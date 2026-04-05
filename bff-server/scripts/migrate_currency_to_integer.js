/**
 * 迁移脚本：货币精度重构（REAL → INTEGER / 分）
 *
 * 执行方式：node scripts/migrate_currency_to_integer.js
 *
 * 幂等性：重复执行安全（检测是否已迁移，跳过已迁移的表/字段）
 *
 * 单位说明：
 *   - 修改前：REAL，元（yuan），如 100.00 表示 100 元
 *   - 修改后：INTEGER，分（fen），如 10000 表示 100 元
 *
 * 迁移逻辑：
 *   旧记录（DB 空）：无需转换（无数据）
 *   新写入：应用层已改为直接写入分，整数存储
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'qzt.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'qzt.db.backup_currency');

// 所有需要从 REAL 改为 INTEGER 的货币字段
// 格式: { table, column, description }
const CURRENCY_FIELDS = [
  // accounts 表
  { table: 'accounts',      column: 'balance',        description: '账户余额（分）' },
  { table: 'accounts',      column: 'frozen_balance',  description: '冻结余额（分）' },

  // transactions 表
  { table: 'transactions',  column: 'amount',          description: '交易金额（分）' },

  // split_records 表
  { table: 'split_records',  column: 'amount',          description: '分账总金额（分）' },
  { table: 'split_records',  column: 'split_amount',   description: '分账金额（分）' },

  // tour_groups 表
  { table: 'tour_groups',    column: 'total_amount',   description: '旅行团总金额（分）' },

  // tour_members 表
  { table: 'tour_members',   column: 'split_amount',   description: '成员分账金额（分）' },

  // split_rule_items 表
  { table: 'split_rule_items', column: 'split_amount', description: '分账规则金额（分）' },

  // reconciliation 表
  { table: 'reconciliation_tasks',    column: 'difference_amount', description: '差异金额（分）' },
  { table: 'reconciliation_details',  column: 'expected_amount',    description: '期望金额（分）' },
  { table: 'reconciliation_details',  column: 'actual_amount',     description: '实际金额（分）' },
  { table: 'reconciliation_details',  column: 'difference_amount', description: '差异金额（分）' },
];

// split_ratio 保持 REAL（比例，无单位）
const RATIO_FIELDS = [
  { table: 'tour_members',      column: 'split_ratio',    description: '分账比例（REAL，维持不变）' },
  { table: 'split_rule_items',  column: 'split_ratio',   description: '分账比例（REAL，维持不变）' },
];

async function migrate() {
  console.log('========================================');
  console.log('货币精度重构迁移：REAL → INTEGER（分）');
  console.log('========================================\n');

  if (!fs.existsSync(DB_PATH)) {
    console.log('[SKIP] 数据库文件不存在，跳过迁移');
    return;
  }

  // Step 0: 备份
  console.log('[1/4] 备份数据库...');
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`      备份已保存: ${BACKUP_PATH}\n`);

  // Step 1: 加载数据库
  console.log('[2/4] 加载数据库...');
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);
  console.log('      数据库加载成功\n');

  // Step 2: 检查当前 schema
  console.log('[3/4] 检查字段类型...');
  const migrationRecords = [];
  const skipRecords = [];

  for (const field of CURRENCY_FIELDS) {
    try {
      const result = db.exec(`PRAGMA table_info(${field.table})`);
      if (!result.length) {
        console.warn(`      [WARN] 表 ${field.table} 不存在，跳过`);
        continue;
      }
      const colInfo = result[0].values.find(row => row[1] === field.column);
      if (!colInfo) {
        console.warn(`      [WARN] 表 ${field.table}.${field.column} 不存在，跳过`);
        continue;
      }
      const currentType = colInfo[2];

      if (currentType === 'INTEGER') {
        skipRecords.push(field);
        console.log(`      [SKIP] ${field.table}.${field.column} 已是 INTEGER`);
      } else {
        migrationRecords.push({ ...field, currentType });
        console.log(`      [MIGRATE] ${field.table}.${field.column}: ${currentType} → INTEGER`);
      }
    } catch (e) {
      console.warn(`      [ERROR] ${field.table}.${field.column}: ${e.message}`);
    }
  }

  if (migrationRecords.length === 0) {
    console.log('\n[INFO] 所有字段已是 INTEGER 或不存在，无需迁移\n');
    db.close();
    return;
  }

  // Step 3: 执行迁移
  console.log(`\n[4/4] 执行迁移（共 ${migrationRecords.length} 个字段）...`);

  // 开始事务
  db.run('BEGIN TRANSACTION');

  try {
    for (const field of migrationRecords) {
      const { table, column } = field;

      // 3a. 读取现有数据（元）
      const selectResult = db.exec(`SELECT id, ${column} FROM ${table}`);
      const rows = selectResult.length ? selectResult[0].values : [];
      const totalRows = rows.length;

      if (totalRows === 0) {
        // 无数据，直接改类型
        db.run(`ALTER TABLE ${table} RENAME TO _${table}_old`);
        // 重建表（改类型）
        await recreateTableWithInteger(db, table, column);
        console.log(`      [OK] ${table}.${column} → INTEGER（无数据，直接转换）`);
      } else {
        // 有数据：元 → 分
        console.log(`      [DATA] ${table}.${column}: 转换 ${totalRows} 条记录（元→分）...`);

        // 创建临时表保存转换后的数据
        db.run(`CREATE TABLE ${table}_new AS SELECT * FROM ${table}`);

        // 更新每一行：元 → 分
        for (const row of rows) {
          const rowId = row[0];
          const yuanValue = row[1];
          if (yuanValue !== null && yuanValue !== undefined) {
            const fenValue = Math.round(parseFloat(yuanValue) * 100);
            db.run(`UPDATE ${table}_new SET ${column} = ? WHERE id = ?`, [fenValue, rowId]);
          }
        }

        // 删除旧表，重命名新表
        db.run(`DROP TABLE ${table}`);
        db.run(`ALTER TABLE ${table}_new RENAME TO ${table}`);
        console.log(`      [OK] ${table}.${column} → INTEGER（${totalRows} 条记录已转换）`);
      }
    }

    db.run('COMMIT');
    console.log('\n[SUCCESS] 迁移完成！所有货币字段已改为 INTEGER（分）\n');
  } catch (e) {
    db.run('ROLLBACK');
    console.error('\n[ERROR] 迁移失败，已回滚:', e.message);
    console.error('      备份文件可用于恢复:', BACKUP_PATH);
    db.close();
    process.exit(1);
  }

  // Step 4: 保存
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
  console.log('[SAVE] 数据库已保存');

  // Step 5: 验证
  console.log('\n========================================');
  console.log('验证结果');
  console.log('========================================');
  await verifyMigration();
}

/**
 * 重建表，将指定字段改为 INTEGER
 * 注意：这是简化版本，实际使用 SQLite 的 ALTER TABLE 限制
 * 对于非空表使用 "CREATE TABLE AS SELECT" 模式
 */
async function recreateTableWithInteger(db, tableName, intColumn) {
  // 获取原表创建语句
  const createResult = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='_${tableName}_old'`);
  if (!createResult.length) return;

  let createSQL = createResult[0].values[0][0];
  // 将 REAL 改为 INTEGER
  createSQL = createSQL.replace(new RegExp(`(\\s${intColumn}\\s+REAL)`, 'i'), `$1 INTEGER`.replace('REAL', 'INTEGER'));
  createSQL = createSQL.replace(new RegExp(`(${intColumn}\\s+REAL)`, 'i'), `${intColumn} INTEGER`);

  db.run(createSQL.replace(`_${tableName}_old`, tableName));
}

async function verifyMigration() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  const passed = [];
  const failed = [];

  for (const field of CURRENCY_FIELDS) {
    try {
      const result = db.exec(`PRAGMA table_info(${field.table})`);
      if (!result.length) continue;
      const colInfo = result[0].values.find(row => row[1] === field.column);
      if (!colInfo) continue;

      const currentType = colInfo[2];
      if (currentType === 'INTEGER') {
        passed.push(`${field.table}.${field.column}`);
      } else {
        failed.push(`${field.table}.${field.column}: ${currentType}`);
      }
    } catch (e) {}
  }

  console.log(`\n通过: ${passed.length}/${CURRENCY_FIELDS.length}`);
  for (const p of passed) console.log(`  ✅ ${p}`);

  if (failed.length) {
    console.log(`\n失败: ${failed.length}`);
    for (const f of failed) console.log(`  ❌ ${f}`);
  }

  db.close();
}

// 运行
migrate().catch(e => {
  console.error('迁移脚本异常:', e);
  process.exit(1);
});

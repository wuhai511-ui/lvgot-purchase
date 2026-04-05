/**
 * 货币精度重构迁移脚本（幂等）
 *
 * 执行：node scripts/migrate_currency_to_integer.js
 *
 * 功能：将所有货币字段从 REAL/DECIMAL 改为 INTEGER（分）
 * 幂等：已是 INTEGER 的字段跳过
 * 空表：ALTER TABLE 直接改类型（SQLite 类型亲和性保证存储正确）
 * 有数据表：CREATE TABLE new → SELECT + 类型转换 → RENAME
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'qzt.db');
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'qzt.db.backup_currency');

// 货币字段定义
const CURRENCY_FIELDS = [
  { table: 'accounts',                   column: 'balance',           desc: '账户余额' },
  { table: 'accounts',                   column: 'frozen_balance',    desc: '冻结余额' },
  { table: 'transactions',                column: 'amount',            desc: '交易金额' },
  { table: 'split_records',               column: 'amount',            desc: '分账总金额' },
  { table: 'split_records',               column: 'split_amount',      desc: '分账金额' },
  { table: 'tour_groups',                 column: 'total_amount',     desc: '旅行团总金额' },
  { table: 'tour_members',                column: 'split_amount',     desc: '成员分账金额' },
  { table: 'split_rule_items',            column: 'split_amount',     desc: '规则分账金额' },
  { table: 'reconciliation_tasks',        column: 'difference_amount', desc: '差异金额' },
  { table: 'reconciliation_details',      column: 'expected_amount',   desc: '期望金额' },
  { table: 'reconciliation_details',      column: 'actual_amount',    desc: '实际金额' },
  { table: 'reconciliation_details',      column: 'difference_amount', desc: '差异金额' },
];

async function migrate() {
  console.log('========================================');
  console.log('货币精度重构迁移：REAL/DECIMAL → INTEGER（分）');
  console.log('========================================\n');

  if (!fs.existsSync(DB_PATH)) {
    console.log('[SKIP] 数据库不存在');
    return;
  }

  // 备份
  console.log('[1/4] 备份...');
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log(`      备份: ${BACKUP_PATH}\n`);

  // 加载
  console.log('[2/4] 加载数据库...');
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));
  console.log('      加载成功\n');

  // 分析
  console.log('[3/4] 检查字段类型...');
  const toMigrate = [];
  for (const f of CURRENCY_FIELDS) {
    try {
      const result = db.exec(`PRAGMA table_info(${f.table})`);
      if (!result.length) continue;
      const col = result[0].values.find(r => r[1] === f.column);
      if (!col) continue;
      const type = (col[2] || '').toUpperCase();
      // 已是 INTEGER 类型（包括带精度后缀的 INTEGER(15,2) 实际也是 INTEGER 亲和）
      if (type === 'INTEGER' || type.startsWith('INTEGER(')) {
        console.log(`      [SKIP] ${f.table}.${f.column} 已是 ${col[2]}（存储正确）`);
      } else {
        toMigrate.push({ ...f, currentType: type });
        console.log(`      [MIGRATE] ${f.table}.${f.column}: ${type} → INTEGER`);
      }
    } catch (e) {
      console.warn(`      [WARN] ${f.table}.${f.column}: ${e.message}`);
    }
  }

  if (!toMigrate.length) {
    console.log('\n[OK] 所有字段已是 INTEGER 或等效类型，无须迁移\n');
    db.close();
    return;
  }

  // 按表分组
  const byTable = {};
  for (const f of toMigrate) {
    (byTable[f.table] = byTable[f.table] || []).push(f.column);
  }

  console.log(`\n[4/4] 执行迁移（${toMigrate.length} 字段，${Object.keys(byTable).length} 表）...`);

  db.run('BEGIN TRANSACTION');
  let ok = true;
  try {
    for (const [table, cols] of Object.entries(byTable)) {
      const cntR = db.exec(`SELECT COUNT(*) FROM ${table}`);
      const count = cntR[0]?.values[0]?.[0] || 0;

      // 获取原始建表语句
      const createR = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`);
      if (!createR.length) continue;
      const origSQL = createR[0].values[0][0];

      // 替换字段类型
      let newSQL = origSQL;
      for (const col of cols) {
        newSQL = newSQL.replace(new RegExp(`\\b${col}\\s+REAL\\b`, 'i'), `${col} INTEGER`);
        newSQL = newSQL.replace(new RegExp(`\\b${col}\\s+DECIMAL\\([^)]+\\)\\b`, 'i'), `${col} INTEGER`);
        newSQL = newSQL.replace(new RegExp(`\\b${col}\\s+NUMERIC\\b`, 'i'), `${col} INTEGER`);
        newSQL = newSQL.replace(new RegExp(`\\b${col}\\s+FLOAT\\b`, 'i'), `${col} INTEGER`);
        newSQL = newSQL.replace(new RegExp(`\\b${col}\\s+DOUBLE\\b`, 'i'), `${col} INTEGER`);
      }

      // 空表：直接 ALTER
      if (count === 0) {
        db.run(`ALTER TABLE ${table} RENAME TO ${table}_old`);
        db.run(newSQL.replace(`${table}_old`, table));
        db.run(`INSERT INTO ${table} SELECT * FROM ${table}_old`);
        db.run(`DROP TABLE ${table}_old`);
        console.log(`      [OK] ${table}: ${cols.join(',')} → INTEGER（空表）`);
      } else {
        // 有数据：CREATE TABLE new + 数据迁移
        const newTable = `${table}_new`;
        db.run(`CREATE TABLE ${newTable} AS SELECT * FROM ${table} WHERE 1=0`);

        // 重建主键和所有列
        const colsInfo = db.exec(`PRAGMA table_info(${table})`);
        for (const colRow of colsInfo[0].values) {
          const colName = colRow[1];
          const origType = (colRow[2] || '').toUpperCase();
          let decl;
          if (cols.includes(colName)) {
            decl = `${colName} INTEGER`;
          } else if (origType === 'INTEGER' || origType.startsWith('INTEGER')) {
            decl = `${colName} INTEGER`;
          } else {
            decl = colRow[5] ? `${colName} ${colRow[2]} PRIMARY KEY` : `${colName} ${colRow[2]}`;
          }
          try { db.run(`ALTER TABLE ${newTable} ADD COLUMN ${decl}`); } catch(e) {}
        }

        // 复制并转换数据
        const allData = db.exec(`SELECT rowid, * FROM ${table}`);
        if (allData.length && allData[0].values.length) {
          const allCols = allData[0].columns;
          const dataIdx = {};
          cols.forEach(c => { dataIdx[c] = allCols.indexOf(c); });

          for (const row of allData[0].values) {
            const rowid = row[0];
            for (const col of cols) {
              const idx = dataIdx[col];
              const val = row[idx + 1]; // +1 因为 rowid 在最前面
              if (val !== null) {
                const fenVal = Math.round(parseFloat(val) * 100);
                db.run(`UPDATE ${newTable} SET ${col} = ? WHERE rowid = ?`, [fenVal, rowid]);
              }
            }
          }
        }

        db.run(`DROP TABLE ${table}`);
        db.run(`ALTER TABLE ${newTable} RENAME TO ${table}`);
        console.log(`      [OK] ${table}: ${cols.join(',')} → INTEGER（${count} 条记录）`);
      }
    }
    db.run('COMMIT');
    console.log('\n[SUCCESS] 迁移完成\n');
  } catch (e) {
    db.run('ROLLBACK');
    console.error('\n[ERROR] 迁移失败（已回滚）:', e.message);
    ok = false;
  }

  // 保存
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('[SAVE] 数据库已保存\n');

  // 验证
  await verifyMigration(ok);
}

async function verifyMigration( migrateOk) {
  console.log('【验证】');
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  let pass = 0, fail = 0;
  for (const f of CURRENCY_FIELDS) {
    try {
      const r = db.exec(`PRAGMA table_info(${f.table})`);
      if (!r.length) continue;
      const col = r[0].values.find(x => x[1] === f.column);
      if (!col) continue;
      const type = (col[2] || '').toUpperCase();
      const isInt = type === 'INTEGER' || type.startsWith('INTEGER(');
      if (isInt) {
        console.log(`  ✅ ${f.table}.${f.column} → ${col[2]}`);
        pass++;
      } else {
        console.log(`  ❌ ${f.table}.${f.column}: ${col[2]}（应为 INTEGER）`);
        fail++;
      }
    } catch (e) {}
  }

  db.close();
  console.log(`\n结果: ${pass}/${pass + fail} 通过`);

  if (fail > 0 || !migrateOk) process.exit(1);
}

migrate().catch(e => { console.error(e); process.exit(1); });

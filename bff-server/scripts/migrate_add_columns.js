/**
 * 数据库迁移脚本：添加缺失列到现有表
 * 运行: node scripts/migrate_add_columns.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'qzt.db');

async function migrate() {
  const SQL = await initSqlJs();
  const fileBuf = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuf);

  // 1. 给 trade_orders 添加缺失列
  const tradeOrdersInfo = db.exec("PRAGMA table_info(trade_orders)");
  const tradeOrdersCols = tradeOrdersInfo[0]?.values.map(r => r[1]) || [];
  const addCols = ['merchant_id', 'out_order_no', 'account_no', 'payee_account_no', 'amount', 'split_status', 'updated_at'];
  addCols.forEach(col => {
    if (!tradeOrdersCols.includes(col)) {
      const colDef = {
        merchant_id: 'INTEGER',
        out_order_no: 'TEXT',
        account_no: 'TEXT',
        payee_account_no: 'TEXT',
        amount: 'INTEGER DEFAULT 0',
        split_status: 'TEXT',
        updated_at: 'DATETIME',
      }[col];
      db.run(`ALTER TABLE trade_orders ADD COLUMN ${col} ${colDef}`);
      console.log(`Added ${col} to trade_orders`);
    } else {
      console.log(`${col} already exists in trade_orders`);
    }
  });

  // 2. 创建 stores 表（如不存在）
  const storesInfo = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='stores'");
  if (!storesInfo.length || !storesInfo[0].values.length) {
    db.run(`CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      store_name TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('Created stores table');
  } else {
    console.log('stores table already exists');
  }

  // 3. 保存并关闭
  const updatedBuf = db.export();
  fs.writeFileSync(dbPath, Buffer.from(updatedBuf));
  console.log('Migration done. Saved to', dbPath);
  db.close();
}

migrate().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
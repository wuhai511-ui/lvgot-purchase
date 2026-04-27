const db = require('../db-sqlite3');

async function up() {
  await db.initDatabase();

  const tables = [
    'merchants',
    'stores',
    'tour_groups',
    'split_rules',
    'split_templates',
    'transactions',
    'accounts',
    'bank_cards',
    'orders'
  ];

  for (const table of tables) {
    // 检查是否已有 tenant_id 列
    const columns = await db.allAsync(`PRAGMA table_info(${table})`);
    const hasTenantId = columns.some(c => c.name === 'tenant_id');

    if (!hasTenantId) {
      // 对于 merchants 表，tenant_id 指向自身
      if (table === 'merchants') {
        await db.runAsync(`ALTER TABLE ${table} ADD COLUMN tenant_id INTEGER DEFAULT id`);
      } else {
        await db.runAsync(`ALTER TABLE ${table} ADD COLUMN tenant_id INTEGER`);
      }
      console.log(`[Migration] Added tenant_id to ${table}`);
    }
  }

  // merchant_features 表（租户功能权限）
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS merchant_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      enable_split INTEGER DEFAULT 1,
      enable_withdraw INTEGER DEFAULT 1,
      enable_reconciliation INTEGER DEFAULT 1,
      enable_store_management INTEGER DEFAULT 1,
      max_stores INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(merchant_id)
    )
  `);

  console.log('[Migration] Completed: tenant_id columns added');
}

module.exports = { up };

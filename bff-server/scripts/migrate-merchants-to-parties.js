/**
 * migrate-merchants-to-parties.js
 * 
 * Data migration: merchant → split_engine_parties
 * 
 * Usage: node scripts/migrate-merchants-to-parties.js [--tenant TENANT_ID]
 * 
 * Mapping:
 *   merchants.split_role -> split_engine_parties.role (map: shop->购物店, agency->旅行社, guide->导游, driver->司机, other->其他)
 *   merchants.qzt_account_no -> split_engine_parties.account_no
 *   merchants.register_name -> split_engine_parties.name
 *   merchants.id -> split_engine_parties.merchant_id
 *   merchants.tenant_id -> split_engine_parties.tenant_id
 *   Default settle_cycle: shop->daily, agency->daily, guide->monthly, driver->monthly, other->daily
 * 
 * Supports --tenant CLI argument to filter by tenant.
 */
const db = require('../db-sqlite3');

async function migrate() {
  const tenantArg = process.argv.includes('--tenant') 
    ? process.argv[process.argv.indexOf('--tenant') + 1] 
    : null;

  await db.initDatabase();
  console.log('数据库已连接');

  let query = `SELECT id, tenant_id, register_name, split_role, qzt_account_no, status
    FROM merchants WHERE qzt_account_no IS NOT NULL AND qzt_account_no != ''`;
  const params = [];
  if (tenantArg) {
    query += ' AND tenant_id = ?';
    params.push(tenantArg);
  }

  const merchants = await db.allAsync(query, params);
  console.log(`找到 ${merchants.length} 个有账户号的商户`);

  let created = 0, skipped = 0;

  const roleMap = {
    'shop': '购物店', 'agency': '旅行社', 'guide': '导游',
    'driver': '司机', 'other': '其他'
  };
  const settleMap = {
    'shop': 'daily', 'agency': 'daily', 'guide': 'monthly', 'driver': 'monthly', 'other': 'daily'
  };

  for (const m of merchants) {
    // Check if already migrated
    const existing = await db.getAsync(
      `SELECT id FROM split_engine_parties WHERE merchant_id = ?`, [m.id]
    );
    if (existing) {
      skipped++;
      continue;
    }

    await db.saveSplitEngineParty({
      tenant_id: m.tenant_id || 'default',
      name: m.register_name,
      role: roleMap[m.split_role] || m.split_role || '其他',
      merchant_id: m.id,
      account_no: m.qzt_account_no,
      settle_cycle: settleMap[m.split_role] || 'daily'
    });
    created++;
  }

  console.log(`迁移完成: 创建 ${created} 条, 跳过 ${skipped} 条（已存在）`);
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
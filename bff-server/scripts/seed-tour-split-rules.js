/**
 * seed-tour-split-rules.js
 *
 * Seed default tour split scene with rules
 *
 * Scene: tour (旅行团分账)
 * Parties: 购物店(10%), 旅行社(70%), 导游(20%)
 *
 * Usage: node scripts/seed-tour-split-rules.js [--tenant TENANT_ID]
 */
const db = require('../db-sqlite3');

async function seed() {
  const tenantId = process.argv.includes('--tenant')
    ? process.argv[process.argv.indexOf('--tenant') + 1]
    : 'default';

  await db.initDatabase();
  console.log('数据库已连接');

  // 1. Create or find scene
  let scene = await db.getSplitEngineSceneByCode(tenantId, 'tour');
  if (!scene) {
    scene = await db.saveSplitEngineScene({
      tenant_id: tenantId, name: '旅行团分账', code: 'tour',
      description: '旅行社标准分账场景：购物店 → 旅行社 + 导游'
    });
    console.log('场景已创建: tour');
  } else {
    console.log('场景已存在: tour');
  }

  // 2. Create or find parties
  const partyDefs = [
    { name: '购物店（默认）', role: '购物店', account_no: null, settle_cycle: 'daily' },
    { name: '旅行社（默认）', role: '旅行社', account_no: null, settle_cycle: 'daily' },
    { name: '导游（默认）', role: '导游', account_no: null, settle_cycle: 'monthly' }
  ];
  const parties = [];
  for (const p of partyDefs) {
    let party = await db.getAsync(
      `SELECT id FROM split_engine_parties WHERE tenant_id = ? AND name = ?`, [tenantId, p.name]
    );
    if (!party) {
      party = await db.saveSplitEngineParty({
        tenant_id: tenantId, name: p.name, role: p.role,
        account_no: p.account_no, settle_cycle: p.settle_cycle
      });
      console.log(`参与方已创建: ${p.name}`);
    } else {
      console.log(`参与方已存在: ${p.name}`);
    }
    parties.push(party);
  }

  // 3. Check if default rule group already exists
  const existingGroups = await db.getSplitEngineRuleGroups(tenantId, scene.id);
  const existingGroup = existingGroups.find(g => g.name === '旅行团标准分账（默认）');
  if (existingGroup) {
    console.log('默认规则组已存在，跳过创建');
    process.exit(0);
  }

  // 4. Create rule group
  const group = await db.saveSplitEngineRuleGroup({
    tenant_id: tenantId, scene_id: scene.id,
    name: '旅行团标准分账（默认）'
  });
  console.log('规则组已创建:', group.name);

  // 5. Create rules: 旅行社 70%, 导游 20%, 购物店 10%
  const rules = [
    { party_id: parties[1].id, rule_type: 'percentage', value: '0.70', priority: 10, settle_cycle: 'daily' },
    { party_id: parties[2].id, rule_type: 'percentage', value: '0.20', priority: 20, settle_cycle: 'monthly' },
    { party_id: parties[0].id, rule_type: 'percentage', value: '0.10', priority: 30, settle_cycle: 'daily' }
  ];
  await db.saveSplitEngineRulesBatch(group.id, rules);
  console.log(`${rules.length} 条规则已创建`);

  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
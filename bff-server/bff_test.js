#!/usr/bin/env node
/**
 * 旅购通 BFF 接口测试脚本
 * 测试范围：充值、分账、提现、商户开户、OCR、人脸识别、账户信息
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://139.196.190.217:3000';
// const BASE_URL = 'http://localhost:3000';  // 本地调试

// 测试结果收集
const results = {
  success: [],
  failed: [],
  total: 0
};

function log(label, msg, status = 'INFO') {
  const ts = new Date().toISOString().split('T')[1].slice(0, 8);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⬜';
  console.log(`[${ts}] ${icon} [${label}] ${msg}`);
}

function record(name, passed, detail = '') {
  results.total++;
  if (passed) {
    results.success.push(name);
    log(name, `通过 ${detail}`, 'PASS');
  } else {
    results.failed.push({ name, detail });
    log(name, `失败: ${detail}`, 'FAIL');
  }
}

// 通用请求封装
async function http(method, url, data = null, params = null, label = '') {
  try {
    const config = { method, url, headers: { 'Content-Type': 'application/json' } };
    if (data) config.data = data;
    if (params) config.params = params;
    const resp = await axios(config);
    return { ok: true, status: resp.status, data: resp.data };
  } catch (e) {
    const status = e.response?.status || 'NETWORK';
    const msg = e.response?.data?.message || e.message || '未知错误';
    log(label || method.toUpperCase(), `请求异常 [${status}]: ${msg}`, 'FAIL');
    return { ok: false, status, error: msg, data: e.response?.data };
  }
}

// ============================================================
// 测试：充值流程
// ============================================================
async function testRecharge() {
  console.log('\n' + '═'.repeat(60));
  console.log('测试模块：充值流程');
  console.log('═'.repeat(60));

  // 1. 充值 pre-order
  const preOrderData = {
    out_request_no: 'RECH_' + Date.now(),
    amount: 10000,  // 单位分，100元
    currency: 'CNY',
    subject: '账户充值测试',
    biz_scene: 'RECHARGE',
    payee_id: 'MERCH_001',
    payee_name: '测试商户'
  };

  const pre = await http('POST', `${BASE_URL}/api/qzt/recharge/pre-order`, preOrderData, null, '充值pre-order');
  let rechargeOrderNo = null;
  if (pre.ok && pre.data?.code === 0) {
    rechargeOrderNo = pre.data.data?.order_no;
    record('充值pre-order', true, `订单号: ${rechargeOrderNo || 'N/A'}`);
  } else {
    record('充值pre-order', false, `响应: ${JSON.stringify(pre.data || pre.error)}`);
  }

  // 2. 充值状态查询
  if (rechargeOrderNo) {
    const status = await http('GET', `${BASE_URL}/api/qzt/recharge/status`, null, { order_no: rechargeOrderNo }, '充值status查询');
    if (status.ok && status.data?.code === 0) {
      record('充值status查询', true, JSON.stringify(status.data.data || {}));
    } else {
      record('充值status查询', false, `响应: ${JSON.stringify(status.data || status.error)}`);
    }
  } else {
    // 即使没有 order_no，也尝试用模拟订单号查询
    const status = await http('GET', `${BASE_URL}/api/qzt/recharge/status`, null, { order_no: 'TEST_RECH_' + Date.now() }, '充值status查询(模拟订单)');
    if (status.ok) {
      record('充值status查询(模拟订单)', true, `code=${status.data?.code}`);
    } else {
      record('充值status查询(模拟订单)', false, `${status.status}: ${status.error}`);
    }
  }
}

// ============================================================
// 测试：分账流程
// ============================================================
async function testSplit() {
  console.log('\n' + '═'.repeat(60));
  console.log('测试模块：分账流程');
  console.log('═'.repeat(60));

  // 1. 分账 pre-order
  const splitPreData = {
    out_request_no: 'SPLIT_' + Date.now(),
    order_no: 'ORD_' + Date.now(),
    amount: 5000,  // 50元
    currency: 'CNY',
    split_list: [
      { seq: 1, account_id: 'ACC_001', account_name: '商户A', amount: 3000 },
      { seq: 2, account_id: 'ACC_002', account_name: '商户B', amount: 2000 }
    ],
    biz_scene: 'SPLIT'
  };

  const pre = await http('POST', `${BASE_URL}/api/qzt/split/pre-order`, splitPreData, null, '分账pre-order');
  let splitOrderNo = null;
  if (pre.ok && pre.data?.code === 0) {
    splitOrderNo = pre.data.data?.order_no;
    record('分账pre-order', true, `订单号: ${splitOrderNo || 'N/A'}`);
  } else {
    record('分账pre-order', false, `响应: ${JSON.stringify(pre.data || pre.error)}`);
  }

  // 2. 分账确认（需要 pre_order_no）
  const confirmData = {
    out_request_no: 'SPLIT_CONFIRM_' + Date.now(),
    order_no: splitOrderNo || ('ORD_' + Date.now()),
    confirm_amount: 5000
  };
  const confirm = await http('POST', `${BASE_URL}/api/qzt/split/confirm`, confirmData, null, '分账confirm');
  if (confirm.ok && confirm.data?.code === 0) {
    record('分账confirm', true, JSON.stringify(confirm.data.data || {}));
  } else {
    record('分账confirm', false, `响应: ${JSON.stringify(confirm.data || confirm.error)}`);
  }

  // 3. 分账查询
  const query = await http('GET', `${BASE_URL}/api/qzt/split/query`, null, { order_no: splitOrderNo || 'ORD_TEST' }, '分账query');
  if (query.ok && query.data?.code === 0) {
    record('分账query', true, JSON.stringify(query.data.data || {}));
  } else {
    record('分账query', false, `响应: ${JSON.stringify(query.data || query.error)}`);
  }
}

// ============================================================
// 测试：提现流程
// ============================================================
async function testWithdraw() {
  console.log('\n' + '═'.repeat(60));
  console.log('测试模块：提现流程');
  console.log('═'.repeat(60));

  // 1. 提现 pre-order
  const withdrawPreData = {
    out_request_no: 'WD_' + Date.now(),
    amount: 1000,  // 10元
    currency: 'CNY',
    account_no: '6222021234567890',
    account_name: '张三',
    bank_name: '工商银行',
    bank_union_code: 'ICBC',
    bank_branch: '北京分行',
    biz_scene: 'WITHDRAW'
  };

  const pre = await http('POST', `${BASE_URL}/api/qzt/withdraw/pre-order`, withdrawPreData, null, '提现pre-order');
  let withdrawOrderNo = null;
  if (pre.ok && pre.data?.code === 0) {
    withdrawOrderNo = pre.data.data?.order_no;
    record('提现pre-order', true, `订单号: ${withdrawOrderNo || 'N/A'}`);
  } else {
    record('提现pre-order', false, `响应: ${JSON.stringify(pre.data || pre.error)}`);
  }

  // 2. 提现确认
  const confirmData = {
    out_request_no: 'WD_CONFIRM_' + Date.now(),
    order_no: withdrawOrderNo || ('WD_ORD_' + Date.now()),
    confirm_amount: 1000
  };
  const confirm = await http('POST', `${BASE_URL}/api/qzt/withdraw/confirm`, confirmData, null, '提现confirm');
  if (confirm.ok && confirm.data?.code === 0) {
    record('提现confirm', true, JSON.stringify(confirm.data.data || {}));
  } else {
    record('提现confirm', false, `响应: ${JSON.stringify(confirm.data || confirm.error)}`);
  }

  // 3. 提现查询
  const query = await http('GET', `${BASE_URL}/api/qzt/withdraw/query`, null, { order_no: withdrawOrderNo || 'WD_TEST' }, '提现query');
  if (query.ok && query.data?.code === 0) {
    record('提现query', true, JSON.stringify(query.data.data || {}));
  } else {
    record('提现query', false, `响应: ${JSON.stringify(query.data || query.error)}`);
  }
}

// ============================================================
// 测试：商户开户（PC admin）
// ============================================================
async function testMerchantApply() {
  console.log('\n' + '═'.repeat(60));
  console.log('测试模块：商户开户（PC admin）');
  console.log('═'.repeat(60));

  // 1. 企业商户开户
  const applyData = {
    merchant_name: '测试科技有限公司',
    merchant_shortname: '测试科技',
    service_phone: '4001234567',
    business_license_type: 1,
    business_license_province: '北京市',
    business_license_city: '北京市',
    business_license_address: '朝阳区建国路88号',
    business_address: '北京市朝阳区建国路88号',
    legal_name: '李四',
    legal_id_card_no: '110101199001011234',
    legal_id_card_expire: '2030-12-31',
    legal_phone: '13800138000',
    bank_account_type: '1',
    bank_name: '工商银行',
    bank_account_no: '6222021234567890123',
    bank_account_name: '测试科技有限公司',
    bank_province: '北京市',
    bank_city: '北京市',
    bank_branch_name: '工商银行北京分行',
    bank_union_code: 'ICBCBJ'
  };

  const apply = await http('POST', `${BASE_URL}/api/merchant/apply`, applyData, null, '企业商户开户');
  let merchantId = null;
  if (apply.ok && apply.data?.code === 0) {
    merchantId = apply.data.data?.merchant_id;
    record('企业商户开户', true, `merchant_id: ${merchantId}, h5_url: ${apply.data.data?.h5_url ? '有' : '无'}`);
  } else {
    record('企业商户开户', false, `响应: ${JSON.stringify(apply.data || apply.error)}`);
  }

  // 2. 个人商户开户
  const personalData = {
    merchant_name: '张三',
    service_phone: '13900139000',
    legal_name: '张三',
    legal_id_card_no: '110101199001011234',
    legal_id_card_expire: '2030-12-31',
    legal_phone: '13900139000',
    bank_account_type: '1',
    bank_name: '建设银行',
    bank_account_no: '6222021234567890124',
    bank_account_name: '张三',
    bank_province: '北京市',
    bank_city: '北京市',
    bank_branch_name: '建设银行北京分行',
    bank_union_code: 'CCBJ'
  };

  const personalApply = await http('POST', `${BASE_URL}/api/merchant/apply-personal`, personalData, null, '个人商户开户');
  let personalMerchantId = null;
  if (personalApply.ok && personalApply.data?.code === 0) {
    personalMerchantId = personalApply.data.data?.merchant_id;
    record('个人商户开户', true, `merchant_id: ${personalMerchantId}`);
  } else {
    record('个人商户开户', false, `响应: ${JSON.stringify(personalApply.data || personalApply.error)}`);
  }

  // 3. 商户列表查询
  const list = await http('GET', `${BASE_URL}/api/merchant`, null, null, '商户列表查询');
  if (list.ok && list.data?.code === 0) {
    const count = Array.isArray(list.data.data) ? list.data.data.length : 'N/A';
    record('商户列表查询', true, `共 ${count} 个商户`);
  } else {
    record('商户列表查询', false, `响应: ${JSON.stringify(list.data || list.error)}`);
  }

  // 4. 商户详情查询
  const testId = merchantId || personalMerchantId || '1';
  const detail = await http('GET', `${BASE_URL}/api/merchant/${testId}`, null, null, '商户详情查询');
  if (detail.ok && detail.data?.code === 0) {
    record('商户详情查询', true, `商户名: ${detail.data.data?.merchant_name || 'N/A'}`);
  } else {
    record('商户详情查询', false, `响应: ${JSON.stringify(detail.data || detail.error)}`);
  }

  return merchantId || personalMerchantId;
}

// ============================================================
// 测试：OCR 识别
// ============================================================
async function testOCR() {
  console.log('\n' + '═'.repeat(60));
  console.log('测试模块：OCR识别');
  console.log('═'.repeat(60));

  // 模拟身份证图片（base64，1x1透明像素）
  const fakeImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  const formData = {
    image: fakeImage.toString('base64'),
    image_type: 'ID_CARD',
    file_name: 'test_id_card.jpg'
  };

  const ocr = await http('POST', `${BASE_URL}/api/merchant/ocr`, formData, null, 'OCR识别');
  if (ocr.ok && (ocr.data?.code === 0 || ocr.data?.code === 200)) {
    record('OCR识别', true, JSON.stringify(ocr.data.data || ocr.data));
  } else {
    record('OCR识别', false, `响应: ${JSON.stringify(ocr.data || ocr.error)}`);
  }
}

// ============================================================
// 测试：人脸识别
// ============================================================
async function testFaceRecognition(merchantId) {
  console.log('\n' + '═'.repeat(60));
  console.log('测试模块：人脸识别');
  console.log('═'.repeat(60));

  const testId = merchantId || '1';
  const face = await http('GET', `${BASE_URL}/api/merchant/${testId}/face-recognition-url`, null, null, '人脸识别URL');
  if (face.ok && face.data?.code === 0) {
    record('人脸识别URL获取', true, `URL: ${face.data.data?.url ? '有' : '无'}`);
  } else {
    record('人脸识别URL获取', false, `响应: ${JSON.stringify(face.data || face.error)}`);
  }
}

// ============================================================
// 测试：账户信息
// ============================================================
async function testAccountInfo(merchantId) {
  console.log('\n' + '═'.repeat(60));
  console.log('测试模块：账户信息');
  console.log('═'.repeat(60));

  const testId = merchantId || '1';

  // 1. 余额查询
  const balance = await http('GET', `${BASE_URL}/api/merchant/${testId}/balance`, null, null, '余额查询');
  if (balance.ok && balance.data?.code === 0) {
    record('余额查询', true, JSON.stringify(balance.data.data || {}));
  } else {
    record('余额查询', false, `响应: ${JSON.stringify(balance.data || balance.error)}`);
  }

  // 2. 流水查询
  const flow = await http('GET', `${BASE_URL}/api/merchant/${testId}/flow`, null, null, '流水查询');
  if (flow.ok && flow.data?.code === 0) {
    const items = Array.isArray(flow.data.data) ? flow.data.data.length : 'N/A';
    record('流水查询', true, `共 ${items} 条记录`);
  } else {
    record('流水查询', false, `响应: ${JSON.stringify(flow.data || flow.error)}`);
  }
}

// ============================================================
// 测试：文件上传
// ============================================================
async function testUpload() {
  console.log('\n' + '═'.repeat(60));
  console.log('测试模块：文件上传');
  console.log('═'.repeat(60));

  // 模拟营业执照图片
  const fakeFile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  const form = new URLSearchParams();
  form.append('file_name', 'business_license.jpg');
  form.append('file_type', 'BUSINESS_LICENSE');
  form.append('file_content', fakeFile.toString('base64'));

  try {
    const resp = await axios.post(`${BASE_URL}/api/merchant/upload`, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (resp.data?.code === 0) {
      record('文件上传', true, JSON.stringify(resp.data.data || {}));
    } else {
      record('文件上传', false, `响应: ${JSON.stringify(resp.data)}`);
    }
  } catch (e) {
    const msg = e.response?.data?.message || e.message;
    record('文件上传', false, `${e.response?.status || 'NET'}: ${msg}`);
  }
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     旅购通 BFF 接口测试   139.196.190.217:3000           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);

  // 先检查服务是否可达
  const ping = await http('GET', `${BASE_URL}/`, null, null, 'BFF服务健康检查');
  if (!ping.ok && ping.status !== 404) {
    log('BFF服务', `不可达 [${ping.status}]，请确认服务已启动`, 'FAIL');
    console.log('提示: cd /home/admin/.openclaw/workspace/lvgot-purchase/bff-server && node index.js &>/tmp/bff_server.log &');
    process.exit(1);
  } else {
    log('BFF服务', '可正常访问', 'PASS');
  }

  // 执行所有测试
  await testRecharge();
  await testSplit();
  await testWithdraw();
  const merchantId = await testMerchantApply();
  await testOCR();
  await testFaceRecognition(merchantId);
  await testAccountInfo(merchantId);
  await testUpload();

  // 汇总报告
  console.log('\n' + '═'.repeat(60));
  console.log('测试结果汇总');
  console.log('═'.repeat(60));
  console.log(`总计: ${results.total} 项`);
  console.log(`通过: ${results.success.length} 项 ✅`);
  console.log(`失败: ${results.failed.length} 项 ❌`);

  if (results.failed.length > 0) {
    console.log('\n失败详情:');
    results.failed.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.name}] ${item.detail}`);
    });
  }

  // 输出飞书报告格式
  const report = buildReport();
  fs.writeFileSync('/tmp/bff_test_report.md', report);
  console.log('\n报告已保存到: /tmp/bff_test_report.md');
  console.log('\n' + '═'.repeat(60));
}

function buildReport() {
  const lines = [
    '# 旅购通 BFF 接口测试报告',
    '',
    `**测试时间**: ${new Date().toLocaleString('zh-CN')}`,
    `**BFF地址**: ${BASE_URL}`,
    '',
    '## 测试结果概览',
    '',
    `| 指标 | 数值 |`,
    `|------|------|`,
    `| 总测试项 | ${results.total} |`,
    `| 通过 | ${results.success.length} |`,
    `| 失败 | ${results.failed.length} |`,
    `| 通过率 | ${results.total > 0 ? Math.round(results.success.length / results.total * 100) : 0}% |`,
    '',
    '## 通过项目',
  ];

  if (results.success.length > 0) {
    results.success.forEach(name => {
      lines.push(`- ✅ ${name}`);
    });
  }

  if (results.failed.length > 0) {
    lines.push('', '## 失败项目', '');
    results.failed.forEach((item, i) => {
      lines.push(`${i + 1}. ❌ **${item.name}**`);
      lines.push(`   - 原因: ${item.detail}`);
      lines.push('');
    });
  }

  lines.push('', '---', '*报告由 BFF 测试脚本自动生成*');
  return lines.join('\n');
}

main().catch(e => {
  console.error('测试脚本异常:', e.message);
  process.exit(1);
});

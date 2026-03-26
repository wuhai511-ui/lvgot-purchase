/**
 * 旅购通分账系统 - Mock API Server v1.2
 * 模拟钱账通/钱包系统接口
 * 支持账户状态机（INVALID/VALID）、差异化开户流程
 */

const http = require('http');
const url = require('url');

const PORT = 3001;
const MOCK_BASE = 'http://localhost:3001';

// ==================== 内存数据库 ====================
const db = {
  accounts: new Map([
    ['ACC001', { id: 'ACC001', accountNo: 'LAK2026030001', name: '张三商行', type: 'merchant', phone: '13800138001', balance: 125680.00, frozenBalance: 0, status: 'VALID', auditStatus: 'approved', livenessStatus: 'passed', bankAccount: '6222021234567890123', bankName: '中国工商银行', createTime: '2026-03-20 10:00:00', level: 1, transferOutEnabled: true, withdrawEnabled: true, merchantNo: 'M10001', terminalNo: 'T001' }],
    ['ACC002', { id: 'ACC002', accountNo: 'LAK2026030002', name: '顺风旅行社', type: 'agency', phone: '13900139002', balance: 356200.00, frozenBalance: 0, status: 'VALID', auditStatus: 'approved', livenessStatus: 'passed', bankAccount: '6222021234567890124', bankName: '中国建设银行', createTime: '2026-03-18 14:30:00', level: 2, transferOutEnabled: true, withdrawEnabled: true, merchantNo: '', terminalNo: '' }],
    ['ACC003', { id: 'ACC003', accountNo: 'LAK2026030003', name: '李四 (导游)', type: 'guide', phone: '13700137003', balance: 8560.00, frozenBalance: 0, status: 'VALID', auditStatus: 'not_required', livenessStatus: 'passed', bankAccount: '6222021234567890125', bankName: '中国农业银行', createTime: '2026-03-15 09:00:00', level: 3, transferOutEnabled: true, withdrawEnabled: true, merchantNo: '', terminalNo: '' }],
    ['ACC004', { id: 'ACC004', accountNo: 'LAK2026030004', name: '王五 (司机)', type: 'driver', phone: '13600136004', balance: 4200.00, frozenBalance: 0, status: 'INVALID', auditStatus: 'not_required', livenessStatus: 'pending', bankAccount: '6222021234567890126', bankName: '中国银行', createTime: '2026-03-22 11:00:00', level: 3, transferOutEnabled: false, withdrawEnabled: false, merchantNo: '', terminalNo: '' }],
    ['ACC005', { id: 'ACC005', accountNo: 'LAK2026030005', name: '海风旅游商店', type: 'merchant', phone: '13500135005', balance: 0, frozenBalance: 0, status: 'INVALID', auditStatus: 'pending', livenessStatus: 'pending', bankAccount: '6222021234567890127', bankName: '招商银行', createTime: '2026-03-25 09:00:00', level: 1, transferOutEnabled: false, withdrawEnabled: false, merchantNo: '', terminalNo: '' }],
  ]),
  appConfig: { appId: 'LVGOT001', appName: '旅购通', enableBankInternalAccount: false, enableEContract: false, paymentAuthType: 'SMS', withdrawAuthType: 'SMS' },
  auditQueue: [{ id: 'AUD001', accountNo: 'LAK2026030005', name: '海风旅游商店', type: 'merchant', phone: '13500135005', submitTime: '2026-03-25 09:00:00', status: 'pending', rejectReason: '' }],
  orders: new Map([['ORD001', { id: 'ORD001', orderNo: 'ORD20260326001', outOrderNo: 'XC20260326001', payerAccountNo: 'LAK2026030002', payerName: '顺风旅行社', totalAmount: 5000, status: 'success', createTime: '2026-03-26 10:30:00' }], ['ORD002', { id: 'ORD002', orderNo: 'ORD20260326002', outOrderNo: 'XC20260326002', payerAccountNo: 'LAK2026030002', payerName: '顺风旅行社', totalAmount: 8000, status: 'success', createTime: '2026-03-25 15:20:00' }]]),
  splitRecords: new Map([['SPL001', { id: 'SPL001', splitNo: 'SP20260326001', orderNo: 'ORD20260326001', payerAccountNo: 'LAK2026030002', payerName: '顺风旅行社', receiverAccountNo: 'LAK2026030003', receiverName: '李四 (导游)', amount: 750, status: 'success', createTime: '2026-03-26 10:30:00' }], ['SPL002', { id: 'SPL002', splitNo: 'SP20260325001', orderNo: 'ORD20260326002', payerAccountNo: 'LAK2026030002', payerName: '顺风旅行社', receiverAccountNo: 'LAK2026030003', receiverName: '李四 (导游)', amount: 1200, status: 'success', createTime: '2026-03-25 15:20:00' }]]),
  withdrawRecords: new Map([['WD001', { id: 'WD001', withdrawNo: 'WD20260326001', accountNo: 'LAK2026030003', accountName: '李四 (导游)', bankAccount: '6222021234567890125', bankName: '中国农业银行', amount: 5000, fee: 5, realAmount: 4995, status: 'pending', createTime: '2026-03-26 11:00:00' }], ['WD002', { id: 'WD002', withdrawNo: 'WD20260325002', accountNo: 'LAK2026030001', accountName: '张三商行', bankAccount: '6222021234567890123', bankName: '中国工商银行', amount: 20000, fee: 20, realAmount: 19980, status: 'success', createTime: '2026-03-25 16:30:00' }]]),
  stores: new Map([['ST001', { id: 'ST001', name: '门店一(旗舰店)', merchantNo: 'M10001', terminalNo: 'T001', boundAccountNo: 'LAK2026030001', boundAccountName: '张三商行', status: 'bound' }], ['ST002', { id: 'ST002', name: '门店二(分店)', merchantNo: 'M10002', terminalNo: 'T002', boundAccountNo: 'LAK2026030001', boundAccountName: '张三商行', status: 'bound' }], ['ST003', { id: 'ST003', name: '门店三(新店)', merchantNo: '', terminalNo: '', boundAccountNo: '', boundAccountName: '', status: 'unbound' }]]),
  smsCodes: new Map(),
  upgradeApplications: new Map([['LAK2026030004', { token: 'FACE_TOKEN_004', status: 'pending', applyTime: '2026-03-26 12:00:00', expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() }]]),
};

// ==================== 工具函数 ====================
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
function genAccountNo() { return 'LAK' + Date.now().toString().slice(-10); }
function genOrderNo() { return 'ORD' + Date.now().toString().slice(-12); }
function genWithdrawNo() { return 'WD' + Date.now().toString().slice(-12); }
function genSplitNo() { return 'SP' + Date.now().toString().slice(-12); }
function now() { return new Date().toISOString().replace('T', ' ').slice(0, 19); }
function sendJson(res, code, data) { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); res.end(JSON.stringify(data)); }
function ok(res, data) { sendJson(res, 200, { code: 0, message: 'success', data }); }
function fail(res, msg, code) { sendJson(res, 200, { code: code || -1, message: msg }); }
function body(req) { return new Promise((resolve, reject) => { let d = []; req.on('data', c => d.push(c)); req.on('end', () => { try { resolve(d.length ? JSON.parse(Buffer.concat(d).toString()) : {}); } catch(e) { reject(e); } }); req.on('error', reject); }); }
function findAcc(no) { for (const a of db.accounts.values()) { if (a.accountNo === no) return a; } return null; }
function computeStatus(acc) {
  if (acc.type === 'guide' || acc.type === 'driver') return acc.livenessStatus === 'passed' ? 'VALID' : 'INVALID';
  if (acc.auditStatus === 'rejected') return 'INVALID';
  if (acc.auditStatus !== 'approved') return 'INVALID';
  return acc.livenessStatus === 'passed' ? 'VALID' : 'INVALID';
}

// ==================== 路由 ====================
const routes = [];
function route(method, path, handler) { routes.push({ method, path, handler }); }

route('GET',  '/api/app/config', async (req, res) => { ok(res, db.appConfig); });
route('POST', '/api/app/config/update', async (req, res) => {
  const p = await body(req);
  if (p.enableBankInternalAccount !== undefined) db.appConfig.enableBankInternalAccount = !!p.enableBankInternalAccount;
  if (p.enableEContract !== undefined) db.appConfig.enableEContract = !!p.enableEContract;
  if (p.paymentAuthType !== undefined) db.appConfig.paymentAuthType = p.paymentAuthType;
  if (p.withdrawAuthType !== undefined) db.appConfig.withdrawAuthType = p.withdrawAuthType;
  ok(res, { message: '配置更新成功', config: db.appConfig });
});

route('POST', '/api/account/open', async (req, res) => {
  const p = await body(req);
  const { name, type, phone, idCard, bankAccount, bankName, businessLicenseNo, legalPerson, legalIdCard } = p;
  if (!name || !type || !phone) return fail(res, 'name/type/phone 不能为空');
  if (!['personal', 'company'].includes(type)) return fail(res, 'type 必须是 personal 或 company');
  const isPersonal = type === 'personal';
  const accountNo = genAccountNo();
  const id = 'ACC' + genId();
  const account = { id, accountNo, name, type, phone, idCard: isPersonal ? idCard : undefined, bankAccount: bankAccount || '', bankName: bankName || '', businessLicenseNo: !isPersonal ? businessLicenseNo : undefined, legalPerson: !isPersonal ? legalPerson : undefined, legalIdCard: !isPersonal ? legalIdCard : undefined, balance: 0, frozenBalance: 0, auditStatus: isPersonal ? 'not_required' : 'pending', livenessStatus: 'pending', status: 'INVALID', level: 1, transferOutEnabled: false, withdrawEnabled: false, merchantNo: '', terminalNo: '', createTime: now() };
  account.status = computeStatus(account);
  if (account.status === 'VALID') { account.transferOutEnabled = true; account.withdrawEnabled = true; }
  db.accounts.set(id, account);
  if (!isPersonal) { db.auditQueue.push({ id: 'AUD' + genId(), accountNo, name, type: 'merchant', phone, submitTime: now(), status: 'pending', rejectReason: '' }); }
  ok(res, { accountNo, status: account.status, auditStatus: account.auditStatus, livenessStatus: account.livenessStatus, message: isPersonal ? '开户申请已提交，请完成人脸识别激活账户' : '开户申请已提交，请等待审核', faceUrl: isPersonal ? MOCK_BASE + '/mock/face-auth?accountNo=' + accountNo : null });
});

route('POST', '/api/account/upgrade/apply', async (req, res) => {
  const p = await body(req);
  const { accountNo } = p;
  if (!accountNo) return fail(res, 'accountNo 不能为空');
  const account = findAcc(accountNo);
  if (!account) return fail(res, '账户不存在');
  if (account.status === 'VALID') return fail(res, '账户已激活，无需升级');
  const existing = db.upgradeApplications.get(accountNo);
  if (existing && existing.status === 'pending' && new Date(existing.expireAt) > new Date()) return ok(res, { token: existing.token, faceUrl: MOCK_BASE + '/mock/face-auth?token=' + existing.token + '&accountNo=' + accountNo, message: '人脸认证链接已生成' });
  const token = 'FACE_' + genId();
  db.upgradeApplications.set(accountNo, { token, status: 'pending', applyTime: now(), expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() });
  ok(res, { token, faceUrl: MOCK_BASE + '/mock/face-auth?token=' + token + '&accountNo=' + accountNo, message: '请完成人脸识别' });
});

route('GET', '/api/account/upgrade/result', async (req, res) => {
  const { accountNo } = url.parse(req.url, true).query;
  if (!accountNo) return fail(res, 'accountNo 不能为空');
  const account = findAcc(accountNo);
  if (!account) return fail(res, '账户不存在');
  const app = db.upgradeApplications.get(accountNo);
  ok(res, { accountNo, status: account.status, livenessStatus: account.livenessStatus, upgradeStatus: app ? app.status : 'none' });
});

route('POST', '/api/account/upgrade/confirm', async (req, res) => {
  const p = await body(req);
  const { accountNo, token, result: faceResult } = p;
  if (!accountNo || !token) return fail(res, 'accountNo 和 token 不能为空');
  const app = db.upgradeApplications.get(accountNo);
  if (!app || app.token !== token) return fail(res, '无效的认证 Token');
  const account = findAcc(accountNo);
  if (!account) return fail(res, '账户不存在');
  const passed = faceResult !== 'failed';
  if (passed) {
    account.livenessStatus = 'passed';
    account.status = computeStatus(account);
    if (account.status === 'VALID') { account.transferOutEnabled = true; account.withdrawEnabled = true; }
    app.status = 'passed';
  } else { app.status = 'failed'; }
  ok(res, { accountNo, status: account.status, livenessStatus: account.livenessStatus, upgradeStatus: app.status, message: passed ? '人脸识别通过，账户已激活' : '人脸识别失败，请重试' });
});

route('GET', '/api/account/list', async (req, res) => {
  const { keyword, status, type, page = 1, pageSize = 20 } = url.parse(req.url, true).query;
  let list = Array.from(db.accounts.values());
  if (keyword) list = list.filter(a => a.name.includes(keyword) || a.accountNo.includes(keyword) || a.phone.includes(keyword));
  if (status) list = list.filter(a => a.status === status);
  if (type) list = list.filter(a => a.type === type);
  const total = list.length, start = (parseInt(page) - 1) * parseInt(pageSize);
  ok(res, { list: list.slice(start, start + parseInt(pageSize)), total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

route('GET', '/api/account/detail', async (req, res) => {
  const { accountNo } = url.parse(req.url, true).query;
  if (!accountNo) return fail(res, 'accountNo 不能为空');
  const account = findAcc(accountNo);
  if (!account) return fail(res, '账户不存在');
  ok(res, account);
});

route('GET', '/api/audit/list', async (req, res) => {
  const { status } = url.parse(req.url, true).query;
  let list = db.auditQueue;
  if (status) list = list.filter(a => a.status === status);
  ok(res, { list, total: list.length });
});

route('POST', '/api/audit/approve', async (req, res) => {
  const p = await body(req);
  const { accountNo } = p;
  if (!accountNo) return fail(res, 'accountNo 不能为空');
  let found = null;
  for (const a of db.accounts.values()) { if (a.accountNo === accountNo) { found = a; break; } }
  if (!found) return fail(res, '账户不存在');
  found.auditStatus = 'approved';
  found.status = computeStatus(found);
  const q = db.auditQueue.find(a => a.accountNo === accountNo);
  if (q) q.status = 'approved';
  ok(res, { message: '审核已通过', accountNo, status: found.status, livenessStatus: found.livenessStatus });
});

route('POST', '/api/audit/reject', async (req, res) => {
  const p = await body(req);
  const { accountNo, reason } = p;
  if (!accountNo) return fail(res, 'accountNo 不能为空');
  let found = null;
  for (const a of db.accounts.values()) { if (a.accountNo === accountNo) { found = a; break; } }
  if (!found) return fail(res, '账户不存在');
  found.auditStatus = 'rejected';
  found.status = 'INVALID';
  const q = db.auditQueue.find(a => a.accountNo === accountNo);
  if (q) { q.status = 'rejected'; q.rejectReason = reason || ''; }
  ok(res, { message: '审核已驳回', accountNo });
});

route('POST', '/api/order/pay', async (req, res) => {
  const p = await body(req);
  const { outOrderNo, payerAccountNo, amount, splitDetailList, smsCode, payPassword } = p;
  if (!outOrderNo || !payerAccountNo || !amount) return fail(res, 'outOrderNo/payerAccountNo/amount 不能为空');
  const payer = findAcc(payerAccountNo);
  if (!payer) return fail(res, '付款方账户不存在');
  if (payer.status !== 'VALID') return fail(res, '付款方账户未激活');
  if (!payer.transferOutEnabled) return fail(res, '付款方未开通转出权限');
  if (payer.balance < amount) return fail(res, '余额不足');
  const authType = db.appConfig.paymentAuthType;
  if (authType === 'SMS') {
    if (!smsCode) return fail(res, '请输入短信验证码', -2);
    const sms = db.smsCodes.get(payer.phone);
    if (!sms || sms.code !== smsCode) return fail(res, '验证码错误');
    if (new Date(sms.expireAt) < new Date()) return fail(res, '验证码已过期');
  } else if (authType === 'PWD') {
    if (!payPassword) return fail(res, '请输入支付密码', -3);
    if (payPassword !== '123456') return fail(res, '支付密码错误');
  }
  for (const o of db.orders.values()) { if (o.outOrderNo === outOrderNo) return ok(res, { orderNo: o.orderNo, outOrderNo, status: o.status, message: '订单已存在', idempotent: true }); }
  const orderNo = genOrderNo();
  const id = 'ORD' + genId();
  db.orders.set(id, { id, orderNo, outOrderNo, payerAccountNo, payerName: payer.name, totalAmount: amount, status: 'success', createTime: now() });
  payer.balance = Math.round((payer.balance - amount) * 100) / 100;
  if (splitDetailList && splitDetailList.length > 0) {
    for (const split of splitDetailList) {
      const recv = findAcc(split.accountNo);
      if (recv && recv.status === 'VALID') {
        recv.balance = Math.round((recv.balance + split.amount) * 100) / 100;
        db.splitRecords.set('SPL' + genId(), { id: 'SPL' + genId(), splitNo: genSplitNo(), orderNo, payerAccountNo, payerName: payer.name, receiverAccountNo: split.accountNo, receiverName: recv.name, amount: split.amount, status: 'success', createTime: now() });
      }
    }
  }
  ok(res, { orderNo, outOrderNo, status: 'success', message: '分账成功', payerBalance: payer.balance });
});

route('POST', '/api/sms/send', async (req, res) => {
  const p = await body(req);
  const { phone } = p;
  if (!phone) return fail(res, '手机号不能为空');
  const code = '123456';
  db.smsCodes.set(phone, { code, expireAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
  ok(res, { message: '短信发送成功', expireSeconds: 300 });
});

route('POST', '/api/fund/withdraw', async (req, res) => {
  const p = await body(req);
  const { accountNo, amount, bankAccount, bankName, smsCode, payPassword } = p;
  if (!accountNo || !amount || !bankAccount || !bankName) return fail(res, 'accountNo/amount/bankAccount/bankName 不能为空');
  const account = findAcc(accountNo);
  if (!account) return fail(res, '账户不存在');
  if (account.status !== 'VALID') return fail(res, '账户未激活');
  if (!account.withdrawEnabled) return fail(res, '未开通提现权限');
  if (account.balance < amount) return fail(res, '余额不足');
  const authType = db.appConfig.withdrawAuthType;
  if (authType === 'SMS') {
    if (!smsCode) return fail(res, '请输入短信验证码', -2);
    const sms = db.smsCodes.get(account.phone);
    if (!sms || sms.code !== smsCode) return fail(res, '验证码错误');
    if (new Date(sms.expireAt) < new Date()) return fail(res, '验证码已过期');
  } else if (authType === 'PWD') {
    if (!payPassword) return fail(res, '请输入支付密码', -3);
    if (payPassword !== '123456') return fail(res, '支付密码错误');
  }
  const fee = Math.max(1, Math.round(amount * 0.001 * 100) / 100);
  const withdrawNo = genWithdrawNo();
  const id = 'WD' + genId();
  db.withdrawRecords.set(id, { id, withdrawNo, accountNo, accountName: account.name, bankAccount, bankName, amount, fee, realAmount: Math.round((amount - fee) * 100) / 100, status: 'pending', createTime: now() });
  account.balance = Math.round((account.balance - amount) * 100) / 100;
  account.frozenBalance = Math.round((account.frozenBalance + amount) * 100) / 100;
  ok(res, { withdrawNo, amount, fee, realAmount: amount - fee, status: 'pending', message: '提现申请已提交' });
});

route('POST', '/api/store/bind_terminal', async (req, res) => {
  const p = await body(req);
  const { merchantNo, terminalNo, accountNo, storeName } = p;
  if (!merchantNo || !terminalNo) return fail(res, 'merchantNo/terminalNo 不能为空');
  for (const s of db.stores.values()) { if (s.terminalNo === terminalNo && s.boundAccountNo && s.boundAccountNo !== accountNo) return fail(res, '终端 ' + terminalNo + ' 已被其他门店绑定，请先解绑后再试'); }
  let store = null;
  for (const s of db.stores.values()) { if (s.merchantNo === merchantNo) { store = s; break; } }
  if (store) {
    store.terminalNo = terminalNo;
    store.boundAccountNo = accountNo || '';
    store.boundAccountName = accountNo ? (findAcc(accountNo)?.name || '') : '';
    store.status = accountNo ? 'bound' : 'unbound';
  } else {
    const id = 'ST' + genId();
    store = { id, name: storeName || '门店' + merchantNo, merchantNo, terminalNo, boundAccountNo: accountNo || '', boundAccountName: accountNo ? (findAcc(accountNo)?.name || '') : '', status: accountNo ? 'bound' : 'unbound' };
    db.stores.set(id, store);
  }
  ok(res, { message: '绑定成功', store });
});

route('GET', '/api/store/list', async (req, res) => {
  const { keyword } = url.parse(req.url, true).query;
  let list = Array.from(db.stores.values());
  if (keyword) list = list.filter(s => s.name.includes(keyword) || s.merchantNo.includes(keyword));
  ok(res, { list, total: list.length });
});

route('POST', '/api/trade/webhook', async (req, res) => {
  const p = await body(req);
  const { eventType, orderNo, status, message } = p;
  if (!eventType || !orderNo) return fail(res, 'eventType/orderNo 不能为空');
  console.log('[Webhook] event=' + eventType + ' order=' + orderNo + ' status=' + status);
  ok(res, { message: 'Webhook 接收成功' });
});

route('GET', '/api/trade/query', async (req, res) => {
  const { orderNo, outOrderNo } = url.parse(req.url, true).query;
  let order = null;
  if (orderNo) { for (const o of db.orders.values()) { if (o.orderNo === orderNo) { order = o; break; } } }
  if (!order && outOrderNo) { for (const o of db.orders.values()) { if (o.outOrderNo === outOrderNo) { order = o; break; } } }
  if (!order) return fail(res, '订单不存在');
  ok(res, order);
});

route('GET', '/api/split/records', async (req, res) => {
  const { status, page = 1, pageSize = 20 } = url.parse(req.url, true).query;
  let list = Array.from(db.splitRecords.values());
  if (status) list = list.filter(r => r.status === status);
  const total = list.length, start = (parseInt(page) - 1) * parseInt(pageSize);
  ok(res, { list: list.slice(start, start + parseInt(pageSize)), total });
});

route('GET', '/api/withdraw/records', async (req, res) => {
  const { status, accountNo, page = 1, pageSize = 20 } = url.parse(req.url, true).query;
  let list = Array.from(db.withdrawRecords.values());
  if (status) list = list.filter(r => r.status === status);
  if (accountNo) list = list.filter(r => r.accountNo === accountNo);
  const total = list.length, start = (parseInt(page) - 1) * parseInt(pageSize);
  ok(res, { list: list.slice(start, start + parseInt(pageSize)), total });
});

route('GET', '/mock/face-auth', async (req, res) => {
  const { token, accountNo } = url.parse(req.url, true).query;
  const html = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>人脸识别认证</title>\n<style>\n  * { margin: 0; padding: 0; box-sizing: border-box; }\n  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #1a1a2e; display: flex; align-items: center; justify-content: center; min-height: 100vh; }\n  .container { background: #fff; border-radius: 20px; padding: 40px; width: 380px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }\n  h2 { color: #333; margin-bottom: 8px; font-size: 20px; }\n  .sub { color: #888; font-size: 13px; margin-bottom: 30px; }\n  .camera { width: 200px; height: 200px; border-radius: 50%; background: #1a1a2e; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }\n  .camera::before { content: \'\'; position: absolute; width: 220px; height: 220px; border: 3px dashed rgba(255,255,255,0.3); border-radius: 50%; animation: spin 8s linear infinite; }\n  @keyframes spin { to { transform: rotate(360deg); } }\n  .camera-icon { font-size: 60px; }\n  .btn-group { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }\n  button { width: 100%; padding: 14px; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; }\n  .btn-pass { background: #4CAF50; color: #fff; }\n  .btn-pass:hover { background: #43a047; }\n  .btn-fail { background: #f5f5f5; color: #666; }\n  .btn-fail:hover { background: #eee; }\n  .tips { font-size: 11px; color: #bbb; margin-top: 16px; }\n  .account { background: #f0f7ff; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #1976D2; margin-bottom: 20px; display: inline-block; }\n</style></head><body>\n<div class="container">\n  <h2>人脸识别认证</h2>\n  <p class="sub">请将面部对准摄像头</p>\n  <div class="account">账户号：' + (accountNo || '-') + '</div>\n  <div class="camera"><span class="camera-icon">&#128248;</span></div>\n  <div class="btn-group">\n    <button class="btn-pass" onclick="confirmAuth(\'passed\')">通过认证</button>\n    <button class="btn-fail" onclick="confirmAuth(\'failed\')">认证失败</button>\n  </div>\n  <p class="tips">* 此为 Mock 演示页面，点击「通过认证」将模拟完成活体检测</p>\n</div>\n<script>\n  function confirmAuth(result) {\n    fetch(\'' + MOCK_BASE + '/api/account/upgrade/confirm\', {\n      method: \'POST\',\n      headers: { \'Content-Type\': \'application/json\' },\n      body: JSON.stringify({ accountNo: \'' + (accountNo || '') + '\', token: \'' + (token || '') + '\', result: result })\n    }).then(r => r.json()).then(data => {\n      if (data.code === 0) {\n        alert((result === \'passed\' ? \'认证通过\' : \'认证失败\') + \'！账户状态：\' + data.data.status);\n      } else {\n        alert(\'操作失败：\' + data.message);\n      }\n      window.close();\n    }).catch(() => { alert(\'请求失败\'); });\n  }\n<\/script>\n</body></html>';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

// ==================== 服务器启动 ====================
const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  const method = req.method;
  if (method === 'OPTIONS') { res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  let matched = false;
  for (const r of routes) {
    if (r.method === method && r.path === pathname) { r.handler(req, res); matched = true; break; }
  }
  if (!matched) sendJson(res, 404, { code: -1, message: 'API 不存在: ' + method + ' ' + pathname });
});

server.listen(PORT, () => {
  console.log('旅购通 Mock API Server running on http://localhost:' + PORT);
  console.log('API清单:');
  console.log(' GET  /api/app/config              - 获取应用配置');
  console.log(' POST /api/app/config/update      - 更新应用配置');
  console.log(' POST /api/account/open           - 支付账户开户');
  console.log(' POST /api/account/upgrade/apply - 申请升级(获取人脸链接)');
  console.log(' GET  /api/account/upgrade/result - 查询升级结果');
  console.log(' POST /api/account/upgrade/confirm - 确认活体认证结果');
  console.log(' GET  /api/account/list           - 账户列表');
  console.log(' GET  /api/account/detail         - 账户详情');
  console.log(' GET  /api/audit/list             - 开户审核列表');
  console.log(' POST /api/audit/approve          - 审核通过');
  console.log(' POST /api/audit/reject           - 审核驳回');
  console.log(' POST /api/order/pay              - 分账/付款订单');
  console.log(' POST /api/sms/send              - 发送验证码');
  console.log(' POST /api/fund/withdraw         - 提现申请');
  console.log(' POST /api/store/bind_terminal   - 门店绑定终端');
  console.log(' GET  /api/store/list            - 门店列表');
  console.log(' POST /api/trade/webhook          - 交易状态Webhook');
  console.log(' GET  /api/trade/query           - 主动查询交易状态');
  console.log(' GET  /api/split/records         - 分账记录');
  console.log(' GET  /api/withdraw/records      - 提现记录');
  console.log(' GET  /mock/face-auth            - Mock人脸识别H5页面');
});

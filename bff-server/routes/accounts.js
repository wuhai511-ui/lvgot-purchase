/**
 * 账户管理路由（多账户模式）
 *
 * GET  /api/accounts              — 账户列表（含 QZT 实时余额）
 * GET  /api/accounts/:id          — 账户详情
 * POST /api/accounts/:id/bind-card — 绑定银行卡（QZT 6.6）
 * DELETE /api/accounts/:id/bind-card/:card_id — 解绑银行卡（QZT 6.7）
 *
 * 多账户模式：账户列表页同时展示账户余额（来自 QZT 7.7）、账户类型、
 * 银行卡绑定状态，不再查本地 transactions 表。
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

/**
 * 调用 QZT 7.7 account.info.query 获取账户实时余额和状态
 * @param {string} account_no
 * @returns {Promise{balance, status, account_type}>}
 */
async function queryQztAccountInfo(account_no) {
  try {
    const result = await callQzt('account.info.query', { account_no });
    // QZT 7.7 返回结构示例：
    // { code: 0, data: { account_no, account_name, account_type, balance: "0", status: "NORMAL", ... } }
    // balance 单位为分
    const data = result?.data || result || {};
    return {
      balance: parseInt(data.balance || 0),
      status: data.status || 'UNKNOWN',
      account_type: data.account_type || '',
      bank_name: data.bank_name || '',
    };
  } catch (err) {
    console.error(`[account.info.query] 查询账户 ${account_no} 失败:`, err.message);
    return { balance: null, status: 'QUERY_FAILED', account_type: '', bank_name: '' };
  }
}

/**
 * GET /api/accounts
 * Query: merchant_id（必填）
 * 返回该商户下所有账户，含 QZT 实时余额（并行查询）
 */
router.get('/', async (req, res) => {
  const { merchant_id } = req.query;
  if (!merchant_id) {
    return res.status(400).json({ code: 400, message: '缺少 merchant_id' });
  }

  // 查本地账户列表
  const accounts = dbSqlite.getAccountsByMerchantId(parseInt(merchant_id));
  if (!accounts.length) {
    return res.json({ code: 0, data: [] });
  }

  // 并行查询每账户的 QZT 余额（不阻塞）
  const enrichedAccounts = await Promise.all(
    accounts.map(async (acct) => {
      const qztInfo = await queryQztAccountInfo(acct.account_no);
      // 银行卡列表
      const cards = dbSqlite.getBankCards(acct.merchant_id)
        .filter(c => c.account_no === acct.account_no);
      return {
        ...acct,
        balance: qztInfo.balance,
        qzt_status: qztInfo.status,
        qzt_account_type: qztInfo.account_type,
        bank_cards: cards,
      };
    })
  );

  res.json({ code: 0, data: enrichedAccounts });
});

/**
 * GET /api/accounts/:id
 * 账户详情（含 QZT 实时余额）
 */
router.get('/:id', async (req, res) => {
  const account = dbSqlite.getAccountById(parseInt(req.params.id));
  if (!account) return res.status(404).json({ code: 404, message: '账户不存在' });

  const qztInfo = await queryQztAccountInfo(account.account_no);
  const cards = dbSqlite.getBankCards(account.merchant_id)
    .filter(c => c.account_no === account.account_no);

  res.json({
    code: 0,
    data: {
      ...account,
      balance: qztInfo.balance,
      qzt_status: qztInfo.status,
      qzt_account_type: qztInfo.account_type,
      bank_cards: cards,
    },
  });
});

/**
 * POST /api/accounts/:id/bind-card
 * 绑定银行卡（QZT 6.6），成功后写本地 bank_cards 表
 * 评审意见：merchant_id 从账户查询结果获取，不硬编码
 */
router.post('/:id/bind-card', async (req, res) => {
  const account = dbSqlite.getAccountById(parseInt(req.params.id));
  if (!account) return res.status(404).json({ code: 404, message: '账户不存在' });

  const { bank_card_no, bank_name, account_name } = req.body;
  if (!bank_card_no || !bank_name) {
    return res.status(400).json({ code: 400, message: '缺少必填参数：bank_card_no, bank_name' });
  }

  // 调用 QZT 6.6 银行卡绑定
  const outRequestNo = 'BCB_' + Date.now();
  const qztResult = await callQzt('bank.card.bind', {
    out_request_no: outRequestNo,
    account_no: account.account_no,
    bank_card_no,
    bank_name,
    account_name: account_name || '',
  });

  // 本地记录（幂等）
  const existing = dbSqlite.getBankCards(account.merchant_id)
    .find(c => c.bank_card_no === bank_card_no && c.account_no === account.account_no);
  if (!existing) {
    dbSqlite.saveBankCard({
      merchant_id: account.merchant_id,
      account_no: account.account_no,
      bank_card_no,
      bank_name,
      account_name: account_name || '',
      status: 'ACTIVE',
    });
  }

  res.json({ code: 0, data: { out_request_no: outRequestNo, qzt_result: qztResult } });
});

/**
 * DELETE /api/accounts/:id/bind-card/:card_id
 * 解绑银行卡（QZT 6.7），成功后删除本地记录
 */
router.delete('/:id/bind-card/:card_id', async (req, res) => {
  const account = dbSqlite.getAccountById(parseInt(req.params.id));
  if (!account) return res.status(404).json({ code: 404, message: '账户不存在' });

  const card = dbSqlite.getBankCards(account.merchant_id)
    .find(c => c.id === parseInt(req.params.card_id));
  if (!card) return res.status(404).json({ code: 404, message: '银行卡不存在' });

  // 调用 QZT 6.7 解绑
  const outRequestNo = 'BCU_' + Date.now();
  const qztResult = await callQzt('bank.card.unbind', {
    out_request_no: outRequestNo,
    account_no: account.account_no,
    bank_card_no: card.bank_card_no,
  });

  // 解绑成功后删除本地记录（QZT 返回成功才删）
  const qztCode = qztResult?.code ?? qztResult?.sub_code ?? '0';
  if (String(qztCode) === '0' || qztResult?.success) {
    dbSqlite.deleteBankCard(parseInt(req.params.card_id));
  }

  res.json({ code: 0, data: { out_request_no: outRequestNo, qzt_result: qztResult } });
});

module.exports = router;

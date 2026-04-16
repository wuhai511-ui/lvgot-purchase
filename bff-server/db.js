/**
 * @deprecated 本文件已废弃，所有数据库操作已迁移到 db-sqlite.js
 * LowDB 数据库模块（基于 JSON 文件）
 * 用于存储商户、账户、交易、通知等数据
 */
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

// 数据目录
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 数据库文件
const DB_FILE = path.join(DATA_DIR, 'db.json');

// 初始化默认数据
const defaultData = {
  merchants: [],
  accounts: [],
  bankCards: [],
  transactions: [],
  splitRecords: [],
  notifications: []
};

// 创建数据库实例
const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter, defaultData);

// 初始化数据库
async function initDb() {
  await db.read();
  db.data = db.data || defaultData;
  await db.write();
  console.log('数据库初始化完成:', DB_FILE);
}

// 同步初始化
initDb().catch(console.error);

// ==================== 商户相关 ====================

async function createMerchant(data) {
  await db.read();
  
  const { out_request_no } = data;
  const existing = db.data.merchants.find(m => m.out_request_no === out_request_no);
  
  if (existing) {
    Object.assign(existing, data, { updated_at: new Date().toISOString() });
    await db.write();
    return existing;
  }
  
  const merchant = {
    id: Date.now(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.data.merchants.unshift(merchant);
  await db.write();
  return merchant;
}

async function getMerchants() {
  await db.read();
  return db.data.merchants;
}

async function getMerchantById(id) {
  await db.read();
  return db.data.merchants.find(m => String(m.id) === String(id));
}

async function getMerchantByOutRequestNo(outRequestNo) {
  await db.read();
  return db.data.merchants.find(m => m.out_request_no === outRequestNo);
}

async function updateMerchantStatus(id, status, qztAccountNo = null) {
  await db.read();
  const merchant = db.data.merchants.find(m => String(m.id) === String(id));
  if (merchant) {
    merchant.status = status;
    if (qztAccountNo) merchant.qzt_account_no = qztAccountNo;
    merchant.updated_at = new Date().toISOString();
    await db.write();
  }
  return merchant;
}

// ==================== 账户相关 ====================

async function createAccount(data) {
  await db.read();
  const account = {
    id: Date.now(),
    ...data,
    created_at: new Date().toISOString()
  };
  db.data.accounts.unshift(account);
  await db.write();
  return account;
}

async function getAccountsByMerchantId(merchantId) {
  await db.read();
  return db.data.accounts.filter(a => String(a.merchant_id) === String(merchantId));
}

async function getAccountBalance(merchantId) {
  await db.read();
  return db.data.accounts.filter(a => String(a.merchant_id) === String(merchantId) && a.status === 'ACTIVE');
}

async function updateAccountBalance(accountId, amount, frozenAmount = null) {
  await db.read();
  const account = db.data.accounts.find(a => String(a.id) === String(accountId));
  if (account) {
    account.balance = amount;
    if (frozenAmount !== null) account.frozen_amount = frozenAmount;
    account.updated_at = new Date().toISOString();
    await db.write();
  }
  return account;
}

// ==================== 银行卡相关 ====================

async function createBankCard(data) {
  await db.read();
  const card = {
    id: Date.now(),
    ...data,
    status: 'ACTIVE',
    bind_time: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  db.data.bankCards.unshift(card);
  await db.write();
  return card;
}

async function getBankCardsByMerchantId(merchantId) {
  await db.read();
  return db.data.bankCards.filter(c => String(c.merchant_id) === String(merchantId) && c.status === 'ACTIVE');
}

async function deleteBankCard(id) {
  await db.read();
  const card = db.data.bankCards.find(c => String(c.id) === String(id));
  if (card) {
    card.status = 'DELETED';
    await db.write();
  }
  return card;
}

// ==================== 交易流水相关 ====================

async function createTransaction(data) {
  await db.read();
  const transaction = {
    id: Date.now(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.data.transactions.unshift(transaction);
  await db.write();
  return transaction;
}

async function getTransactions(merchantId, type = null, limit = 50, offset = 0) {
  await db.read();
  let list = db.data.transactions.filter(t => String(t.merchant_id) === String(merchantId));
  if (type) list = list.filter(t => t.transaction_type === type);
  return list.slice(offset, offset + limit);
}

async function getTransactionByNo(transactionNo) {
  await db.read();
  return db.data.transactions.find(t => t.transaction_no === transactionNo);
}

async function updateTransactionStatus(transactionNo, status, qztResponse = null) {
  await db.read();
  const transaction = db.data.transactions.find(t => t.transaction_no === transactionNo);
  if (transaction) {
    transaction.status = status;
    if (qztResponse) transaction.qzt_response = qztResponse;
    transaction.updated_at = new Date().toISOString();
    await db.write();
  }
  return transaction;
}

// ==================== 分账记录相关 ====================

async function createSplitRecord(data) {
  await db.read();
  const record = {
    id: Date.now(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.data.splitRecords.unshift(record);
  await db.write();
  return record;
}

async function getSplitRecords(merchantId, limit = 50, offset = 0) {
  await db.read();
  return db.data.splitRecords
    .filter(r => String(r.merchant_id) === String(merchantId))
    .slice(offset, offset + limit);
}

async function updateSplitRecordStatus(splitNo, status, qztResponse = null) {
  await db.read();
  const record = db.data.splitRecords.find(r => r.split_no === splitNo);
  if (record) {
    record.status = status;
    if (qztResponse) record.qzt_response = qztResponse;
    record.updated_at = new Date().toISOString();
    await db.write();
  }
  return record;
}

// ==================== 通知记录相关 ====================

async function createNotification(data) {
  await db.read();
  const notification = {
    id: Date.now(),
    ...data,
    created_at: new Date().toISOString()
  };
  db.data.notifications.unshift(notification);
  await db.write();
  return notification;
}

async function getNotifications(type = null, limit = 100) {
  await db.read();
  let list = db.data.notifications;
  if (type) list = list.filter(n => n.notification_type === type);
  return list.slice(0, limit);
}

async function markNotificationProcessed(id) {
  await db.read();
  const notification = db.data.notifications.find(n => String(n.id) === String(id));
  if (notification) {
    notification.processed = 1;
    await db.write();
  }
  return notification;
}

module.exports = {
  // 商户
  createMerchant,
  getMerchants,
  getMerchantById,
  getMerchantByOutRequestNo,
  updateMerchantStatus,
  // 账户
  createAccount,
  getAccountsByMerchantId,
  getAccountBalance,
  updateAccountBalance,
  // 银行卡
  createBankCard,
  getBankCardsByMerchantId,
  deleteBankCard,
  // 交易
  createTransaction,
  getTransactions,
  getTransactionByNo,
  updateTransactionStatus,
  // 分账
  createSplitRecord,
  getSplitRecords,
  updateSplitRecordStatus,
  // 通知
  createNotification,
  getNotifications,
  markNotificationProcessed
};

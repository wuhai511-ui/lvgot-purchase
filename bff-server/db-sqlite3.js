/**
 * db-sqlite3.js - SQLite 数据库层（原生 sqlite3，磁盘直写）
 *
 * 相比 sql.js 的改进：
 * 1. 直接磁盘操作，无需手动 saveDatabase()
 * 2. 异步 API，适合高并发
 * 3. 数据实时持久化，无内存依赖
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ========== 加密配置 ==========
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  if (!text) return text;
  if (!ENCRYPTION_KEY) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
  } catch (e) {
    console.error('[DB] 加密失败:', e.message);
    return text;
  }
}

function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  if (!ENCRYPTION_KEY) return encryptedText;
  if (!encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[DB] 解密失败:', e.message);
    return encryptedText;
  }
}

const DB_PATH = path.join(__dirname, 'data', 'qzt.db');
let db = null;

// ========== Promise 化数据库操作 ==========
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// ========== 初始化数据库 ==========
async function initDatabase() {
  if (db) return db;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
        reject(err);
      } else {
        console.log('SQLite 数据库已连接:', DB_PATH);
        createTables();
        resolve(db);
      }
    });
  });
}

function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS merchants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      out_request_no TEXT UNIQUE NOT NULL,
      register_name TEXT,
      legal_mobile TEXT,
      legal_name TEXT,
      legal_id_card TEXT,
      license_no TEXT,
      enterprise_type TEXT DEFAULT '3',
      split_role TEXT DEFAULT 'other',
      guide_cert_no TEXT,
      guide_cert_img TEXT,
      address TEXT,
      email TEXT,
      back_url TEXT,
      status TEXT DEFAULT 'PENDING',
      pay_account_status TEXT DEFAULT 'PENDING',
      bank_account_status TEXT DEFAULT 'PENDING',
      face_verify_status TEXT DEFAULT 'PENDING',
      bank_account_url TEXT,
      qzt_account_no TEXT,
      qzt_merchant_no TEXT,
      qzt_response TEXT,
      callback_message TEXT,
      callback_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      account_no TEXT,
      balance INTEGER DEFAULT 0,
      frozen_balance INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bank_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      bank_code TEXT,
      bank_name TEXT,
      bank_card_no TEXT,
      bank_card_name TEXT,
      bank_type TEXT DEFAULT '2',
      bank_province TEXT,
      bank_city TEXT,
      bank_branch TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER,
      out_request_no TEXT UNIQUE,
      transaction_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING',
      bank_card_no TEXT,
      remark TEXT,
      qzt_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS split_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER,
      out_request_no TEXT UNIQUE,
      order_no TEXT,
      amount INTEGER NOT NULL,
      split_account_no TEXT,
      split_amount INTEGER,
      status TEXT DEFAULT 'PENDING',
      qzt_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_type TEXT NOT NULL,
      out_request_no TEXT,
      content TEXT,
      processed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tour_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      tour_no TEXT UNIQUE NOT NULL,
      tour_name TEXT NOT NULL,
      route_name TEXT,
      days INTEGER DEFAULT 1,
      itinerary TEXT,
      start_date DATE,
      end_date DATE,
      people_count INTEGER DEFAULT 1,
      guide_id INTEGER,
      driver_id INTEGER,
      shop_id INTEGER,
      attractions TEXT,
      hotel_name TEXT,
      hotel_phone TEXT,
      hotel_address TEXT,
      total_amount INTEGER DEFAULT 0,
      split_status TEXT DEFAULT 'PENDING',
      status TEXT DEFAULT 'ACTIVE',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tour_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tour_id INTEGER NOT NULL,
      merchant_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      split_ratio REAL DEFAULT 0,
      split_amount INTEGER DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS split_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      rule_name TEXT NOT NULL,
      rule_type TEXT DEFAULT 'FIXED',
      default_rule INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS split_rule_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER NOT NULL,
      target_merchant_id INTEGER NOT NULL,
      split_ratio REAL DEFAULT 0,
      split_amount INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS split_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '📋',
      items TEXT NOT NULL,
      creator_id TEXT,
      creator_type TEXT DEFAULT 'merchant',
      is_system INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reconciliation_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_no TEXT UNIQUE NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      date_range_start DATE,
      date_range_end DATE,
      total_records INTEGER DEFAULT 0,
      matched_records INTEGER DEFAULT 0,
      unmatched_records INTEGER DEFAULT 0,
      difference_amount INTEGER DEFAULT 0,
      report_url TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS reconciliation_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_no TEXT NOT NULL,
      record_type TEXT NOT NULL,
      record_id TEXT,
      expected_amount INTEGER,
      actual_amount INTEGER,
      difference_amount INTEGER,
      status TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reconciliation_differences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_no TEXT NOT NULL,
      difference_type TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      description TEXT,
      suggested_action TEXT,
      status TEXT DEFAULT 'pending',
      resolved_by TEXT,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      merchant_id INTEGER,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT UNIQUE NOT NULL,
      store_name TEXT NOT NULL,
      account_no TEXT,
      merchant_id INTEGER,
      tour_group_id INTEGER,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS store_terminals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT NOT NULL,
      merchant_no TEXT,
      terminal_no TEXT,
      merchant_name TEXT,
      bind_status TEXT DEFAULT 'BOUND',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(store_id)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      order_type TEXT NOT NULL DEFAULT 'PAY',
      store_id TEXT,
      tour_group_id INTEGER,
      merchant_id INTEGER,
      amount INTEGER DEFAULT 0,
      pay_method TEXT,
      status TEXT DEFAULT 'PENDING',
      refund_status TEXT DEFAULT 'NONE',
      split_status TEXT DEFAULT 'PENDING',
      split_rule_id INTEGER,
      remark TEXT,
      raw_notify TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS order_payment_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL,
      flow_no TEXT UNIQUE NOT NULL,
      amount INTEGER DEFAULT 0,
      pay_method TEXT,
      pay_status TEXT DEFAULT 'PENDING',
      refund_amount INTEGER DEFAULT 0,
      trade_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tour_group_stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tour_group_id INTEGER NOT NULL,
      store_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tour_group_id, store_id)
    )`,
    `CREATE TABLE IF NOT EXISTS merchant_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL UNIQUE,
      enable_split INTEGER DEFAULT 0,
      enable_withdraw INTEGER DEFAULT 0,
      enable_reconciliation INTEGER DEFAULT 0,
      enable_store_management INTEGER DEFAULT 0,
      max_stores INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      api_endpoint TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model_type TEXT NOT NULL DEFAULT 'chat',
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      qzt_account_no TEXT,
      contact_name TEXT,
      contact_mobile TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  tables.forEach(sql => {
    db.run(sql, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('创建表失败:', err.message);
      }
    });
  });
  console.log('数据表创建完成');
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('数据库已关闭');
  }
}

// ========== 用户 ==========
async function createUser({ username, password_hash, role, merchant_id }) {
  const result = await runAsync(
    `INSERT INTO users (username, password_hash, role, merchant_id) VALUES (?, ?, ?, ?)`,
    [username, password_hash, role || 'user', merchant_id || null]
  );
  return { id: result.lastID, username, role, merchant_id };
}

async function getUserByUsername(username) {
  return await getAsync(`SELECT * FROM users WHERE username = ?`, [username]);
}

// ========== 商户 ==========
async function saveMerchant(merchant) {
  const { out_request_no, register_name, legal_mobile, legal_name, legal_id_card, license_no, enterprise_type, split_role, guide_cert_no, guide_cert_img, address, email, back_url, status, pay_account_status, bank_account_status, face_verify_status, bank_account_url, qzt_account_no, qzt_merchant_no, qzt_response, callback_message, callback_at, tenant_id } = merchant;

  const encryptedIdCard = encrypt(legal_id_card);
  const encryptedLicenseNo = encrypt(license_no);
  const encryptedGuideCertNo = encrypt(guide_cert_no);
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';

  const existing = await getMerchantByOutRequestNo(out_request_no);

  if (existing) {
    await runAsync(
      `UPDATE merchants SET register_name=?, legal_mobile=?, legal_name=?, legal_id_card=?, license_no=?, enterprise_type=?, split_role=?, guide_cert_no=?, guide_cert_img=?, address=?, email=?, back_url=?, status=?, pay_account_status=?, bank_account_status=?, face_verify_status=?, bank_account_url=?, qzt_account_no=?, qzt_merchant_no=?, qzt_response=?, callback_message=?, callback_at=?, tenant_id=COALESCE(?, tenant_id), updated_at=CURRENT_TIMESTAMP WHERE out_request_no=?`,
      [register_name, legal_mobile, legal_name, encryptedIdCard, encryptedLicenseNo, enterprise_type||'3', split_role||'other', encryptedGuideCertNo, guide_cert_img, address, email, back_url, status||'PENDING', pay_account_status||'PENDING', bank_account_status||'PENDING', face_verify_status||'PENDING', bank_account_url, qzt_account_no, qzt_merchant_no, qztResponseStr, callback_message, callback_at, tenant_id || null, out_request_no]
    );
    return { ...existing, ...merchant, tenant_id: tenant_id || existing.tenant_id, id: existing.id };
  }

  const result = await runAsync(
    `INSERT INTO merchants (out_request_no, register_name, legal_mobile, legal_name, legal_id_card, license_no, enterprise_type, split_role, guide_cert_no, guide_cert_img, address, email, back_url, status, pay_account_status, bank_account_status, face_verify_status, bank_account_url, qzt_account_no, qzt_merchant_no, qzt_response, callback_message, callback_at, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [out_request_no, register_name, legal_mobile, legal_name, encryptedIdCard, encryptedLicenseNo, enterprise_type||'3', split_role||'other', encryptedGuideCertNo, guide_cert_img, address, email, back_url, status||'PENDING', pay_account_status||'PENDING', bank_account_status||'PENDING', face_verify_status||'PENDING', bank_account_url, qzt_account_no, qzt_merchant_no, qztResponseStr, callback_message||null, callback_at||null, tenant_id || null]
  );
  return { id: result.lastID, ...merchant };
}

async function getMerchants() {
  return await allAsync(`SELECT * FROM merchants ORDER BY created_at DESC`);
}

async function getMerchantByOutRequestNo(out_request_no) {
  return await getAsync(`SELECT * FROM merchants WHERE out_request_no = ?`, [out_request_no]);
}

async function getMerchantById(id) {
  const idNum = parseInt(id);
  if (isNaN(idNum)) return null;
  return await getAsync(`SELECT * FROM merchants WHERE id = ?`, [idNum]);
}

async function getMerchantByQztAccountNo(qzt_account_no) {
  if (!qzt_account_no) return null;
  return await getAsync(`SELECT * FROM merchants WHERE qzt_account_no = ?`, [qzt_account_no]);
}

async function updateMerchantStatus(id, status, qztAccountNo) {
  const idNum = parseInt(id);
  if (isNaN(idNum)) return null;
  if (qztAccountNo) {
    await runAsync(`UPDATE merchants SET status=?, qzt_account_no=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, qztAccountNo, idNum]);
  } else {
    await runAsync(`UPDATE merchants SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, idNum]);
  }
  return await getMerchantById(idNum);
}

// ========== 银行卡 ==========
async function saveBankCard(card) {
  const { merchant_id, bank_code, bank_name, bank_card_no, bank_card_name, bank_type, bank_province, bank_city, bank_branch, status } = card;
  const encryptedCardNo = encrypt(bank_card_no);
  const result = await runAsync(
    `INSERT INTO bank_cards (merchant_id, bank_code, bank_name, bank_card_no, bank_card_name, bank_type, bank_province, bank_city, bank_branch, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [parseInt(merchant_id)||0, bank_code, bank_name, encryptedCardNo, bank_card_name, bank_type||'2', bank_province, bank_city, bank_branch, status||'ACTIVE']
  );
  return { id: result.lastID, ...card };
}

async function getBankCards(merchant_id) {
  let query = 'SELECT * FROM bank_cards WHERE status = "ACTIVE"';
  const params = [];
  if (merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(merchant_id)); }
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

async function deleteBankCard(id) {
  await runAsync(`UPDATE bank_cards SET status = 'DELETED' WHERE id = ?`, [parseInt(id)]);
  return true;
}

// ========== 账户 ==========
async function getAccountsByMerchantId(merchant_id) {
  return await allAsync(`SELECT * FROM accounts WHERE merchant_id = ?`, [parseInt(merchant_id)]);
}

// ========== 交易 ==========
async function saveTransaction(transaction) {
  const { merchant_id, out_request_no, transaction_type, amount, status, bank_card_no, remark, qzt_response } = transaction;
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';
  const encryptedCardNo = encrypt(bank_card_no);

  const existing = await getAsync(`SELECT id FROM transactions WHERE out_request_no = ?`, [out_request_no]);
  if (existing) {
    await runAsync(`UPDATE transactions SET status=?, qzt_response=?, updated_at=CURRENT_TIMESTAMP WHERE out_request_no=?`, [status||'PENDING', qztResponseStr, out_request_no]);
    return transaction;
  }

  const result = await runAsync(
    `INSERT INTO transactions (merchant_id, out_request_no, transaction_type, amount, status, bank_card_no, remark, qzt_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [parseInt(merchant_id)||0, out_request_no, transaction_type, Math.round(parseFloat(amount) * 100)||0, status||'PENDING', encryptedCardNo, remark, qztResponseStr]
  );
  return { id: result.lastID||0, ...transaction };
}

async function getTransactions(filters = {}) {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (filters.merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(filters.merchant_id)); }
  if (filters.type) { query += ' AND transaction_type = ?'; params.push(filters.type); }
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  query += ' ORDER BY created_at DESC';
  if (filters.limit) { query += ' LIMIT ?'; params.push(parseInt(filters.limit)); }
  return await allAsync(query, params);
}

// ========== 分账记录 ==========
async function saveSplitRecord(record) {
  const { merchant_id, out_request_no, order_no, amount, split_account_no, split_amount, status, qzt_response } = record;
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';

  const existing = await getAsync(`SELECT id FROM split_records WHERE out_request_no = ?`, [out_request_no]);
  if (existing) {
    await runAsync(`UPDATE split_records SET status=?, qzt_response=? WHERE out_request_no=?`, [status||'PENDING', qztResponseStr, out_request_no]);
    return record;
  }

  const result = await runAsync(
    `INSERT INTO split_records (merchant_id, out_request_no, order_no, amount, split_account_no, split_amount, status, qzt_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [parseInt(merchant_id)||0, out_request_no, order_no, Math.round(parseFloat(amount) * 100)||0, split_account_no, Math.round(parseFloat(split_amount) * 100)||0, status||'PENDING', qztResponseStr]
  );
  return { id: result.lastID||0, ...record };
}

async function getSplitRecords(filters = {}) {
  let query = 'SELECT * FROM split_records WHERE 1=1';
  const params = [];
  if (filters.merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(filters.merchant_id)); }
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

// ========== 旅行团 ==========
async function saveTourGroup(tour) {
  const { merchant_id, tour_no, tour_name, route_name, days, itinerary, start_date, end_date, people_count, guide_id, driver_id, shop_id, attractions, hotel_name, hotel_phone, hotel_address, total_amount, split_status, status, remark } = tour;

  const existing = await getAsync(`SELECT id FROM tour_groups WHERE tour_no = ?`, [tour_no]);
  if (existing) {
    await runAsync(
      `UPDATE tour_groups SET tour_name=?, route_name=?, days=?, itinerary=?, start_date=?, end_date=?, people_count=?, guide_id=?, driver_id=?, shop_id=?, attractions=?, hotel_name=?, hotel_phone=?, hotel_address=?, total_amount=?, split_status=?, status=?, remark=?, updated_at=CURRENT_TIMESTAMP WHERE tour_no=?`,
      [tour_name, route_name||'', parseInt(days)||1, itinerary||'', start_date, end_date, parseInt(people_count)||1, guide_id||null, driver_id||null, shop_id||null, attractions||'', hotel_name||'', hotel_phone||'', hotel_address||'', Math.round(parseFloat(total_amount) * 100)||0, split_status||'PENDING', status||'ACTIVE', remark||'', tour_no]
    );
    return { ...tour };
  }

  const result = await runAsync(
    `INSERT INTO tour_groups (merchant_id, tour_no, tour_name, route_name, days, itinerary, start_date, end_date, people_count, guide_id, driver_id, shop_id, attractions, hotel_name, hotel_phone, hotel_address, total_amount, split_status, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [parseInt(merchant_id)||0, tour_no, tour_name, route_name||'', parseInt(days)||1, itinerary||'', start_date, end_date, parseInt(people_count)||1, guide_id||null, driver_id||null, shop_id||null, attractions||'', hotel_name||'', hotel_phone||'', hotel_address||'', Math.round(parseFloat(total_amount) * 100)||0, split_status||'PENDING', status||'ACTIVE', remark||'']
  );
  return { id: result.lastID||0, ...tour };
}

async function getTourGroups(merchant_id) {
  let query = 'SELECT * FROM tour_groups WHERE status = "ACTIVE"';
  const params = [];
  if (merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(merchant_id)); }
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

async function getTourGroupById(id) {
  return await getAsync(`SELECT * FROM tour_groups WHERE id = ?`, [parseInt(id)]);
}

async function deleteTourGroup(id) {
  await runAsync(`UPDATE tour_groups SET status = 'DELETED' WHERE id = ?`, [parseInt(id)]);
  return true;
}

// ========== 团队成员 ==========
async function saveTourMember(member) {
  const { tour_id, merchant_id, role, split_ratio, split_amount, status } = member;
  const result = await runAsync(
    `INSERT INTO tour_members (tour_id, merchant_id, role, split_ratio, split_amount, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [parseInt(tour_id)||0, parseInt(merchant_id)||0, role, parseFloat(split_ratio)||0, Math.round(parseFloat(split_amount) * 100)||0, status||'PENDING']
  );
  return { id: result.lastID||0, ...member };
}

async function getTourMembers(tour_id) {
  return await allAsync(`SELECT * FROM tour_members WHERE tour_id = ?`, [parseInt(tour_id)]);
}

async function deleteTourMember(id) {
  await runAsync(`DELETE FROM tour_members WHERE id = ?`, [parseInt(id)]);
  return true;
}

// ========== 分账规则 ==========
async function saveSplitRule(rule) {
  const { merchant_id, rule_name, rule_type, default_rule, status } = rule;
  const result = await runAsync(
    `INSERT INTO split_rules (merchant_id, rule_name, rule_type, default_rule, status) VALUES (?, ?, ?, ?, ?)`,
    [parseInt(merchant_id)||0, rule_name, rule_type||'FIXED', default_rule?1:0, status||'ACTIVE']
  );
  return { id: result.lastID||0, ...rule };
}

async function getSplitRules(merchant_id) {
  let query = 'SELECT * FROM split_rules WHERE status = "ACTIVE"';
  const params = [];
  if (merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(merchant_id)); }
  query += ' ORDER BY default_rule DESC, created_at DESC';
  return await allAsync(query, params);
}

async function getSplitRuleById(id) {
  return await getAsync(`SELECT * FROM split_rules WHERE id = ?`, [parseInt(id)]);
}

async function deleteSplitRule(id) {
  await runAsync(`UPDATE split_rules SET status = 'DELETED' WHERE id = ?`, [parseInt(id)]);
  return true;
}

// ========== 分账规则明细 ==========
async function saveSplitRuleItem(item) {
  const { rule_id, target_merchant_id, split_ratio, split_amount } = item;
  const result = await runAsync(
    `INSERT INTO split_rule_items (rule_id, target_merchant_id, split_ratio, split_amount) VALUES (?, ?, ?, ?)`,
    [parseInt(rule_id)||0, parseInt(target_merchant_id)||0, parseFloat(split_ratio)||0, Math.round(parseFloat(split_amount) * 100)||0]
  );
  return { id: result.lastID||0, ...item };
}

async function getSplitRuleItems(rule_id) {
  return await allAsync(`SELECT * FROM split_rule_items WHERE rule_id = ?`, [parseInt(rule_id)]);
}

// ========== 通知 ==========
async function saveNotification(notification) {
  const { notification_type, out_request_no, content } = notification;
  const contentStr = content ? JSON.stringify(content) : '';
  const result = await runAsync(
    `INSERT INTO notifications (notification_type, out_request_no, content) VALUES (?, ?, ?)`,
    [notification_type, out_request_no, contentStr]
  );
  return { id: result.lastID||0, ...notification };
}

async function getNotifications(filters = {}) {
  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params = [];
  if (filters.type) { query += ' AND notification_type = ?'; params.push(filters.type); }
  if (filters.unprocessed) query += ' AND processed = 0';
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

async function getNotificationByOutRequestNo(out_request_no, notification_type) {
  if (!out_request_no) return null;
  let query = `SELECT * FROM notifications WHERE out_request_no = ?`;
  const params = [out_request_no];
  if (notification_type) { query += ` AND notification_type = ?`; params.push(notification_type); }
  query += ` ORDER BY created_at DESC LIMIT 1`;
  return await getAsync(query, params);
}

async function markNotificationProcessed(id) {
  await runAsync(`UPDATE notifications SET processed = 1 WHERE id = ?`, [parseInt(id)]);
}

// ========== 分账模板 ==========
async function saveSplitTemplate(template) {
  const { template_id, name, description, icon, items, creator_id, creator_type, is_system } = template;
  const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);

  const existing = await getAsync(`SELECT id FROM split_templates WHERE template_id = ?`, [template_id]);
  if (existing) {
    await runAsync(
      `UPDATE split_templates SET name=?, description=?, icon=?, items=?, updated_at=CURRENT_TIMESTAMP WHERE template_id=?`,
      [name, description||'', icon||'📋', itemsStr, template_id]
    );
  } else {
    await runAsync(
      `INSERT INTO split_templates (template_id, name, description, icon, items, creator_id, creator_type, is_system) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [template_id, name, description||'', icon||'📋', itemsStr, creator_id||'', creator_type||'merchant', is_system?1:0]
    );
  }
  return await getSplitTemplateById(template_id);
}

async function getSplitTemplates(creator_id = null) {
  let query = 'SELECT * FROM split_templates WHERE 1=1';
  const params = [];
  if (creator_id) { query += ' AND (creator_id = ? OR is_system = 1)'; params.push(creator_id); }
  query += ' ORDER BY is_system DESC, usage_count DESC, created_at DESC';
  return await allAsync(query, params);
}

async function getSplitTemplateById(template_id) {
  return await getAsync(`SELECT * FROM split_templates WHERE template_id = ?`, [template_id]);
}

async function deleteSplitTemplate(template_id) {
  await runAsync(`DELETE FROM split_templates WHERE template_id = ? AND is_system = 0`, [template_id]);
  return { success: true };
}

async function incrementTemplateUsage(template_id) {
  await runAsync(`UPDATE split_templates SET usage_count = usage_count + 1 WHERE template_id = ?`, [template_id]);
}

// ========== 对账 ==========
async function saveReconciliationTask(task) {
  const { task_no, task_type, date_range_start, date_range_end, created_by } = task;
  await runAsync(
    `INSERT INTO reconciliation_tasks (task_no, task_type, date_range_start, date_range_end, created_by) VALUES (?, ?, ?, ?, ?)`,
    [task_no, task_type, date_range_start, date_range_end, created_by||'']
  );
  return await getReconciliationTask(task_no);
}

async function getReconciliationTask(task_no) {
  return await getAsync(`SELECT * FROM reconciliation_tasks WHERE task_no = ?`, [task_no]);
}

async function getReconciliationTasks(filters = {}) {
  let query = 'SELECT * FROM reconciliation_tasks WHERE 1=1';
  const params = [];
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.task_type) { query += ' AND task_type = ?'; params.push(filters.task_type); }
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

async function updateReconciliationTask(task_no, updates) {
  const fields = [];
  const params = [];
  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.total_records !== undefined) { fields.push('total_records = ?'); params.push(updates.total_records); }
  if (updates.matched_records !== undefined) { fields.push('matched_records = ?'); params.push(updates.matched_records); }
  if (updates.unmatched_records !== undefined) { fields.push('unmatched_records = ?'); params.push(updates.unmatched_records); }
  if (updates.difference_amount !== undefined) { fields.push('difference_amount = ?'); params.push(updates.difference_amount); }
  if (updates.report_url) { fields.push('report_url = ?'); params.push(updates.report_url); }
  if (updates.completed_at) { fields.push('completed_at = ?'); params.push(updates.completed_at); }
  if (fields.length > 0) {
    await runAsync(`UPDATE reconciliation_tasks SET ${fields.join(', ')} WHERE task_no = ?`, [...params, task_no]);
  }
  return await getReconciliationTask(task_no);
}

async function saveReconciliationDetail(detail) {
  const { task_no, record_type, record_id, expected_amount, actual_amount, difference_amount, status, remark } = detail;
  await runAsync(
    `INSERT INTO reconciliation_details (task_no, record_type, record_id, expected_amount, actual_amount, difference_amount, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [task_no, record_type, record_id||'', expected_amount||0, actual_amount||0, difference_amount||0, status||'matched', remark||'']
  );
}

async function getReconciliationDetails(task_no) {
  return await allAsync(`SELECT * FROM reconciliation_details WHERE task_no = ?`, [task_no]);
}

async function saveReconciliationDifference(diff) {
  const { task_no, difference_type, severity, description, suggested_action } = diff;
  const result = await runAsync(
    `INSERT INTO reconciliation_differences (task_no, difference_type, severity, description, suggested_action) VALUES (?, ?, ?, ?, ?)`,
    [task_no, difference_type, severity||'medium', description||'', suggested_action||'']
  );
  return { id: result.lastID||0, ...diff };
}

async function getReconciliationDifferences(task_no) {
  return await allAsync(`SELECT * FROM reconciliation_differences WHERE task_no = ?`, [task_no]);
}

async function updateReconciliationDifference(id, updates) {
  const fields = [];
  const params = [];
  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.resolved_by) { fields.push('resolved_by = ?'); params.push(updates.resolved_by); }
  if (updates.resolved_at) { fields.push('resolved_at = ?'); params.push(updates.resolved_at); }
  if (fields.length > 0) {
    await runAsync(`UPDATE reconciliation_differences SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
  }
}

/**
 * 生成门店ID
 * 格式：LVGS + yyyyMMdd + 6位序号
 * 例如：LVGS20260426000001
 */
async function generateStoreId() {
  const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const prefix = 'LVGS' + today;
  const last = await getAsync(
    `SELECT store_id FROM stores WHERE store_id LIKE ? ORDER BY id DESC LIMIT 1`,
    [prefix + '%']
  );
  const seq = last ? String(parseInt(last.store_id.slice(-6)) + 1).padStart(6, '0') : '000001';
  return prefix + seq;
}

// ========== Tenant 相关（独立租户表）==========
async function getTenantById(id) {
  return await getAsync(`SELECT * FROM tenants WHERE id = ? AND status != 'DELETED'`, [parseInt(id)]);
}

async function getTenantByUsername(username) {
  return await getAsync(`SELECT * FROM tenants WHERE username = ? AND status != 'DELETED'`, [username]);
}

async function getTenants(filters = {}) {
  let query = 'SELECT * FROM tenants WHERE status != "DELETED"';
  const params = [];
  if (filters.status && filters.status !== 'ALL') { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.keyword) {
    query += ' AND (tenant_name LIKE ? OR username LIKE ?)';
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

async function getTenantOptions() {
  return await allAsync(`SELECT id, tenant_name FROM tenants WHERE status = 'ACTIVE' ORDER BY tenant_name ASC`);
}

async function saveTenant(tenant) {
  const { id, tenant_name, username, password_hash, qzt_account_no, contact_name, contact_mobile, status } = tenant;
  if (id) {
    const fields = [];
    const vals = [];
    if (tenant_name !== undefined) { fields.push('tenant_name = ?'); vals.push(tenant_name); }
    if (username !== undefined) { fields.push('username = ?'); vals.push(username); }
    if (password_hash !== undefined) { fields.push('password_hash = ?'); vals.push(password_hash); }
    if (qzt_account_no !== undefined) { fields.push('qzt_account_no = ?'); vals.push(qzt_account_no); }
    if (contact_name !== undefined) { fields.push('contact_name = ?'); vals.push(contact_name); }
    if (contact_mobile !== undefined) { fields.push('contact_mobile = ?'); vals.push(contact_mobile); }
    if (status !== undefined) { fields.push('status = ?'); vals.push(status); }
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      await runAsync(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`, [...vals, parseInt(id)]);
    }
    return await getTenantById(id);
  }
  const result = await runAsync(
    `INSERT INTO tenants (tenant_name, username, password_hash, qzt_account_no, contact_name, contact_mobile, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenant_name, username, password_hash, qzt_account_no || null, contact_name || null, contact_mobile || null, status || 'ACTIVE']
  );
  return { id: result.lastID, tenant_name, username, status: status || 'ACTIVE' };
}

async function deleteTenant(id) {
  await runAsync(`UPDATE tenants SET status = 'DELETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [parseInt(id)]);
  return { success: true };
}

async function getTenantMerchants(tenant_id) {
  return await allAsync(
    `SELECT * FROM merchants WHERE tenant_id = ? ORDER BY created_at DESC`,
    [parseInt(tenant_id)]
  );
}

async function getTenantMerchantCount(tenant_id) {
  const row = await getAsync(
    `SELECT COUNT(*) as count FROM merchants WHERE tenant_id = ? AND status != 'DELETED'`,
    [parseInt(tenant_id)]
  );
  return row ? row.count : 0;
}

// 商户查询（保留原 merchants 表查询，供管理员查看商户列表）
async function getMerchantsByTenant(tenant_id, filters = {}) {
  let query = 'SELECT * FROM merchants WHERE tenant_id = ?';
  const params = [parseInt(tenant_id)];
  if (filters.split_role) { query += ' AND split_role = ?'; params.push(filters.split_role); }
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.keyword) {
    query += ' AND (register_name LIKE ? OR legal_mobile LIKE ?)';
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

async function getGuides(filters = {}) {
  let query = 'SELECT * FROM merchants WHERE split_role = "guide" AND status != "DELETED"';
  const params = [];
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.keyword) {
    query += ' AND (register_name LIKE ? OR legal_mobile LIKE ?)';
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

async function updateTenantStatus(id, status) {
  const idNum = parseInt(id);
  if (isNaN(idNum)) return null;
  await runAsync(`UPDATE tenants SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, idNum]);
  return await getTenantById(idNum);
}

async function getMerchantFeatures(merchant_id) {
  return await getAsync(`SELECT * FROM merchant_features WHERE merchant_id = ?`, [parseInt(merchant_id)]);
}

const toBool = v => v === 'false' ? false : !!v;

async function saveMerchantFeatures(features) {
  const { merchant_id, enable_split, enable_withdraw, enable_reconciliation, enable_store_management, max_stores } = features;
  const existing = await getMerchantFeatures(merchant_id);
  if (existing) {
    await runAsync(
      `UPDATE merchant_features SET enable_split=?, enable_withdraw=?, enable_reconciliation=?, enable_store_management=?, max_stores=?, updated_at=CURRENT_TIMESTAMP WHERE merchant_id=?`,
      [toBool(enable_split) ? 1 : 0, toBool(enable_withdraw) ? 1 : 0, toBool(enable_reconciliation) ? 1 : 0, toBool(enable_store_management) ? 1 : 0, max_stores || 10, parseInt(merchant_id)]
    );
  } else {
    await runAsync(
      `INSERT INTO merchant_features (merchant_id, enable_split, enable_withdraw, enable_reconciliation, enable_store_management, max_stores) VALUES (?, ?, ?, ?, ?, ?)`,
      [parseInt(merchant_id), toBool(enable_split) ? 1 : 0, toBool(enable_withdraw) ? 1 : 0, toBool(enable_reconciliation) ? 1 : 0, toBool(enable_store_management) ? 1 : 0, max_stores || 10]
    );
  }
  return await getMerchantFeatures(merchant_id);
}

// ========== AI 模型配置 ==========
async function getAIModels(filters = {}) {
  let query = 'SELECT * FROM ai_models WHERE 1=1';
  const params = [];
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.model_type) { query += ' AND model_type = ?'; params.push(filters.model_type); }
  if (filters.keyword) {
    query += ' AND (name LIKE ? OR model_id LIKE ?)';
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  query += ' ORDER BY created_at DESC';
  const rows = await allAsync(query, params);
  return rows.map(r => ({
    ...r,
    api_key: r.api_key ? '••••••••' + decrypt(r.api_key).slice(-4) : ''
  }));
}

async function getAIModelById(id) {
  const row = await getAsync(`SELECT * FROM ai_models WHERE id = ?`, [parseInt(id)]);
  if (!row) return null;
  return { ...row, api_key: row.api_key ? decrypt(row.api_key) : '' };
}

async function saveAIModel(model) {
  const { id, model_id, name, api_endpoint, api_key, model_type, status } = model;
  const encryptedKey = api_key ? encrypt(api_key) : undefined;

  if (id) {
    const fields = [];
    const vals = [];
    if (model_id !== undefined) { fields.push('model_id = ?'); vals.push(model_id); }
    if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
    if (api_endpoint !== undefined) { fields.push('api_endpoint = ?'); vals.push(api_endpoint); }
    if (encryptedKey !== undefined) { fields.push('api_key = ?'); vals.push(encryptedKey); }
    if (model_type !== undefined) { fields.push('model_type = ?'); vals.push(model_type); }
    if (status !== undefined) { fields.push('status = ?'); vals.push(status); }
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      await runAsync(`UPDATE ai_models SET ${fields.join(', ')} WHERE id = ?`, [...vals, parseInt(id)]);
    }
    return await getAIModelById(id);
  }

  const result = await runAsync(
    `INSERT INTO ai_models (model_id, name, api_endpoint, api_key, model_type, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [model_id, name, api_endpoint, encryptedKey || '', model_type || 'chat', status || 'ACTIVE']
  );
  return { id: result.lastID, model_id, name, api_endpoint, model_type: model_type || 'chat', status: status || 'ACTIVE' };
}

async function deleteAIModel(id) {
  await runAsync(`DELETE FROM ai_models WHERE id = ?`, [parseInt(id)]);
  return { success: true };
}

module.exports = {
  initDatabase,
  closeDatabase,
  // Promise 化数据库操作（供迁移脚本使用）
  runAsync,
  getAsync,
  allAsync,
  // 用户
  createUser,
  getUserByUsername,
  // 商户
  saveMerchant,
  getMerchants,
  getMerchantByOutRequestNo,
  getMerchantByQztAccountNo,
  getMerchantById,
  updateMerchantStatus,
  // 银行卡
  saveBankCard,
  getBankCards,
  deleteBankCard,
  // 账户
  getAccountsByMerchantId,
  // 交易
  saveTransaction,
  getTransactions,
  // 分账记录
  saveSplitRecord,
  getSplitRecords,
  // 旅行团
  saveTourGroup,
  getTourGroups,
  getTourGroupById,
  deleteTourGroup,
  // 团队成员
  saveTourMember,
  getTourMembers,
  deleteTourMember,
  // 分账规则
  saveSplitRule,
  getSplitRules,
  getSplitRuleById,
  deleteSplitRule,
  // 分账规则明细
  saveSplitRuleItem,
  getSplitRuleItems,
  // 通知
  saveNotification,
  getNotifications,
  getNotificationByOutRequestNo,
  markNotificationProcessed,
  // 分账模板
  saveSplitTemplate,
  getSplitTemplates,
  getSplitTemplateById,
  deleteSplitTemplate,
  incrementTemplateUsage,
  // 对账
  saveReconciliationTask,
  getReconciliationTask,
  getReconciliationTasks,
  updateReconciliationTask,
  saveReconciliationDetail,
  getReconciliationDetails,
  saveReconciliationDifference,
  getReconciliationDifferences,
  updateReconciliationDifference,
  // 门店
  getStores, getStoreById, getStoreByStoreId, saveStore, deleteStore,
  // 门店终端
  getStoreTerminals, saveStoreTerminal, deleteStoreTerminal,
  // 旅行团门店关联
  getTourGroupStores,
  // 订单
  getOrders, getOrderById, getOrderByOrderNo, getOrdersByTourGroup, saveOrder, updateOrderStatus,
  // 生成门店ID
  generateStoreId,
  // 订单查询
  getOrdersPay, countOrdersPay,
  // 支付流水
  getPaymentFlowsByOrderNo,
  // 订单状态更新
  updateOrderSplitStatus,
  // 门店旅行团关联
  getTourGroupStoresByStoreId,

  // Tenant
  getTenantById,
  getTenantByUsername,
  getTenants,
  getTenantOptions,
  saveTenant,
  deleteTenant,
  getTenantMerchants,
  getTenantMerchantCount,
  getMerchantsByTenant,
  getGuides,
  updateTenantStatus,
  getMerchantFeatures,
  saveMerchantFeatures,
  // AI 模型
  getAIModels,
  getAIModelById,
  saveAIModel,
  deleteAIModel,
};

// ========== 门店 ==========
async function getStores() {
  return await allAsync(`SELECT * FROM stores ORDER BY created_at DESC`);
}

async function getStoreById(id) {
  return await getAsync(`SELECT * FROM stores WHERE id = ?`, [id]);
}

async function getStoreByStoreId(store_id) {
  return await getAsync(`SELECT * FROM stores WHERE store_id = ?`, [store_id]);
}

async function saveStore(store) {
  if (store.id) {
    await runAsync(`UPDATE stores SET store_name=?, account_no=?, merchant_id=?, tour_group_id=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [store.store_name, store.account_no, store.merchant_id, store.tour_group_id, store.status || 'ACTIVE', store.id]);
    return store.id;
  } else {
    const store_id = await generateStoreId();
    const result = await runAsync(`INSERT INTO stores (store_id, store_name, account_no, merchant_id, tour_group_id, status) VALUES (?, ?, ?, ?, ?, ?)`, [store_id, store.store_name, store.account_no, store.merchant_id, store.tour_group_id, store.status || 'ACTIVE']);
    return result.lastInsertRowid;
  }
}

async function deleteStore(id) {
  await runAsync('DELETE FROM stores WHERE id = ?', [id]);
}

// ========== 门店终端 ==========
async function getStoreTerminals(store_id) {
  if (store_id) {
    return await allAsync(`SELECT * FROM store_terminals WHERE store_id = ? ORDER BY created_at DESC`, [store_id]);
  }
  return await allAsync(`SELECT * FROM store_terminals ORDER BY created_at DESC`);
}

async function saveStoreTerminal(terminal) {
  if (terminal.id) {
    await runAsync(`UPDATE store_terminals SET merchant_no=?, terminal_no=?, merchant_name=?, bind_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [terminal.merchant_no, terminal.terminal_no, terminal.merchant_name, terminal.bind_status || 'BOUND', terminal.id]);
    return terminal.id;
  } else {
    const result = await runAsync(`INSERT INTO store_terminals (store_id, merchant_no, terminal_no, merchant_name, bind_status) VALUES (?, ?, ?, ?, ?)`, [terminal.store_id, terminal.merchant_no, terminal.terminal_no, terminal.merchant_name, terminal.bind_status || 'BOUND']);
    return result.lastInsertRowid;
  }
}

async function deleteStoreTerminal(id) {
  await runAsync('DELETE FROM store_terminals WHERE id = ?', [id]);
}

// ========== 旅行团门店关联 ==========
async function getTourGroupStores() {
  return await allAsync(`SELECT * FROM tour_group_stores`);
}

// ========== 订单 ==========
async function getOrders(limit = 100, offset = 0) {
  return await allAsync(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
}

async function getOrderById(id) {
  return await getAsync(`SELECT * FROM orders WHERE id = ?`, [id]);
}

async function getOrderByOrderNo(order_no) {
  return await getAsync(`SELECT * FROM orders WHERE order_no = ?`, [order_no]);
}

async function getOrdersByTourGroup(tour_group_id) {
  return await allAsync(`SELECT * FROM orders WHERE tour_group_id = ? ORDER BY created_at DESC`, [tour_group_id]);
}

async function saveOrder(order) {
  if (order.id) {
    await runAsync(`UPDATE orders SET store_id=?, tour_group_id=?, merchant_id=?, amount=?, pay_method=?, pay_status=?, refund_status=?, split_status=?, split_rule_id=?, remark=?, raw_notify=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [order.store_id, order.tour_group_id, order.merchant_id, order.amount, order.pay_method, order.pay_status || 'PENDING', order.refund_status || 'NONE', order.split_status || 'PENDING', order.split_rule_id, order.remark, order.raw_notify, order.id]);
    return order.id;
  } else {
    const order_no = order.order_no || require("./qzt").generateTransNo();
    const result = await runAsync(`INSERT INTO orders (order_no, order_type, store_id, tour_group_id, merchant_id, amount, pay_method, pay_status, refund_status, split_status, split_rule_id, remark, raw_notify) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [order_no, order.order_type || 'PAY', order.store_id, order.tour_group_id, order.merchant_id, order.amount, order.pay_method, order.pay_status || 'PENDING', order.refund_status || 'NONE', order.split_status || 'PENDING', order.split_rule_id, order.remark, order.raw_notify]);
    return result.lastInsertRowid;
  }
}

async function updateOrderStatus(id, status, split_status) {
  await runAsync('UPDATE orders SET status=?, split_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, split_status, id]);
}
async function getOrdersPay(limit, offset, filters) {
  let sql = 'SELECT * FROM orders WHERE order_type = "PAY"';
  let params = [];
  if (filters?.order_no) { sql += ' AND order_no LIKE ?'; params.push('%' + filters.order_no + '%'); }
  if (filters?.store_id) { sql += ' AND store_id = ?'; params.push(filters.store_id); }
  if (filters?.pay_status) { sql += ' AND pay_status = ?'; params.push(filters.pay_status); }
  if (filters?.split_status) { sql += ' AND split_status = ?'; params.push(filters.split_status); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return await allAsync(sql, params);
}

async function countOrdersPay(filters) {
  let sql = 'SELECT COUNT(*) as cnt FROM orders WHERE order_type = "PAY"';
  let params = [];
  if (filters?.order_no) { sql += ' AND order_no LIKE ?'; params.push('%' + filters.order_no + '%'); }
  if (filters?.store_id) { sql += ' AND store_id = ?'; params.push(filters.store_id); }
  if (filters?.pay_status) { sql += ' AND pay_status = ?'; params.push(filters.pay_status); }
  if (filters?.split_status) { sql += ' AND split_status = ?'; params.push(filters.split_status); }
  const row = await getAsync(sql, params);
  return row ? row.cnt : 0;
}

async function getPaymentFlowsByOrderNo(orderNo) {
  return await allAsync('SELECT * FROM order_payment_flows WHERE order_no = ? ORDER BY created_at', [orderNo]);
}

async function updateOrderSplitStatus(orderNo, splitStatus) {
  await runAsync('UPDATE orders SET split_status=?, updated_at=CURRENT_TIMESTAMP WHERE order_no=?', [splitStatus, orderNo]);
}

async function getTourGroupStoresByStoreId(storeId) {
  return await allAsync(`SELECT tg.* FROM tour_groups tg JOIN tour_group_stores tgs ON tg.id = tgs.tour_group_id WHERE tgs.store_id = ? AND tg.status = 'ACTIVE'`, [storeId]);
}


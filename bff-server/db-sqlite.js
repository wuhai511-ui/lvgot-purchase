/**
 * db-sqlite.js - SQLite 数据库层
 *
 * 安全修复：
 * 1. 所有 SQL 使用参数化查询（? 占位符），彻底杜绝注入
 * 2. 敏感字段（身份证、银行卡号等）使用 AES-256-GCM 加密存储
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ========== 加密配置 ==========
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 64 hex chars = 32 bytes
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

/**
 * AES-256-GCM 加密
 * 返回格式: iv(hex):authTag(hex):ciphertext(hex)
 */
function encrypt(text) {
  if (!text) return text;
  if (!ENCRYPTION_KEY) {
    console.warn('[DB-SECURITY] ENCRYPTION_KEY 未配置，敏感字段将以明文存储（生产环境必须配置）');
    return text;
  }
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

/**
 * AES-256-GCM 解密
 */
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
let SQL = null;

async function initDatabase() {
  if (db) return db;
  SQL = await initSqlJs();
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('SQLite 数据库已加载:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('SQLite 数据库已创建:', DB_PATH);
  }
  createTables();
  saveDatabase();
  return db;
}

function createTables() {
  db.run("CREATE TABLE IF NOT EXISTS merchants (id INTEGER PRIMARY KEY AUTOINCREMENT, out_request_no TEXT UNIQUE NOT NULL, register_name TEXT, legal_mobile TEXT, legal_name TEXT, legal_id_card TEXT, license_no TEXT, enterprise_type TEXT DEFAULT '3', split_role TEXT DEFAULT 'other', guide_cert_no TEXT, guide_cert_img TEXT, address TEXT, email TEXT, back_url TEXT, status TEXT DEFAULT 'PENDING', qzt_account_no TEXT, qzt_merchant_no TEXT, qzt_response TEXT, callback_message TEXT, callback_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_id INTEGER NOT NULL, account_no TEXT, balance INTEGER DEFAULT 0, frozen_balance INTEGER DEFAULT 0, status TEXT DEFAULT 'ACTIVE', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS bank_cards (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_id INTEGER NOT NULL, bank_code TEXT, bank_name TEXT, bank_card_no TEXT, bank_card_name TEXT, bank_type TEXT DEFAULT '2', bank_province TEXT, bank_city TEXT, bank_branch TEXT, status TEXT DEFAULT 'ACTIVE', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_id INTEGER, out_request_no TEXT UNIQUE, transaction_type TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT DEFAULT 'PENDING', bank_card_no TEXT, remark TEXT, qzt_response TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS split_records (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_id INTEGER, out_request_no TEXT UNIQUE, order_no TEXT, amount INTEGER NOT NULL, split_account_no TEXT, split_amount INTEGER, status TEXT DEFAULT 'PENDING', qzt_response TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, notification_type TEXT NOT NULL, out_request_no TEXT, content TEXT, processed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS tour_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_id INTEGER NOT NULL, tour_no TEXT UNIQUE NOT NULL, tour_name TEXT NOT NULL, route_name TEXT, days INTEGER DEFAULT 1, itinerary TEXT, start_date DATE, end_date DATE, people_count INTEGER DEFAULT 1, guide_id INTEGER, driver_id INTEGER, shop_id INTEGER, attractions TEXT, hotel_name TEXT, hotel_phone TEXT, hotel_address TEXT, total_amount INTEGER DEFAULT 0, split_status TEXT DEFAULT 'PENDING', status TEXT DEFAULT 'ACTIVE', remark TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS tour_members (id INTEGER PRIMARY KEY AUTOINCREMENT, tour_id INTEGER NOT NULL, merchant_id INTEGER NOT NULL, role TEXT NOT NULL, split_ratio REAL DEFAULT 0, split_amount INTEGER DEFAULT 0, status TEXT DEFAULT 'PENDING', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS split_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_id INTEGER NOT NULL, rule_name TEXT NOT NULL, rule_type TEXT DEFAULT 'FIXED', default_rule INTEGER DEFAULT 0, status TEXT DEFAULT 'ACTIVE', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS split_rule_items (id INTEGER PRIMARY KEY AUTOINCREMENT, rule_id INTEGER NOT NULL, target_merchant_id INTEGER NOT NULL, split_ratio REAL DEFAULT 0, split_amount INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS split_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, template_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT, icon TEXT DEFAULT '📋', items TEXT NOT NULL, creator_id TEXT, creator_type TEXT DEFAULT 'merchant', is_system INTEGER DEFAULT 0, usage_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS reconciliation_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_no TEXT UNIQUE NOT NULL, task_type TEXT NOT NULL, status TEXT DEFAULT 'pending', date_range_start DATE, date_range_end DATE, total_records INTEGER DEFAULT 0, matched_records INTEGER DEFAULT 0, unmatched_records INTEGER DEFAULT 0, difference_amount INTEGER DEFAULT 0, report_url TEXT, created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, completed_at DATETIME)");
  db.run("CREATE TABLE IF NOT EXISTS reconciliation_details (id INTEGER PRIMARY KEY AUTOINCREMENT, task_no TEXT NOT NULL, record_type TEXT NOT NULL, record_id TEXT, expected_amount INTEGER, actual_amount INTEGER, difference_amount INTEGER, status TEXT, remark TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS reconciliation_differences (id INTEGER PRIMARY KEY AUTOINCREMENT, task_no TEXT NOT NULL, difference_type TEXT NOT NULL, severity TEXT DEFAULT 'medium', description TEXT, suggested_action TEXT, status TEXT DEFAULT 'pending', resolved_by TEXT, resolved_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'user', merchant_id INTEGER, status TEXT DEFAULT 'ACTIVE', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS store_terminals (id INTEGER PRIMARY KEY AUTOINCREMENT, store_id INTEGER NOT NULL, merchant_no TEXT NOT NULL, terminal_no TEXT NOT NULL, account_no TEXT, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS trade_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT UNIQUE NOT NULL, out_order_no TEXT, payer_account_no TEXT NOT NULL, payer_name TEXT, total_amount INTEGER NOT NULL DEFAULT 0, currency TEXT DEFAULT 'CNY', status TEXT DEFAULT 'PENDING', create_time DATETIME DEFAULT CURRENT_TIMESTAMP, update_time DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS trade_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, payment_seq_no TEXT UNIQUE, payment_type TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, status TEXT DEFAULT 'PENDING', create_time DATETIME DEFAULT CURRENT_TIMESTAMP)");
  db.run("CREATE TABLE IF NOT EXISTS trade_splits (id INTEGER PRIMARY KEY AUTOINCREMENT, payment_id INTEGER NOT NULL, split_seq_no TEXT UNIQUE, receiver_account_no TEXT NOT NULL, receiver_name TEXT, amount INTEGER NOT NULL DEFAULT 0, status TEXT DEFAULT 'PENDING', create_time DATETIME DEFAULT CURRENT_TIMESTAMP)");
  console.log('数据表创建完成');
}

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function closeDatabase() {
  if (db) { saveDatabase(); db.close(); db = null; console.log('数据库已关闭'); }
}

function _rowToObj(columns, row) {
  const obj = {};
  columns.forEach((col, i) => {
    let value = row[i];
    if (col === 'qzt_response' && value) { try { value = JSON.parse(value); } catch(e) {} }
    if (col === 'bank_card_no') value = decrypt(value);
    if (col === 'items' && value) { try { value = JSON.parse(value); } catch(e) {} }
    obj[col] = value;
  });
  return obj;
}

// ========== 用户 ==========
function createUser({ username, password_hash, role, merchant_id }) {
  db.run(`INSERT INTO users (username, password_hash, role, merchant_id) VALUES (?, ?, ?, ?)`, [username, password_hash, role || 'user', merchant_id || null]);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], username, role, merchant_id };
}

function getUserByUsername(username) {
  const result = db.exec(`SELECT * FROM users WHERE username = ?`, [username]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

// ========== 商户 ==========
function saveMerchant(merchant) {
  const { out_request_no, register_name, legal_mobile, legal_name, legal_id_card, license_no, enterprise_type, split_role, guide_cert_no, guide_cert_img, address, email, back_url, status, qzt_account_no, qzt_merchant_no, qzt_response, callback_message, callback_at } = merchant;
  const encryptedIdCard = encrypt(legal_id_card);
  const encryptedLicenseNo = encrypt(license_no);
  const encryptedGuideCertNo = encrypt(guide_cert_no);
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';
  const existing = getMerchantByOutRequestNo(out_request_no);
  if (existing) {
    db.run(`UPDATE merchants SET register_name=?, legal_mobile=?, legal_name=?, legal_id_card=?, license_no=?, enterprise_type=?, split_role=?, guide_cert_no=?, guide_cert_img=?, address=?, email=?, back_url=?, status=?, qzt_account_no=?, qzt_merchant_no=?, qzt_response=?, callback_message=?, callback_at=?, updated_at=CURRENT_TIMESTAMP WHERE out_request_no=?`, [register_name, legal_mobile, legal_name, encryptedIdCard, encryptedLicenseNo, enterprise_type||'3', split_role||'other', encryptedGuideCertNo, guide_cert_img, address, email, back_url, status||'PENDING', qzt_account_no, qzt_merchant_no, qztResponseStr, callback_message, callback_at, out_request_no]);
    saveDatabase();
    return { ...existing, ...merchant, id: existing.id };
  }
  db.run(`INSERT INTO merchants (out_request_no, register_name, legal_mobile, legal_name, legal_id_card, license_no, enterprise_type, split_role, guide_cert_no, guide_cert_img, address, email, back_url, status, qzt_account_no, qzt_merchant_no, qzt_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [out_request_no, register_name, legal_mobile, legal_name, encryptedIdCard, encryptedLicenseNo, enterprise_type||'3', split_role||'other', encryptedGuideCertNo, guide_cert_img, address, email, back_url, status||'PENDING', qzt_account_no, qzt_merchant_no, qztResponseStr]);
  saveDatabase();
  const r = db.exec('SELECT MAX(id) as id FROM merchants');
  return { id: r[0]?.values[0]?.[0]||0, ...merchant };
}

function getMerchants() {
  const result = db.exec('SELECT * FROM merchants ORDER BY created_at DESC');
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getMerchantByOutRequestNo(out_request_no) {
  const result = db.exec(`SELECT * FROM merchants WHERE out_request_no = ?`, [out_request_no]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function getMerchantById(id) {
  const idNum = parseInt(id);
  if (isNaN(idNum)) return null;
  const result = db.exec(`SELECT * FROM merchants WHERE id = ?`, [idNum]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function updateMerchantStatus(id, status, qztAccountNo) {
  const idNum = parseInt(id);
  if (isNaN(idNum)) return null;
  if (qztAccountNo) {
    db.run(`UPDATE merchants SET status=?, qzt_account_no=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, qztAccountNo, idNum]);
  } else {
    db.run(`UPDATE merchants SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, idNum]);
  }
  saveDatabase();
  return getMerchantById(idNum);
}

// ========== 银行卡 ==========
function saveBankCard(card) {
  const { merchant_id, bank_code, bank_name, bank_card_no, bank_card_name, bank_type, bank_province, bank_city, bank_branch, status } = card;
  const encryptedCardNo = encrypt(bank_card_no);
  db.run(`INSERT INTO bank_cards (merchant_id, bank_code, bank_name, bank_card_no, bank_card_name, bank_type, bank_province, bank_city, bank_branch, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [parseInt(merchant_id)||0, bank_code, bank_name, encryptedCardNo, bank_card_name, bank_type||'2', bank_province, bank_city, bank_branch, status||'ACTIVE']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...card };
}

function getBankCards(merchant_id) {
  let query = 'SELECT * FROM bank_cards WHERE status = "ACTIVE"';
  const params = [];
  if (merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(merchant_id)); }
  query += ' ORDER BY created_at DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function deleteBankCard(id) {
  db.run(`UPDATE bank_cards SET status = 'DELETED' WHERE id = ?`, [parseInt(id)]);
  saveDatabase(); return true;
}

// ========== 账户 ==========
function getAccountsByMerchantId(merchant_id) {
  const result = db.exec(`SELECT * FROM accounts WHERE merchant_id = ?`, [parseInt(merchant_id)]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

// ========== 交易 ==========
function saveTransaction(transaction) {
  const { merchant_id, out_request_no, transaction_type, amount, status, bank_card_no, remark, qzt_response } = transaction;
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';
  const encryptedCardNo = encrypt(bank_card_no);
  const existing = db.exec(`SELECT id FROM transactions WHERE out_request_no = ?`, [out_request_no]);
  if (existing.length && existing[0].values.length) {
    db.run(`UPDATE transactions SET status=?, qzt_response=?, updated_at=CURRENT_TIMESTAMP WHERE out_request_no=?`, [status||'PENDING', qztResponseStr, out_request_no]);
    saveDatabase(); return transaction;
  }
  db.run(`INSERT INTO transactions (merchant_id, out_request_no, transaction_type, amount, status, bank_card_no, remark, qzt_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [parseInt(merchant_id)||0, out_request_no, transaction_type, Math.round(parseFloat(amount) * 100)||0, status||'PENDING', encryptedCardNo, remark, qztResponseStr]);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...transaction };
}

function getTransactions(filters = {}) {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (filters.merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(filters.merchant_id)); }
  if (filters.type) { query += ' AND transaction_type = ?'; params.push(filters.type); }
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  query += ' ORDER BY created_at DESC';
  if (filters.limit) { query += ' LIMIT ?'; params.push(parseInt(filters.limit)); }
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

// ========== 分账记录 ==========
function saveSplitRecord(record) {
  const { merchant_id, out_request_no, order_no, amount, split_account_no, split_amount, status, qzt_response } = record;
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';
  const existing = db.exec(`SELECT id FROM split_records WHERE out_request_no = ?`, [out_request_no]);
  if (existing.length && existing[0].values.length) {
    db.run(`UPDATE split_records SET status=?, qzt_response=? WHERE out_request_no=?`, [status||'PENDING', qztResponseStr, out_request_no]);
    saveDatabase(); return record;
  }
  db.run(`INSERT INTO split_records (merchant_id, out_request_no, order_no, amount, split_account_no, split_amount, status, qzt_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [parseInt(merchant_id)||0, out_request_no, order_no, Math.round(parseFloat(amount) * 100)||0, split_account_no, Math.round(parseFloat(split_amount) * 100)||0, status||'PENDING', qztResponseStr]);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...record };
}

function getSplitRecords(filters = {}) {
  let query = 'SELECT * FROM split_records WHERE 1=1';
  const params = [];
  if (filters.merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(filters.merchant_id)); }
  query += ' ORDER BY created_at DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

// ========== 旅行团 ==========
function saveTourGroup(tour) {
  const { merchant_id, tour_no, tour_name, route_name, days, itinerary, start_date, end_date, people_count, guide_id, driver_id, shop_id, attractions, hotel_name, hotel_phone, hotel_address, total_amount, split_status, status, remark } = tour;
  const existing = db.exec(`SELECT id FROM tour_groups WHERE tour_no = ?`, [tour_no]);
  if (existing.length && existing[0].values.length) {
    db.run(`UPDATE tour_groups SET tour_name=?, route_name=?, days=?, itinerary=?, start_date=?, end_date=?, people_count=?, guide_id=?, driver_id=?, shop_id=?, attractions=?, hotel_name=?, hotel_phone=?, hotel_address=?, total_amount=?, split_status=?, status=?, remark=?, updated_at=CURRENT_TIMESTAMP WHERE tour_no=?`, [tour_name, route_name||'', parseInt(days)||1, itinerary||'', start_date, end_date, parseInt(people_count)||1, guide_id||null, driver_id||null, shop_id||null, attractions||'', hotel_name||'', hotel_phone||'', hotel_address||'', Math.round(parseFloat(total_amount) * 100)||0, split_status||'PENDING', status||'ACTIVE', remark||'', tour_no]);
    saveDatabase(); return { ...tour };
  }
  db.run(`INSERT INTO tour_groups (merchant_id, tour_no, tour_name, route_name, days, itinerary, start_date, end_date, people_count, guide_id, driver_id, shop_id, attractions, hotel_name, hotel_phone, hotel_address, total_amount, split_status, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [parseInt(merchant_id)||0, tour_no, tour_name, route_name||'', parseInt(days)||1, itinerary||'', start_date, end_date, parseInt(people_count)||1, guide_id||null, driver_id||null, shop_id||null, attractions||'', hotel_name||'', hotel_phone||'', hotel_address||'', Math.round(parseFloat(total_amount) * 100)||0, split_status||'PENDING', status||'ACTIVE', remark||'']);
  saveDatabase();
  const r = db.exec('SELECT MAX(id) as id FROM tour_groups');
  return { id: r[0]?.values[0]?.[0]||0, ...tour };
}

function getTourGroups(merchant_id) {
  let query = 'SELECT * FROM tour_groups WHERE status = "ACTIVE"';
  const params = [];
  if (merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(merchant_id)); }
  query += ' ORDER BY created_at DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getTourGroupById(id) {
  const result = db.exec(`SELECT * FROM tour_groups WHERE id = ?`, [parseInt(id)]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function deleteTourGroup(id) {
  db.run(`UPDATE tour_groups SET status = 'DELETED' WHERE id = ?`, [parseInt(id)]);
  saveDatabase(); return true;
}

// ========== 团队成员 ==========
function saveTourMember(member) {
  const { tour_id, merchant_id, role, split_ratio, split_amount, status } = member;
  db.run(`INSERT INTO tour_members (tour_id, merchant_id, role, split_ratio, split_amount, status) VALUES (?, ?, ?, ?, ?, ?)`, [parseInt(tour_id)||0, parseInt(merchant_id)||0, role, parseFloat(split_ratio)||0, Math.round(parseFloat(split_amount) * 100)||0, status||'PENDING']);
  saveDatabase();
  const r = db.exec('SELECT MAX(id) as id FROM tour_members');
  return { id: r[0]?.values[0]?.[0], ...member };
}

function getTourMembers(tour_id) {
  const result = db.exec(`SELECT * FROM tour_members WHERE tour_id = ?`, [parseInt(tour_id)]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function deleteTourMember(id) {
  db.run(`DELETE FROM tour_members WHERE id = ?`, [parseInt(id)]);
  saveDatabase(); return true;
}

// ========== 分账规则 ==========
function saveSplitRule(rule) {
  const { merchant_id, rule_name, rule_type, default_rule, status } = rule;
  db.run(`INSERT INTO split_rules (merchant_id, rule_name, rule_type, default_rule, status) VALUES (?, ?, ?, ?, ?)`, [parseInt(merchant_id)||0, rule_name, rule_type||'FIXED', default_rule?1:0, status||'ACTIVE']);
  saveDatabase();
  const r = db.exec('SELECT MAX(id) as id FROM split_rules');
  return { id: r[0]?.values[0]?.[0], ...rule };
}

function getSplitRules(merchant_id) {
  let query = 'SELECT * FROM split_rules WHERE status = "ACTIVE"';
  const params = [];
  if (merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(merchant_id)); }
  query += ' ORDER BY default_rule DESC, created_at DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getSplitRuleById(id) {
  const result = db.exec(`SELECT * FROM split_rules WHERE id = ?`, [parseInt(id)]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function deleteSplitRule(id) {
  db.run(`UPDATE split_rules SET status = 'DELETED' WHERE id = ?`, [parseInt(id)]);
  saveDatabase(); return true;
}

// ========== 分账规则明细 ==========
function saveSplitRuleItem(item) {
  const { rule_id, target_merchant_id, split_ratio, split_amount } = item;
  db.run(`INSERT INTO split_rule_items (rule_id, target_merchant_id, split_ratio, split_amount) VALUES (?, ?, ?, ?)`, [parseInt(rule_id)||0, parseInt(target_merchant_id)||0, parseFloat(split_ratio)||0, Math.round(parseFloat(split_amount) * 100)||0]);
  saveDatabase();
  const r = db.exec('SELECT MAX(id) as id FROM split_rule_items');
  return { id: r[0]?.values[0]?.[0], ...item };
}

function getSplitRuleItems(rule_id) {
  const result = db.exec(`SELECT * FROM split_rule_items WHERE rule_id = ?`, [parseInt(rule_id)]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

// ========== 通知 ==========
function saveNotification(notification) {
  const { notification_type, out_request_no, content } = notification;
  const contentStr = content ? JSON.stringify(content) : '';
  db.run(`INSERT INTO notifications (notification_type, out_request_no, content) VALUES (?, ?, ?)`, [notification_type, out_request_no, contentStr]);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...notification };
}

function getNotifications(filters = {}) {
  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params = [];
  if (filters.type) { query += ' AND notification_type = ?'; params.push(filters.type); }
  if (filters.unprocessed) query += ' AND processed = 0';
  query += ' ORDER BY created_at DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getNotificationByOutRequestNo(out_request_no, notification_type) {
  if (!out_request_no) return null;
  let query = `SELECT * FROM notifications WHERE out_request_no = ?`;
  const params = [out_request_no];
  if (notification_type) { query += ` AND notification_type = ?`; params.push(notification_type); }
  query += ` ORDER BY created_at DESC LIMIT 1`;
  const result = db.exec(query, params);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function markNotificationProcessed(id) {
  db.run(`UPDATE notifications SET processed = 1 WHERE id = ?`, [parseInt(id)]);
  saveDatabase();
}

// ========== 账户 ==========
function getAccounts(merchant_id = null) {
  let query = 'SELECT * FROM accounts WHERE 1=1';
  const params = [];
  if (merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(merchant_id)); }
  query += ' ORDER BY id DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getAccountById(id) {
  const result = db.exec('SELECT * FROM accounts WHERE id = ?', [parseInt(id)]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function saveAccount(account) {
  const { id, merchant_id, account_no, balance, frozen_balance, status } = account;
  if (id) {
    db.run('UPDATE accounts SET merchant_id=?, account_no=?, balance=?, frozen_balance=?, status=? WHERE id=?',
      [parseInt(merchant_id)||0, account_no||'', balance||0, frozen_balance||0, status||'ACTIVE', parseInt(id)]);
    saveDatabase(); return account;
  }
  db.run('INSERT INTO accounts (merchant_id, account_no, balance, frozen_balance, status) VALUES (?, ?, ?, ?, ?)',
    [parseInt(merchant_id)||0, account_no||'', balance||0, frozen_balance||0, status||'ACTIVE']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...account };
}

function updateAccountBalance(account_no, balance_increment) {
  const acc = db.exec('SELECT id, balance FROM accounts WHERE account_no = ?', [account_no]);
  if (!acc.length || !acc[0].values.length) return;
  const currentBalance = acc[0].values[0][1] || 0;
  db.run('UPDATE accounts SET balance = ? WHERE account_no = ?', [currentBalance + parseInt(balance_increment), account_no]);
  saveDatabase();
}

// ========== 商终绑定 ==========
function saveStoreTerminal(store_id, merchant_no, terminal_no, account_no = '') {
  // 检查是否已存在
  const existing = db.exec('SELECT id FROM store_terminals WHERE store_id=? AND merchant_no=? AND terminal_no=?',
    [parseInt(store_id), merchant_no, terminal_no]);
  if (existing.length && existing[0].values.length) {
    db.run('UPDATE store_terminals SET account_no=?, status=? WHERE store_id=? AND merchant_no=? AND terminal_no=?',
      [account_no, 'active', parseInt(store_id), merchant_no, terminal_no]);
  } else {
    db.run('INSERT INTO store_terminals (store_id, merchant_no, terminal_no, account_no, status) VALUES (?, ?, ?, ?, ?)',
      [parseInt(store_id), merchant_no, terminal_no, account_no, 'active']);
  }
  saveDatabase();
}

function getStoreTerminalsByStoreId(store_id) {
  const result = db.exec('SELECT * FROM store_terminals WHERE store_id = ? ORDER BY id DESC', [parseInt(store_id)]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function deleteStoreTerminal(terminal_id) {
  db.run('UPDATE store_terminals SET status=? WHERE id=?', ['deleted', parseInt(terminal_id)]);
  saveDatabase();
}

// ========== 交易订单 ==========
function saveTradeOrder(order) {
  const { id, order_no, out_order_no, payer_account_no, payer_name, total_amount, currency, status } = order;
  if (id) {
    db.run('UPDATE trade_orders SET out_order_no=?, payer_account_no=?, payer_name=?, total_amount=?, currency=?, status=?, update_time=CURRENT_TIMESTAMP WHERE id=?',
      [out_order_no||'', payer_account_no||'', payer_name||'', Math.round(parseFloat(total_amount))||0, currency||'CNY', status||'PENDING', parseInt(id)]);
    saveDatabase(); return order;
  }
  db.run('INSERT INTO trade_orders (order_no, out_order_no, payer_account_no, payer_name, total_amount, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [order_no, out_order_no||'', payer_account_no||'', payer_name||'', Math.round(parseFloat(total_amount))||0, currency||'CNY', status||'PENDING']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...order };
}

function getTradeOrders(filters = {}) {
  let query = 'SELECT * FROM trade_orders WHERE 1=1';
  const params = [];
  if (filters.merchant_id) { query += ' AND merchant_id = ?'; params.push(parseInt(filters.merchant_id)); }
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  query += ' ORDER BY create_time DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getTradeOrderById(id) {
  const result = db.exec('SELECT * FROM trade_orders WHERE id = ?', [parseInt(id)]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function getTradeOrderByOutOrderNo(out_order_no) {
  const result = db.exec('SELECT * FROM trade_orders WHERE out_order_no = ?', [out_order_no]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

// ========== 支付流水 ==========
function saveTradePayment(payment) {
  const { id, order_id, payment_seq_no, payment_type, amount, status } = payment;
  if (id) {
    db.run('UPDATE trade_payments SET status=? WHERE id=?', [status||'PENDING', parseInt(id)]);
    saveDatabase(); return payment;
  }
  // 检查是否已存在
  const existing = db.exec('SELECT id FROM trade_payments WHERE payment_seq_no = ?', [payment_seq_no]);
  if (existing.length && existing[0].values.length) {
    db.run('UPDATE trade_payments SET status=? WHERE payment_seq_no=?', [status||'PENDING', payment_seq_no]);
    saveDatabase(); return payment;
  }
  db.run('INSERT INTO trade_payments (order_id, payment_seq_no, payment_type, amount, status) VALUES (?, ?, ?, ?, ?)',
    [parseInt(order_id), payment_seq_no||'', payment_type||'PAYMENT', Math.round(parseFloat(amount))||0, status||'PENDING']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...payment };
}

function getTradePaymentsByOrderId(order_id) {
  const result = db.exec('SELECT * FROM trade_payments WHERE order_id = ? ORDER BY create_time ASC', [parseInt(order_id)]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getTradePaymentBySeqNo(payment_seq_no) {
  const result = db.exec('SELECT * FROM trade_payments WHERE payment_seq_no = ?', [payment_seq_no]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

// ========== 分账记录 ==========
function saveTradeSplit(split) {
  const { id, payment_id, split_seq_no, receiver_account_no, receiver_name, amount, status } = split;
  if (id) {
    db.run('UPDATE trade_splits SET status=? WHERE id=?', [status||'PENDING', parseInt(id)]);
    saveDatabase(); return split;
  }
  db.run('INSERT INTO trade_splits (payment_id, split_seq_no, receiver_account_no, receiver_name, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
    [parseInt(payment_id), split_seq_no||'', receiver_account_no||'', receiver_name||'', Math.round(parseFloat(amount))||0, status||'PENDING']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...split };
}

function getTradeSplitsByPaymentId(payment_id) {
  const result = db.exec('SELECT * FROM trade_splits WHERE payment_id = ? ORDER BY create_time ASC', [parseInt(payment_id)]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

// ========== 分账模板 ==========
function saveSplitTemplate(template) {
  const { template_id, name, description, icon, items, creator_id, creator_type, is_system } = template;
  const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);
  const existing = db.exec(`SELECT id FROM split_templates WHERE template_id = ?`, [template_id]);
  if (existing.length && existing[0].values.length > 0) {
    db.run(`UPDATE split_templates SET name=?, description=?, icon=?, items=?, updated_at=CURRENT_TIMESTAMP WHERE template_id=?`, [name, description||'', icon||'📋', itemsStr, template_id]);
  } else {
    db.run(`INSERT INTO split_templates (template_id, name, description, icon, items, creator_id, creator_type, is_system) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [template_id, name, description||'', icon||'📋', itemsStr, creator_id||'', creator_type||'merchant', is_system?1:0]);
  }
  saveDatabase();
  return getSplitTemplateById(template_id);
}

function getSplitTemplates(creator_id = null) {
  let query = 'SELECT * FROM split_templates WHERE 1=1';
  const params = [];
  if (creator_id) { query += ' AND (creator_id = ? OR is_system = 1)'; params.push(creator_id); }
  query += ' ORDER BY is_system DESC, usage_count DESC, created_at DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getSplitTemplateById(template_id) {
  const result = db.exec(`SELECT * FROM split_templates WHERE template_id = ?`, [template_id]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function deleteSplitTemplate(template_id) {
  db.run(`DELETE FROM split_templates WHERE template_id = ? AND is_system = 0`, [template_id]);
  saveDatabase(); return { success: true };
}

function incrementTemplateUsage(template_id) {
  db.run(`UPDATE split_templates SET usage_count = usage_count + 1 WHERE template_id = ?`, [template_id]);
  saveDatabase();
}

// ========== 对账 ==========
function saveReconciliationTask(task) {
  const { task_no, task_type, date_range_start, date_range_end, created_by } = task;
  db.run(`INSERT INTO reconciliation_tasks (task_no, task_type, date_range_start, date_range_end, created_by) VALUES (?, ?, ?, ?, ?)`, [task_no, task_type, date_range_start, date_range_end, created_by||'']);
  saveDatabase();
  return getReconciliationTask(task_no);
}

function getReconciliationTask(task_no) {
  const result = db.exec(`SELECT * FROM reconciliation_tasks WHERE task_no = ?`, [task_no]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function getReconciliationTasks(filters = {}) {
  let query = 'SELECT * FROM reconciliation_tasks WHERE 1=1';
  const params = [];
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.task_type) { query += ' AND task_type = ?'; params.push(filters.task_type); }
  query += ' ORDER BY created_at DESC';
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function updateReconciliationTask(task_no, updates) {
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
    db.run(`UPDATE reconciliation_tasks SET ${fields.join(', ')} WHERE task_no = ?`, [...params, task_no]);
    saveDatabase();
  }
  return getReconciliationTask(task_no);
}

function saveReconciliationDetail(detail) {
  const { task_no, record_type, record_id, expected_amount, actual_amount, difference_amount, status, remark } = detail;
  db.run(`INSERT INTO reconciliation_details (task_no, record_type, record_id, expected_amount, actual_amount, difference_amount, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [task_no, record_type, record_id||'', expected_amount||0, actual_amount||0, difference_amount||0, status||'matched', remark||'']);
  saveDatabase();
}

function getReconciliationDetails(task_no) {
  const result = db.exec(`SELECT * FROM reconciliation_details WHERE task_no = ?`, [task_no]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function saveReconciliationDifference(diff) {
  const { task_no, difference_type, severity, description, suggested_action } = diff;
  db.run(`INSERT INTO reconciliation_differences (task_no, difference_type, severity, description, suggested_action) VALUES (?, ?, ?, ?, ?)`, [task_no, difference_type, severity||'medium', description||'', suggested_action||'']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...diff };
}

function getReconciliationDifferences(task_no) {
  const result = db.exec(`SELECT * FROM reconciliation_differences WHERE task_no = ?`, [task_no]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function updateReconciliationDifference(id, updates) {
  const fields = [];
  const params = [];
  if (updates.status) { fields.push('status = ?'); params.push(updates.status); }
  if (updates.resolved_by) { fields.push('resolved_by = ?'); params.push(updates.resolved_by); }
  if (updates.resolved_at) { fields.push('resolved_at = ?'); params.push(updates.resolved_at); }
  if (fields.length > 0) {
    db.run(`UPDATE reconciliation_differences SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
    saveDatabase();
  }
}

module.exports = {
  initDatabase, closeDatabase, saveDatabase,
  // 用户
  createUser, getUserByUsername,
  // 商户
  saveMerchant, getMerchants, getMerchantByOutRequestNo, getMerchantById, updateMerchantStatus,
  // 银行卡
  saveBankCard, getBankCards, deleteBankCard,
  // 账户
  getAccounts, getAccountById, saveAccount, updateAccountBalance, getAccountsByMerchantId,
  // 交易
  saveTransaction, getTransactions,
  // 分账记录
  saveSplitRecord, getSplitRecords,
  // 旅行团
  saveTourGroup, getTourGroups, getTourGroupById, deleteTourGroup,
  // 团队成员
  saveTourMember, getTourMembers, deleteTourMember,
  // 分账规则
  saveSplitRule, getSplitRules, getSplitRuleById, deleteSplitRule,
  // 分账规则明细
  saveSplitRuleItem, getSplitRuleItems,
  // 通知
  saveNotification, getNotifications, getNotificationByOutRequestNo, markNotificationProcessed,

  // 分账模板
  saveSplitTemplate, getSplitTemplates, getSplitTemplateById, deleteSplitTemplate, incrementTemplateUsage,
  // 对账
  saveReconciliationTask, getReconciliationTask, getReconciliationTasks, updateReconciliationTask,
  saveReconciliationDetail, getReconciliationDetails,
  saveReconciliationDifference, getReconciliationDifferences, updateReconciliationDifference,
  // 账户
  getAccounts, getAccountById, saveAccount, updateAccountBalance,
  // 商终绑定
  saveStoreTerminal, getStoreTerminalsByStoreId, deleteStoreTerminal,
  // 交易订单
  saveTradeOrder, getTradeOrders, getTradeOrderById, getTradeOrderByOutOrderNo,
  // 支付流水
  saveTradePayment, getTradePaymentsByOrderId, getTradePaymentBySeqNo,
  // 分账记录
  saveTradeSplit, getTradeSplitsByPaymentId
};

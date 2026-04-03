const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'qzt.db');

let db = null;
let SQL = null;

// 初始化数据库
async function initDatabase() {
  if (db) return db;
  
  // 初始化 sql.js
  SQL = await initSqlJs();
  
  // 确保数据目录存在
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // 尝试加载现有数据库
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('SQLite 数据库已加载:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('SQLite 数据库已创建:', DB_PATH);
  }
  
  // 创建表
  createTables();
  
  // 保存到文件
  saveDatabase();
  
  return db;
}

// 创建数据表
function createTables() {
  // 商户表
  db.run(`
    CREATE TABLE IF NOT EXISTS merchants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      out_request_no TEXT UNIQUE NOT NULL,
      register_name TEXT,
      legal_mobile TEXT,
      legal_name TEXT,
      legal_id_card TEXT,
      license_no TEXT,
      enterprise_type TEXT DEFAULT '3',
      address TEXT,
      email TEXT,
      back_url TEXT,
      status TEXT DEFAULT 'PENDING',
      qzt_account_no TEXT,
      qzt_merchant_no TEXT,
      qzt_response TEXT,
      callback_message TEXT,
      callback_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 账户余额表
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      account_no TEXT,
      balance DECIMAL(15,2) DEFAULT 0,
      frozen_balance DECIMAL(15,2) DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    )
  `);
  
  // 银行卡表
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_cards (
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    )
  `);
  
  // 交易流水表（充值/提现）
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER,
      out_request_no TEXT UNIQUE,
      transaction_type TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      status TEXT DEFAULT 'PENDING',
      bank_card_no TEXT,
      remark TEXT,
      qzt_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    )
  `);
  
  // 分账记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS split_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER,
      out_request_no TEXT UNIQUE,
      order_no TEXT,
      amount DECIMAL(15,2) NOT NULL,
      split_account_no TEXT,
      split_amount DECIMAL(15,2),
      status TEXT DEFAULT 'PENDING',
      qzt_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    )
  `);
  
  // 通知记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_type TEXT NOT NULL,
      out_request_no TEXT,
      content TEXT,
      processed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 旅行团表
  db.run(`
    CREATE TABLE IF NOT EXISTS tour_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      tour_no TEXT UNIQUE NOT NULL,
      tour_name TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      total_amount DECIMAL(15,2) DEFAULT 0,
      split_status TEXT DEFAULT 'PENDING',
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    )
  `);
  
  // 团队成员表（导游、司机等）
  db.run(`
    CREATE TABLE IF NOT EXISTS tour_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tour_id INTEGER NOT NULL,
      merchant_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      split_ratio DECIMAL(5,2) DEFAULT 0,
      split_amount DECIMAL(15,2) DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tour_id) REFERENCES tour_groups(id),
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    )
  `);
  
  // 分账规则表
  db.run(`
    CREATE TABLE IF NOT EXISTS split_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      rule_name TEXT NOT NULL,
      rule_type TEXT DEFAULT 'FIXED',
      default_rule INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id)
    )
  `);
  
  // 分账规则明细表
  db.run(`
    CREATE TABLE IF NOT EXISTS split_rule_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER NOT NULL,
      target_merchant_id INTEGER NOT NULL,
      split_ratio DECIMAL(5,2) DEFAULT 0,
      split_amount DECIMAL(15,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rule_id) REFERENCES split_rules(id),
      FOREIGN KEY (target_merchant_id) REFERENCES merchants(id)
    )
  `);
  
  console.log('数据表创建完成');
}

// 保存数据库到文件
function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 关闭数据库
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('数据库已关闭');
  }
}

// ========== 商户操作 ==========

function saveMerchant(merchant) {
  const {
    out_request_no, register_name, legal_mobile, legal_name,
    legal_id_card, license_no, enterprise_type, address, email,
    back_url, status, qzt_account_no, qzt_merchant_no, qzt_response,
    callback_message, callback_at
  } = merchant;
  
  // 检查是否已存在
  const existing = getMerchantByOutRequestNo(out_request_no);
  
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';
  
  if (existing) {
    // 更新
    db.run(`
      UPDATE merchants SET
        register_name = '${escapeSql(register_name)}',
        legal_mobile = '${escapeSql(legal_mobile)}',
        legal_name = '${escapeSql(legal_name)}',
        legal_id_card = '${escapeSql(legal_id_card)}',
        license_no = '${escapeSql(license_no)}',
        enterprise_type = '${escapeSql(enterprise_type)}',
        address = '${escapeSql(address)}',
        email = '${escapeSql(email)}',
        back_url = '${escapeSql(back_url)}',
        status = '${escapeSql(status)}',
        qzt_account_no = '${escapeSql(qzt_account_no)}',
        qzt_merchant_no = '${escapeSql(qzt_merchant_no)}',
        qzt_response = '${escapeSql(qztResponseStr)}',
        callback_message = '${escapeSql(callback_message)}',
        callback_at = '${escapeSql(callback_at)}',
        updated_at = CURRENT_TIMESTAMP
      WHERE out_request_no = '${escapeSql(out_request_no)}'
    `);
    saveDatabase();
    return { ...existing, ...merchant, id: existing.id };
  }
  
  // 新增
  db.run(`
    INSERT INTO merchants (out_request_no, register_name, legal_mobile, legal_name,
      legal_id_card, license_no, enterprise_type, address, email, back_url,
      status, qzt_account_no, qzt_merchant_no, qzt_response)
    VALUES (
      '${escapeSql(out_request_no)}',
      '${escapeSql(register_name)}',
      '${escapeSql(legal_mobile)}',
      '${escapeSql(legal_name)}',
      '${escapeSql(legal_id_card)}',
      '${escapeSql(license_no)}',
      '${escapeSql(enterprise_type)}',
      '${escapeSql(address)}',
      '${escapeSql(email)}',
      '${escapeSql(back_url)}',
      '${escapeSql(status || 'PENDING')}',
      '${escapeSql(qzt_account_no)}',
      '${escapeSql(qzt_merchant_no)}',
      '${escapeSql(qztResponseStr)}'
    )
  `);
  
  saveDatabase();
  
  // 获取最后插入的 ID
  const result = db.exec('SELECT MAX(id) as id FROM merchants');
  const id = result[0]?.values[0]?.[0] || 0;
  
  return { id, ...merchant };
}

// SQL 转义函数
function escapeSql(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/'/g, "''");
}

function getMerchants() {
  const result = db.exec('SELECT * FROM merchants ORDER BY created_at DESC');
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      let value = row[i];
      if (col === 'qzt_response' && value) {
        try { value = JSON.parse(value); } catch(e) {}
      }
      obj[col] = value;
    });
    return obj;
  });
}

function getMerchantByOutRequestNo(out_request_no) {
  const result = db.exec(`SELECT * FROM merchants WHERE out_request_no = '${escapeSql(out_request_no)}'`);
  if (!result.length || !result[0].values.length) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => {
    let value = row[i];
    if (col === 'qzt_response' && value) {
      try { value = JSON.parse(value); } catch(e) {}
    }
    obj[col] = value;
  });
  return obj;
}

function getMerchantById(id) {
  const idNum = parseInt(id);
  if (isNaN(idNum)) return null;
  
  const result = db.exec(`SELECT * FROM merchants WHERE id = ${idNum}`);
  if (!result.length || !result[0].values.length) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => {
    let value = row[i];
    if (col === 'qzt_response' && value) {
      try { value = JSON.parse(value); } catch(e) {}
    }
    obj[col] = value;
  });
  return obj;
}

// ========== 银行卡操作 ==========

function saveBankCard(card) {
  const { merchant_id, bank_code, bank_name, bank_card_no, bank_card_name,
    bank_type, bank_province, bank_city, bank_branch, status } = card;
  
  db.run(`
    INSERT INTO bank_cards (merchant_id, bank_code, bank_name, bank_card_no,
      bank_card_name, bank_type, bank_province, bank_city, bank_branch, status)
    VALUES (
      ${parseInt(merchant_id) || 0},
      '${escapeSql(bank_code)}',
      '${escapeSql(bank_name)}',
      '${escapeSql(bank_card_no)}',
      '${escapeSql(bank_card_name)}',
      '${escapeSql(bank_type || '2')}',
      '${escapeSql(bank_province)}',
      '${escapeSql(bank_city)}',
      '${escapeSql(bank_branch)}',
      '${escapeSql(status || 'ACTIVE')}'
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { id: result[0]?.values[0]?.[0], ...card };
}

function getBankCards(merchant_id) {
  let query = `SELECT * FROM bank_cards WHERE status = 'ACTIVE'`;
  
  if (merchant_id) {
    query += ` AND merchant_id = ${parseInt(merchant_id)}`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = db.exec(query);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function deleteBankCard(id) {
  db.run(`UPDATE bank_cards SET status = 'DELETED' WHERE id = ${parseInt(id)}`);
  saveDatabase();
  return true;
}

// ========== 交易操作 ==========

function saveTransaction(transaction) {
  const { merchant_id, out_request_no, transaction_type, amount, status,
    bank_card_no, remark, qzt_response } = transaction;
  
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';
  
  // 检查是否已存在
  const existing = db.exec(`SELECT * FROM transactions WHERE out_request_no = '${escapeSql(out_request_no)}'`);
  if (existing.length && existing[0].values.length) {
    db.run(`
      UPDATE transactions SET
        status = '${escapeSql(status)}',
        qzt_response = '${escapeSql(qztResponseStr)}',
        updated_at = CURRENT_TIMESTAMP
      WHERE out_request_no = '${escapeSql(out_request_no)}'
    `);
    saveDatabase();
    return transaction;
  }
  
  db.run(`
    INSERT INTO transactions (merchant_id, out_request_no, transaction_type,
      amount, status, bank_card_no, remark, qzt_response)
    VALUES (
      ${parseInt(merchant_id) || 0},
      '${escapeSql(out_request_no)}',
      '${escapeSql(transaction_type)}',
      ${parseFloat(amount) || 0},
      '${escapeSql(status || 'PENDING')}',
      '${escapeSql(bank_card_no)}',
      '${escapeSql(remark)}',
      '${escapeSql(qztResponseStr)}'
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { id: result[0]?.values[0]?.[0], ...transaction };
}

function getTransactions(filters = {}) {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  
  if (filters.merchant_id) {
    query += ` AND merchant_id = ${parseInt(filters.merchant_id)}`;
  }
  if (filters.type) {
    query += ` AND transaction_type = '${escapeSql(filters.type)}'`;
  }
  if (filters.status) {
    query += ` AND status = '${escapeSql(filters.status)}'`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (filters.limit) {
    query += ` LIMIT ${parseInt(filters.limit)}`;
  }
  
  const result = db.exec(query);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      let value = row[i];
      if (col === 'qzt_response' && value) {
        try { value = JSON.parse(value); } catch(e) {}
      }
      obj[col] = value;
    });
    return obj;
  });
}

// ========== 分账记录操作 ==========

function saveSplitRecord(record) {
  const { merchant_id, out_request_no, order_no, amount, split_account_no,
    split_amount, status, qzt_response } = record;
  
  const qztResponseStr = qzt_response ? JSON.stringify(qzt_response) : '';
  
  const existing = db.exec(`SELECT * FROM split_records WHERE out_request_no = '${escapeSql(out_request_no)}'`);
  if (existing.length && existing[0].values.length) {
    db.run(`
      UPDATE split_records SET
        status = '${escapeSql(status)}',
        qzt_response = '${escapeSql(qztResponseStr)}'
      WHERE out_request_no = '${escapeSql(out_request_no)}'
    `);
    saveDatabase();
    return record;
  }
  
  db.run(`
    INSERT INTO split_records (merchant_id, out_request_no, order_no, amount,
      split_account_no, split_amount, status, qzt_response)
    VALUES (
      ${parseInt(merchant_id) || 0},
      '${escapeSql(out_request_no)}',
      '${escapeSql(order_no)}',
      ${parseFloat(amount) || 0},
      '${escapeSql(split_account_no)}',
      ${parseFloat(split_amount) || 0},
      '${escapeSql(status || 'PENDING')}',
      '${escapeSql(qztResponseStr)}'
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { id: result[0]?.values[0]?.[0], ...record };
}

function getSplitRecords(filters = {}) {
  let query = 'SELECT * FROM split_records WHERE 1=1';
  
  if (filters.merchant_id) {
    query += ` AND merchant_id = ${parseInt(filters.merchant_id)}`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = db.exec(query);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      let value = row[i];
      if (col === 'qzt_response' && value) {
        try { value = JSON.parse(value); } catch(e) {}
      }
      obj[col] = value;
    });
    return obj;
  });
}

// ========== 旅行团操作 ==========

function saveTourGroup(tour) {
  const { merchant_id, tour_no, tour_name, start_date, end_date, total_amount, split_status, status } = tour;
  
  // 检查是否已存在
  const existing = db.exec(`SELECT * FROM tour_groups WHERE tour_no = '${escapeSql(tour_no)}'`);
  
  if (existing.length && existing[0].values.length) {
    // 更新
    db.run(`
      UPDATE tour_groups SET
        tour_name = '${escapeSql(tour_name)}',
        start_date = '${escapeSql(start_date)}',
        end_date = '${escapeSql(end_date)}',
        total_amount = ${parseFloat(total_amount) || 0},
        split_status = '${escapeSql(split_status || 'PENDING')}',
        status = '${escapeSql(status || 'ACTIVE')}',
        updated_at = CURRENT_TIMESTAMP
      WHERE tour_no = '${escapeSql(tour_no)}'
    `);
    saveDatabase();
    return { ...existing[0].values[0], ...tour };
  }
  
  // 新增
  db.run(`
    INSERT INTO tour_groups (merchant_id, tour_no, tour_name, start_date, end_date, total_amount, split_status, status)
    VALUES (
      ${parseInt(merchant_id) || 0},
      '${escapeSql(tour_no)}',
      '${escapeSql(tour_name)}',
      '${escapeSql(start_date)}',
      '${escapeSql(end_date)}',
      ${parseFloat(total_amount) || 0},
      '${escapeSql(split_status || 'PENDING')}',
      '${escapeSql(status || 'ACTIVE')}'
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT MAX(id) as id FROM tour_groups');
  const id = result[0]?.values[0]?.[0] || 0;
  
  return { id, ...tour };
}

function getTourGroups(merchant_id) {
  let query = 'SELECT * FROM tour_groups WHERE status = "ACTIVE"';
  if (merchant_id) {
    query += ` AND merchant_id = ${parseInt(merchant_id)}`;
  }
  query += ' ORDER BY created_at DESC';
  
  const result = db.exec(query);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function getTourGroupById(id) {
  const result = db.exec(`SELECT * FROM tour_groups WHERE id = ${parseInt(id)}`);
  if (!result.length || !result[0].values.length) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => obj[col] = row[i]);
  return obj;
}

function deleteTourGroup(id) {
  db.run(`UPDATE tour_groups SET status = 'DELETED' WHERE id = ${parseInt(id)}`);
  saveDatabase();
  return true;
}

// ========== 团队成员操作 ==========

function saveTourMember(member) {
  const { tour_id, merchant_id, role, split_ratio, split_amount, status } = member;
  
  db.run(`
    INSERT INTO tour_members (tour_id, merchant_id, role, split_ratio, split_amount, status)
    VALUES (
      ${parseInt(tour_id) || 0},
      ${parseInt(merchant_id) || 0},
      '${escapeSql(role)}',
      ${parseFloat(split_ratio) || 0},
      ${parseFloat(split_amount) || 0},
      '${escapeSql(status || 'PENDING')}'
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT MAX(id) as id FROM tour_members');
  const id = result[0]?.values[0]?.[0] || 0;
  
  return { id, ...member };
}

function getTourMembers(tour_id) {
  const result = db.exec(`SELECT * FROM tour_members WHERE tour_id = ${parseInt(tour_id)}`);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function deleteTourMember(id) {
  db.run(`DELETE FROM tour_members WHERE id = ${parseInt(id)}`);
  saveDatabase();
  return true;
}

// ========== 分账规则操作 ==========

function saveSplitRule(rule) {
  const { merchant_id, rule_name, rule_type, default_rule, status } = rule;
  
  db.run(`
    INSERT INTO split_rules (merchant_id, rule_name, rule_type, default_rule, status)
    VALUES (
      ${parseInt(merchant_id) || 0},
      '${escapeSql(rule_name)}',
      '${escapeSql(rule_type || 'FIXED')}',
      ${default_rule ? 1 : 0},
      '${escapeSql(status || 'ACTIVE')}'
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT MAX(id) as id FROM split_rules');
  const id = result[0]?.values[0]?.[0] || 0;
  
  return { id, ...rule };
}

function getSplitRules(merchant_id) {
  let query = 'SELECT * FROM split_rules WHERE status = "ACTIVE"';
  if (merchant_id) {
    query += ` AND merchant_id = ${parseInt(merchant_id)}`;
  }
  query += ' ORDER BY default_rule DESC, created_at DESC';
  
  const result = db.exec(query);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function getSplitRuleById(id) {
  const result = db.exec(`SELECT * FROM split_rules WHERE id = ${parseInt(id)}`);
  if (!result.length || !result[0].values.length) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => obj[col] = row[i]);
  return obj;
}

function deleteSplitRule(id) {
  db.run(`UPDATE split_rules SET status = 'DELETED' WHERE id = ${parseInt(id)}`);
  saveDatabase();
  return true;
}

// ========== 分账规则明细操作 ==========

function saveSplitRuleItem(item) {
  const { rule_id, target_merchant_id, split_ratio, split_amount } = item;
  
  db.run(`
    INSERT INTO split_rule_items (rule_id, target_merchant_id, split_ratio, split_amount)
    VALUES (
      ${parseInt(rule_id) || 0},
      ${parseInt(target_merchant_id) || 0},
      ${parseFloat(split_ratio) || 0},
      ${parseFloat(split_amount) || 0}
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT MAX(id) as id FROM split_rule_items');
  const id = result[0]?.values[0]?.[0] || 0;
  
  return { id, ...item };
}

function getSplitRuleItems(rule_id) {
  const result = db.exec(`SELECT * FROM split_rule_items WHERE rule_id = ${parseInt(rule_id)}`);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

// ========== 通知记录操作 ==========

function saveNotification(notification) {
  const { notification_type, out_request_no, content } = notification;
  
  const contentStr = content ? JSON.stringify(content) : '';
  
  db.run(`
    INSERT INTO notifications (notification_type, out_request_no, content)
    VALUES (
      '${escapeSql(notification_type)}',
      '${escapeSql(out_request_no)}',
      '${escapeSql(contentStr)}'
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { id: result[0]?.values[0]?.[0], ...notification };
}

function getNotifications(filters = {}) {
  let query = 'SELECT * FROM notifications WHERE 1=1';
  
  if (filters.type) {
    query += ` AND notification_type = '${escapeSql(filters.type)}'`;
  }
  if (filters.unprocessed) {
    query += ' AND processed = 0';
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = db.exec(query);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      let value = row[i];
      if (col === 'content' && value) {
        try { value = JSON.parse(value); } catch(e) {}
      }
      obj[col] = value;
    });
    return obj;
  });
}

module.exports = {
  initDatabase,
  closeDatabase,
  saveDatabase,
  // 商户
  saveMerchant,
  getMerchants,
  getMerchantByOutRequestNo,
  getMerchantById,
  // 银行卡
  saveBankCard,
  getBankCards,
  deleteBankCard,
  // 交易
  saveTransaction,
  getTransactions,
  // 分账
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
  getNotifications
};

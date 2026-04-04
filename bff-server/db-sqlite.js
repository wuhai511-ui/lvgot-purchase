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
      split_role TEXT DEFAULT 'other',
      guide_cert_no TEXT,
      guide_cert_img TEXT,
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
      total_amount DECIMAL(15,2) DEFAULT 0,
      split_status TEXT DEFAULT 'PENDING',
      status TEXT DEFAULT 'ACTIVE',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id),
      FOREIGN KEY (guide_id) REFERENCES merchants(id),
      FOREIGN KEY (driver_id) REFERENCES merchants(id),
      FOREIGN KEY (shop_id) REFERENCES merchants(id)
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
  
  // 分账模板表
  db.run(`
    CREATE TABLE IF NOT EXISTS split_templates (
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
    )
  `);
  
  // 对账任务表
  db.run(`
    CREATE TABLE IF NOT EXISTS reconciliation_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_no TEXT UNIQUE NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      date_range_start DATE,
      date_range_end DATE,
      total_records INTEGER DEFAULT 0,
      matched_records INTEGER DEFAULT 0,
      unmatched_records INTEGER DEFAULT 0,
      difference_amount DECIMAL(15,2) DEFAULT 0,
      report_url TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);
  
  // 对账明细表
  db.run(`
    CREATE TABLE IF NOT EXISTS reconciliation_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_no TEXT NOT NULL,
      record_type TEXT NOT NULL,
      record_id TEXT,
      expected_amount DECIMAL(15,2),
      actual_amount DECIMAL(15,2),
      difference_amount DECIMAL(15,2),
      status TEXT,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 对账差异表
  db.run(`
    CREATE TABLE IF NOT EXISTS reconciliation_differences (
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
    legal_id_card, license_no, enterprise_type, split_role, 
    guide_cert_no, guide_cert_img, address, email,
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
        split_role = '${escapeSql(split_role || 'other')}',
        guide_cert_no = '${escapeSql(guide_cert_no)}',
        guide_cert_img = '${escapeSql(guide_cert_img)}',
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
      legal_id_card, license_no, enterprise_type, split_role, guide_cert_no, guide_cert_img,
      address, email, back_url, status, qzt_account_no, qzt_merchant_no, qzt_response)
    VALUES (
      '${escapeSql(out_request_no)}',
      '${escapeSql(register_name)}',
      '${escapeSql(legal_mobile)}',
      '${escapeSql(legal_name)}',
      '${escapeSql(legal_id_card)}',
      '${escapeSql(license_no)}',
      '${escapeSql(enterprise_type)}',
      '${escapeSql(split_role || 'other')}',
      '${escapeSql(guide_cert_no)}',
      '${escapeSql(guide_cert_img)}',
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
  const { 
    merchant_id, tour_no, tour_name, route_name, days, itinerary,
    start_date, end_date, people_count, guide_id, driver_id, shop_id,
    attractions, hotel_name, hotel_phone, hotel_address,
    total_amount, split_status, status, remark 
  } = tour;
  
  // 检查是否已存在
  const existing = db.exec(`SELECT * FROM tour_groups WHERE tour_no = '${escapeSql(tour_no)}'`);
  
  if (existing.length && existing[0].values.length) {
    // 更新
    db.run(`
      UPDATE tour_groups SET
        tour_name = '${escapeSql(tour_name)}',
        route_name = '${escapeSql(route_name || '')}',
        days = ${parseInt(days) || 1},
        itinerary = '${escapeSql(itinerary || '')}',
        start_date = '${escapeSql(start_date)}',
        end_date = '${escapeSql(end_date)}',
        people_count = ${parseInt(people_count) || 1},
        guide_id = ${guide_id ? parseInt(guide_id) : 'NULL'},
        driver_id = ${driver_id ? parseInt(driver_id) : 'NULL'},
        shop_id = ${shop_id ? parseInt(shop_id) : 'NULL'},
        attractions = '${escapeSql(attractions || '')}',
        hotel_name = '${escapeSql(hotel_name || '')}',
        hotel_phone = '${escapeSql(hotel_phone || '')}',
        hotel_address = '${escapeSql(hotel_address || '')}',
        total_amount = ${parseFloat(total_amount) || 0},
        split_status = '${escapeSql(split_status || 'PENDING')}',
        status = '${escapeSql(status || 'ACTIVE')}',
        remark = '${escapeSql(remark || '')}',
        updated_at = CURRENT_TIMESTAMP
      WHERE tour_no = '${escapeSql(tour_no)}'
    `);
    saveDatabase();
    return { ...existing[0].values[0], ...tour };
  }
  
  // 新增
  db.run(`
    INSERT INTO tour_groups (merchant_id, tour_no, tour_name, route_name, days, itinerary,
      start_date, end_date, people_count, guide_id, driver_id, shop_id, attractions,
      hotel_name, hotel_phone, hotel_address, total_amount, split_status, status, remark)
    VALUES (
      ${parseInt(merchant_id) || 0},
      '${escapeSql(tour_no)}',
      '${escapeSql(tour_name)}',
      '${escapeSql(route_name || '')}',
      ${parseInt(days) || 1},
      '${escapeSql(itinerary || '')}',
      '${escapeSql(start_date)}',
      '${escapeSql(end_date)}',
      ${parseInt(people_count) || 1},
      ${guide_id ? parseInt(guide_id) : 'NULL'},
      ${driver_id ? parseInt(driver_id) : 'NULL'},
      ${shop_id ? parseInt(shop_id) : 'NULL'},
      '${escapeSql(attractions || '')}',
      '${escapeSql(hotel_name || '')}',
      '${escapeSql(hotel_phone || '')}',
      '${escapeSql(hotel_address || '')}',
      ${parseFloat(total_amount) || 0},
      '${escapeSql(split_status || 'PENDING')}',
      '${escapeSql(status || 'ACTIVE')}',
      '${escapeSql(remark || '')}'
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

// ========== 分账模板操作 ==========

function saveSplitTemplate(template) {
  const { template_id, name, description, icon, items, creator_id, creator_type, is_system } = template;
  
  const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);
  
  // 检查是否已存在
  const existing = db.exec(`SELECT id FROM split_templates WHERE template_id = '${escapeSql(template_id)}'`);
  
  if (existing.length && existing[0].values.length > 0) {
    // 更新
    db.run(`
      UPDATE split_templates SET
        name = '${escapeSql(name)}',
        description = '${escapeSql(description || '')}',
        icon = '${escapeSql(icon || '📋')}',
        items = '${escapeSql(itemsStr)}',
        updated_at = CURRENT_TIMESTAMP
      WHERE template_id = '${escapeSql(template_id)}'
    `);
  } else {
    // 新增
    db.run(`
      INSERT INTO split_templates (template_id, name, description, icon, items, creator_id, creator_type, is_system)
      VALUES (
        '${escapeSql(template_id)}',
        '${escapeSql(name)}',
        '${escapeSql(description || '')}',
        '${escapeSql(icon || '📋')}',
        '${escapeSql(itemsStr)}',
        '${escapeSql(creator_id || '')}',
        '${escapeSql(creator_type || 'merchant')}',
        ${is_system ? 1 : 0}
      )
    `);
  }
  
  saveDatabase();
  return getSplitTemplateById(template_id);
}

function getSplitTemplates(creator_id = null) {
  let query = 'SELECT * FROM split_templates WHERE 1=1';
  
  if (creator_id) {
    query += ` AND (creator_id = '${escapeSql(creator_id)}' OR is_system = 1)`;
  }
  
  query += ' ORDER BY is_system DESC, usage_count DESC, created_at DESC';
  
  const result = db.exec(query);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      let value = row[i];
      if (col === 'items' && value) {
        try { value = JSON.parse(value); } catch(e) {}
      }
      obj[col] = value;
    });
    return obj;
  });
}

function getSplitTemplateById(template_id) {
  const result = db.exec(`SELECT * FROM split_templates WHERE template_id = '${escapeSql(template_id)}'`);
  if (!result.length || !result[0].values.length) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => {
    let value = row[i];
    if (col === 'items' && value) {
      try { value = JSON.parse(value); } catch(e) {}
    }
    obj[col] = value;
  });
  return obj;
}

function deleteSplitTemplate(template_id) {
  db.run(`DELETE FROM split_templates WHERE template_id = '${escapeSql(template_id)}' AND is_system = 0`);
  saveDatabase();
  return { success: true };
}

function incrementTemplateUsage(template_id) {
  db.run(`UPDATE split_templates SET usage_count = usage_count + 1 WHERE template_id = '${escapeSql(template_id)}'`);
  saveDatabase();
}

// ========== 对账操作 ==========

function saveReconciliationTask(task) {
  const { task_no, task_type, date_range_start, date_range_end, created_by } = task;
  
  db.run(`
    INSERT INTO reconciliation_tasks (task_no, task_type, date_range_start, date_range_end, created_by)
    VALUES (
      '${escapeSql(task_no)}',
      '${escapeSql(task_type)}',
      '${escapeSql(date_range_start)}',
      '${escapeSql(date_range_end)}',
      '${escapeSql(created_by || '')}'
    )
  `);
  
  saveDatabase();
  return getReconciliationTask(task_no);
}

function getReconciliationTask(task_no) {
  const result = db.exec(`SELECT * FROM reconciliation_tasks WHERE task_no = '${escapeSql(task_no)}'`);
  if (!result.length || !result[0].values.length) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj = {};
  columns.forEach((col, i) => obj[col] = row[i]);
  return obj;
}

function getReconciliationTasks(filters = {}) {
  let query = 'SELECT * FROM reconciliation_tasks WHERE 1=1';
  
  if (filters.status) {
    query += ` AND status = '${escapeSql(filters.status)}'`;
  }
  if (filters.task_type) {
    query += ` AND task_type = '${escapeSql(filters.task_type)}'`;
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

function updateReconciliationTask(task_no, updates) {
  const fields = [];
  if (updates.status) fields.push(`status = '${escapeSql(updates.status)}'`);
  if (updates.total_records !== undefined) fields.push(`total_records = ${updates.total_records}`);
  if (updates.matched_records !== undefined) fields.push(`matched_records = ${updates.matched_records}`);
  if (updates.unmatched_records !== undefined) fields.push(`unmatched_records = ${updates.unmatched_records}`);
  if (updates.difference_amount !== undefined) fields.push(`difference_amount = ${updates.difference_amount}`);
  if (updates.report_url) fields.push(`report_url = '${escapeSql(updates.report_url)}'`);
  if (updates.completed_at) fields.push(`completed_at = '${escapeSql(updates.completed_at)}'`);
  
  if (fields.length > 0) {
    db.run(`UPDATE reconciliation_tasks SET ${fields.join(', ')} WHERE task_no = '${escapeSql(task_no)}'`);
    saveDatabase();
  }
  
  return getReconciliationTask(task_no);
}

function saveReconciliationDetail(detail) {
  const { task_no, record_type, record_id, expected_amount, actual_amount, difference_amount, status, remark } = detail;
  
  db.run(`
    INSERT INTO reconciliation_details (task_no, record_type, record_id, expected_amount, actual_amount, difference_amount, status, remark)
    VALUES (
      '${escapeSql(task_no)}',
      '${escapeSql(record_type)}',
      '${escapeSql(record_id || '')}',
      ${expected_amount || 0},
      ${actual_amount || 0},
      ${difference_amount || 0},
      '${escapeSql(status || 'matched')}',
      '${escapeSql(remark || '')}'
    )
  `);
  
  saveDatabase();
}

function getReconciliationDetails(task_no) {
  const result = db.exec(`SELECT * FROM reconciliation_details WHERE task_no = '${escapeSql(task_no)}'`);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function saveReconciliationDifference(diff) {
  const { task_no, difference_type, severity, description, suggested_action } = diff;
  
  db.run(`
    INSERT INTO reconciliation_differences (task_no, difference_type, severity, description, suggested_action)
    VALUES (
      '${escapeSql(task_no)}',
      '${escapeSql(difference_type)}',
      '${escapeSql(severity || 'medium')}',
      '${escapeSql(description || '')}',
      '${escapeSql(suggested_action || '')}'
    )
  `);
  
  saveDatabase();
  
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { id: result[0]?.values[0]?.[0], ...diff };
}

function getReconciliationDifferences(task_no) {
  const result = db.exec(`SELECT * FROM reconciliation_differences WHERE task_no = '${escapeSql(task_no)}'`);
  if (!result.length) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function updateReconciliationDifference(id, updates) {
  const fields = [];
  if (updates.status) fields.push(`status = '${escapeSql(updates.status)}'`);
  if (updates.resolved_by) fields.push(`resolved_by = '${escapeSql(updates.resolved_by)}'`);
  if (updates.resolved_at) fields.push(`resolved_at = '${escapeSql(updates.resolved_at)}'`);
  
  if (fields.length > 0) {
    db.run(`UPDATE reconciliation_differences SET ${fields.join(', ')} WHERE id = ${id}`);
    saveDatabase();
  }
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
  getNotifications,
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
  updateReconciliationDifference
};

-- 旅购通 SQLite 建表脚本（修复版）
-- 运行：sqlite3 data/qzt.db < scripts/init_tables.sql

-- 商户表
CREATE TABLE IF NOT EXISTS merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  out_request_no TEXT UNIQUE,
  enterprise_type TEXT,          -- 1=有限责任公司, 2=个体工商户, 3=个人
  register_name TEXT,
  legal_name TEXT,
  legal_mobile TEXT,
  business_license TEXT,         -- OSS URL
  status TEXT DEFAULT 'PENDING',
  qzt_account_no TEXT,
  qzt_merchant_no TEXT,
  qzt_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 账户表（映射钱账通支付账户）
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,
  account_no TEXT NOT NULL,
  account_type TEXT,             -- PERSONAL/ENTERPRISE
  status TEXT DEFAULT 'ACTIVE',
  balance INTEGER DEFAULT 0,    -- 缓存余额（分）
  frozen_balance INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 银行卡表
CREATE TABLE IF NOT EXISTS bank_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,
  account_no TEXT,
  bank_card_no TEXT,
  bank_name TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 门店表
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  store_name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 商终绑定表（一门店多商终）
CREATE TABLE IF NOT EXISTS store_terminals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  merchant_no TEXT NOT NULL,
  terminal_no TEXT NOT NULL,
  account_no TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- 交易订单表（含 merchant_id）
CREATE TABLE IF NOT EXISTS trade_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,
  out_order_no TEXT UNIQUE NOT NULL,
  account_no TEXT NOT NULL,
  payee_account_no TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  split_status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 交易流水表（从 QZT 通知创建）
CREATE TABLE IF NOT EXISTS trade_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  out_request_no TEXT,
  seq_no TEXT,
  amount INTEGER DEFAULT 0,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分账记录表
CREATE TABLE IF NOT EXISTS trade_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER,
  split_amount INTEGER DEFAULT 0,
  split_account_no TEXT,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 旅行团表
CREATE TABLE IF NOT EXISTS tour_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,
  group_name TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 团队成员表
CREATE TABLE IF NOT EXISTS tour_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER,
  member_name TEXT,
  role TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分账规则表
CREATE TABLE IF NOT EXISTS split_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,
  rule_name TEXT,
  rule_type TEXT,
  match_conditions TEXT,
  split_items TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分账模板表
CREATE TABLE IF NOT EXISTS split_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,
  template_name TEXT,
  split_items TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 通知记录表
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  out_request_no TEXT,
  notification_type TEXT,
  raw_payload TEXT,
  processed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'MERCHANT',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 对账差异表
CREATE TABLE IF NOT EXISTS reconciliation_differences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  merchant_id INTEGER,
  diff_type TEXT,
  amount INTEGER DEFAULT 0,
  description TEXT,
  resolved INTEGER DEFAULT 0,
  resolved_by TEXT,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
# 旅购通 BFF 升级实现计划

**目标：** 完成旅购通 BFF 升级，支持多账户模式、充值/提现/付款订单、门店商终管理、订单管理、批量分账、交易订阅

**架构：**
- BFF：Express + SQLite/sql.js（原地修复），阿里云 OSS 文件存储
- 数据定位：QZT 为支付账户权威源，本地 SQLite 为业务数据库（商户、分账规则、订单等）
- 文件：钱账通上传文件转存阿里云 OSS，本地 SQLite 仅存储 URL/元数据

**技术栈：** Node.js / Express, sql.js, ali-oss, axios, jsrsasign

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `bff-server/tools/oss-client.js` | 阿里云 OSS 封装，统一文件上传/下载 |
| `bff-server/tools/qzt-service.js` | QZT 接口调用封装（签名/验签/发请求） |
| `bff-server/db-migration.js` | 数据库迁移脚本（建表修复、金额字段统一为分） |
| `bff-server/routes/stores.js` | 门店管理路由（独立文件） |
| `bff-server/routes/terminals.js` | 商终管理路由（独立文件） |
| `bff-server/routes/orders.js` | 交易订单路由（独立文件） |
| `bff-server/routes/recharge.js` | 充值路由（独立文件） |
| `bff-server/routes/withdraw.js` | 提现路由（独立文件） |
| `bff-server/routes/upload.js` | 文件上传路由（OSS） |
| `bff-server/scripts/init_tables.sql` | SQLite 建表 SQL（含修复） |
| `bff-server/scripts/fix_default_now.js` | 修复 DEFAULT 'now' 的迁移脚本 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `bff-server/db-sqlite.js` | 清理重复导出（第707/730行），修复 DEFAULT 'now' |
| `bff-server/index.js` | 废弃 db.js，统一走 dbSqlite，挂载新路由 |
| `bff-server/package.json` | 添加 ali-oss 依赖 |
| `bff-server/.env.example` | 添加 OSS 环境变量 |

### 暂不动（本期不开干）

- `bff-server/db.js` — 标记 DEPRECATED，保留文件不删除
- Admin 前端 — 本次只做 BFF 层，前端改造另起计划
- UniApp 前端 — 本次只做 BFF 层，前端改造另起计划

---

## 第一阶段：技术债务修复（优先级最高）

### 任务 1：修复 db-sqlite.js 重复导出

**文件：**
- 修改：`bff-server/db-sqlite.js:698-740`

**步骤：**

- [ ] **步骤 1：读取 db-sqlite.js module.exports 区域，确认重复项**

运行：`grep -n "getAccounts\|saveAccount\|updateAccountBalance\|getAccountById" bff-server/db-sqlite.js | grep "^[0-9]*:module.exports\|^[0-9]*:  getAccounts\|^[0-9]*:  saveAccount\|^[0-9]*:  updateAccountBalance\|^[0-9]*:  getAccountById"`

目标：找到第 707 行和 730 行附近的重复导出，列出需要删除的行号

- [ ] **步骤 2：修复重复导出**

用 edit 工具删除第 730 行附近重复的以下导出：
```javascript
// 删除这4个（它们在707行已有）
getAccounts, getAccountById, saveAccount, updateAccountBalance,
```

修复后 module.exports 中每个导出只出现一次。

- [ ] **步骤 3：验证 getAccountsByMerchantId 能被正确导出**

运行：`node -e "const db = require('./bff-server/db-sqlite.js'); console.log(typeof db.getAccountsByMerchantId)"`

预期输出：`function`

- [ ] **步骤 4：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/db-sqlite.js
git commit -m "fix(db-sqlite): remove duplicate exports, restore getAccountsByMerchantId"
```

---

### 任务 2：修复建表语句 DEFAULT 'now' 语法错误

**文件：**
- 修改：`bff-server/db-sqlite.js`（全局替换）

**步骤：**

- [ ] **步骤 1：查找所有 DEFAULT 'now' 用法**

运行：`grep -n "DEFAULT 'now'" bff-server/db-sqlite.js`

列出所有出现行号。

- [ ] **步骤 2：全局替换为 CURRENT_TIMESTAMP**

运行：
```bash
sed -i "s/DEFAULT 'now'/DEFAULT CURRENT_TIMESTAMP/g" bff-server/db-sqlite.js
grep -n "DEFAULT 'now'" bff-server/db-sqlite.js
```

预期：grep 无输出（全部替换完成）

- [ ] **步骤 3：验证 SQLite 语法**

运行：
```bash
cd /home/admin/.openclaw/workspace/lvgot/bff-server
node -e "
const db = require('./db-sqlite.js');
// 测试初始化是否报错
db.initDatabase().then(() => {
  console.log('initDatabase OK');
  db.closeDatabase();
}).catch(e => console.error('ERROR:', e.message));
"

预期：无报错，输出 `initDatabase OK`

- [ ] **步骤 4：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/db-sqlite.js
git commit -m "fix(db-sqlite): replace DEFAULT 'now' with CURRENT_TIMESTAMP"
```

---

### 任务 3：废弃 db.js，统一走 dbSqlite

**文件：**
- 修改：`bff-server/index.js`（删除 db.js 引用，统一 dbSqlite）
- 修改：`bff-server/db.js`（文件头加 DEPRECATED 注释）

**步骤：**

- [ ] **步骤 1：确认 index.js 中所有数据库调用来源**

运行：`grep -n "require.*db\b\|require.*db-sqlite\|dbSqlite\|Low\|lowdb" bff-server/index.js`

目标：列出所有引用 LowDB/db.js 的地方。

- [ ] **步骤 2：确认 db.js 已不再被 index.js 加载**

运行：`grep -n "require.*db["']" bff-server/index.js`

如果无输出，说明 db.js 引用已清除，跳到步骤 4。

如果有输出，标记具体行号，提交给主开发者确认是删除还是保留。

- [ ] **步骤 3：给 db.js 加 DEPRECATED 注释**

用 edit 工具在 `bff-server/db.js` 第一行加：
```javascript
/**
 * @deprecated 本文件已废弃，所有数据库操作已迁移到 db-sqlite.js
 * 如需使用请 import { ... } from './db-sqlite'
 */
```

- [ ] **步骤 4：测试应用能正常启动**

运行：`cd /home/admin/.openclaw/workspace/lvgot/bff-server && timeout 10 node index.js 2>&1 | head -30`

预期：无声退出或显示 `listening` 字样，无数据库报错。

- [ ] **步骤 5：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/db.js bff-server/index.js
git commit -m "refactor(db): mark db.js deprecated, unify on dbSqlite"
```

---

## 第二阶段：OSS 文件存储

### 任务 4：安装 ali-oss 依赖

**文件：**
- 修改：`bff-server/package.json`

**步骤：**

- [ ] **步骤 1：安装 ali-oss**

运行：`cd /home/admin/.openclaw/workspace/lvgot/bff-server && npm install ali-oss --save`

- [ ] **步骤 2：验证安装**

运行：`node -e "require('ali-oss'); console.log('ali-oss OK')"`

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/package.json bff-server/package-lock.json
git commit -m "deps: add ali-oss for file storage"
```

---

### 任务 5：创建 OSS 客户端封装

**文件：**
- 创建：`bff-server/tools/oss-client.js`

**步骤：**

- [ ] **步骤 1：写 OSS 客户端封装**

写入以下完整代码：

```javascript
/**
 * 阿里云 OSS 文件存储客户端
 * 统一管理钱账通相关文件的上传/下载/删除
 */
const OSS = require('ali-oss');
const path = require('path');

// 单例
let client = null;

function getOSSClient() {
  if (!client) {
    client = new OSS({
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET,
    });
  }
  return client;
}

/**
 * 上传文件 Buffer 到 OSS
 * @param {string} targetPath - OSS 路径，如 'merchants/123/business_license.jpg'
 * @param {Buffer|string} fileContent - 文件内容
 * @param {string} contentType - MIME 类型
 * @returns {Promise<string>} - 文件访问 URL
 */
async function uploadFile(targetPath, fileContent, contentType) {
  const oss = getOSSClient();
  const result = await oss.put(targetPath, Buffer.from(fileContent), {
    contentType,
  });
  return result.url;
}

/**
 * 获取私有 bucket 的签名访问 URL
 * @param {string} targetPath - OSS 路径
 * @param {number} expires - 有效期（秒），默认 3600
 * @returns {Promise<string>} - 签名 URL
 */
async function getSignedUrl(targetPath, expires = 3600) {
  const oss = getOSSClient();
  return oss.signatureUrl(targetPath, { expires });
}

/**
 * 删除 OSS 文件
 * @param {string} targetPath - OSS 路径
 */
async function deleteFile(targetPath) {
  const oss = getOSSClient();
  await oss.delete(targetPath);
}

module.exports = {
  getOSSClient,
  uploadFile,
  getSignedUrl,
  deleteFile,
};
```

- [ ] **步骤 2：测试 OSS 客户端加载**

运行：`node -e "const oss = require('./bff-server/tools/oss-client.js'); console.log('oss-client OK')"`

预期：输出 `oss-client OK`

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/tools/oss-client.js
git commit -m "feat(oss): add aliyun OSS client wrapper"
```

---

## 第三阶段：QZT 接口服务层

### 任务 6：创建 QZT 服务层（签名/验签/发请求）

**文件：**
- 创建：`bff-server/tools/qzt-service.js`

**步骤：**

- [ ] **步骤 1：写 QZT 服务层封装**

基于 index.js 中已有 callQzt 函数，抽取为独立模块：

```javascript
/**
 * 钱账通（QZT）服务层
 * 统一封装签名、验签、接口调用
 */
const axios = require('axios');
const { KJUR } = require('jsrsasign');
const fs = require('fs');
const crypto = require('crypto');

const QZT_CONFIG = {
  appId: process.env.QZT_APP_ID || '',
  version: '4.0',
  gateway: process.env.QZT_GATEWAY_URL || 'https://test.wsmsd.cn/qzt/gateway/soa',
  privateKey: fs.readFileSync(process.env.QZT_PRIVATE_KEY_PATH || path.join(__dirname, '..', 'keys', 'private_key.pem'), 'utf8'),
  publicKey: fs.readFileSync(process.env.QZT_PUBLIC_KEY_PATH || path.join(__dirname, '..', 'keys', 'cloud_public_key.pem'), 'utf8'),
};

const { appId, version, gateway, privateKey, publicKey } = QZT_CONFIG;

// 签名
function sign(content) {
  const signer = new KJUR.Signature({ alg: 'SHA256withRSA' });
  signer.init(privateKey, true);
  signer.updateString(content);
  return signer.sign();
}

// 验签
function verify(data, signValue) {
  const verifier = new KJUR.Signature({ alg: 'SHA256withRSA' });
  verifier.init(publicKey, false);
  verifier.updateString(data);
  return verifier.verify(signValue);
}

// 发请求
async function callQzt(service, params = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsStr = JSON.stringify(params);
  const signContent = appId + timestamp + version + service + paramsStr;
  const signValue = sign(signContent);

  const body = {
    app_id: appId,
    timestamp,
    version,
    sign: signValue,
    service,
    params,
  };

  const response = await axios.post(gateway, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const { status, result, error_code, message, sign: responseSign } = response.data;

  // 验签
  if (status === 'SUCCESS' && responseSign) {
    const valid = verify(typeof result === 'string' ? result : JSON.stringify(result), responseSign);
    if (!valid) throw new Error('QZT response signature verify failed');
  }

  if (status === 'FAIL') {
    const err = new Error(`${error_code}: ${message}`);
    err.code = error_code;
    throw err;
  }

  return result;
}

// 解析通知验签（通知是 event 字段）
function verifyEvent(eventStr, signValue) {
  const verifier = new KJUR.Signature({ alg: 'SHA256withRSA' });
  verifier.init(publicKey, false);
  verifier.updateString(eventStr);
  return verifier.verify(signValue);
}

module.exports = {
  callQzt,
  verifyEvent,
  QZT_CONFIG,
};
```

- [ ] **步骤 2：测试加载**

运行：`node -e "const qzt = require('./bff-server/tools/qzt-service.js'); console.log('qzt-service OK', typeof qzt.callQzt)"`

预期：`qzt-service OK function`

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/tools/qzt-service.js
git commit -m "feat(qzt): extract QZT service layer for reuse across routes"
```

---

## 第四阶段：数据库表结构

### 任务 7：创建数据库迁移脚本

**文件：**
- 创建：`bff-server/scripts/init_tables.sql`
- 创建：`bff-server/scripts/fix_default_now.js`
- 修改：`bff-server/db-migration.js`

**步骤：**

- [ ] **步骤 1：写 init_tables.sql（含全部建表语句，修复 DEFAULT CURRENT_TIMESTAMP）**

写入完整 SQL（包含 merchants, accounts, bank_cards, transactions, split_records, stores, store_terminals, trade_orders, trade_payments, trade_splits 等表）：

```sql
-- 商户表
CREATE TABLE IF NOT EXISTS merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  out_request_no TEXT UNIQUE,
  enterprise_type TEXT,          -- 1=有限责任公司, 2=个体工商户, 3=个人
  register_name TEXT,
  legal_name TEXT,
  legal_mobile TEXT,
  business_license TEXT,          -- OSS URL
  status TEXT DEFAULT 'PENDING',
  qzt_account_no TEXT,
  qzt_merchant_no TEXT,
  qzt_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 账户表（映射钱账通账户）
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,
  account_no TEXT NOT NULL,
  account_type TEXT,              -- PERSONAL/ENTERPRISE
  status TEXT DEFAULT 'ACTIVE',
  balance INTEGER DEFAULT 0,
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

-- 交易订单表
CREATE TABLE IF NOT EXISTS trade_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  rule_type TEXT,                -- MANUAL/AUTO
  match_conditions TEXT,         -- JSON: {amount_range, payee_type}
  split_items TEXT,              -- JSON: [{account_no, percent}]
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分账模板表
CREATE TABLE IF NOT EXISTS split_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER,
  template_name TEXT,
  split_items TEXT,              -- JSON
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
```

- [ ] **步骤 2：写 fix_default_now.js 迁移脚本**

```javascript
/**
 * 修复 db-sqlite.js 中 DEFAULT 'now' 的迁移脚本
 * 执行一次即可，将所有 'now' 替换为 CURRENT_TIMESTAMP
 */
const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'db-sqlite.js');
let content = fs.readFileSync(dbFile, 'utf8');

const count = (content.match(/DEFAULT 'now'/g) || []).length;
console.log(`Found ${count} occurrences of DEFAULT 'now'`);

content = content.replace(/DEFAULT 'now'/g, 'DEFAULT CURRENT_TIMESTAMP');

fs.writeFileSync(dbFile, content);
console.log(`Fixed. Writing back to ${dbFile}`);
```

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/scripts/
git commit -m "scripts: add SQLite init_tables.sql and DEFAULT 'now' fix migration"
```

---

## 第五阶段：门店和商终管理

### 任务 8：创建商终管理接口（QZT 6.4/6.5）

**文件：**
- 创建：`bff-server/routes/terminals.js`
- 修改：`bff-server/index.js`（注册路由）

**步骤：**

- [ ] **步骤 1：写商终管理路由**

```javascript
/**
 * 商终管理路由
 * POST /api/terminals/bind   — QZT 6.4 商终绑定
 * POST /api/terminals/:id/unbind — QZT 6.5 商终解绑 + 删除本地记录
 * GET  /api/terminals        — 商终列表
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 商终绑定（QZT 6.4）
router.post('/bind', async (req, res) => {
  const { store_id, merchant_no, terminal_no, account_no } = req.body;
  if (!store_id || !merchant_no || !terminal_no) {
    return res.status(400).json({ code: 400, message: '缺少必填参数' });
  }

  // 调用 QZT 6.4
  const outRequestNo = 'BT_' + Date.now();
  const qztResult = await callQzt('terminal.bind', {
    out_request_no: outRequestNo,
    merchant_no,
    terminal_no,
    account_no: account_no || '',
  });

  // 保存本地记录
  dbSqlite.saveStoreTerminal({
    store_id,
    merchant_no,
    terminal_no,
    account_no: account_no || '',
    status: 'ACTIVE',
  });

  res.json({ code: 0, data: { out_request_no: outRequestNo, qzt_result: qztResult } });
});

// 商终解绑（QZT 6.5）
router.post('/:id/unbind', async (req, res) => {
  const { id } = req.params;

  // 查本地记录
  const terminals = dbSqlite.getStoreTerminalsByStoreId(null);
  const terminal = terminals.find(t => String(t.id) === String(id));
  if (!terminal) {
    return res.status(404).json({ code: 404, message: '商终记录不存在' });
  }

  // 调用 QZT 6.5 解绑
  const outRequestNo = 'UB_' + Date.now();
  await callQzt('terminal.unbind', {
    out_request_no: outRequestNo,
    merchant_no: terminal.merchant_no,
    terminal_no: terminal.terminal_no,
  });

  // 删除本地记录
  dbSqlite.deleteStoreTerminal(id);

  res.json({ code: 0, message: '解绑成功' });
});

// 商终列表（独立菜单）
router.get('/', async (req, res) => {
  const { store_id, merchant_id } = req.query;
  const terminals = dbSqlite.getStoreTerminalsByStoreId(store_id || null);
  const filtered = merchant_id
    ? terminals.filter(t => String(t.merchant_id) === String(merchant_id))
    : terminals;
  res.json({ code: 0, data: filtered });
});

module.exports = router;
```

注意：`getStoreTerminalsByStoreId(store_id)` 需接受 null 返回全部（db-sqlite.js 已支持）。

- [ ] **步骤 2：修改 index.js，注册新路由**

在 index.js 中找到路由注册区域，添加：
```javascript
const terminalsRouter = require('./routes/terminals');
app.use('/api/terminals', terminalsRouter);
```

- [ ] **步骤 3：验证路由挂载**

运行：`cd bff-server && node -e "require('./index.js'); console.log('routes loaded')"` 或检查路由文件语法。

- [ ] **步骤 4：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/routes/terminals.js bff-server/index.js
git commit -m "feat(terminals): add terminal bind/unbind routes (QZT 6.4/6.5)"
```

---

### 任务 9：创建门店管理路由

**文件：**
- 创建：`bff-server/routes/stores.js`
- 修改：`bff-server/index.js`

**步骤：**

- [ ] **步骤 1：写门店管理路由**

```javascript
/**
 * 门店管理路由
 * GET    /api/stores         — 门店列表
 * POST   /api/stores         — 创建门店
 * PUT    /api/stores/:id     — 更新门店
 * DELETE /api/stores/:id     — 删除门店
 * GET    /api/stores/:id/terminals — 门店下的商终列表
 */
const express = require('express');
const router = express.Router();
const dbSqlite = require('../db-sqlite');

// 门店列表
router.get('/', async (req, res) => {
  const { merchant_id } = req.query;
  const stores = dbSqlite.getStores ? dbSqlite.getStores(merchant_id) : [];
  res.json({ code: 0, data: stores });
});

// 创建门店
router.post('/', async (req, res) => {
  const { merchant_id, store_name } = req.body;
  if (!merchant_id || !store_name) {
    return res.status(400).json({ code: 400, message: '缺少必填参数' });
  }
  const store = dbSqlite.saveStore({ merchant_id, store_name, status: 'ACTIVE' });
  res.json({ code: 0, data: store });
});

// 更新门店
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { store_name, status } = req.body;
  // 暂用 saveStore 做 upsert
  const store = dbSqlite.saveStore({ id, store_name, status });
  res.json({ code: 0, data: store });
});

// 门店详情（含商终）
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const stores = dbSqlite.getStores ? dbSqlite.getStores() : [];
  const store = stores.find(s => String(s.id) === String(id));
  if (!store) return res.status(404).json({ code: 404, message: '门店不存在' });
  const terminals = dbSqlite.getStoreTerminalsByStoreId(id);
  res.json({ code: 0, data: { ...store, terminals } });
});

// 门店下的商终
router.get('/:id/terminals', async (req, res) => {
  const { id } = req.params;
  const terminals = dbSqlite.getStoreTerminalsByStoreId(id);
  res.json({ code: 0, data: terminals });
});

module.exports = router;
```

注意：需要确认 db-sqlite.js 中有 `saveStore` 和 `getStores` 方法。如果没有，需要添加（参考 accounts 的实现模式）。

- [ ] **步骤 2：修改 index.js 注册路由**

添加：
```javascript
const storesRouter = require('./routes/stores');
app.use('/api/stores', storesRouter);
```

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/routes/stores.js bff-server/index.js
git commit -m "feat(stores): add store management routes"
```

---

## 第六阶段：充值、提现、订单

### 任务 10：创建充值路由

**文件：**
- 创建：`bff-server/routes/recharge.js`
- 修改：`bff-server/index.js`

**步骤：**

- [ ] **步骤 1：写充值路由**

```javascript
/**
 * 充值路由
 * POST /api/recharge/apply   — 发起充值（QZT 7.9）
 * GET  /api/recharge/status   — 查询充值状态（QZT 7.10）
 * GET  /api/recharge/records  — 充值记录列表
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 发起充值
router.post('/apply', async (req, res) => {
  const { account_no, amount, remark } = req.body;
  if (!account_no || !amount) {
    return res.status(400).json({ code: 400, message: '缺少必填参数：account_no, amount' });
  }

  const account = dbSqlite.getAccounts().find(a => a.account_no === account_no);
  if (!account) return res.status(404).json({ code: 404, message: '账户不存在' });
  if (account.account_type === 'PERSONAL') {
    return res.status(400).json({ code: 400, message: '个人账户不支持充值' });
  }

  const outRequestNo = 'RC_' + Date.now();
  const result = await callQzt('account.recharge', {
    out_request_no: outRequestNo,
    account_no,
    amount: Math.round(parseFloat(amount) * 100), // 转为分
    remark: remark || '',
  });

  // 记录本地
  dbSqlite.saveTransaction({
    merchant_id: account.merchant_id,
    out_request_no: outRequestNo,
    transaction_type: 'RECHARGE',
    amount,
    status: 'PENDING',
    qzt_response: result,
  });

  res.json({ code: 0, data: { out_request_no: outRequestNo, result } });
});

// 查询充值状态
router.get('/status', async (req, res) => {
  const { out_request_no } = req.query;
  if (!out_request_no) return res.status(400).json({ code: 400, message: '缺少 out_request_no' });
  const result = await callQzt('account.recharge.query', { out_request_no });
  res.json({ code: 0, data: result });
});

// 充值记录
router.get('/records', async (req, res) => {
  const { merchant_id, limit = 50, offset = 0 } = req.query;
  const txs = dbSqlite.getTransactions({
    merchant_id: merchant_id ? parseInt(merchant_id) : null,
    type: 'RECHARGE',
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json({ code: 0, data: txs });
});

module.exports = router;
```

- [ ] **步骤 2：注册路由（在 index.js 添加）**

```javascript
const rechargeRouter = require('./routes/recharge');
app.use('/api/recharge', rechargeRouter);
```

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/routes/recharge.js bff-server/index.js
git commit -m "feat(recharge): add recharge routes (QZT 7.9/7.10)"
```

---

### 任务 11：创建提现路由

**文件：**
- 创建：`bff-server/routes/withdraw.js`
- 修改：`bff-server/index.js`

**步骤：**

- [ ] **步骤 1：写提现路由**

```javascript
/**
 * 提现路由
 * POST /api/withdraw/apply     — 发起提现申请（QZT 7.3）
 * POST /api/withdraw/send-sms  — 发送短信验证码（QZT 7.5）
 * POST /api/withdraw/confirm   — 确认提现（QZT 7.6）
 * GET  /api/withdraw/records   — 提现记录
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 发起提现申请
router.post('/apply', async (req, res) => {
  const { account_no, amount, bank_card_no, remark } = req.body;
  if (!account_no || !amount) {
    return res.status(400).json({ code: 400, message: '缺少必填参数' });
  }

  const outRequestNo = 'WD_' + Date.now();
  const result = await callQzt('account.withdraw.apply', {
    out_request_no: outRequestNo,
    account_no,
    amount: Math.round(parseFloat(amount) * 100),
    bank_card_no: bank_card_no || '',
    remark: remark || '',
  });

  dbSqlite.saveTransaction({
    merchant_id: 0,
    out_request_no: outRequestNo,
    transaction_type: 'WITHDRAW',
    amount,
    bank_card_no,
    status: 'PENDING',
    qzt_response: result,
  });

  res.json({ code: 0, data: { out_request_no: outRequestNo, result } });
});

// 发送短信
router.post('/send-sms', async (req, res) => {
  const { out_request_no } = req.body;
  const result = await callQzt('account.withdraw.send.sms', {
    out_request_no,
  });
  res.json({ code: 0, data: result });
});

// 确认提现
router.post('/confirm', async (req, res) => {
  const { out_request_no, sms_code } = req.body;
  const result = await callQzt('account.withdraw.confirm', {
    out_request_no,
    sms_code,
  });
  res.json({ code: 0, data: result });
});

// 提现记录
router.get('/records', async (req, res) => {
  const { merchant_id, limit = 50, offset = 0 } = req.query;
  const txs = dbSqlite.getTransactions({
    merchant_id: merchant_id ? parseInt(merchant_id) : null,
    type: 'WITHDRAW',
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json({ code: 0, data: txs });
});

module.exports = router;
```

- [ ] **步骤 2：注册路由**

```javascript
const withdrawRouter = require('./routes/withdraw');
app.use('/api/withdraw', withdrawRouter);
```

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/routes/withdraw.js bff-server/index.js
git commit -m "feat(withdraw): add withdraw routes (QZT 7.3/7.5/7.6)"
```

---

### 任务 12：创建交易订单路由

**文件：**
- 创建：`bff-server/routes/orders.js`
- 修改：`bff-server/index.js`

**步骤：**

- [ ] **步骤 1：写交易订单路由**

```javascript
/**
 * 交易订单路由
 * GET  /api/orders        — 订单列表（平台查所有，商户查自己）
 * POST /api/orders        — 创建付款订单
 * GET  /api/orders/:id    — 订单详情
 * POST /api/orders/:id/splits — 手动分账（QZT 7.1）
 * POST /api/orders/batch  — 批量创建订单
 */
const express = require('express');
const router = express.Router();
const { callQzt } = require('../tools/qzt-service');
const dbSqlite = require('../db-sqlite');

// 订单列表
router.get('/', async (req, res) => {
  const { merchant_id, status, limit = 50, offset = 0 } = req.query;
  const orders = dbSqlite.getTradeOrders({
    merchant_id: merchant_id ? parseInt(merchant_id) : null,
    status,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  res.json({ code: 0, data: orders });
});

// 创建订单
router.post('/', async (req, res) => {
  const { out_order_no, account_no, payee_account_no, amount } = req.body;
  if (!out_order_no || !account_no ||  amount, status: 'PENDING' });
  res.json({ code: 0, data: order });
});

// 订单详情
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const order = dbSqlite.getTradeOrderById(id);
  if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
  const payments = dbSqlite.getTradePaymentsByOrderId(id);
  res.json({ code: 0, data: { ...order, payments } });
});

// 手动分账
router.post('/:id/splits', async (req, res) => {
  const { id } = req.params;
  const order = dbSqlite.getTradeOrderById(id);
  if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });

  const outSplitNo = 'SP_' + Date.now();
  const result = await callQzt('trade.balance.split', {
    out_split_no: outSplitNo,
    account_no: order.account_no,
    amount: order.amount,
    payee_list: req.body.payee_list, // [{account_no, amount}]
  });

  // 保存分账记录
  dbSqlite.saveTradeSplit({
    payment_id: id,
    split_amount: order.amount,
    status: 'PENDING',
  });

  res.json({ code: 0, data: { out_split_no: outSplitNo, result } });
});

// 批量创建订单
router.post('/batch', async (req, res) => {
  const { orders } = req.body; // [{out_order_no, account_no, payee_account_no, amount}]
  if (!Array.isArray(orders)) {
    return res.status(400).json({ code: 400, message: 'orders 必须是数组' });
  }
  const results = orders.map(o => {
    const order = dbSqlite.saveTradeOrder({
      out_order_no: o.out_order_no || 'ORD_' + Date.now() + Math.random().toString(36).slice(2),
      account_no: o.account_no,
      payee_account_no: o.payee_account_no || '',
      amount: Math.round(parseFloat(o.amount || 0) * 100),
      status: 'PENDING',
    });
    return { out_order_no: o.out_order_no, order };
  });
  res.json({ code: 0, data: results });
});

module.exports = router;
```

- [ ] **步骤 2：注册路由**

在 index.js 添加：
```javascript
const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);
```

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/routes/orders.js bff-server/index.js
git commit -m "feat(orders): add trade order routes with batch support"
```

---

## 第七阶段：交易通知 Webhook

### 任务 13：完善 QZT 交易通知 Webhook

**文件：**
- 修改：`bff-server/index.js`（增强 `/api/trade/callback`）

**步骤：**

- [ ] **步骤 1：确认现有 Webhook 路由**

运行：`grep -n "trade.callback\|trade/callback\|trade.notify" bff-server/index.js`

- [ ] **步骤 2：增强 Webhook 处理逻辑**

找到现有的 `/api/trade/callback` 路由（约第 2491 行），增强处理：

```javascript
// POST /api/trade/callback — QZT 交易通知（8.4）
app.post('/api/trade/callback', async (req, res) => {
  const { event_type, event, sign } = req.body;

  // 1. 验签
  if (!verifyEvent(JSON.stringify(event), sign)) {
    return res.status(400).send('FAIL');
  }

  // 2. 写 notification 日志
  const notifId = dbSqlite.saveNotification({
    out_request_no: event.out_request_no || event.out_split_no || '',
    notification_type: event_type,
    raw_payload: JSON.stringify(event),
    processed: 0,
  });

  // 3. 根据事件类型处理
  if (event_type === 'trade.notify') {
    // 交易通知 → 创建/更新订单
    const order = dbSqlite.saveTradeOrder({
      out_order_no: event.out_order_no,
      account_no: event.account_no || '',
      payee_account_no: event.payee_account_no || '',
      amount: parseInt(event.amount || 0),
      status: event.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
      split_status: 'UNSPLIT',
    });

    // 4. 自动分账规则匹配（可选，本期先记录人工处理）
    // autoSplit(order);
  }

  // 4. 标记已处理
  dbSqlite.markNotificationProcessed(notifId);

  res.send('SUCCESS');
});
```

- [ ] **步骤 3：确保 getTradeOrderById / saveTradeOrder 等方法存在**

运行：`grep -n "getTradeOrderById\|saveTradeOrder\|getTradeOrders" bff-server/db-sqlite.js`

如果方法不存在，需要在 db-sqlite.js 中添加（参考 accounts 的实现模式，参考 schema）。

- [ ] **步骤 4：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/index.js
git commit -m "feat(webhook): enhance trade callback with order creation and notification logging"
```

---

## 第八阶段：企业商户银行内部户开户

### 任务 14：增强商户开户路由（支持企业银行内部户）

**文件：**
- 修改：`bff-server/index.js`

**步骤：**

- [ ] **步骤 1：找到现有商户路由**

运行：`grep -n "open.pay.account\|open.bank.account\|merchant/enterprise\|bank-account" bff-server/index.js`

- [ ] **步骤 2：添加银行内部户开户接口**

在商户相关路由区域添加：

```javascript
// POST /api/merchant/bank-account-page — 获取银行内部户开户页面（QZT 6.1）
app.post('/api/merchant/bank-account-page', async (req, res) => {
  const { merchant_id, register_name, legal_mobile, enterprise_type, back_url } = req.body;

  const merchant = await dbSqlite.getMerchantById(merchant_id);
  if (!merchant) return res.status(404).json({ code: 404, message: '商户不存在' });
  if (enterprise_type === '3') {
    return res.status(400).json({ code: 400, message: '个人商户无需银行内部户' });
  }

  const outRequestNo = 'BA_' + Date.now();
  const result = await callQzt('open.bank.account.page.url', {
    out_request_no: outRequestNo,
    register_name: register_name || merchant.register_name,
    legal_mobile: legal_mobile || merchant.legal_mobile,
    enterprise_type: enterprise_type || merchant.enterprise_type,
    back_url: back_url || `${QZT_CALLBACK_URL}/api/merchant/callback?out_request_no=${outRequestNo}`,
  });

  res.json({ code: 0, data: { redirect_url: result.redirect_url, out_request_no: outRequestNo } });
});

// GET /api/merchant/bank-account-query — 查询银行开户凭证（QZT 6.12）
app.get('/api/merchant/bank-account-query', async (req, res) => {
  const { out_request_no } = req.query;
  if (!out_request_no) return res.status(400).json({ code: 400, message: '缺少 out_request_no' });
  const result = await callQzt('open.bank.account.voucher.query', { out_request_no });
  res.json({ code: 0, data: result });
});
```

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/index.js
git commit -m "feat(merchant): add bank internal account open and query routes (QZT 6.1/6.12)"
```

---

## 第九阶段：OSS 文件上传路由

### 任务 15：创建文件上传路由

**文件：**
- 创建：`bff-server/routes/upload.js`
- 修改：`bff-server/index.js`

**步骤：**

- [ ] **步骤 1：写文件上传路由**

```javascript
/**
 * 文件上传路由
 * POST /api/upload/merchant-files — 商户证件上传（营业执照/身份证等）
 * POST /api/upload/bank-card-files — 银行卡照片上传
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { uploadFile, getSignedUrl } = require('../tools/oss-client');

// 商户证件上传
router.post('/merchant-files', async (req, res) => {
  const { merchant_id, file_type, file_content, file_name } = req.body;
  // file_type: business_license / legal_id_front / legal_id_back / account_license
  if (!merchant_id || !file_type || !file_content) {
    return res.status(400).json({ code: 400, message: '缺少必填参数' });
  }

  const ossPath = `merchants/${merchant_id}/${file_type}/${file_name || path.basename(file_name || 'file')}`;
  const url = await uploadFile(ossPath, Buffer.from(file_content, 'base64'), 'application/octet-stream');

  res.json({ code: 0, data: { url, path: ossPath } });
});

// 银行卡照片上传
router.post('/bank-card-files', async (req, res) => {
  const { card_id, file_content, file_name } = req.body;
  if (!card_id || !file_content) {
    return res.status(400).json({ code: 400, message: '缺少必填参数' });
  }

  const ossPath = `bank_cards/${card_id}/${file_name || 'photo.jpg'}`;
  const url = await uploadFile(ossPath, Buffer.from(file_content, 'base64'), 'image/jpeg');

  res.json({ code: 0, data: { url, path: ossPath } });
});

// 获取私有文件访问签名 URL
router.get('/signed-url', async (req, res) => {
  const { file_path, expires } = req.query;
  if (!file_path) return res.status(400).json({ code: 400, message: '缺少 file_path' });
  const url = await getSignedUrl(file_path, parseInt(expires || 3600));
  res.json({ code: 0, data: { url } });
});

module.exports = router;
```

- [ ] **步骤 2：注册路由**

```javascript
const uploadRouter = require('./routes/upload');
app.use('/api/upload', uploadRouter);
```

- [ ] **步骤 3：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/routes/upload.js bff-server/index.js
git commit -m "feat(upload): add OSS file upload routes"
```

---

## 第十阶段：db-sqlite.js 补全缺失方法

### 任务 16：确认并补全 db-sqlite.js 中缺失的方法

**文件：**
- 修改：`bff-server/db-sqlite.js`

**步骤：**

- [ ] **步骤 1：检查缺失方法**

运行：
```bash
cd /home/admin/.openclaw/workspace/lvgot/bff-server
node -e "
const db = require('./db-sqlite.js');
const methods = [
  'saveStore', 'getStores',
  'getStoreTerminalsByStoreId', 'saveStoreTerminal', 'deleteStoreTerminal',
  'saveTradeOrder', 'getTradeOrders', 'getTradeOrderById',
  'getTradePaymentsByOrderId', 'saveTradeSplit',
  'getStores'
];
methods.forEach(m => console.log(m + ':', typeof db[m]));
"
```

- [ ] **步骤 2：识别缺失的方法**

列表中 `typeof` 为 `undefined` 的需要添加。

- [ ] **步骤 3：添加缺失方法**

每个方法参考以下模式添加到 db-sqlite.js 末尾（在 module.exports 之前）：

```javascript
// ========== 门店 ==========
function saveStore(store) {
  const { id, merchant_id, store_name, status } = store;
  if (id) {
    db.run('UPDATE stores SET store_name=?, status=? WHERE id=?', [store_name, status || 'ACTIVE', parseInt(id)]);
    saveDatabase(); return store;
  }
  db.run('INSERT INTO stores (merchant_id, store_name, status) VALUES (?, ?, ?)', [parseInt(merchant_id), store_name, status || 'ACTIVE']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...store };
}

function getStores(merchant_id = null) {
  const result = merchant_id
    ? db.exec('SELECT * FROM stores WHERE merchant_id=?', [parseInt(merchant_id)])
    : db.exec('SELECT * FROM stores');
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

// ========== 交易订单 ==========
function saveTradeOrder(order) {
  const { out_order_no, account_no, payee_account_no, amount, status, split_status } = order;
  const existing = db.exec('SELECT id FROM trade_orders WHERE out_order_no=?', [out_order_no]);
  if (existing.length && existing[0].values.length) {
    db.run('UPDATE trade_orders SET status=?, split_status=? WHERE out_order_no=?', [status, split_status || '', out_order_no]);
    saveDatabase(); return order;
  }
  db.run('INSERT INTO trade_orders (out_order_no, account_no, payee_account_no, amount, status, split_status) VALUES (?, ?, ?, ?, ?, ?)', [out_order_no, account_no, payee_account_no || '', Math.round(amount || 0), status || 'PENDING', split_status || '']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...order };
}

function getTradeOrders({ merchant_id, status, limit = 50, offset = 0 } = {}) {
  let query = 'SELECT * FROM trade_orders WHERE 1=1';
  const params = [];
  if (merchant_id) { query += ' AND merchant_id=?'; params.push(merchant_id); }
  if (status) { query += ' AND status=?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const result = db.exec(query, params);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function getTradeOrderById(id) {
  const result = db.exec('SELECT * FROM trade_orders WHERE id=?', [parseInt(id)]);
  if (!result.length || !result[0].values.length) return null;
  return _rowToObj(result[0].columns, result[0].values[0]);
}

function getTradePaymentsByOrderId(orderId) {
  const result = db.exec('SELECT * FROM trade_payments WHERE order_id=?', [parseInt(orderId)]);
  if (!result.length) return [];
  return result[0].values.map(row => _rowToObj(result[0].columns, row));
}

function saveTradeSplit(split) {
  const { payment_id, split_amount, split_account_no, status } = split;
  db.run('INSERT INTO trade_splits (payment_id, split_amount, split_account_no, status) VALUES (?, ?, ?, ?)', [parseInt(payment_id) || 0, Math.round(split_amount || 0), split_account_no || '', status || 'PENDING']);
  saveDatabase();
  const r = db.exec('SELECT last_insert_rowid() as id');
  return { id: r[0]?.values[0]?.[0], ...split };
}
```

- [ ] **步骤 4：更新 module.exports**

确保新增方法都在 module.exports 中导出。

- [ ] **步骤 5：Commit**

```bash
cd /home/admin/.openclaw/workspace/lvgot
git add bff-server/db-sqlite.js
git commit -m "feat(db): add missing store and trade_order methods to db-sqlite"
```

---

## 自审清单

完成所有任务后，逐项检查：

| 检查项 | 确认 |
|--------|------|
| 规格覆盖：账户列表多账户模式 | 任务 1-3, 16 |
| 规格覆盖：充值页面选账户 | 任务 10 |
| 规格覆盖：提现入口移至账户子功能 | 任务 11 |
| 规格覆盖：付款订单选账户 | 任务 12 |
| 规格覆盖：门店管理 + 商终绑定/解绑 | 任务 8, 9 |
| 规格覆盖：企业商户银行内部户开户 | 任务 14 |
| 规格覆盖：订单管理 + 交易订阅 | 任务 12, 13 |
| 规格覆盖：批量分账 | 任务 12 |
| 规格覆盖：OSS 文件存储 | 任务 4, 5, 15 |
| 技术债务：getAccountsByMerchantId 修复 | 任务 1 |
| 技术债务：DEFAULT 'now' 修复 | 任务 2 |
| 技术债务：废弃 db.js | 任务 3 |
| QZT API：6.1 银行开户页面 | 任务 14 |
| QZT API：6.4/6.5 商终绑定/解绑 | 任务 8 |
| QZT API：7.3/7.5/7.6 提现 | 任务 11 |
| QZT API：7.9/7.10 充值 | 任务 10 |
| QZT API：8.4 交易通知 | 任务 13 |

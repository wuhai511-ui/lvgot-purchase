# 旅购通 BFF 升级技术设计方案

**项目：** 旅购通分账通道升级
**日期：** 2026-04-16
**状态：** 已确认
**版本：** v1.0

---

## 一、背景与目标

### 现状
- BFF 层：`/home/admin/.openclaw/workspace/lvgot/bff-server/`（Express + SQLite/sql.js）
- 前端 Admin：`/home/admin/.openclaw/workspace/lvgot/admin/`（Vue3）
- 前端 UniApp：`/home/admin/.openclaw/workspace/lvgot/uniapp/`（UniApp）
- 支付通道：钱账通（QZT，拉卡拉支付账户体系）

### 现有问题
1. `db-sqlite.js` 的 `module.exports` 中有重复导出（第 707 行和 730 行），导致 `getAccountsByMerchantId is not a function`
2. 建表语句使用 `DEFAULT 'now'`（字符串），SQLite 不支持，应为 `CURRENT_TIMESTAMP`
3. `db.js`（LowDB/JSON）和 `db-sqlite.js`（SQLite）两套并存，调用关系混乱
4. 文件（证件照、营业执照）存储在本地或 Base64，缺乏统一管理

### 升级目标
1. 统一数据库到 SQLite，废弃 LowDB
2. 接入阿里云 OSS 存储上传文件
3. 完成 8 项功能升级（账户管理、充值、提现、付款订单、门店商终、订单管理、批量分账）
4. 接入 QZT 完整交易通知体系

---

## 二、数据架构

### 2.1 数据库定位

| 数据类型 | 存储位置 | 说明 |
|---------|---------|------|
| 商户业务属性（角色、旅行社/导游/司机） | 本地 SQLite | 钱账通无此概念 |
| 分账规则和模板 | 本地 SQLite | 业务逻辑层 |
| 旅行团和成员 | 本地 SQLite | 业务逻辑层 |
| 支付账户信息（account_no、余额） | 钱账通（QZT）为权威源，本地 SQLite 缓存 | 调用 QZT 接口获取/同步 |
| 银行内部户 | 钱账通（QZT）为权威源，本地 SQLite 缓存 | 可选开立 |
| 交易订单（trade_orders） | 本地 SQLite | 基于 QZT 交易通知创建 |
| 商户号/终端号绑定关系 | 本地 SQLite | 业务配置数据 |
| 证件照、营业执照等文件 | 阿里云 OSS | 替换本地存储 |

### 2.2 钱账通账户体系映射

钱账通账户类型：
- **支付账户**：企业/个人在钱账通的资金账户（必须开立）
- **银行内部户**：企业可选开立，用于资金调拨（QZT 自动调拨）

本地 `accounts` 表映射钱账通支付账户，一个商户号（merchant_no）可对应多个 account_no。

### 2.3 数据库修复

**修复 1：清理重复导出**
```javascript
// db-sqlite.js module.exports 清理后
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
  // ... 其他导出（去重）
};
```

**修复 2：建表语句 `DEFAULT 'now'` → `CURRENT_TIMESTAMP`**
```sql
-- 错误
created_at DATETIME DEFAULT 'now'

-- 正确
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

**修复 3：废弃 db.js（LowDB）**
- 所有数据库操作统一走 `dbSqlite`（db-sqlite.js）
- 删除 `index.js` 中对 db.js 的引用

---

## 三、功能模块设计

### 3.1 账户管理（需求 1）

**BFF 接口：**
- `GET /api/accounts` — 获取账户列表（按 merchant_id），余额从 QZT `account.info.query` 获取
- `GET /api/accounts/:id` — 账户详情
- `GET /api/accounts/:id/balance` — 查询余额（调 QZT 7.7 接口）
- `POST /api/bank-cards/bind` — 绑定银行卡（QZT 6.6）
- `POST /api/bank-cards/unbind` — 解绑银行卡（QZT 6.7）
- `GET /api/bank-cards` — 银行卡列表

**数据库表：**
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  account_no TEXT NOT NULL,        -- 钱账通账户号
  account_type TEXT,               -- PERSONAL/ENTERPRISE
  status TEXT DEFAULT 'ACTIVE',
  balance INTEGER DEFAULT 0,      -- 缓存余额（分）
  frozen_balance INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 充值（需求 2）

**前置条件：** 个人账户不支持充值

**流程：**
1. 用户选择充值账户（从账户列表选）
2. 用户填写充值金额
3. BFF 调用 QZT `account.recharge`（7.9）
4. 返回充值信息（跳转页面或结果）给前端展示

**BFF 接口：**
- `POST /api/recharge/apply` — 发起充值申请（调 QZT 7.9）
- `GET /api/recharge/status` — 查询充值状态（调 QZT 7.10）
- `GET /api/recharge/records` — 充值记录列表

### 3.3 提现（需求 3）

**前置条件：** 提现入口从独立菜单移至账户列表的子功能

**流程：**
1. 用户在账户列表点击某账户的"提现"按钮
2. 填写提现金额、选择到账银行卡
3. BFF 调用 QZT `account.withdraw.apply`（7.3）
4. 短信验证 → 确认提现（7.5/7.6）

**BFF 接口：**
- `POST /api/withdraw/apply` — 发起提现申请（QZT 7.3）
- `POST /api/withdraw/send-sms` — 发送短信（QZT 7.5）
- `POST /api/withdraw/confirm` — 确认提现（QZT 7.6）
- `GET /api/withdraw/records` — 提现记录

### 3.4 付款订单（需求 4）

**流程：**
1. 商户财务选择付款账户（从账户列表选）
2. 填写付款信息（收款方、金额）
3. BFF 创建付款订单记录（本地）
4. 调用 QZT 扣款/分账接口

**数据库表：**
```sql
CREATE TABLE trade_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  out_order_no TEXT UNIQUE NOT NULL,     -- 商户侧订单号
  account_no TEXT NOT NULL,              -- 付款账户
  payee_account_no TEXT,                -- 收款方账户
  amount INTEGER NOT NULL,                -- 金额（分）
  status TEXT DEFAULT 'PENDING',         -- PENDING/SUCCESS/FAILED
  split_status TEXT,                      -- 分账状态
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**BFF 接口：**
- `POST /api/orders` — 创建付款订单
- `GET /api/orders` — 订单列表（平台查所有，商户查自己）
- `GET /api/orders/:id` — 订单详情

### 3.5 批量分账（需求 8）

**流程：**
1. 商户财务选择付款账户
2. 上传/填写批量付款清单（out_order_no + 金额 + 收款方）
3. BFF 调用 QZT 批量分账接口
4. 返回批量处理结果

**BFF 接口：**
- `POST /api/orders/batch` — 批量创建订单
- `POST /api/split/batch-apply` — 批量分账申请（调 QZT 7.1/7.2）

### 3.6 门店管理（需求 5 & 6.4/6.5）

**门店表结构（一门店多商终）：**
```sql
CREATE TABLE stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL,
  store_name TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE store_terminals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  merchant_no TEXT NOT NULL,
  terminal_no TEXT NOT NULL,
  account_no TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);
-- 一门店多商终：同一 store_id 可有多条 merchant_no + terminal_no 组合
```

**BFF 接口：**
- `GET /api/stores` — 门店列表
- `POST /api/stores` — 创建门店
- `PUT /api/stores/:id` — 更新门店
- `POST /api/stores/:id/terminals` — 绑定商终（QZT 6.4）
- `DELETE /api/stores/:store_id/terminals/:id` — 解绑商终（QZT 6.5 + 删除本地记录）
- `GET /api/terminals` — 商终管理列表（独立菜单）
- `POST /api/terminals/:id/unbind` — 商终解绑

### 3.7 企业商户银行内部户开户（需求 6 & 6.1）

**企业商户定义：**
- `enterprise_type = '1'`：有限责任公司
- `enterprise_type = '2'`：个体工商户

**开户流程：**
```
企业/个体工商户
    ↓
① 先开支付账户（QZT 6.2）— 必须
    ↓
② 可选开银行内部户（QZT 6.1）
    ↓
③ 分账/提现时如余额不足 → QZT 自动从银行内部户调拨
```

**BFF 接口：**
- `POST /api/merchant/enterprise-account-page` — 获取支付开户页面（QZT 6.2）
- `POST /api/merchant/bank-account-page` — 获取银行内部户开户页面（QZT 6.1）
- `GET /api/merchant/bank-account-query` — 查询银行开户凭证（QZT 6.12）

### 3.8 订单管理 + 交易订阅（需求 7）

**Webhook 接收（QZT → BFF）：**
- 路径：`POST /api/trade/callback`
- 事件类型：`trade.notify`（8.4 交易通知）
- 处理逻辑：
  1. 验签（QZT 公钥）
  2. 解析交易通知内容
  3. 创建/更新 `trade_orders` 记录
  4. 如有自动分账规则匹配，执行分账

**自动分账规则：**
- 订单模板 + 匹配规则（如：金额区间、收款方类型）
- 命中规则 → 自动生成分账申请 → 调 QZT 分账接口
- 不匹配 → 等待手动分账

**BFF 接口：**
- `GET /api/orders` — 订单列表（支持平台/商户权限过滤）
- `GET /api/orders/:id` — 订单详情
- `POST /api/orders/:id/splits` — 手动分账
- `GET /api/split/templates` — 分账模板列表
- `POST /api/split/templates` — 创建分账模板

---

## 四、OSS 文件存储方案

### 4.1 集成方式

使用阿里云 OSS SDK（`ali-oss`）：

```javascript
const OSS = require('ali-oss');
const client = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});
```

### 4.2 文件分类

| 文件类型 | OSS 路径格式 | 说明 |
|---------|-------------|------|
| 营业执照 | `merchants/{merchant_id}/business_license/{filename}` | 企业/个体工商户 |
| 法人身份证正面 | `merchants/{merchant_id}/legal_id_front/{filename}` | |
| 法人身份证反面 | `merchants/{merchant_id}/legal_id_back/{filename}` | |
| 开户许可证 | `merchants/{merchant_id}/account_license/{filename}` | 企业 |
| 银行卡照片 | `bank_cards/{card_id}/{filename}` | |
| 门店照片 | `stores/{store_id}/{filename}` | |

### 4.3 BFF 接口

- `POST /api/upload/merchant-files` — 商户证件上传（返回 OSS URL）
- `POST /api/upload/bank-card-files` — 银行卡照片上传
- `GET /api/files/:type/:id/:filename` — 文件访问（私有 bucket 用签名 URL）

---

## 五、技术债务修复（优先级最高）

### 5.1 Bug 修复清单

| # | 问题 | 修复方案 | 文件 |
|---|------|---------|------|
| 1 | `getAccountsByMerchantId is not a function` | 清理 db-sqlite.js 重复导出，确认 exports 正确 | db-sqlite.js |
| 2 | `DEFAULT 'now'` 语法错误 | 全局替换为 `CURRENT_TIMESTAMP` | db-sqlite.js |
| 3 | db.js（LowDB）与 db-sqlite.js 混用 | 废弃 db.js，统一走 dbSqlite | index.js |
| 4 | 商终绑定/解绑接口缺失 | 实现 QZT 6.4/6.5 + 本地记录管理 | index.js |

### 5.2 重构清单

- `db.js` 文件保留但标记废弃（`// DEPRECATED`），不删除，便于回滚
- `index.js` 中所有 `require('./db')` 替换为 `require('./db-sqlite')`
- 数据库初始化统一在 `db-sqlite.js` 的 `initDatabase()`

---

## 六、QZT 接口对接矩阵

| 功能 | QZT 接口（service）| 说明 |
|------|-------------------|------|
| 账户余额查询 | `account.info.query` | 7.7 |
| 账户充值 | `account.recharge` | 7.9 |
| 充值查询 | `account.recharge.query` | 7.10 |
| 账户提现申请 | `account.withdraw.apply` | 7.3 |
| 提现短信发送 | `account.withdraw.send.sms` | 7.5 |
| 提现确认 | `account.withdraw.confirm` | 7.6 |
| 商终绑定 | `terminal.bind` | 6.4 |
| 商终解绑 | `terminal.unbind` | 6.5 |
| 商终查询 | `terminal.query` | 6.8 |
| 银行卡绑定 | `bank.card.bind` | 6.6 |
| 银行卡解绑 | `bank.card.unbind` | 6.7 |
| 支付开户页面 | `open.pay.account.page.url` | 6.2 |
| 银行开户页面 | `open.bank.account.page.url` | 6.1 |
| 银行开户凭证查询 | `open.bank.account.voucher.query` | 6.12 |
| 分账方开户 | `open.split.account.page.url` | 6.3 |
| 交易余额分账 | `trade.balance.split` | 7.1 |
| 分账查询 | `trade.balance.split.query` | 7.2 |
| 文件上传 | `file.upload.commn` | 5.1 |

---

## 七、部署与配置

### 7.1 环境变量

```bash
# 钱账通
QZT_APP_ID=
QZT_GATEWAY_URL=https://test.wsmsd.cn/qzt/gateway/soa
QZT_PRIVATE_KEY_PATH=./keys/private_key.pem
QZT_PUBLIC_KEY_PATH=./keys/cloud_public_key.pem
QZT_CALLBACK_URL=https://your-bff-domain.com

# 阿里云 OSS
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=lvgot-files

# 数据库
DB_PATH=./data/lvgot.db
```

### 7.2 数据库迁移

首次部署执行：
```bash
node scripts/migrate_currency_to_integer.js  # 金额字段从元转分
node scripts/init_sqlite_tables.js           # 初始化/升级表结构
```

---

## 八、测试策略

### 8.1 QZT 联调（SIT 环境）
- 所有 QZT 接口先用 SIT 环境测试
- 测试账号：钱账通提供测试商户号/终端号

### 8.2 功能测试用例

| 用例 | 步骤 | 预期 |
|------|------|------|
| 企业开户 | 填表单 → 支付账户 → 银行内部户 | 两类账户都能开立 |
| 充值 | 选择账户 → 填金额 → 调 QZT | 充值成功，余额增加 |
| 提现 | 账户余额足 → 提现 → 短信确认 | 到账 |
| 商终绑定 | 选门店 → 填商户号/终端 → QZT 绑定 | 绑定成功 |
| 商终解绑 | 解绑 → QZT 6.5 → 本地删除 | 两边都清除 |
| 交易通知 | QZT 推送 → BFF 创建订单 | 订单入库 |
| 批量分账 | 上传批量清单 → 分账申请 | 批量处理结果返回 |

---

## 九、后续规划（本期不开干）

- 自动分账规则引擎（规则匹配 + 异步分账）
- 财务对账模块（与钱账通对账）
- 数据看板和报表
- 从 SQLite 迁移到 MySQL（如并发量增大）

# 门店·账户明细·订单管理 功能设计

> 2026-04-26
> 旅购通 BFF（Express + SQLite）+ Vue 3 前端

---

## 一、概述

本期新增/改造 5 个功能模块：

| 模块 | 变更类型 | 说明 |
|------|---------|------|
| 门店管理 | **改造** | 重写 Store.vue，门店 CRUD + 终端绑定 + 旅行团关联 |
| 门店详情 | **新增** | 基础信息 + 终端列表 + 关联旅行团 |
| 账户动账明细 | **新增** | 对接钱账通 `account.flow.query` 7.8 接口 |
| 支付订单 | **新增** | 钱账通交易订阅生成订单，自动匹配分账模板 |
| 提现订单 | **新增** | 展示账户资金发起的提现记录和状态 |

---

## 二、菜单结构

```
资金中心
├── 账户资金      → /fund-management
├── 充值          → /recharge
├── 分账记录      → /split-record
├── 银行卡管理    → /bank-card
└── 对账中心      → /reconciliation

订单管理（一级菜单）
├── 支付订单      → /orders/pay               ← 新增
├── 提现订单      → /orders/withdraw           ← 新增
└── 付款订单      → /payment (保留现有)

商户经营
├── 门店管理      → /store                    ← 改写
├── 团队协同      → /tour-group
├── 账户资料      → /account

经营工具
├── 智能分账      → /ai-split
├── 分账模板      → /split-template
├── 分账规则      → /split-rule
```

- 账户明细入口：在账户资金页每个账户卡片上加「查看明细」按钮，不占菜单
- 提现入口：保留在账户资金页（已有），提现订单页只展示列表+状态

---

## 三、数据库 Schema 变更

### 3.1 补充现有表 CREATE TABLE

`stores`、`store_terminals`、`orders` 代码中已使用但缺少建表语句，补到 `createTables()`。

```sql
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT UNIQUE NOT NULL,        -- LVGS+yyyMMdd+6位seq
  store_name TEXT NOT NULL,
  account_no TEXT,                      -- 绑定钱账通账户号
  merchant_id INTEGER,                  -- 关联商户
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_terminals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,               -- 关联 stores.id
  merchant_no TEXT,                     -- 拉卡拉商户号
  terminal_no TEXT,                     -- 终端号
  merchant_name TEXT,
  bind_status TEXT DEFAULT 'BOUND',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'PAY',  -- PAY 支付订单；提现订单查 transactions 表
  store_id TEXT,
  tour_group_id INTEGER,                  -- 关联旅行团
  merchant_id INTEGER,
  amount INTEGER DEFAULT 0,
  pay_method TEXT,
  pay_status TEXT DEFAULT 'PENDING',
  refund_status TEXT DEFAULT 'NONE',
  split_status TEXT DEFAULT 'PENDING',
  split_rule_id INTEGER,
  remark TEXT,
  raw_notify TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 新增表

```sql
-- 旅行团 × 门店 多对多
CREATE TABLE IF NOT EXISTS tour_group_stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_group_id INTEGER NOT NULL,
  store_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tour_group_id, store_id)
);

-- 订单支付流水（预留多笔支付）
CREATE TABLE IF NOT EXISTS order_payment_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL,
  flow_no TEXT UNIQUE NOT NULL,
  amount INTEGER DEFAULT 0,
  pay_method TEXT,
  pay_status TEXT DEFAULT 'PENDING',
  refund_amount INTEGER DEFAULT 0,
  trade_time DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 store_id 生成规则

格式：`LVGS` + yyyyMMdd + 6位序号，如 `LVGS20260426000001`

DB 层函数：
```js
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
```

---

## 四、后端 API

### 4.1 门店路由 `routes/store.js`（增强）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/store` | 列表，支持 `store_id`/`store_name` 模糊搜索，分页 |
| `GET` | `/api/store/:id` | 详情（含终端列表、关联旅行团列表） |
| `POST` | `/api/store` | 新增（store_name + account_no + merchant_id） |
| `PUT` | `/api/store/:id` | 编辑 |
| `DELETE` | `/api/store/:id` | 删除 |
| `POST` | `/api/store/:id/terminals` | 新增终端 |
| `DELETE` | `/api/store/terminals/:terminalId` | 删除终端 |
| `GET` | `/api/store/available/accounts` | 可绑定账户列表（已有） |

门店列表响应：
```json
{
  "code": 0,
  "data": {
    "list": [
      { "id": 1, "store_id": "LVGS...", "store_name": "...", "account_no": "...",
        "merchant_name": "...", "terminal_count": 2, "tour_group_count": 1 }
    ],
    "total": 10
  }
}
```

### 4.2 账户流水 `routes/account.js`（新增接口）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/account/flow` | 调用 QZT `account.flow.query` |

```js
const result = await callQzt('account.flow.query', {
  account_no,
  page: String(page),
  page_size: String(page_size),
  start_date, end_date
});
```

### 4.3 订单路由 `routes/order.js`（增强）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/orders/pay` | 支付订单列表（查 orders 表, order_type=PAY） |
| `GET` | `/api/orders/withdraw` | 提现订单列表（查 transactions 表, transaction_type=WITHDRAW） |
| `GET` | `/api/orders/:orderNo` | 订单详情（含支付流水） |
| `POST` | `/api/orders/:orderNo/split` | 手动触发该订单分账 |

支持筛选：`order_no`/`store_id`/`tour_group_id`/`pay_status`/`split_status` 等。

关联数据：`store_name`、`tour_group_name`、`merchant_name`、`payment_flows[]`

### 4.4 交易通知回调 `routes/webhook.js`（新增）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/webhook/notify` | 钱账通交易结果通知入口 |

**处理流程：**
```
接收 notify → 日志记录
  → 解析 remark（格式: "团号:xxx,商户号:xxx"）
  → 提取 tour_no + merchant_no
  → store_terminals 匹配 merchant_no → 得到 store
  → tour_group_stores 匹配 store_id → 得到 tour_group
  → 生成 order（order_type=PAY）
  → 匹配分账模板 → 自动触发分账
  → 更新 order.split_status
```

**remark 解析规则：**
```
格式: "团号:TG20260426001,商户号:301440153001020"
规则: 逗号分隔键值对，冒号分隔 key/value
```

---

## 五、前端视图

### 5.1 门店管理 → `/store`（改写）

- 取消当前顶部账户筛选 → 改为门店ID + 门店名称搜索框
- 列表：门店ID、门店名称、绑定账户（脱敏）、终端数量、关联旅行团数、操作
- 「+ 新增门店」弹窗：门店名称 + 绑定账户选择（可选已开通的钱账通账户）
- 点击门店ID/详情 → 跳转 `/store/:id`

### 5.2 门店详情 → `/store/:id`（新增）

三个区块：
1. **基础信息**：门店ID、门店名称、绑定账户、创建时间
2. **终端信息**：表格展示商户号、终端号、商户名称，「+ 新增终端」弹窗
3. **关联旅行团**：表格展示团号、名称、线路、日期

### 5.3 账户动账明细 → `/account-flow?account_no=xxx`（新增）

- 顶部选择账户（下拉） + 日期范围选择
- 调用 `GET /api/account/flow` 展示流水列表
- 入口：账户资金页每个账户卡片的「查看明细」按钮

### 5.4 支付订单 → `/orders/pay`（新增）

- 筛选：订单号、门店、支付状态、分账状态
- 列表：订单号、门店、金额、支付方式、支付状态、分账状态
- 支持「分账」按钮手动触发
- 点击订单号 → 弹窗详情（含支付流水列表 + 交易订阅信息）

### 5.5 提现订单 → `/orders/withdraw`（新增）

- 展示从账户资金发起的提现记录
- 列表：提现单号、提现账户、金额、状态（审核中/已到账/失败）、申请时间
- 仅展示，无操作入口（提现申请在账户资金/提现管理页面）

---

## 六、数据流（交易通知 → 订单 → 分账）

```
钱账通 POST /api/webhook/notify
  │
  ├─ 解析 remark 提取 tour_no + merchant_no
  │
  ├─ store_terminals.merchant_no → store
  │
  ├─ tour_group_stores → tour_group
  │
  ├─ 创建 order (order_type=PAY)
  │
  └─ 匹配分账模板 → callQzt('trans.trade.fund.split')
       ├─ SUCCESS → order.split_status = 'SUCCESS'
       └─ FAILED  → order.split_status = 'FAILED', 等待手动重试
```

---

## 七、涉及文件清单

### 数据库
| 文件 | 变更 |
|------|------|
| `db-sqlite3.js` | 补充 stores/store_terminals/orders CREATE TABLE，新增 tour_group_stores/order_payment_flows 表，新增 generateStoreId |

### 后端
| 文件 | 变更 |
|------|------|
| `routes/store.js` | 增强（新增字段、关联数据） |
| `routes/account.js` | 新增 `GET /flow` 接口 |
| `routes/order.js` | 增强（pay/withdraw 列表、详情、手动分账） |
| `routes/webhook.js` | **新增** — 交易通知回调 |
| `app.js` | 挂载 webhook 路由 |

### 前端
| 文件 | 变更 |
|------|------|
| `src/api/store.js` | 新增门店/终端/详情 API |
| `src/api/account.js` | 新增 `getAccountFlow` API |
| `src/api/order.js` | **新增** — 订单相关 API |
| `src/views/Store.vue` | **改写** — 门店管理列表+搜索+新增 |
| `src/views/StoreDetail.vue` | **新增** — 门店详情页 |
| `src/views/AccountFlow.vue` | **新增** — 账户动账明细 |
| `src/views/OrderPay.vue` | **新增** — 支付订单列表+详情 |
| `src/views/OrderWithdraw.vue` | **新增** — 提现订单列表 |
| `src/views/FundManagement.vue` | 修改 — 账户卡片加「查看明细」按钮 |
| `src/views/App.vue` | 菜单结构调整 |
| `src/router/routes.js` | 新增路由 |

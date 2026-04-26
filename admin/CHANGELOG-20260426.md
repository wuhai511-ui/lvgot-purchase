# 旅购通系统变更记录 — 2026-04-26

> BFF 重构收尾：统一交易流水号格式，修复全部前端 API 路由，完善充值/提现/开户流程。

---

## 一、交易流水号统一

### 背景

此前各模块独立生成流水号，格式不统一（`R${Date.now()}`、`S${Date.now()}`、`M${Date.now()}` 等），不便追踪。

### 规范

统一格式：**`lvg` + 毫秒级时间戳 + 4位序号**

示例：`lvg17772018962910001`

### 改动

| 文件 | 原格式 | 新格式 |
|------|--------|--------|
| `routes/qzt-util.js` | — | 新增 `generateTransNo()` 共享函数 |
| `routes/recharge.js` | `"R" + Date.now()` | `generateTransNo()` |
| `routes/withdraw.js` | `'lvg' + Date.now() + seq` (本地定义) | `generateTransNo()` (导入共享) |
| `routes/split.js` | `` `S${order_no}` : `S${Date.now()}` `` | `order_no \|\| generateTransNo()` |
| `routes/merchant.js` | `` `M${Date.now()}` `` | `generateTransNo()` |

### 技术细节

- 共享函数位于 `qzt-util.js:152-159`，被所有路由文件引用
- 使用模块级计数器（0-9999 循环）+ `Date.now()` 保证唯一性
- 修复了此前 sed 脚本导致的 qzt-util.js 文件损坏（`generateTransNo` 被错误插入 `getBankName` 函数内部）

---

## 二、BFF 路由架构变更

### 背景

旧版 `index.js` 单文件 BFF → 新版 Express Router 模块化架构。

### `app.js` 路由挂载结构

| 前缀 | 路由文件 | 说明 |
|------|---------|------|
| `/api/merchant` | `routes/merchant.js` | 商户开户、详情、列表 |
| `/api/account` | `routes/account.js` | 账户余额查询、绑定 |
| `/api/bank-cards` | `routes/bank-card.js` | 银行卡管理 |
| `/api/recharge` | `routes/recharge.js` | 充值申请、记录 |
| `/api/withdraw` | `routes/withdraw.js` | 提现申请(两阶段SMS)、确认、记录 |
| `/api/split` | `routes/split.js` | 分账申请、记录 |
| `/api/reconciliation` | `routes/reconciliation.js` | **新增** 对账任务 |
| `/api/orders` | `routes/order.js` | 交易订单 |
| `/api/store` | `routes/store.js` | 门店管理 |
| `/api/merchant/terminals` | `routes/terminal.js` | 终端绑定/解绑 |

新老接口均兼容挂载（`/api/*` + `/api/v1/*` 双前缀）。

---

## 三、Nginx 路由配置

### `/etc/nginx/nginx.conf`

| 路径 | 目标 | 说明 |
|------|------|------|
| `/api/ai` | `127.0.0.1:3002` | AI 服务（Minimax 等） |
| `/api/v1` | `127.0.0.1:3002` | 旧版兼容 → 实际指向 AI 服务器 |
| `/api/` | `127.0.0.1:3000` | 新版 BFF 服务 |

### BFF 服务进程 (PM2)

| 名称 | 端口 | 进程 ID | 状态 |
|------|------|---------|------|
| `lvgot-bff-qzt` | 3000 | 主 BFF | 运行中 |
| `lvgot-bff-new` | 3002 | AI 服务 | 运行中 |

---

## 四、前端 API 路由修正

### 修正明细

| 前端 API 文件 | 原路径 | 修正路径 |
|--------------|--------|---------|
| `src/api/recharge.js` | `/api/recharge/pre-order` | `/api/recharge/apply` |
| `src/api/withdraw.js` | `/api/qzt/withdraw/pre-order` | `/api/withdraw/apply` |
| `src/api/withdraw.js` | — | 新增 `account_no` 参数 |
| `src/api/store.js` | `/api/qzt/merchant/bind` | `/api/merchant/terminals/bind` |
| `src/api/trade.js` | `/api/flows` | `GET /api/orders` |
| `src/api/split.js` | `/api/v1/split/*` | `/api/split/*` |
| `src/api/bankCard.js` | `/api/v1/bank-cards/*` | `/api/bank-cards/*` |
| `src/api/account.js` | — | 新增 `getBalanceByAccountNo` |

### 新增 API 函数

```js
// src/api/account.js — 按 account_no 查询余额
export const getBalanceByAccountNo = (accountNo) => {
  return get('/api/account/balance', { account_no: accountNo })
}
```

---

## 五、视图层变更

### 1. 开户页面 (`AccountOpening.vue`)

- **所有个人商户**（含导游、司机）取消银行卡信息填写
- 导游角色保留导游证上传（必填）
- 简化 `personalForm`：移除 `bankType`、`bankCardNo`、`bankName`、`bankProvince`、`bankCity`、`bankBranch` 字段
- 移除 `bankList` 数据加载逻辑

### 2. 充值页面 (`Recharge.vue`)

- 移除前端 `bank_card_no` 参数传递
- 新增**收款方信息弹窗**：API 申请成功后展示 `recharge_order_no`、`payee_acc_no`、`payee_acc_name`、`payee_bank`、`payee_bank_no`、`payee_bank_name`、`payee_bank_area`
- 简化提交参数：仅 `merchant_id` + `amount` + `remark`

### 3. 提现页面 (`Withdraw.vue`)

- `applyWithdraw` 传入 `account_no: account.accountNo`（多账户模式）
- 支持两阶段提现：申请（触发短信）→ 确认（提交验证码）

### 4. 资金管理 (`FundManagement.vue`)

- 余额查询方式从 `Promise.all` 批量查询 → **顺序逐条查询**
- 查询参数从 `merchant_id` → `account_no`
- 修复多账户场景下并发查询超时问题

### 5. 交易订单 (`PaymentOrder.vue`)

- 修复分页响应处理：`res.data?.list || []`

### 6. 商户工作台 (`App.vue`)

- 新增菜单项：资金管理、充值、交易订单、银行卡、系统设置

### 7. 路由 (`router/routes.js`, `App.vue`)

- 新增 `FundManagement` 路由

### 8. 入口文件 (`main.js`)

- 改用 MerchantApp（`views/App.vue`）作为默认入口

---

## 六、BFF 接口详细变更

### 1. 充值接口 `routes/recharge.js`

**POST /api/recharge/apply**

```js
// 请求：仅需 merchant_id + amount + remark
// 响应：返回收款方完整信息
{
  recharge_order_no: "lvg17772...0001",
  payee_acc_no: "7452174160891871232",
  payee_acc_name: "...",
  payee_bank: "01020000",
  payee_bank_no: "...",
  payee_bank_name: "中国工商银行",
  payee_bank_area: "..."
}
```

### 2. 提现接口 `routes/withdraw.js`

**第一阶段 POST /api/withdraw/apply**

```js
// 请求
{ merchant_id, account_no, amount, bank_card_no, remark }

// 服务器逻辑
// 1. 从 DB 获取商户信息 → 取 qzt_response.bank_card_no
// 2. 调用钱账通 account.balance.withdraw
// 3. 保存事务记录，状态 PENDING
// 4. 返回 withdraw_seq_no + sms_sent: true
```

**第二阶段 POST /api/withdraw/confirm**

```js
// 请求
{ out_request_no, account_no, withdraw_seq_no, sms_code }

// 服务器逻辑
// 1. 调用钱账通 account.balance.withdraw.confirm
// 2. 更新事务状态
```

### 3. 对账接口 `routes/reconciliation.js`（新增）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/reconciliation/tasks` | 创建对账任务 |
| GET | `/api/reconciliation/tasks` | 查询对账任务列表 |
| GET | `/api/reconciliation/tasks/:taskNo` | 查询单个任务 |
| PUT | `/api/reconciliation/differences/:id` | 处理对账差异 |

### 4. 商户接口 `routes/merchant.js`

- 流水号格式统一：`` `M${Date.now()}` `` → `generateTransNo()`
- 开户回调处理逻辑完整（含银行卡列表同步）

### 5. 分账接口 `routes/split.js`

- 流水号格式统一：`` order_no ? `S${order_no}` : `S${Date.now()}` `` → `order_no || generateTransNo()`

---

## 七、服务器部署

### 文件位置

```
/opt/lvgot-purchase/bff-server/
├── app.js                  # Express 应用工厂（路由挂载配置）
├── server.js               # 启动入口
├── db-sqlite3.js           # SQLite 数据库
├── middleware/
│   └── auth.js             # JWT 认证中间件
├── routes/
│   ├── qzt-util.js         # QZT 工具函数（签名、加密、generateTransNo）
│   ├── recharge.js         # 充值（已更新）
│   ├── withdraw.js         # 提现（已更新）
│   ├── reconciliation.js   # 对账（新增）
│   ├── split.js            # 分账（已更新）
│   ├── merchant.js         # 商户（已更新）
│   ├── account.js          # 账户
│   ├── bank-card.js        # 银行卡
│   ├── order.js            # 交易订单
│   ├── store.js            # 门店
│   ├── terminal.js         # 终端
│   └── split-template.js   # 分账模板
└── .env                    # 环境变量
```

### 部署命令

```bash
# 前端构建
cd /home/whf/workspace/lvgot-purchase/admin
npm run build               # 多入口构建
tar -czf dist.tar.gz dist/ lvgot.conf
scp dist.tar.gz admin@139.196.190.217:/opt/lvgot-purchase/admin/
# 服务器解压
ssh admin@139.196.190.217
cd /opt/lvgot-purchase/admin && tar -xzf dist.tar.gz

# BFF 更新（部分路由文件通过 scp 或 base64 写入）
pm2 restart lvgot-bff-qzt   # 重启 BFF 服务
```

---

## 八、当前已知问题

| 问题 | 说明 | 状态 |
|------|------|------|
| 商户列表 502 | BFF 重启间歇性出现 | 已恢复（瞬态） |
| GitHub 推送失败 | `Couldn't connect to server` | 网络问题，待重试 |
| 钱账通签名 | RSA-SHA256 签名使用 `.env` 中配置的密钥 | 已验证通过 |

---

## 九、涉及全部文件清单

### 前端（本地仓库 `/home/whf/workspace/lvgot-purchase/admin/`）

| 文件 | 变更类型 |
|------|---------|
| `src/api/recharge.js` | 修改 |
| `src/api/withdraw.js` | 修改 |
| `src/api/account.js` | 修改 |
| `src/api/store.js` | 修改 |
| `src/api/trade.js` | 修改 |
| `src/api/split.js` | 修改 |
| `src/api/bankCard.js` | 修改 |
| `src/views/Recharge.vue` | 修改 |
| `src/views/AccountOpening.vue` | 修改 |
| `src/views/FundManagement.vue` | 修改 |
| `src/views/Withdraw.vue` | 修改 |
| `src/views/PaymentOrder.vue` | 修改 |
| `src/views/App.vue` | 修改 |
| `src/App.vue` | 修改 |
| `src/router/routes.js` | 修改 |
| `src/main.js` | 修改 |
| `index.admin.html` | 修改 |
| `lvgot.conf` | 修改 |

### BFF（服务器 `/opt/lvgot-purchase/bff-server/`）

| 文件 | 变更类型 |
|------|---------|
| `routes/qzt-util.js` | 修改（新增 generateTransNo + 修复损坏） |
| `routes/recharge.js` | 修改 |
| `routes/withdraw.js` | 修改 |
| `routes/split.js` | 修改 |
| `routes/merchant.js` | 修改 |
| `routes/reconciliation.js` | **新增** |
| `app.js` | 修改（挂载 reconciliation 路由） |

### 服务器配置

| 文件 | 变更类型 |
|------|---------|
| `/etc/nginx/nginx.conf` | 修改（API 路由规则） |

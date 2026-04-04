# 旅购通开发任务清单

> 基于 BRD 文档梳理，对照现有代码实现

## 一、项目结构

```
lvgot-purchase/
├── admin/          # Vue3 管理后台
├── bff-server/     # Node.js BFF 服务层
├── uniapp/         # 移动端小程序
├── miniprogram/    # 微信小程序
└── docs/           # 文档
```

---

## 二、功能完成度分析

### ✅ 已完成功能

| 模块 | 功能 | 页面/API | 状态 |
|------|------|----------|------|
| **入网进件** | 商户进件 | `/api/merchant/apply` | ✅ |
| | 个人开户 H5 | `/api/merchant/apply-personal` | ✅ |
| | 分账方开户 | `/api/merchant/split-account-*` | ✅ |
| | OCR 识别 | `/api/merchant/ocr` | ✅ |
| **账户管理** | 账户列表 | AccountList.vue | ✅ |
| | 银行卡管理 | BankCard.vue | ✅ |
| **团务管理** | 旅行团管理 | TourGroup.vue | ✅ |
| | 团成员管理 | bff-server | ✅ |
| **分账引擎** | 分账规则配置 | SplitRule.vue | ✅ |
| | 分账申请 | `/api/qzt/split/apply` | ✅ |
| | 分账查询 | `/api/qzt/split/query` | ✅ |
| | 分账记录 | SplitRecord.vue | ✅ |
| **结算提现** | 提现申请 | `/api/qzt/withdraw/*` | ✅ |
| | 提现记录 | Withdraw.vue | ✅ |
| **系统管理** | 员工管理 | Employee.vue | ⚠️ 页面有，逻辑待完善 |
| | 部门管理 | Department.vue | ⚠️ 页面有，逻辑待完善 |
| | 角色管理 | Role.vue | ⚠️ 页面有，逻辑待完善 |
| | 权限管理 | Permission.vue | ⚠️ 页面有，逻辑待完善 |

### ⚠️ 需要完善功能

| 模块 | 功能 | 当前状态 | 优化方向 |
|------|------|----------|----------|
| **工作台** | Dashboard | 数据展示简单 | 增加图表、统计、待办事项 |
| **账户列表** | 状态筛选 | 已实现 | 增加批量操作 |
| **旅行团** | 散客模式 | 未实现 | 支持无团号消费 |
| **分账规则** | 默认规则 | 未实现 | 配置默认分账比例 |
| **门店管理** | Store.vue | 页面空白 | 完整 CRUD |
| **充值** | Recharge.vue | 功能简单 | 对接真实支付通道 |
| **付款订单** | PaymentOrder.vue | 页面空白 | 完整订单管理 |
| **交易消息** | TradeMessage.vue | 页面简单 | 消息推送、已读状态 |

### ❌ 缺失功能（MVP 必需）

| 模块 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| **交易收单** | 聚合收款码 | P0 | 生成商户静态收款码 |
| | 智能POS收单 | P0 | 对接POS机具，关联团号 |
| | 退款处理 | P1 | 原路退回，校验分账余额 |
| **对账系统** | 交易对账 | P0 | 拉卡拉对账单处理 |
| | 银行资金对账 | P0 | 结算金额核对 |
| | 支付账户余额对账 | P1 | 日终余额核对 |
| | 分账对账 | P1 | 分账交易核对 |
| | 提现对账 | P1 | 提现到账核对 |
| **自动结算** | 自动提现(D1/T1) | P1 | 定时任务自动清零 |
| **导游端** | 小程序首页 | P0 | uniapp 移动端 |
| | 备用金查看 | P1 | 券付通额度 |
| | 分账记录查看 | P1 | 个人收益明细 |

---

## 三、开发任务排期

### Phase 1: MVP 核心完善（预计 2 周）

#### Week 1: 交易收单 + 对账

| 任务 | 前端 | 后端 | 优先级 |
|------|------|------|--------|
| 1.1 聚合收款码 | QrCode.vue | `/api/merchant/qrcode` | P0 |
| 1.2 交易流水优化 | TradeList.vue | `/api/trade/list` | P0 |
| 1.3 退款功能 | Refund.vue | `/api/trade/refund` | P1 |
| 1.4 对账单下载 | Reconcile.vue | `/api/reconcile/*` | P0 |

#### Week 2: 导游端小程序 + 自动化

| 任务 | 前端 | 后端 | 优先级 |
|------|------|------|--------|
| 2.1 导游端首页 | uniapp/pages/index | - | P0 |
| 2.2 分账记录 | uniapp/pages/split | - | P1 |
| 2.3 自动提现定时任务 | - | cron job | P1 |
| 2.4 消息推送 | - | `/api/message/push` | P1 |

### Phase 2: 业务深化（预计 4 周）

| 任务 | 说明 | 优先级 |
|------|------|--------|
| 3.1 券付通对接 | 因公支付额度管理 | P0 |
| 3.2 灵活用工对接 | 个税代征代缴 | P1 |
| 3.3 五维对账系统 | 自动化对账报表 | P1 |
| 3.4 数据看板 | Dashboard 图表优化 | P2 |
| 3.5 权限系统完善 | RBAC 完整实现 | P1 |

### Phase 3: 增值服务（持续迭代）

| 任务 | 说明 | 优先级 |
|------|------|--------|
| 4.1 供应链金融 | 导游贷、经营贷 | P2 |
| 4.2 信用画像 | 商户/导游评分 | P2 |
| 4.3 多租户支持 | SaaS 化改造 | P2 |

---

## 四、代码架构优化建议

### 4.1 前端优化

```
admin/src/
├── api/              # API 层 ✅
│   ├── account.js
│   ├── merchant.js
│   ├── split.js
│   ├── trade.js      # 新增：交易相关
│   ├── reconcile.js  # 新增：对账相关
│   └── message.js    # 新增：消息相关
├── components/       # 公共组件（需补充）
│   ├── PageHeader.vue
│   ├── SearchBar.vue
│   ├── DataTable.vue
│   └── ChartCard.vue
├── composables/      # 组合式函数（需补充）
│   ├── useTable.js
│   ├── useForm.js
│   └── usePermission.js
├── stores/           # Pinia 状态管理（需补充）
│   ├── user.js
│   └── permission.js
└── views/            # 页面视图
```

### 4.2 后端优化

```
bff-server/
├── routes/           # 路由拆分（当前全在 index.js）
│   ├── merchant.js
│   ├── trade.js
│   ├── split.js
│   ├── withdraw.js
│   └── reconcile.js
├── services/         # 业务逻辑层（需补充）
│   ├── qztService.js
│   ├── splitService.js
│   └── reconcileService.js
├── models/           # 数据模型（需补充）
│   ├── Merchant.js
│   ├── TourGroup.js
│   └── SplitRule.js
├── jobs/             # 定时任务（需补充）
│   ├── autoWithdraw.js
│   └── reconcile.js
└── middleware/       # 中间件
    ├── auth.js
    └── permission.js
```

### 4.3 数据库优化

当前使用 SQLite，建议迁移到 PostgreSQL/MySQL：

```sql
-- 核心表结构
 merchants (
  id, out_request_no, register_name, enterprise_type,
  status, qzt_account_no, split_role, created_at
)

 tour_groups (
  id, merchant_id, group_code, start_date, end_date,
  status, created_at
)

 tour_members (
  id, tour_id, member_type, member_id, role, created_at
)

 split_rules (
  id, merchant_id, name, split_type, status, created_at
)

 split_rule_items (
  id, rule_id, account_no, split_rate, split_amount, created_at
)

 trade_orders (
  id, merchant_id, tour_id, out_trade_no, amount,
  status, pay_time, created_at
)

 split_records (
  id, order_id, split_seq_no, split_amount, status, created_at
)

 withdraw_records (
  id, merchant_id, withdraw_seq_no, amount, status, created_at
)

 reconcile_records (
  id, reconcile_date, type, total_amount, diff_amount, status, created_at
)
```

---

## 五、立即执行任务

### 5.1 前端页面完善（优先）

1. **Dashboard 工作台** - 增加图表统计
2. **Store 门店管理** - 完整 CRUD
3. **PaymentOrder 付款订单** - 完整订单管理
4. **TradeMessage 交易消息** - 消息列表优化

### 5.2 后端接口补充

1. **交易收单 API** - 收款码生成、交易查询
2. **对账 API** - 对账单下载、核对
3. **消息推送 API** - 站内消息、微信推送

### 5.3 移动端开发

1. **uniapp 首页** - 导游端入口
2. **分账记录** - 个人收益查看
3. **提现功能** - 移动端提现

---

## 六、技术债务

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| BFF 单文件过大 | 维护困难 | 拆分路由/服务层 |
| 缺少类型定义 | 前端易出错 | 引入 TypeScript |
| 无单元测试 | 质量无保障 | 补充 Jest 测试 |
| 无 CI/CD | 部署风险 | 配置 GitHub Actions |
| SQLite 存储 | 性能瓶颈 | 迁移 PostgreSQL |

---

*文档更新时间: 2026-04-04*

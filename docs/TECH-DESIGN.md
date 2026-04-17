# 旅购通 - 技术方案设计文档

## 一、AI 智能分账方案

### 1.1 功能概述

用户通过自然语言描述分账需求，AI 自动解析并生成分账方案。

**支持平台**: PC 端 (Admin) + 移动端 (UniApp)

### 1.2 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层                                │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │  PC Admin       │         │  UniApp H5      │           │
│  │  (Vue3)         │         │  (Vue3)         │           │
│  └────────┬────────┘         └────────┬────────┘           │
└───────────┼───────────────────────────┼────────────────────┘
            │                           │
            └───────────┬───────────────┘
                        │ HTTP API
┌───────────────────────┼─────────────────────────────────────┐
│                       ▼                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              BFF Server (Express)                    │   │
│  │  /api/ai/parse-split    - AI 解析分账需求            │   │
│  │  /api/ai/chat           - AI 对话接口               │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│  ┌─────────────────────┼───────────────────────────────┐   │
│  │              AI Service Layer                        │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  MiniMax API (M2.7)                         │    │   │
│  │  │  - 模型: MiniMax-Text-01                     │    │   │
│  │  │  - 能力: 自然语言理解、结构化输出            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘    │
│                        后端层                                │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 MiniMax 对接方案

**API 配置**:
```javascript
// bff-server/config/ai.js
module.exports = {
  minimax: {
    apiUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    model: 'MiniMax-Text-01',
    // 从环境变量读取
    apiKey: process.env.MINIMAX_API_KEY,
    groupId: process.env.MINIMAX_GROUP_ID
  }
}
```

**Prompt 设计**:
```javascript
const SPLIT_PARSE_PROMPT = `你是一个分账助手。用户会用自然语言描述分账需求，请解析并返回JSON格式的分账方案。

用户输入：{userInput}

请返回以下JSON格式（不要包含其他文字）：
{
  "success": true,
  "totalAmount": 10000,
  "items": [
    { "name": "李四", "role": "导游", "percent": 40, "amount": 4000 },
    { "name": "张三", "role": "司机", "percent": 20, "amount": 2000 },
    { "name": "顺风旅行社", "role": "旅行社", "percent": 30, "amount": 3000 },
    { "name": "平台服务费", "role": "平台", "percent": 10, "amount": 1000 }
  ],
  "confidence": 85,
  "suggestion": "已识别为旅行团分账场景"
}

如果无法解析，返回：
{
  "success": false,
  "message": "无法理解分账需求，请提供金额和分账对象"
}`;
```

### 1.4 API 接口设计

```javascript
// POST /api/ai/parse-split
// 请求
{
  "text": "把10000元按3:7分给导游和旅行社",
  "context": {
    "accountId": "LAK2026030001",
    "recentReceivers": ["李四", "张三"]  // 最近收款人，辅助识别
  }
}

// 响应
{
  "code": 0,
  "data": {
    "success": true,
    "totalAmount": 10000,
    "items": [...],
    "confidence": 85,
    "suggestion": "..."
  }
}
```

---

## 二、分账模板数据方案

### 2.1 数据库设计

**模板表** `split_templates`:
```sql
CREATE TABLE split_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id VARCHAR(32) UNIQUE NOT NULL,      -- 模板ID
  name VARCHAR(100) NOT NULL,                    -- 模板名称
  description VARCHAR(500),                      -- 模板描述
  icon VARCHAR(10) DEFAULT '📋',                 -- 图标
  items JSON NOT NULL,                           -- 分账项目 [{name, role, percent}]
  creator_id VARCHAR(32),                        -- 创建者账户ID
  creator_type VARCHAR(20) DEFAULT 'merchant',   -- merchant/guide
  is_system BOOLEAN DEFAULT 0,                   -- 是否系统模板
  usage_count INTEGER DEFAULT 0,                 -- 使用次数
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_template_creator ON split_templates(creator_id);
CREATE INDEX idx_template_system ON split_templates(is_system);
```

### 2.2 API 接口

```javascript
// 获取模板列表
GET /api/split-templates?accountId=xxx

// 创建模板
POST /api/split-templates
{
  "name": "旅行团标准分账",
  "description": "适用于常规旅行团",
  "items": [
    { "name": "旅行社", "role": "旅行社", "percent": 30 },
    { "name": "导游", "role": "导游", "percent": 40 },
    { "name": "司机", "role": "司机", "percent": 20 },
    { "name": "平台", "role": "平台", "percent": 10 }
  ]
}

// 更新模板
PUT /api/split-templates/:templateId

// 删除模板
DELETE /api/split-templates/:templateId

// 使用模板（增加使用次数）
POST /api/split-templates/:templateId/use
```

---

## 三、对账功能技术方案

### 3.1 功能概述

对账系统用于核对交易数据，确保资金流转准确无误。

**核心功能**:
1. **交易对账** - 核对支付订单与分账记录
2. **资金对账** - 核对账户余额与银行流水
3. **差异处理** - 发现并处理对账差异
4. **对账报表** - 生成对账报告

### 3.2 数据库设计

**对账任务表** `reconciliation_tasks`:
```sql
CREATE TABLE reconciliation_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_no VARCHAR(32) UNIQUE NOT NULL,           -- 任务编号
  task_type VARCHAR(20) NOT NULL,                -- trade/fund/daily
  status VARCHAR(20) DEFAULT 'pending',          -- pending/processing/completed/failed
  date_range_start DATE,                         -- 对账开始日期
  date_range_end DATE,                           -- 对账结束日期
  total_records INTEGER DEFAULT 0,               -- 总记录数
  matched_records INTEGER DEFAULT 0,             -- 匹配记录数
  unmatched_records INTEGER DEFAULT 0,           -- 不匹配记录数
  difference_amount DECIMAL(15,2) DEFAULT 0,     -- 差异金额
  report_url VARCHAR(500),                       -- 报告下载地址
  created_by VARCHAR(32),                        -- 创建人
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

**对账明细表** `reconciliation_details`:
```sql
CREATE TABLE reconciliation_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_no VARCHAR(32) NOT NULL,                  -- 关联任务
  record_type VARCHAR(20) NOT NULL,              -- trade/split/withdraw
  record_id VARCHAR(64),                         -- 原始记录ID
  expected_amount DECIMAL(15,2),                 -- 预期金额
  actual_amount DECIMAL(15,2),                   -- 实际金额
  difference_amount DECIMAL(15,2),               -- 差异金额
  status VARCHAR(20),                            -- matched/unmatched/difference
  remark TEXT,                                   -- 备注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**对账差异表** `reconciliation_differences`:
```sql
CREATE TABLE reconciliation_differences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_no VARCHAR(32) NOT NULL,
  difference_type VARCHAR(50) NOT NULL,          -- amount_mismatch/missing_record/duplicate
  severity VARCHAR(20) DEFAULT 'medium',         -- low/medium/high
  description TEXT,
  suggested_action TEXT,                         -- 建议处理方式
  status VARCHAR(20) DEFAULT 'pending',          -- pending/resolved/ignored
  resolved_by VARCHAR(32),
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 对账流程

```
┌─────────────────────────────────────────────────────────────┐
│                      对账流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 创建对账任务                                            │
│     ├── 选择对账类型（交易对账/资金对账）                    │
│     ├── 设置时间范围                                        │
│     └── 自动生成任务编号                                    │
│                                                             │
│  2. 数据采集                                                │
│     ├── 拉取本地交易记录                                    │
│     ├── 拉取支付渠道账单（QZT API）                         │
│     └── 拉取银行流水（可选）                                │
│                                                             │
│  3. 数据匹配                                                │
│     ├── 按订单号匹配                                        │
│     ├── 按金额匹配                                          │
│     └── 按时间匹配                                          │
│                                                             │
│  4. 差异识别                                                │
│     ├── 金额不一致                                          │
│     ├── 缺失记录                                            │
│     └── 重复记录                                            │
│                                                             │
│  5. 生成报告                                                │
│     ├── 对账汇总                                            │
│     ├── 差异明细                                            │
│     └── 导出 Excel/PDF                                      │
│                                                             │
│  6. 差异处理                                                │
│     ├── 人工核实                                            │
│     ├── 调账处理                                            │
│     └── 标记解决                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 API 接口设计

```javascript
// 创建对账任务
POST /api/reconciliation/tasks
{
  "taskType": "trade",           // trade/fund/daily
  "dateRangeStart": "2026-04-01",
  "dateRangeEnd": "2026-04-30"
}

// 获取对账任务列表
GET /api/reconciliation/tasks?status=completed&page=1&pageSize=20

// 获取对账任务详情
GET /api/reconciliation/tasks/:taskNo

// 获取对账差异列表
GET /api/reconciliation/tasks/:taskNo/differences

// 处理对账差异
PUT /api/reconciliation/differences/:id
{
  "action": "resolve",           // resolve/ignore
  "remark": "已核实，金额正确"
}

// 导出对账报告
GET /api/reconciliation/tasks/:taskNo/export?format=excel

// 获取对账统计
GET /api/reconciliation/stats?month=2026-04
```

### 3.5 前端页面设计

**对账管理页面** (Admin):
```
┌─────────────────────────────────────────────────────────────┐
│  📊 对账管理                                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  对账概览                                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │本月对账  │ │匹配率    │ │差异金额  │ │待处理    │   │   │
│  │  │  12     │ │ 98.5%   │ │ ¥320    │ │   3     │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  新建对账任务                                        │   │
│  │  对账类型: [交易对账 ▼]                              │   │
│  │  时间范围: [2026-04-01] ~ [2026-04-30]              │   │
│  │  [开始对账]                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  对账任务列表                                        │   │
│  │  任务编号 │ 类型 │ 时间范围 │ 状态 │ 匹配率 │ 操作  │   │
│  │  REC202604001 │ 交易 │ 04/01-04/30 │ ✅完成 │ 98.5% │ 详情 │
│  │  REC202603001 │ 交易 │ 03/01-03/31 │ ✅完成 │ 99.2% │ 详情 │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.6 定时对账

```javascript
// bff-server/jobs/reconciliation.js
const cron = require('node-cron');

// 每日凌晨2点执行自动对账
cron.schedule('0 2 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  await createReconciliationTask({
    taskType: 'daily',
    dateRangeStart: yesterday.toISOString().split('T')[0],
    dateRangeEnd: yesterday.toISOString().split('T')[0]
  });
});
```

---

## 四、部署方案

### 4.1 服务器信息

| 项目 | 值 |
|------|-----|
| IP | 139.196.190.217 |
| 用户 | admin |
| 系统 | Linux (Alibaba Cloud) |
| Node | v24.14.1 |
| 磁盘 | 40G (已用24G) |

### 4.2 部署目录结构

```
/opt/lvgot-purchase/
├── admin/           # PC 前端
│   └── dist/
├── uniapp/          # 移动端 H5
│   └── dist/
├── bff-server/      # 后端服务
│   ├── config/
│   ├── routes/
│   └── database/
└── logs/            # 日志目录
```

### 4.3 Nginx 配置

```nginx
# /etc/nginx/conf.d/lvgot.conf
server {
    listen 80;
    server_name lvgot.example.com;

    # PC 前端
    location / {
        root /opt/lvgot-purchase/admin/dist;
        try_files $uri $uri/ /index.html;
    }

    # 移动端 H5
    location /h5 {
        alias /opt/lvgot-purchase/uniapp/dist;
        try_files $uri $uri/ /h5/index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4.4 PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'lvgot-bff',
    script: 'src/index.js',
    cwd: '/opt/lvgot-purchase/bff-server',
    instances: 2,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

---

## 五、开发排期

### Phase 1: AI 智能分账 (2天)
- [ ] MiniMax API 对接
- [ ] PC 端 AI 分账页面
- [ ] UniApp AI 分账优化
- [ ] 测试验证

### Phase 2: 分账模板 (1天)
- [ ] 数据库表创建
- [ ] 后端 API 开发
- [ ] PC 端模板管理页面
- [ ] UniApp 模板对接

### Phase 3: 对账功能 (3天)
- [ ] 数据库表创建
- [ ] 对账核心逻辑
- [ ] PC 端对账页面
- [ ] 对账报表导出
- [ ] 定时对账任务

### Phase 4: 部署上线 (1天)
- [ ] 服务器环境配置
- [ ] Nginx 配置
- [ ] PM2 部署
- [ ] 域名配置
- [ ] 测试验证

---

## 六、业财一体化后台（Business Backend）

### 6.1 概述

业财一体化后台（`/opt/lvgot-yewu/`）是旅购通的核心业务后台系统，处理交易对账、电子发票、AI 对话等业务逻辑。

**项目路径**: `/home/admin/.openclaw/workspace-dev/业财一体化-mvp/`

### 6.2 系统架构

```
旅财一体化后台（业财一体化-mvp）
├── src/
│   ├── api/                    # API 入口层
│   │   ├── index.ts           # Fastify 服务启动
│   │   └── routes/            # 路由注册
│   │       ├── auth.ts        # 登录认证（POST /auth/login, GET /auth/me）
│   │       ├── file.ts        # 文件上传
│   │       └── health.ts      # 健康检查
│   │
│   ├── bff/                    # BFF 层（对接钱账通）
│   │   ├── adapters/
│   │   │   └── qzt.adapter.ts # 钱账通数据格式转换
│   │   ├── routes/
│   │   │   └── bff.routes.ts  # POST /bff/files/ingest
│   │   └── services/
│   │       └── bff-file.service.ts
│   │
│   ├── business/               # 业务后台（核心逻辑）
│   │   ├── repositories/       # Repository 数据访问层（可 mock）
│   │   │   ├── invoice.repo.ts
│   │   │   ├── merchant.repo.ts
│   │   │   ├── settlement.repo.ts
│   │   │   └── transaction.repo.ts
│   │   ├── routes/            # 业务路由
│   │   │   ├── ai.ts / file.ts / invoice.ts
│   │   │   ├── merchant.ts / reconciliation.ts
│   │   │   ├── template.ts / transaction.ts / user.ts
│   │   └── services/
│   │       ├── file-processor.ts   # 11种文件解析引擎
│   │       ├── invoice-ocr.ts      # 发票 OCR
│   │       ├── llm.ts             # LLM 对话
│   │       └── reconciliation-engine.ts
│   │
│   └── shared/                 # 共享基础设施
│       ├── db/pool.ts         # PostgreSQL 连接池
│       └── types/database.ts
│
├── prisma/
│   └── schema.prisma           # 数据模型（16张表）
│
└── docs/superpowers/          # 实现计划与设计文档
```

### 6.3 分层职责

| 层级 | 目录 | 职责 |
|------|------|------|
| API 层 | `src/api/` | Fastify 路由注册、服务启动 |
| BFF 层 | `src/bff/` | 对接钱账通，格式转换，不写库 |
| 业务层 | `src/business/` | 所有业务逻辑、文件解析、对账 |
| 数据层 | `src/business/repositories/` | 所有 Prisma 数据访问（可 mock） |
| 共享层 | `src/shared/` | PostgreSQL 连接池、类型定义 |

### 6.4 数据模型

| 模型 | 说明 |
|------|------|
| `Merchant` | 商户表 |
| `User` | 用户表（merchantId 可选绑定） |
| `JyTransaction` | 交易明细（JY_） |
| `JsSettlement` | 结算明细（JS_） |
| `JzWalletSettlement` | 钱包结算（JZ_） |
| `AccAccountSettlement` | 账户结算（ACC_） |
| `SepTransaction` | 分账明细（SEP_） |
| `SepSummary` | 分账汇总（SEP_SUM_） |
| `DwWithdrawal` | 提现对账（DW_） |
| `D0Withdrawal` | D0 提现 |
| `JyInstallment` | 分期交易 |
| `BusinessOrder` | 业务订单 |
| `Invoice` | 电子发票 |
| `ReconciliationBatch` | 对账批次 |
| `ReconciliationDetail` | 对账明细 |
| `BillTemplate` | 对账模板 |

### 6.5 关键设计

**merchantId 非强绑定**：用户初始 `merchantId = null`，通过 `POST /users/me/bind-merchant` 自主绑定。

**BFF 与 Business 分离**：BFF 层（`src/bff/`）专门对接钱账通，Business 层（`src/business/`）处理业务逻辑。钱账通接口变更不影响业务层，可独立部署。

**Repository 模式**：所有数据访问经由 `src/business/repositories/`，便于单元测试 mock。

**货币单位**：所有金额字段使用 `BigInt`（INTEGER），单位为**分**，避免浮点精度问题。

### 6.6 核心 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 登录 |
| POST | `/api/v1/users/me/bind-merchant` | 绑定商户 |
| POST | `/api/v1/files/upload` | 上传文件 |
| POST | `/api/v1/bff/files/ingest` | 接收钱账通文件 |
| GET | `/api/v1/reconciliation/batches` | 对账批次 |
| POST | `/api/v1/reconciliation/reconcile` | 执行对账 |
| GET | `/api/v1/invoices` | 发票列表 |
| POST | `/api/v1/ai/chat` | AI 对话 |
| GET | `/api/v1/health` | 健康检查 |

### 6.7 开发命令

```bash
# 编译
npm run build

# 启动服务（端口 3000）
node dist/api/index.js

# 种子数据
npx tsx prisma/seed.ts   # 用户: 15801852984 / 123456
```

### 6.8 技术栈

- Node.js 22 + Fastify + TypeScript
- Prisma ORM（SQLite 开发 / PostgreSQL 生产）
- PostgreSQL 16
- AI：MiniMax / DeepSeek / OpenAI

---

## 七、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| MiniMax API 不稳定 | AI 分账不可用 | 降级为规则解析 + 模板推荐 |
| 对账数据量大 | 性能问题 | 分批处理 + 异步任务 |
| 支付渠道账单延迟 | 对账延迟 | 延迟对账 + 差异预警 |

---

**文档版本**: v1.1  
**创建时间**: 2026-04-04  
**最后更新**: 2026-04-17  
**作者**: AI Assistant

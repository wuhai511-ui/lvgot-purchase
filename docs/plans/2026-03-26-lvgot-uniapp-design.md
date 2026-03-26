# 旅购通 UniApp 重构设计方案

**版本：** v1.0
**日期：** 2026-03-26
**状态：** 待审批

---

## 1. 项目概述

### 1.1 目标
将旅购通分账通道升级改造项目从现有 HTML 单页应用，重构为基于 **UniApp + Vant** 的多端小程序（编译到微信/支付宝），实现真正的移动端开发体验，为后续接真实 API 打好架构基础。

### 1.2 约束
- 前端纯静态，Mock API 保持现状（后期切换真实 API 改动最小）
- 继续部署在 GitHub Pages
- 保留现有 PRD 全部业务逻辑

---

## 2. 技术选型

| 维度 | 选型 | 理由 |
|------|------|------|
| 框架 | UniApp 3.x | 一套代码编译到微信/支付宝多端 |
| UI 组件 | Vant 4（uni-app 版） | 与现有 C端风格一致，轻量 |
| 状态管理 | Pinia（Vue 3） | 轻量响应式，比 Vuex 更现代 |
| CSS 预处理器 | SCSS | 变量复用、嵌套书写 |
| 构建工具 | Vite（通过 HBuilderX） | 快 |
| Mock 方式 | 本地 JSON 数据 + 拦截器 | 不依赖后端接口 |

---

## 3. 目录结构

```
lvgot-purchase/
├── docs/
│   └── plans/              # 设计文档（现有）
├── PRD.md
├── README.md
├── mock-server/            # Mock API Server（Node.js）
│   ├── index.js
│   └── routes/
│       ├── account.js      # 账户相关
│       ├── auth.js         # 认证相关
│       ├── split.js        # 分账相关
│       ├── merchant.js      # 商户相关
│       └── order.js        # 订单相关
├── admin/                  # 管理后台（保留，静态 HTML）
│   └── src/
├── uniapp/                 # ⭐ 新建：UniApp 小程序源码
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   ├── manifest.json   # 平台配置
│   │   ├── pages.json      # 路由配置
│   │   ├── pages/          # 页面
│   │   │   ├── home/           # 首页
│   │   │   ├── account/         # 账户详情
│   │   │   ├── recharge/        # 充值
│   │   │   ├── withdraw/        # 提现
│   │   │   ├── split-record/    # 分账记录
│   │   │   ├── order/           # 付款订单
│   │   │   ├── qrcode/          # 收款码
│   │   │   ├── bankcard/        # 银行卡
│   │   │   ├── account-upgrade/ # 账户升级
│   │   │   ├── store-bind/     # 门店绑定
│   │   │   ├── message/         # 消息通知
│   │   │   ├── help/            # 帮助与客服
│   │   │   ├── open-account/    # 开户
│   │   │   ├── split/           # 分账
│   │   │   └── mine/            # 我的
│   │   ├── static/              # 静态资源
│   │   │   ├── styles/          # 全局样式
│   │   │   └── images/
│   │   ├── store/               # Pinia 状态管理
│   │   │   ├── account.js       # 账户状态
│   │   │   ├── order.js         # 订单状态
│   │   │   └── split.js         # 分账状态
│   │   ├── api/                 # API 请求封装
│   │   │   └── index.js
│   │   ├── mock/                # Mock 数据
│   │   │   └── data/
│   │   │       ├── account.json
│   │   │       ├── order.json
│   │   │       └── split.json
│   │   └── utils/                # 工具函数
│   │       ├── auth.js
│   │       └── format.js
│   ├── package.json
│   └── vite.config.js
└── .github/workflows/
    └── deploy.yml
```

---

## 4. 页面清单

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/pages/home/index` | 用户卡片、余额、菜单、最近分账 |
| 账户详情 | `/pages/account/index` | Ledger 关联、账户状态 |
| 充值 | `/pages/recharge/index` | 金额输入、支付方式 |
| 提现 | `/pages/withdraw/index` | 提现表单、密码验证 |
| 分账记录 | `/pages/split-record/index` | Tab 筛选（全部/成功/失败） |
| 付款订单 | `/pages/order/index` | 订单列表、详情 |
| 收款码 | `/pages/qrcode/index` | 收款二维码展示 |
| 银行卡 | `/pages/bankcard/index` | 绑卡列表、添加银行卡 |
| 账户升级 | `/pages/account-upgrade/index` | 个人→企业升级引导 |
| 门店绑定 | `/pages/store-bind/index` | 门店关联操作 |
| 消息通知 | `/pages/message/index` | 系统消息列表 |
| 帮助与客服 | `/pages/help/index` | FAQ、联系客服 |
| 开户 | `/pages/open-account/index` | 个人/企业 Tab 开户表单 |
| 分账 | `/pages/split/index` | 发起分账、选择分账方 |
| 我的 | `/pages/mine/index` | 个人中心、设置 |

---

## 5. 状态管理设计

```
store/
├── account.js    # currentAccount, balance, status, auditStatus
├── order.js     # orderList, orderDetail
├── split.js     # splitRecords, splitForm
├── auth.js      # authType, isLoggedIn
└── app.js       # globalLoading, toast
```

---

## 6. API 层设计

```js
// api/index.js - 统一请求封装
request({
  url: '/api/account/open',
  method: 'POST',
  data: { name, phone, idCard }
})

// Mock 拦截：开发环境自动拦截指向本地 JSON
// 生产环境（GitHub Pages）：Vite proxy → localhost:3001
```

### 核心接口（复用现有 Mock API）
| 接口 | 方法 | 路径 |
|------|------|------|
| 开户 | POST | /api/account/open |
| 账户查询 | GET | /api/account/info |
| 升级账户 | POST | /api/account/upgrade |
| 余额查询 | GET | /api/balance |
| 分账记录 | GET | /api/split/records |
| 发起分账 | POST | /api/split/create |
| 提现 | POST | /api/withdraw |
| 交易订单 | GET | /api/order/list |

---

## 7. Mock Server 升级

保留现有 `mock-server/`，升级为标准 REST API：
- Express.js 路由化
- JSON 数据分离到 `/data/*.json`
- 支持 CORS + JSONP
- 端口：`3001`

---

## 8. 部署方案

### UniApp 编译产物
- 微信小程序：`dist/build/mp-weixin/`
- 支付宝小程序：`dist/build/mp-alipay/`
- H5：`dist/build/h5/` → 部署到 GitHub Pages

### GitHub Pages 访问
- H5 版本：https://wuhai511-ui.github.io/lvgot-purchase/uniapp/
- 微信/支付宝：使用 HBuilderX 内置预览 + 上传

### CI/CD
GitHub Actions 编译 H5 版本自动部署到 GitHub Pages。

---

## 9. 开发计划概要

### 阶段一：项目初始化（约 2h）
1. 初始化 UniApp 项目，安装依赖
2. 配置 Vant、SCSS、Pinia
3. 配置 H5 编译 + GitHub Actions
4. 迁移全局样式变量

### 阶段二：页面框架搭建（约 3h）
1. 配置 pages.json 路由
2. 实现底部 TabBar（首页/订单/分账/我的）
4. 创建骨架页面（每个页面一个 .vue 文件 + 基本 template）
5. 全局样式和主题变量

### 阶段三：业务功能开发（约 8h）
1. 首页 + 账户模块
2. 开户 + 升级模块
3. 分账 + 订单模块
4. 充值 + 提现模块
5. 银行卡 + 门店绑定
6. 消息 + 帮助

### 阶段四：Mock API 对接（约 4h）
1. API 请求封装 + 拦截器
2. 每个页面的 Mock 数据联调
3. 状态管理数据流打通

### 阶段五：体验优化 + 部署（约 3h）
1. 动画和过渡效果
2. 错误处理和 loading 状态
3. 真机调试（微信/支付宝）
4. GitHub Pages 部署验证

**预计总工时：约 20h**

---

## 10. 风险与备选

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| UniApp 编译到微信卡顿 | 低 | 中 | 使用 HBuilderX 内置真机调试 |
| Vant 组件在小程序端表现差异 | 低 | 低 | 优先用基础组件，自定义复杂组件 |
| GitHub Pages SPA 路由问题 | 中 | 低 | 配置 404.html 回退到 index |
| Mock API 和真实 API 差异 | 高 | 中 | API 层抽象好接口，统一替换 |

---

**下一步：设计审批通过后，进入 Phase 2（写详细任务计划）**

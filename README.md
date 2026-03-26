# 旅购通分账通道升级改造

基于拉卡拉支付账户的分账系统，支持商户、旅行社、导游/司机的多级分账。

## 项目结构

```
lvgot-purchase/
├── admin/                    # 管理后台原型
│   └── src/
│       └── index.html        # 主页面（工作台/账户/分账/提现/门店）
├── miniprogram/              # C端小程序原型
│   └── src/
│       └── index.html        # 移动端页面（余额/分账记录/收款码）
├── mock-server/              # Mock API服务
│   ├── index.js              # API模拟（账户/分账/支付/提现）
│   └── package.json
├── docs/                     # 文档
├── .github/workflows/        # GitHub Actions
│   └── deploy.yml            # 部署到GitHub Pages
└── PRD.md                    # 产品需求文档
```

## 在线预览

- **首页入口**: https://wuhai511-ui.github.io/lvgot-purchase/
- **管理后台**: https://wuhai511-ui.github.io/lvgot-purchase/admin/
- **C端小程序**: https://wuhai511-ui.github.io/lvgot-purchase/miniprogram/

## 功能模块

### P0 需求点

| 功能 | 平台 | 描述 |
|------|------|------|
| 支付账户开户 | 旅购通 | 商户/旅行社/导游开户，支持企业/个人差异化流程 |
| 多级余额分账 | 旅购通 | 商户→旅行社→导游/司机的链条式分账 |
| 支付账户升级 | 旅购通 | 人脸识别实名认证，等级提升 |
| 付款订单 | 小冲 | 分账支持免密/短信验证 |
| 交易订阅 | 小冲 | Webhook实时推送交易事件 |
| 资金提现 | 小冲 | 余额提现到银行卡 |
| 门店绑定 | 小冲 | 绑定商户号/终端到账户 |

### 账户状态机

```
对公账户：待审核 → 审核通过 → 活体检测 → 开户有效
个人账户：申请 → 活体检测 → 开户有效
```

### 分账链条

```
商户（70%）→ 旅行社（15%）→ 导游/司机（15%）
```

## 本地开发

### 启动Mock API服务

```bash
cd mock-server
npm install
npm start
```

API服务将运行在 http://localhost:3000

### 主要API接口

#### 账户管理
- `GET /api/accounts` - 账户列表
- `POST /api/accounts/open` - 开户申请
- `POST /api/accounts/:id/upgrade` - 账户升级（人脸识别）

#### 分账管理
- `GET /api/split/records` - 分账记录
- `POST /api/split/apply` - 分账申请
- `POST /api/split/refund` - 分账退款

#### 交易管理
- `POST /api/payment/pay` - 付款支付
- `POST /api/subscribe/webhook` - Webhook订阅

#### 提现管理
- `GET /api/withdraw/records` - 提现记录
- `POST /api/withdraw/apply` - 提现申请

## 技术栈

- **前端原型**: HTML5 + Vue3 + Element Plus / Vant
- **Mock服务**: Node.js 原生HTTP服务器
- **CI/CD**: GitHub Actions
- **部署**: GitHub Pages

## 相关系统

- **小冲系统**: 前端业务入口（C端/管理端）
- **钱账通**: 支付账户核心服务
- **钱包系统**: 审核方/底层能力
- **拉卡拉**: 支付通道/结算

## License

MIT

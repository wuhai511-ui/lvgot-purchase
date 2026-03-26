# 旅购通 UniApp 重构实施计划

**版本：** v1.0
**日期：** 2026-03-26
**状态：** 待执行
**前置文档：** 2026-03-26-lvgot-uniapp-design.md

---

## 阶段一：项目初始化

### 任务 1.1：初始化 UniApp 项目
**预估时间：** 30min
**验收标准：** `npx create-uniapp` 或 HBuilderX 新建项目成功，Vue 3 版本

**执行步骤：**
1. 在 `lvgot-purchase/uniapp/` 目录下初始化项目
2. 安装 Vue 3 + Vite + UniApp CLI
3. `package.json` 包含 uni-app + @dcloudio/uni-app-vite

---

### 任务 1.2：安装核心依赖
**预估时间：** 20min
**验收标准：** `npm install` 无报错，所有依赖完整

**执行步骤：**
```bash
npm install @vant/weapp       # Vant 微信版
npm install pinia              # 状态管理
npm install sass               # SCSS 预处理器
npm install axios               # HTTP 请求（UniApp request 封装）
npm install dayjs               # 日期格式化
```

---

### 任务 1.3：配置 Vite + SCSS + Vant
**预估时间：** 30min
**验收标准：** Vant 组件能正常注册，SCSS 变量能全局使用

**执行步骤：**
1. `vite.config.js` 配置 uni-app 插件
2. `main.js` 全局注册 Vant
3. `uni.scss` 全局样式变量（主题色/字体/间距）
4. `App.vue` 引入全局样式

---

### 任务 1.4：配置 GitHub Actions CI/CD
**预估时间：** 20min
**验收标准：** push 到 master 触发 Actions 构建 H5 版本

**执行步骤：**
1. 新建 `.github/workflows/uniapp-deploy.yml`
2. 使用 `uni-app` GitHub Action 或手动 `npm run build:h5`
3. 部署产物到 `dist/uniapp/`
4. 验证 https://wuhai511-ui.github.io/lvgot-purchase/uniapp/ 返回 200

---

## 阶段二：页面框架搭建

### 任务 2.1：配置 pages.json 路由
**预估时间：** 20min
**验收标准：** 15个页面全部注册，底部 TabBar 配置正确

**执行步骤：**
1. 配置 `pages.json` 的 `pages[]` 和 `tabBar`
2. 设置每个页面的 `path` 和 `style`
3. 验证各页面路径不冲突

---

### 任务 2.2：创建全局样式和主题变量
**预估时间：** 30min
**验收标准：** 样式变量统一，主题色能在所有组件复用

**执行步骤：**
1. 创建 `static/styles/variables.scss`（主题色 #1976D2/渐变/圆角/阴影）
2. 创建 `static/styles/common.scss`（重置样式/工具类）
3. 在 `App.vue` 全局引入

---

### 任务 2.3：实现 TabBar 页面骨架
**预估时间：** 30min
**验收标准：** 首页/订单/分账/我的 四个 Tab 页面能切换

**执行步骤：**
1. 创建 `pages/home/index.vue`
2. 创建 `pages/order/index.vue`
3. 创建 `pages/split/index.vue`
4. 创建 `pages/mine/index.vue`
5. 配置 pages.json 的 tabBar items

---

### 任务 2.4：创建页面骨架文件
**预估时间：** 60min
**验收标准：** 15个页面文件全部创建，每个有基本 template + script

**执行步骤：**
按以下顺序创建空页面骨架：
1. home
2. account
3. recharge
4. withdraw
5. split-record
6. order
7. qrcode
8. bankcard
9. account-upgrade
10. store-bind
11. message
12. help
13. open-account
14. split
15. mine

---

## 阶段三：状态管理 + API 层

### 任务 3.1：搭建 Pinia Store
**预估时间：** 40min
**验收标准：** 4个 Store（account/order/split/auth）能正常读写

**执行步骤：**
1. 创建 `store/index.js`（Pinia 初始化）
2. 创建 `store/account.js`（账户状态：currentAccount/balance/status）
3. 创建 `store/order.js`（订单状态：orderList/filter）
4. 创建 `store/split.js`（分账状态：splitRecords/splitForm）
5. 创建 `store/auth.js`（认证状态：isLoggedIn/authType）
6. 在 `main.js` 挂载 Pinia

---

### 任务 3.2：封装请求工具 + Mock 拦截
**预估时间：** 30min
**验收标准：** `request()` 能发起请求，Mock 模式下返回本地数据

**执行步骤：**
1. 创建 `api/request.js`（uni.request 封装）
2. 创建 `api/index.js`（各业务接口：getAccountInfo/openAccount/split 等）
3. 在 `main.js` 全局挂载 `api` 到 `uni`

---

### 任务 3.3：准备 Mock JSON 数据
**预估时间：** 30min
**验收标准：** 本地 JSON 文件数据能正确返回

**执行步骤：**
1. 创建 `mock/data/account.json`
2. 创建 `mock/data/order.json`
3. 创建 `mock/data/split.json`
4. 创建 `mock/data/merchant.json`
5. 配置 vite.config.js 的 mock 拦截（或用本地 JSON 文件模拟）

---

## 阶段四：业务功能开发

### 任务 4.1：首页模块
**预估时间：** 60min
**验收标准：** 余额展示、菜单跳转、最近分账列表

**执行步骤：**
1. 用户卡片组件（头像/姓名/类型）
2. 余额展示区（可用余额/冻结余额）
3. 快捷操作按钮（充值/提现/收款码）
4. 功能菜单（8个菜单项 → 跳转对应页面）
5. 最近分账记录列表
6. TabBar 高亮逻辑

---

### 任务 4.2：开户模块
**预估时间：** 60min
**验收标准：** 个人开户/企业开户 Tab 切换，数据提交成功

**执行步骤：**
1. TabBar 切换（个人/企业）
2. 个人开户表单（姓名/手机/身份证/银行卡/开户行）
3. 企业开户表单（企业名称/信用代码/法人/法人身份证/联系人手机/对公账户）
4. 提交按钮 + loading 状态
5. Mock 成功响应 + 跳转

---

### 任务 4.3：账户升级模块
**预估时间：** 40min
**验收标准：** 升级引导页、活体认证流程模拟

**执行步骤：**
1. 当前账户状态展示
2. 升级条件说明
3. 活体认证模拟（模拟拍照 + 成功回调）
4. 升级结果展示

---

### 任务 4.4：充值 + 提现模块
**预估时间：** 60min
**验收标准：** 充值成功/提现成功，有手续费展示

**执行步骤：**
充值：
1. 金额输入（快捷金额按钮 + 自定义）
2. 支付方式选择（余额/微信/支付宝）
3. 确认支付按钮
4. 充值成功/失败结果页

提现：
1. 到账账户选择（银行卡）
2. 金额输入 + 手续费展示
3. 密码验证表单
4. 提现成功/失败结果页

---

### 任务 4.5：分账 + 分账记录模块
**预估时间：** 60min
**验收标准：** 发起分账成功，列表正确展示

**执行步骤：**
分账（split 页面）：
1. 收款方选择（从商户/导游列表选择）
2. 分账金额输入 + 分账比例
3. 确认分账弹窗
4. 成功/失败结果

分账记录（split-record 页面）：
1. Tab 筛选（全部/成功/失败/处理中）
2. 列表展示（金额/时间/收款方/状态）
3. 详情页跳转

---

### 任务 4.6：付款订单模块
**预估时间：** 40min
**验收标准：** 订单列表和详情展示正确

**执行步骤：**
1. 订单状态 Tab（全部/待支付/已支付/已退款）
2. 订单卡片列表
3. 订单详情页

---

### 任务 4.7：收款码 + 银行卡 + 门店绑定
**预估时间：** 60min
**验收标准：** 收款码展示，绑卡列表，增删改查

**执行步骤：**
收款码：
1. 二维码生成（金额固定/可调）
2. 保存图片到相册

银行卡（bankcard）：
1. 绑卡列表展示
2. 添加银行卡弹窗（姓名/卡号/银行/手机）
3. 解绑功能

门店绑定（store-bind）：
1. 门店搜索
2. 绑定确认

---

### 任务 4.8：消息 + 帮助 + 关于
**预估时间：** 40min
**验收标准：** 消息列表，帮助内容展示

**执行步骤：**
消息（message）：
1. 消息分类 Tab（系统/交易/公告）
2. 消息列表

帮助（help）：
1. FAQ 折叠面板
2. 联系客服入口

---

## 阶段五：收尾 + 部署

### 任务 5.1：工程化完善
**预估时间：** 30min
**验收标准：** eslint + prettier 配置完成

**执行步骤：**
1. 安装 + 配置 eslint
2. 安装 + 配置 prettier
3. husky + lint-staged（可选）
4. commitlint 配置

---

### 任务 5.2：真机调试 + Bug 修复
**预估时间：** 60min
**验收标准：** 微信开发者工具能正常预览，无白屏/报错

**执行步骤：**
1. HBuilderX 连接微信开发者工具
2. 真机调试检查 UI 问题
3. 修复兼容性问题（UNI-API 差异）

---

### 任务 5.3：GitHub Pages 部署验证
**预估时间：** 20min
**验收标准：** https://wuhai511-ui.github.io/lvgot-purchase/uniapp/ 全部页面 200

**执行步骤：**
1. 触发 GitHub Actions 构建
2. 验证每个页面 URL 可访问
3. 确认 TabBar 和页面跳转正常

---

## 执行模式选择

**推荐：Subagent 驱动执行**

每个任务分配给 subagent 并行处理，按依赖顺序串行：
1. 任务 1.x（初始化）→ 2.x（页面框架）→ 3.x（状态+API）→ 4.x（业务功能）→ 5.x（收尾）
2. Phase 3（subagent-development）Per-task loop：implement → review → quality check

---

**工时汇总**

| 阶段 | 任务数 | 预估时间 |
|------|--------|----------|
| 一：初始化 | 4 | 1.5h |
| 二：页面框架 | 4 | 2.5h |
| 三：状态+API | 3 | 1.5h |
| 四：业务功能 | 8 | 7h |
| 五：收尾 | 3 | 1.8h |
| **合计** | **22** | **~14h** |

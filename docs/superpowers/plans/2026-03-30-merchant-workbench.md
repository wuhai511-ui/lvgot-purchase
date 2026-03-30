# 商户工作台 — 实现计划

**目标：** 将 admin 项目从单文件 App.vue 重构为多页面 Vue3 项目，实现商户工作台全部功能

**架构：** Vue 3 + Vite + Element Plus + Vue Router，组件化拆分，API 层统一封装

**技术栈：** vue@3, element-plus@2.4, vue-router@4, vite

---

## 文件结构（重构后）

```
admin/src/
  api/
    index.js          # 统一封装 fetch， 自动附加 token
    merchant.js       # 商户登录、开户申请相关 API
    account.js        # 账户查询、充值、提现 API
    trade.js          # 付款、分账、交易消息 API
    bank.js           # 银行卡管理 API
    system.js         # 员工、部门、角色、权限 API
  router/
    index.js          # 路由配置
    guards.js         # 路由守卫（登录拦截）
  views/
    Login.vue          # 登录页（手机号+验证码）
    Dashboard.vue      # 工作台/账户总览
    AccountOpening.vue # 开户申请流程
    BankCard.vue       # 银行卡管理
    Recharge.vue       # 充值
    Withdraw.vue       # 提现申请
    PaymentOrder.vue    # 付款订单（手动分账）
    SplitRule.vue       # 分账规则
    SplitRecord.vue     # 分账记录
    TradeMessage.vue     # 交易消息明细
    Store.vue           # 门店管理
    Employee.vue         # 员工管理
    Department.vue       # 部门管理
    Role.vue            # 角色管理
    Permission.vue       # 权限管理
  styles/
    variables.scss      # 主题变量（颜色、字体）
    global.scss         # 全局样式
  utils/
    storage.js         # localStorage 封装
    qzt.js             # 钱账通接口签名（RSA）
  App.vue              # 根组件（仅布局+路由出口）
  main.js              # 入口（挂载 Vue + 注册插件）
```

---

## 任务清单

### 阶段一：基础设施（P0）

- [ ] **任务 1：** 安装 vue-router@4，建立 `src/router/index.js` 基础路由配置
- [ ] **任务 2：** 建立 `src/api/index.js` 封装统一 fetch，自动附加 Authorization token
- [ ] **任务 3：** 建立 `src/utils/storage.js`（localStorage 存 token/open_id）
- [ ] **任务 4：** 建立 `src/styles/variables.scss` 和 `global.scss`，配置 Element Plus 主题变量
- [ ] **任务 5：** 重构 `App.vue` 为纯布局组件（侧边栏 + 顶部栏 + `<router-view>`），删除所有页面逻辑
- [ ] **任务 6：** 建立 `src/router/guards.js` 路由守卫，未登录拦截到 /login

### 阶段二：登录 + 工作台（P0）

- [ ] **任务 7：** 实现 `Login.vue` — 手机号输入 + 验证码输入（Mock，任意验证码登录成功），登录成功后保存 token 并跳转
- [ ] **任务 8：** 实现 `Dashboard.vue` — 账户总览，展示主账户余额 = 拉卡拉余额 + 银行内部户余额（Mock 数据）
- [ ] **任务 9：** 实现侧边栏菜单，根据登录状态动态显示（未登录隐藏，已开户显示全部菜单）

### 阶段三：资金管理核心（P0）

- [ ] **任务 10：** 实现 `AccountOpening.vue` — 开户申请流程：表单（商户名称+类型+身份证+营业执照上传）+ file.upload.commn 上传 + 调用 `/api/merchant/apply` + 跳转钱账通 H5 + 回调处理
- [ ] **任务 11：** 实现 `BankCard.vue` — 银行卡列表 + 绑卡表单 + 解绑确认弹窗
- [ ] **任务 12：** 实现 `Recharge.vue` — 充值表单（选择账户+金额）
- [ ] **任务 13：** 实现 `Withdraw.vue` — 提现申请（绑卡判断+余额展示+手续费说明+自动提现规则配置）

### 阶段四：交易管理核心（P0）

- [ ] **任务 14：** 实现 `PaymentOrder.vue` — 手动分账：选择付款账户+收款方+金额+确认提交
- [ ] **任务 15：** 实现 `SplitRule.vue` — 分账规则列表 + 新增规则（比例/固定金额）+ 编辑/删除
- [ ] **任务 16：** 实现 `SplitRecord.vue` — 分账记录列表（时间+金额+状态+收款方，支持筛选）

### 阶段五：交易消息（P1）

- [ ] **任务 17：** 实现 `TradeMessage.vue` — 交易消息明细列表（时间+商户号+流水号+金额+类型，支持按商户号/流水号查询）

### 阶段六：门店管理（P2）

- [ ] **任务 18：** 实现 `Store.vue` — 门店列表 + 新增/编辑/解绑（解绑需二次确认弹窗）

### 阶段七：系统设置（P3）

- [ ] **任务 19：** 实现 `Department.vue` — 部门列表 + 新增/编辑/删除
- [ ] **任务 20：** 实现 `Employee.vue` — 员工列表 + 新增（手机号+姓名+部门+角色）+ 编辑/禁用
- [ ] **任务 21：** 实现 `Role.vue` — 角色列表 + 新增角色（选择可访问菜单）+ 编辑/删除
- [ ] **任务 22：** 实现 `Permission.vue` — 权限列表 + 角色-权限关联配置

---

## 执行说明

- 每个任务完成后 `git commit -m "feat(view): 实现 xxx"`
- Mock 数据放在各 `views` 内部作为临时数据，BFF 接口联调时替换
- API 层先写好接口定义和 Mock 返回，实际 BFF 完成后切换真实接口

---

## 当前状态

- ✅ 设计规格已写完：`docs/superpowers/specs/2026-03-30-merchant-workbench-design.md`
- ⏳ 实现计划已写完
- ⏳ 待确认执行方式后开始实现

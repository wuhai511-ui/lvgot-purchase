# CLAUDE.md — 旅购通系统 AI 协作规范手册

---

## 1. 项目概述 (Project Identity)

- **项目名称**：旅购通系统
- **核心目标**：为旅游从业者提供一站式采购管理服务，对接钱账通（QZT）支付网关
- **当前阶段**：开发中，已上线运营
- **关键约束**：私有化部署、单服务器资源有限

---

## 2. 技术栈 (Tech Stack)

- **前端**：Vue 3（JavaScript）+ Element Plus + Vite（`admin/`）
- **后端**：Node.js 18 + Express（`bff-server/`）
- **数据库**：SQLite（`better-sqlite3`），路径 `/opt/lvgot-purchase/bff-server/data/qzt.db`
- **进程管理**：PM2（`lvgot-bff-qzt`）
- **部署**：私有化服务器 139.196.190.217，Nginx 反向代理

---

## 3. 工程铁律 (Global Rules)

<!-- 以下规则优先级最高 -->

- **在编写任何代码前，先描述方法并等待批准。**
- 如果需求比较模糊，请主动提出澄清性问题。
- 禁止生成除英文、中文以外的代码注释或字符串。
- 每次被纠正后复盘原因，给出避免再犯的计划。
- 出现 Bug 时必须先定位根因再修复，不可盲目修补。
- 超过 3 个文件的改动需先拆解为小任务。

---

## 4. 全局开发指令 (Commands)

```bash
# 前端
cd admin && npm run dev          # 开发调试
npm run build                     # 构建前端

# 后端（BFF 服务在服务器上运行，本地修改后同步部署）
# 服务器操作：
ssh admin@139.196.190.217
pm2 restart lvgot-bff-qzt        # 重启 BFF 服务
pm2 logs lvgot-bff-qzt --lines 50 # 查看日志

# 数据库
cd /opt/lvgot-purchase/bff-server
sqlite3 data/qzt.db "SELECT * FROM merchants LIMIT 5;"

# Nginx
sudo nginx -s reload
```

---

## 5. 架构与编码规范 (Architecture & Conventions)

### 目录结构

```
lvgot-purchase/
├── admin/                    # Vue 3 前端
│   ├── src/
│   │   ├── api/             # API 调用封装
│   │   ├── views/           # 页面组件
│   │   └── router/          # 路由配置
│   └── dist/                # 构建产物（部署到服务器）
├── bff-server/              # Node.js BFF 服务
│   ├── routes/             # Express 路由（每实体一个文件）
│   ├── qzt/                # 钱账通模块（crypto/client/index）
│   ├── db-sqlite3.js       # 数据库操作（better-sqlite3 同步 API）
│   ├── app.js              # 主入口
│   └── data/qzt.db         # SQLite 数据库
└── uniapp/                  # 小程序端（参考用）
```

### 命名约定

- 文件名：kebab-case (store-detail.vue)
- 变量/函数：camelCase
- 常量：UPPER_SNAKE_CASE
- 路由处理器：async/await，禁止回调

### API 规范

- 返回格式：`{ code: 0, data: ... }` 或 `{ code: 非0, message: "..." }`
- 钱账通调用：`callQzt(service, params)`，签名自动处理
- 数据库写：`db.run()` 而非 `db.exec()`

---

## 6. AI 协作规范

### 已安装 Skill

- `brainstorming` — 需求澄清、设计文档
- `writing-plans` — 任务拆解为微步骤
- `subagent-driven-development` — 子代理并行开发
- `test-driven-development` — TDD 红-绿循环
- `systematic-debugging` — Bug 根因分析
- `requesting-code-review` — 代码审查
- `verification-before-completion` — 完成前验证
- `finishing-a-development-branch` — 分支收尾
- `using-git-worktrees` — 功能分支隔离

### Skill 触发方式

AI 根据当前操作自动激活对应 Skill，无需手动命令。

核心目标：强制执行 规划 → 实现 → 测试 → 审查 → 收尾 的工程纪律。
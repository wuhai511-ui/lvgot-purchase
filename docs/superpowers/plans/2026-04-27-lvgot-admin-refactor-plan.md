# 旅购通运营后台重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将运营后台重构为商户工作台的后台支撑系统，采用共享数据库+tenant_id隔离方案

**Architecture:**
- 共享数据库 + tenant_id 字段隔离
- 商户端 API 强制注入 tenant_id
- 运营后台 API 支持可选筛选
- 保留商户工作台对钱账通的对接

**Tech Stack:** Vue 3 + Element Plus (前端), Express + SQLite (BFF)

---

## 文件结构

```
lvgot-purchase/
├── admin/src/
│   ├── api/                    # API 调用封装
│   │   ├── index.js           # API 统一导出
│   │   ├── merchant.js        # 商户 API（需重构）
│   │   ├── guide.js           # 新增：导游管理 API
│   │   ├── store.js           # 门店 API（已有）
│   │   ├── tour.js            # 旅行社 API（已有）
│   │   ├── split.js           # 分账 API（已有）
│   │   └── finance.js         # 财务报表 API（已有）
│   ├── views/                 # 页面组件（按功能模块重组）
│   │   ├── Tenant/            # 新增：租户管理模块
│   │   │   ├── TenantList.vue
│   │   │   └── TenantDetail.vue
│   │   ├── Guide/              # 新增：导游管理模块
│   │   │   ├── GuideList.vue
│   │   │   └── GuideAudit.vue
│   │   ├── Store/             # 门店管理（已有）
│   │   ├── Tour/              # 旅行社管理（已有）
│   │   ├── Finance/           # 财务报表（已有）
│   │   ├── Split/             # 分账管理（已有）
│   │   └── System/            # 系统管理（Role, Permission, Department, Employee）
│   ├── router/
│   │   ├── routes.js          # 路由配置（需按新模块重组）
│   │   └── guards.js          # 路由守卫（需增加 admin 角色校验）
│   └── utils/
│       └── storage.js         # 存储工具（已有）
├── bff-server/
│   ├── routes/
│   │   ├── merchant.js        # 商户路由（已有）
│   │   ├── guide.js           # 新增：导游审核路由
│   │   ├── tenant.js          # 新增：租户管理路由
│   │   └── admin.js           # 新增：admin 专属路由聚合
│   ├── db-sqlite3.js          # 数据库层（需增加 tenant_id）
│   └── app.js                # 应用入口（需挂载 admin 路由）
└── docs/superpowers/plans/2026-04-27-lvgot-admin-refactor-plan.md
```

---

## 第一阶段：数据库层改造

### Task 1: 数据库迁移脚本

**Files:**
- Create: `bff-server/migrations/001_add_tenant_id.js`
- Test: 在测试库执行，验证字段添加成功

- [ ] **Step 1: 创建迁移脚本**

```javascript
// bff-server/migrations/001_add_tenant_id.js
const db = require('../db-sqlite3');

async function up() {
  const tables = [
    'merchants',
    'stores',
    'tour_groups',
    'split_rules',
    'split_templates',
    'transactions',
    'accounts',
    'bank_cards',
    'orders'
  ];

  for (const table of tables) {
    // 检查是否已有 tenant_id 列
    const columns = await db.allAsync(`PRAGMA table_info(${table})`);
    const hasTenantId = columns.some(c => c.name === 'tenant_id');

    if (!hasTenantId) {
      // 对于 merchants 表，tenant_id 指向自身
      if (table === 'merchants') {
        await db.runAsync(`ALTER TABLE ${table} ADD COLUMN tenant_id INTEGER DEFAULT id`);
      } else {
        await db.runAsync(`ALTER TABLE ${table} ADD COLUMN tenant_id INTEGER`);
      }
      console.log(`[Migration] Added tenant_id to ${table}`);
    }
  }

  // merchant_features 表（租户功能权限）
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS merchant_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL,
      enable_split INTEGER DEFAULT 1,
      enable_withdraw INTEGER DEFAULT 1,
      enable_reconciliation INTEGER DEFAULT 1,
      enable_store_management INTEGER DEFAULT 1,
      max_stores INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(merchant_id)
    )
  `);

  console.log('[Migration] Completed: tenant_id columns added');
}

module.exports = { up };
```

- [ ] **Step 2: 创建迁移目录**

Run: `mkdir -p /home/whf/workspace/lvgot-purchase/bff-server/migrations`

- [ ] **Step 3: 执行迁移**

Run: `cd /home/whf/workspace/lvgot-purchase/bff-server && node -e "require('./migrations/001_add_tenant_id').up()"`

Expected: 输出 "[Migration] Completed: tenant_id columns added"

- [ ] **Step 4: 验证迁移**

Run: `sqlite3 data/qzt.db "PRAGMA table_info(merchants);" | grep tenant_id`

Expected: 显示 tenant_id 列信息

- [ ] **Step 5: 提交**

```bash
git add bff-server/migrations/001_add_tenant_id.js
git commit -m "db: 添加 tenant_id 字段迁移脚本"
```

---

### Task 2: 数据库层 tenant_id 支持

**Files:**
- Modify: `bff-server/db-sqlite3.js` (末尾添加新函数)

- [ ] **Step 1: 添加 tenant_id 相关函数**

在 `db-sqlite3.js` 末尾添加以下函数：

```javascript
// ========== Tenant 相关 ==========
async function getTenantById(id) {
  return await getAsync(`SELECT * FROM merchants WHERE id = ?`, [parseInt(id)]);
}

async function getTenants(filters = {}) {
  let query = 'SELECT * FROM merchants WHERE 1=1';
  const params = [];
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.split_role) { query += ' AND split_role = ?'; params.push(filters.split_role); }
  if (filters.keyword) {
    query += ' AND (register_name LIKE ? OR legal_mobile LIKE ?)';
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  query += ' ORDER BY created_at DESC';
  return await allAsync(query, params);
}

async function getGuides(filters = {}) {
  // 导游是 split_role = 'guide' 的商户
  return await getTenants({ ...filters, split_role: 'guide' });
}

async function updateTenantStatus(id, status) {
  await runAsync(`UPDATE merchants SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, [status, parseInt(id)]);
  return await getTenantById(id);
}

async function getMerchantFeatures(merchant_id) {
  return await getAsync(`SELECT * FROM merchant_features WHERE merchant_id = ?`, [parseInt(merchant_id)]);
}

async function saveMerchantFeatures(features) {
  const { merchant_id, enable_split, enable_withdraw, enable_reconciliation, enable_store_management, max_stores } = features;
  const existing = await getMerchantFeatures(merchant_id);
  if (existing) {
    await runAsync(
      `UPDATE merchant_features SET enable_split=?, enable_withdraw=?, enable_reconciliation=?, enable_store_management=?, max_stores=?, updated_at=CURRENT_TIMESTAMP WHERE merchant_id=?`,
      [enable_split ? 1 : 0, enable_withdraw ? 1 : 0, enable_reconciliation ? 1 : 0, enable_store_management ? 1 : 0, max_stores || 10, parseInt(merchant_id)]
    );
  } else {
    await runAsync(
      `INSERT INTO merchant_features (merchant_id, enable_split, enable_withdraw, enable_reconciliation, enable_store_management, max_stores) VALUES (?, ?, ?, ?, ?, ?)`,
      [parseInt(merchant_id), enable_split ? 1 : 0, enable_withdraw ? 1 : 0, enable_reconciliation ? 1 : 0, enable_store_management ? 1 : 0, max_stores || 10]
    );
  }
  return await getMerchantFeatures(merchant_id);
}
```

- [ ] **Step 2: 导出新函数**

在 `module.exports` 中添加：

```javascript
// Tenant
getTenantById,
getTenants,
getGuides,
updateTenantStatus,
getMerchantFeatures,
saveMerchantFeatures,
```

- [ ] **Step 3: 验证函数**

Run: `cd /home/whf/workspace/lvgot-purchase/bff-server && node -e "const db=require('./db-sqlite3'); db.initDatabase().then(()=>db.getTenants()).then(r=>console.log('Tenants count:', r.length)).catch(console.error)"`

Expected: 输出 "Tenants count: X"

- [ ] **Step 4: 提交**

```bash
git add bff-server/db-sqlite3.js
git commit -m "db: 添加 tenant_id 相关函数和 merchant_features 表支持"
```

---

## 第二阶段：BFF 层改造

### Task 3: 创建 admin 路由

**Files:**
- Create: `bff-server/routes/admin.js`

- [ ] **Step 1: 创建 admin 路由文件**

```javascript
// bff-server/routes/admin.js
const express = require('express');
const router = express.Router();

module.exports = function createAdminRouter(deps) {
  const { db } = deps;

  // ========== 租户管理 ==========
  
  // 获取租户列表
  router.get('/tenants', async (req, res) => {
    const { status, split_role, keyword } = req.query;
    const tenants = await db.getTenants({ status, split_role, keyword });
    res.json({ code: 0, data: tenants });
  });

  // 获取租户详情
  router.get('/tenants/:id', async (req, res) => {
    const tenant = await db.getTenantById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ code: 404, message: '租户不存在' });
    }
    // 获取功能权限
    const features = await db.getMerchantFeatures(req.params.id);
    res.json({ code: 0, data: { ...tenant, features } });
  });

  // 更新租户状态
  router.put('/tenants/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ code: 400, message: '缺少 status 参数' });
    }
    const tenant = await db.updateTenantStatus(req.params.id, status);
    res.json({ code: 0, data: tenant });
  });

  // 更新租户功能权限
  router.put('/tenants/:id/features', async (req, res) => {
    const features = await db.saveMerchantFeatures({
      merchant_id: req.params.id,
      ...req.body
    });
    res.json({ code: 0, data: features });
  });

  // ========== 导游管理 ==========

  // 获取导游列表
  router.get('/guides', async (req, res) => {
    const { status, keyword } = req.query;
    const guides = await db.getGuides({ status, keyword });
    res.json({ code: 0, data: guides });
  });

  // 获取导游详情
  router.get('/guides/:id', async (req, res) => {
    const guide = await db.getTenantById(req.params.id);
    if (!guide || guide.split_role !== 'guide') {
      return res.status(404).json({ code: 404, message: '导游不存在' });
    }
    const features = await db.getMerchantFeatures(req.params.id);
    res.json({ code: 0, data: { ...guide, features } });
  });

  // 审核导游（通过/驳回）
  router.put('/guides/:id/audit', async (req, res) => {
    const { status, reject_reason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的审核状态' });
    }
    const guide = await db.updateTenantStatus(req.params.id, status);
    if (status === 'REJECTED' && reject_reason) {
      // 可以扩展 callback_message 存储驳回原因
      await db.saveMerchant({
        ...guide,
        callback_message: reject_reason
      });
    }
    res.json({ code: 0, data: guide });
  });

  // ========== 门店管理（管理员视角）==========

  // 获取所有门店（不限制租户）
  router.get('/stores', async (req, res) => {
    const stores = await db.getStores();
    res.json({ code: 0, data: stores });
  });

  // 获取门店详情
  router.get('/stores/:store_id', async (req, res) => {
    const store = await db.getStoreByStoreId(req.params.store_id);
    if (!store) {
      return res.status(404).json({ code: 404, message: '门店不存在' });
    }
    // 获取关联的终端
    const terminals = await db.getStoreTerminals(req.params.store_id);
    res.json({ code: 0, data: { ...store, terminals } });
  });

  // ========== 旅行社管理（管理员视角）==========

  // 获取所有旅行社/团队
  router.get('/tours', async (req, res) => {
    const { status } = req.query;
    const tours = await db.getTourGroups();
    res.json({ code: 0, data: tours });
  });

  // ========== 财务报表（管理员视角）==========

  // 获取交易流水（所有租户）
  router.get('/transactions', async (req, res) => {
    const { type, status, limit = 100 } = req.query;
    const transactions = await db.getTransactions({ type, status, limit: parseInt(limit) });
    res.json({ code: 0, data: transactions });
  });

  // 获取账户列表（所有租户）
  router.get('/accounts', async (req, res) => {
    // 返回所有账户，需关联商户名称
    const merchants = await db.getMerchants();
    const accountsMap = {};
    for (const m of merchants) {
      const accounts = await db.getAccountsByMerchantId(m.id);
      if (accounts.length > 0) {
        accountsMap[m.id] = { ...accounts[0], merchant_name: m.register_name };
      }
    }
    res.json({ code: 0, data: Object.values(accountsMap) });
  });

  return router;
};
```

- [ ] **Step 2: 在 app.js 中挂载 admin 路由**

在 `bff-server/app.js` 中添加：

```javascript
// 在路由模块引入部分添加
const createAdminRouter = require('./routes/admin');

// 在挂载路由部分添加（放在其他路由之后）
app.use('/api/admin', createAdminRouter(deps));
```

- [ ] **Step 3: 验证路由**

Run: `cd /home/whf/workspace/lvgot-purchase/bff-server && node -e "
const {createApp} = require('./app');
createApp().then(app => {
  const server = app.listen(3000, () => {
    console.log('Server started');
    // 测试 admin 路由
    const http = require('http');
    http.get('http://localhost:3000/api/admin/tenants', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Response:', data.substring(0, 200));
        server.close();
      });
    }).on('error', console.error);
  });
});
"`

Expected: 显示 `{ "code": 0, "data": [...] }`

- [ ] **Step 4: 提交**

```bash
git add bff-server/routes/admin.js bff-server/app.js
git commit -m "feat: 添加 admin 路由支持运营后台 API"
```

---

## 第三阶段：前端重构

### Task 4: 创建 API 封装

**Files:**
- Create: `admin/src/api/index.js`
- Create: `admin/src/api/guide.js`

- [ ] **Step 1: 创建 API 统一入口**

```javascript
// admin/src/api/index.js
import * as merchant from './merchant'
import * as guide from './guide'
import * as store from './store'
import * as tour from './tour'
import * as finance from './finance'
import * as split from './split'

export default {
  merchant,
  guide,
  store,
  tour,
  finance,
  split
}

export { merchant, guide, store, tour, finance, split }
```

- [ ] **Step 2: 创建导游管理 API**

```javascript
// admin/src/api/guide.js
import request from '@/utils/request'

export function getGuides(params) {
  return request({
    url: '/api/admin/guides',
    method: 'get',
    params
  })
}

export function getGuideDetail(id) {
  return request({
    url: `/api/admin/guides/${id}`,
    method: 'get'
  })
}

export function auditGuide(id, data) {
  return request({
    url: `/api/admin/guides/${id}/audit`,
    method: 'put',
    data
  })
}
```

- [ ] **Step 3: 创建租户管理 API**

```javascript
// admin/src/api/tenant.js
import request from '@/utils/request'

export function getTenants(params) {
  return request({
    url: '/api/admin/tenants',
    method: 'get',
    params
  })
}

export function getTenantDetail(id) {
  return request({
    url: `/api/admin/tenants/${id}`,
    method: 'get'
  })
}

export function updateTenantStatus(id, status) {
  return request({
    url: `/api/admin/tenants/${id}/status`,
    method: 'put',
    data: { status }
  })
}

export function updateTenantFeatures(id, features) {
  return request({
    url: `/api/admin/tenants/${id}/features`,
    method: 'put',
    data: features
  })
}
```

- [ ] **Step 4: 提交**

```bash
git add admin/src/api/index.js admin/src/api/guide.js admin/src/api/tenant.js
git commit -m "feat: 添加 admin API 封装"
```

---

### Task 5: 创建导游管理页面

**Files:**
- Create: `admin/src/views/Guide/GuideList.vue`
- Create: `admin/src/views/Guide/GuideAudit.vue`

- [ ] **Step 1: 创建导游列表页面**

```vue
<!-- admin/src/views/Guide/GuideList.vue -->
<template>
  <div class="guide-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>导游管理</span>
        </div>
      </template>
      
      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="姓名/手机号/证号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="待审核" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已驳回" value="REJECTED" />
            <el-option label="已激活" value="ACTIVE" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="register_name" label="姓名" />
        <el-table-column prop="legal_mobile" label="手机号" />
        <el-table-column prop="guide_cert_no" label="导游证号" />
        <el-table-column prop="guide_cert_img" label="导游证照片">
          <template #default="{ row }">
            <el-image 
              v-if="row.guide_cert_img" 
              :src="row.guide_cert_img" 
              :preview-src-list="[row.guide_cert_img]"
              style="width: 60px; height: 60px"
              fit="cover"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'PENDING'" type="warning">待审核</el-tag>
            <el-tag v-else-if="row.status === 'APPROVED'" type="success">已通过</el-tag>
            <el-tag v-else-if="row.status === 'REJECTED'" type="danger">已驳回</el-tag>
            <el-tag v-else type="success">已激活</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button 
              v-if="row.status === 'PENDING'" 
              link 
              type="primary" 
              @click="handleAudit(row)"
            >
              审核
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditDialogVisible" title="导游证审核" width="500px">
      <el-form :model="auditForm" label-width="100px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.status">
            <el-radio label="APPROVED">通过</el-radio>
            <el-radio label="REJECTED">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="auditForm.status === 'REJECTED'" label="驳回原因">
          <el-input 
            v-model="auditForm.reject_reason" 
            type="textarea" 
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAudit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getGuides, auditGuide } from '@/api/guide'

const loading = ref(false)
const tableData = ref([])
const searchForm = reactive({
  keyword: '',
  status: ''
})
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const auditDialogVisible = ref(false)
const auditForm = reactive({
  id: null,
  status: 'APPROVED',
  reject_reason: ''
})

async function fetchData() {
  loading.value = true
  try {
    const res = await getGuides({
      keyword: searchForm.keyword,
      status: searchForm.status
    })
    tableData.value = res.data || []
    pagination.total = tableData.value.length
  } catch (err) {
    ElMessage.error('获取导游列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  handleSearch()
}

function handleView(row) {
  // 查看详情逻辑
  console.log('查看导游:', row.id)
}

function handleAudit(row) {
  auditForm.id = row.id
  auditForm.status = 'APPROVED'
  auditForm.reject_reason = ''
  auditDialogVisible.value = true
}

async function submitAudit() {
  try {
    await auditGuide(auditForm.id, {
      status: auditForm.status,
      reject_reason: auditForm.reject_reason
    })
    ElMessage.success('审核提交成功')
    auditDialogVisible.value = false
    fetchData()
  } catch (err) {
    ElMessage.error('审核提交失败')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.guide-list {
  padding: 20px;
}
.search-form {
  margin-bottom: 20px;
}
</style>
```

- [ ] **Step 2: 创建目录**

Run: `mkdir -p /home/whf/workspace/lvgot-purchase/admin/src/views/Guide`

- [ ] **Step 3: 提交**

```bash
git add admin/src/views/Guide/GuideList.vue
git commit -m "feat: 添加导游管理页面"
```

---

### Task 6: 重组路由配置

**Files:**
- Modify: `admin/src/router/routes.js`

- [ ] **Step 1: 更新路由配置**

修改 `routes.js`，添加新模块路由，保持现有页面路由不变：

```javascript
// 在 import 部分添加新页面
import GuideList from '../views/Guide/GuideList.vue'
import TenantList from '../views/Tenant/TenantList.vue'

// 在 routes 数组中添加
{
  path: '/guides',
  name: 'GuideList',
  meta: { requiresAuth: true },
  component: GuideList,
},
{
  path: '/tenants',
  name: 'TenantList',
  meta: { requiresAuth: true },
  component: TenantList,
},
```

- [ ] **Step 2: 提交**

```bash
git add admin/src/router/routes.js
git commit -m "feat: 添加新模块路由配置"
```

---

## 验收标准

1. **数据库迁移成功** — 所有表增加 tenant_id 字段，merchant_features 表创建成功
2. **Admin API 可用** — `/api/admin/tenants`、`/api/admin/guides` 等接口正常返回数据
3. **导游审核功能** — 导游列表查询、审核通过/驳回功能正常
4. **路由配置正确** — 新增页面可正常访问
5. **商户工作台不受影响** — 原有钱账通对接功能正常工作

---

## 执行选项

**Plan complete and saved to `docs/superpowers/plans/2026-04-27-lvgot-admin-refactor-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

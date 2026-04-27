<!-- admin/src/views/Tenant/TenantList.vue -->
<template>
  <div class="tenant-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>租户管理</span>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="名称/手机号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="待审核" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已激活" value="ACTIVE" />
            <el-option label="已驳回" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.split_role" placeholder="全部" clearable>
            <el-option label="商户" value="merchant" />
            <el-option label="门店" value="store" />
            <el-option label="旅行社" value="agency" />
            <el-option label="导游" value="guide" />
            <el-option label="其他" value="other" />
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
        <el-table-column prop="register_name" label="商户名称" min-width="150" />
        <el-table-column prop="legal_mobile" label="手机号" width="130" />
        <el-table-column prop="split_role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.split_role === 'merchant'" type="primary">商户</el-tag>
            <el-tag v-else-if="row.split_role === 'store'" type="success">门店</el-tag>
            <el-tag v-else-if="row.split_role === 'agency'" type="warning">旅行社</el-tag>
            <el-tag v-else-if="row.split_role === 'guide'" type="info">导游</el-tag>
            <el-tag v-else>{{ row.split_role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="qzt_account_no" label="钱账通账号" width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'PENDING'" type="warning">待审核</el-tag>
            <el-tag v-else-if="row.status === 'APPROVED'" type="success">已通过</el-tag>
            <el-tag v-else-if="row.status === 'REJECTED'" type="danger">已驳回</el-tag>
            <el-tag v-else-if="row.status === 'ACTIVE'" type="success">已激活</el-tag>
            <el-tag v-else type="info">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="注册时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">详情</el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              link
              type="success"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'ACTIVE'"
              link
              type="danger"
              @click="handleDisable(row)"
            >
              禁用
            </el-button>
            <el-button link type="primary" @click="handleFeatures(row)">功能权限</el-button>
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

    <!-- 功能权限对话框 -->
    <el-dialog v-model="featuresDialogVisible" title="功能权限配置" width="500px">
      <el-form :model="featuresForm" label-width="120px">
        <el-form-item label="分账功能">
          <el-switch v-model="featuresForm.enable_split" />
        </el-form-item>
        <el-form-item label="提现功能">
          <el-switch v-model="featuresForm.enable_withdraw" />
        </el-form-item>
        <el-form-item label="对账功能">
          <el-switch v-model="featuresForm.enable_reconciliation" />
        </el-form-item>
        <el-form-item label="门店管理">
          <el-switch v-model="featuresForm.enable_store_management" />
        </el-form-item>
        <el-form-item label="最大门店数">
          <el-input-number v-model="featuresForm.max_stores" :min="1" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="featuresDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFeatures">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTenants, getTenantDetail, updateTenantStatus, updateTenantFeatures } from '@/api/tenant'

const loading = ref(false)
const tableData = ref([])
const searchForm = reactive({
  keyword: '',
  status: '',
  split_role: ''
})
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const featuresDialogVisible = ref(false)
const featuresForm = reactive({
  merchant_id: null,
  enable_split: false,
  enable_withdraw: false,
  enable_reconciliation: false,
  enable_store_management: false,
  max_stores: 10
})

async function fetchData() {
  loading.value = true
  try {
    const res = await getTenants({
      keyword: searchForm.keyword,
      status: searchForm.status,
      split_role: searchForm.split_role
    })
    if (res.code === 0) {
      tableData.value = res.data || []
      pagination.total = tableData.value.length
    } else {
      ElMessage.error(res.message || '获取租户列表失败')
    }
  } catch (err) {
    console.error('获取租户列表失败:', err)
    ElMessage.error('获取租户列表失败')
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
  searchForm.split_role = ''
  handleSearch()
}

function handleView(row) {
  ElMessage.info('租户详情功能开发中')
}

async function handleApprove(row) {
  try {
    await ElMessageBox.confirm(`确认通过商户「${row.register_name}」的申请？`, '审核确认', {
      confirmButtonText: '确认通过',
      type: 'success'
    })
    const res = await updateTenantStatus(row.id, 'APPROVED')
    if (res.code === 0) {
      ElMessage.success('已通过')
      fetchData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

async function handleDisable(row) {
  try {
    await ElMessageBox.confirm(`确认禁用商户「${row.register_name}」？`, '禁用确认', {
      confirmButtonText: '确认禁用',
      type: 'warning'
    })
    const res = await updateTenantStatus(row.id, 'DISABLED')
    if (res.code === 0) {
      ElMessage.success('已禁用')
      fetchData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

async function handleFeatures(row) {
  // 获取现有功能权限
  try {
    const res = await getTenantDetail(row.id)
    if (res.code === 0 && res.data.features) {
      const f = res.data.features
      featuresForm.merchant_id = row.id
      featuresForm.enable_split = !!f.enable_split
      featuresForm.enable_withdraw = !!f.enable_withdraw
      featuresForm.enable_reconciliation = !!f.enable_reconciliation
      featuresForm.enable_store_management = !!f.enable_store_management
      featuresForm.max_stores = f.max_stores || 10
    } else {
      featuresForm.merchant_id = row.id
      featuresForm.enable_split = false
      featuresForm.enable_withdraw = false
      featuresForm.enable_reconciliation = false
      featuresForm.enable_store_management = false
      featuresForm.max_stores = 10
    }
    featuresDialogVisible.value = true
  } catch (err) {
    ElMessage.error('获取功能权限失败')
  }
}

async function submitFeatures() {
  try {
    const res = await updateTenantFeatures(featuresForm.merchant_id, {
      enable_split: featuresForm.enable_split,
      enable_withdraw: featuresForm.enable_withdraw,
      enable_reconciliation: featuresForm.enable_reconciliation,
      enable_store_management: featuresForm.enable_store_management,
      max_stores: featuresForm.max_stores
    })
    if (res.code === 0) {
      ElMessage.success('功能权限已保存')
      featuresDialogVisible.value = false
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (err) {
    console.error('保存功能权限失败:', err)
    ElMessage.error('保存失败')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.tenant-list {
  padding: 20px;
}
.search-form {
  margin-bottom: 20px;
}
</style>

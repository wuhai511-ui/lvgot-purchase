<template>
  <div class="page">
    <div class="page-title">门店管理</div>

    <!-- 搜索区 -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-body" style="display:flex;justify-content:space-between;align-items:center;">
        <div class="search-area">
          <el-input v-model="search.store_id" placeholder="门店ID" style="width:160px;margin-right:12px;" clearable @keyup.enter="loadData"/>
          <el-input v-model="search.store_name" placeholder="门店名称" style="width:200px;margin-right:12px;" clearable @keyup.enter="loadData"/>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="search = {store_id:'',store_name:''}; loadData()">重置</el-button>
        </div>
        <el-button type="primary" @click="showCreate = true">+ 新增门店</el-button>
      </div>
    </div>

    <!-- 门店列表 -->
    <div class="card">
      <el-table :data="tableData" v-loading="loading" stripe @row-click="handleRowClick" style="cursor:pointer;">
        <el-table-column prop="store_id" label="门店ID" width="200"/>
        <el-table-column prop="store_name" label="门店名称" min-width="160"/>
        <el-table-column prop="account_no" label="绑定账户" width="200">
          <template #default="{row}">{{ row.qzt_account_no || row.account_no || '-' }}</template>
        </el-table-column>
        <el-table-column prop="merchant_name" label="商户名称" width="150"/>
        <el-table-column prop="terminal_count" label="终端数" width="80" align="center"/>
        <el-table-column prop="tour_group_count" label="关联旅行团" width="100" align="center"/>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{row}">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{row}">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click.stop="handleView(row)">详情</el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="padding:16px;display:flex;justify-content:flex-end;">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>

    <!-- 新增门店弹窗 -->
    <el-dialog v-model="showCreate" title="新增门店" width="500px">
      <el-form :model="createForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="门店名称" prop="store_name">
          <el-input v-model="createForm.store_name" placeholder="请输入门店名称"/>
        </el-form-item>
        <el-form-item label="绑定账户" prop="merchant_id">
          <el-select v-model="createForm.merchant_id" placeholder="请选择已开通账户" style="width:100%" filterable>
            <el-option v-for="acc in availableAccounts" :key="acc.id" :label="acc.register_name + ' (' + (acc.qzt_account_no || '-') + ')'" :value="acc.id"/>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- 删除确认弹窗 -->
    <el-dialog v-model="showDelete" title="删除门店" width="400px">
      <el-alert type="warning" :closable="false">
        <template #title>确定要删除门店「{{ deleteTarget?.store_name }}」吗？此操作不可恢复。</template>
      </el-alert>
      <template #footer>
        <el-button @click="showDelete = false">取消</el-button>
        <el-button type="danger" :loading="deleting" @click="handleDeleteConfirm">确认删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStoreList, deleteStore, getAvailableAccounts } from '@/api/store'
import { createStore } from '@/api/store'

const router = useRouter()

const loading = ref(false)
const creating = ref(false)
const deleting = ref(false)
const showCreate = ref(false)
const showDelete = ref(false)
const formRef = ref()
const deleteTarget = ref(null)

const search = reactive({ store_id: '', store_name: '' })
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tableData = ref([])
const availableAccounts = ref([])
const createForm = reactive({ store_name: '', merchant_id: null })

const formRules = {
  store_name: [{ required: true, message: '请输入门店名称', trigger: 'blur' }],
  merchant_id: [{ required: true, message: '请选择绑定账户', trigger: 'change' }]
}

const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const loadData = async () => {
  loading.value = true
  try {
    const res = await getStoreList({
      store_id: search.store_id || undefined,
      store_name: search.store_name || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.code === 0) {
      tableData.value = res.data?.list || []
      total.value = res.data?.total || 0
    }
  } catch (e) {
    console.error('获取门店列表失败:', e)
  } finally {
    loading.value = false
  }
}

const fetchAccounts = async () => {
  try {
    const res = await getAvailableAccounts()
    if (res.code === 0) {
      availableAccounts.value = res.data || []
    }
  } catch (e) {
    console.error('获取可用账户列表失败:', e)
  }
}

const handleCreate = async () => {
  await formRef.value?.validate()
  creating.value = true
  try {
    const res = await createStore(createForm)
    if (res.code === 0) {
      ElMessage.success('创建成功')
      showCreate.value = false
      createForm.store_name = ''
      createForm.merchant_id = null
      loadData()
    } else {
      ElMessage.error(res.message || '创建失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '创建失败')
  } finally {
    creating.value = false
  }
}

const handleRowClick = (row) => {
  router.push(`/store/${row.id}`)
}

const handleView = (row) => {
  router.push(`/store/${row.id}`)
}

const handleDelete = (row) => {
  deleteTarget.value = row
  showDelete.value = true
}

const handleDeleteConfirm = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const res = await deleteStore(deleteTarget.value.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      showDelete.value = false
      deleteTarget.value = null
      loadData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadData()
  fetchAccounts()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
.search-area { display: flex; align-items: center; flex-wrap: wrap; }
</style>

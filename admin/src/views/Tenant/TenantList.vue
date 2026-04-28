<!-- admin/src/views/Tenant/TenantList.vue -->
<template>
  <div class="tenant-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>租户管理</span>
          <el-button type="primary" size="small" @click="handleCreate">新增租户</el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="租户名/账号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="启用" value="ACTIVE" />
            <el-option label="禁用" value="DISABLED" />
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
        <el-table-column prop="tenant_name" label="租户名称" min-width="150" />
        <el-table-column prop="username" label="登录账号" width="140" />
        <el-table-column prop="contact_name" label="联系人" width="120" />
        <el-table-column prop="contact_mobile" label="联系电话" width="130" />
        <el-table-column prop="qzt_account_no" label="钱账通账号" width="200" />
        <el-table-column prop="merchant_count" label="子商户数" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'ACTIVE'" type="success">启用</el-tag>
            <el-tag v-else type="danger">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">详情</el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleResetPwd(row)">重置密码</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑租户' : '新增租户'" width="550px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="租户名称" prop="tenant_name">
          <el-input v-model="form.tenant_name" placeholder="例如：某某旅游公司" />
        </el-form-item>
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="form.username" placeholder="用于登录商户工作台" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="登录密码" :prop="isEdit ? '' : 'password'">
          <el-input v-model="form.password" type="password" show-password :placeholder="isEdit ? '留空则不修改密码' : '请设置登录密码'" />
        </el-form-item>
        <el-form-item label="钱账通账号">
          <el-input v-model="form.qzt_account_no" placeholder="绑定钱账通账号（选填）" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contact_name" placeholder="联系人姓名（选填）" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contact_mobile" placeholder="联系电话（选填）" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status_active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="pwdDialogVisible" title="重置密码" width="400px">
      <el-form :model="pwdForm" label-width="80px">
        <el-form-item label="租户">
          <span>{{ pwdForm.tenant_name }}</span>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="pwdForm.password" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdSubmitting" @click="submitResetPwd">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTenants, getTenantDetail, createTenant, updateTenant, deleteTenant, resetTenantPassword } from '@/api/tenant'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])
const searchForm = reactive({
  keyword: '',
  status: ''
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive({
  id: null,
  tenant_name: '',
  username: '',
  password: '',
  qzt_account_no: '',
  contact_name: '',
  contact_mobile: '',
  status_active: true
})

const rules = {
  tenant_name: [{ required: true, message: '请输入租户名称', trigger: 'blur' }],
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getTenants({
      keyword: searchForm.keyword,
      status: searchForm.status
    })
    if (res.code === 0) {
      tableData.value = res.data || []
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
  fetchData()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  handleSearch()
}

function resetForm() {
  form.id = null
  form.tenant_name = ''
  form.username = ''
  form.password = ''
  form.qzt_account_no = ''
  form.contact_name = ''
  form.contact_mobile = ''
  form.status_active = true
}

function handleCreate() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

async function handleEdit(row) {
  isEdit.value = true
  resetForm()
  try {
    const res = await getTenantDetail(row.id)
    if (res.code === 0) {
      const d = res.data
      form.id = d.id
      form.tenant_name = d.tenant_name
      form.username = d.username
      form.qzt_account_no = d.qzt_account_no || ''
      form.contact_name = d.contact_name || ''
      form.contact_mobile = d.contact_mobile || ''
      form.status_active = d.status === 'ACTIVE'
    }
  } catch (err) {
    ElMessage.error('获取租户详情失败')
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const data = {
      tenant_name: form.tenant_name,
      username: form.username,
      qzt_account_no: form.qzt_account_no,
      contact_name: form.contact_name,
      contact_mobile: form.contact_mobile,
      status: form.status_active ? 'ACTIVE' : 'DISABLED'
    }
    if (form.password) {
      data.password = form.password
    }
    let res
    if (isEdit.value) {
      res = await updateTenant(form.id, data)
    } else {
      res = await createTenant(data)
    }
    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (err) {
    console.error('保存租户失败:', err)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除租户「${row.tenant_name}」？删除后该租户将无法登录。`, '删除确认', {
      confirmButtonText: '确认删除',
      type: 'warning'
    })
    const res = await deleteTenant(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 重置密码
const pwdDialogVisible = ref(false)
const pwdSubmitting = ref(false)
const pwdForm = reactive({ tenant_id: null, tenant_name: '', password: '' })

function handleResetPwd(row) {
  pwdForm.tenant_id = row.id
  pwdForm.tenant_name = row.tenant_name
  pwdForm.password = ''
  pwdDialogVisible.value = true
}

async function submitResetPwd() {
  if (!pwdForm.password) {
    ElMessage.warning('请输入新密码')
    return
  }
  pwdSubmitting.value = true
  try {
    const res = await resetTenantPassword(pwdForm.tenant_id, pwdForm.password)
    if (res.code === 0) {
      ElMessage.success('密码重置成功')
      pwdDialogVisible.value = false
    } else {
      ElMessage.error(res.message || '重置失败')
    }
  } catch (err) {
    ElMessage.error('重置失败')
  } finally {
    pwdSubmitting.value = false
  }
}

function handleView(row) {
  router.push(`/tenants/${row.id}`)
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
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

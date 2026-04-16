<template>
  <div class="page">
    <div class="page-title">🏪 门店管理</div>
    <div style="margin-bottom:20px">
      <el-button type="primary" @click="openCreateDialog">+ 新增门店</el-button>
    </div>

    <!-- 门店列表 -->
    <div class="card">
      <div class="card-body">
        <el-table :data="stores" v-loading="loading" stripe>
          <el-table-column prop="store_name" label="门店名称" width="180" />
          <el-table-column prop="merchant_no" label="商户号" width="150" />
          <el-table-column prop="contact_name" label="联系人" width="120" />
          <el-table-column prop="contact_mobile" label="联系电话" width="130" />
          <el-table-column prop="address" label="门店地址" min-width="200" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="90">
            <template #default="{row}">
              <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                {{ row.status === 'ACTIVE' ? '生效' : '失效' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{row}">
              <el-button type="primary" link size="small" @click="editStore(row)">编辑</el-button>
              <el-button type="success" link size="small" @click="goToTerminals(row)">商终管理</el-button>
              <el-button type="danger" link size="small" @click="deleteStore(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 新增/编辑门店弹窗 -->
    <el-dialog v-model="showStoreDialog" :title="editTarget ? '编辑门店' : '新增门店'" width="500px">
      <el-form :model="storeForm" label-width="100px">
        <el-form-item label="门店名称" required>
          <el-input v-model="storeForm.store_name" placeholder="请输入门店名称" />
        </el-form-item>
        <el-form-item label="商户号">
          <el-input v-model="storeForm.merchant_no" placeholder="请输入商户号" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="storeForm.contact_name" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="storeForm.contact_mobile" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="门店地址">
          <el-input v-model="storeForm.address" placeholder="请输入门店地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showStoreDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveStore">确认</el-button>
      </template>
    </el-dialog>

    <!-- 商终管理弹窗 -->
    <el-dialog v-model="showTerminalDialog" :title="`商终管理 - ${currentStore?.store_name}`" width="800px">
      <div style="margin-bottom:12px">
        <el-button type="primary" size="small" @click="showAddTerminal = true">+ 绑定新商终</el-button>
      </div>
      <el-table :data="terminals" stripe v-loading="loadingTerminals">
        <el-table-column prop="terminal_no" label="终端号" width="140" />
        <el-table-column prop="merchant_no" label="商户号" width="140" />
        <el-table-column prop="account_no" label="关联账户" width="160" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{row}">
            <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'danger'">
              {{ row.status === 'ACTIVE' ? '生效' : '失效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="绑定时间" width="170">
          <template #default="{row}">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{row}">
            <el-button type="danger" link size="small" @click="handleUnbindTerminal(row)">解绑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 绑定新商终表单 -->
      <el-form v-if="showAddTerminal" :model="terminalForm" :inline="true" style="margin-top:16px;border-top:1px solid #eee;padding-top:12px">
        <el-form-item label="商户号" style="margin-bottom:0">
          <el-input v-model="terminalForm.merchant_no" placeholder="商户号" style="width:160px" />
        </el-form-item>
        <el-form-item label="终端号" style="margin-bottom:0">
          <el-input v-model="terminalForm.terminal_no" placeholder="终端号" style="width:140px" />
        </el-form-item>
        <el-form-item label="账户" style="margin-bottom:0">
          <el-select v-model="terminalForm.account_no" placeholder="选择账户" style="width:160px">
            <el-option v-for="acc in accounts" :key="acc.account_no" :label="acc.account_no" :value="acc.account_no" />
          </el-select>
        </el-form-item>
        <el-form-item style="margin-bottom:0">
          <el-button type="primary" size="small" @click="handleBindTerminal">确认绑定</el-button>
          <el-button size="small" @click="showAddTerminal = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getStores, createStore, updateStore, deleteStore } from '@/api/store'
import { getTerminalsByStore, bindTerminal, unbindTerminal as apiUnbindTerminal } from '@/api/store'
import { getAccounts } from '@/api/account'

const loading = ref(false)
const stores = ref([])

// 门店弹窗
const showStoreDialog = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const storeForm = reactive({
  store_name: '',
  merchant_no: '',
  contact_name: '',
  contact_mobile: '',
  address: ''
})

// 商终弹窗
const showTerminalDialog = ref(false)
const showAddTerminal = ref(false)
const loadingTerminals = ref(false)
const currentStore = ref(null)
const terminals = ref([])
const accounts = ref([])

const terminalForm = reactive({
  merchant_no: '',
  terminal_no: '',
  account_no: ''
})

const formatTime = (t) => t ? t.replace('T', ' ').substring(0, 19) : '-'

// 加载门店列表
const loadStores = async () => {
  loading.value = true
  try {
    const res = await getStores(1) // merchantId 硬编码 1
    if (res.code === 0) stores.value = res.data || []
  } catch (e) {
    ElMessage.error('加载门店列表失败')
  } finally {
    loading.value = false
  }
}

// 新增门店
const openCreateDialog = () => {
  editTarget.value = null
  Object.assign(storeForm, { store_name: '', merchant_no: '', contact_name: '', contact_mobile: '', address: '' })
  showStoreDialog.value = true
}

// 编辑门店
const editStore = (row) => {
  editTarget.value = row
  Object.assign(storeForm, row)
  showStoreDialog.value = true
}

// 保存门店
const handleSaveStore = async () => {
  if (!storeForm.store_name) { ElMessage.warning('请填写门店名称'); return }
  saving.value = true
  try {
    let res
    if (editTarget.value) {
      res = await updateStore(editTarget.value.id, storeForm)
    } else {
      res = await createStore(storeForm)
    }
    if (res.code === 0) {
      ElMessage.success(editTarget.value ? '修改成功' : '新增成功')
      showStoreDialog.value = false
      await loadStores()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    saving.value = false
  }
}

// 删除门店
const deleteStore = (row) => {
  ElMessageBox.confirm(`确定要删除门店「${row.store_name}」吗？`, '删除确认', { type: 'warning' })
    .then(async () => {
      try {
        const res = await deleteStore(row.id)
        if (res.code === 0) {
          ElMessage.success('删除成功')
          await loadStores()
        } else {
          ElMessage.error(res.message || '删除失败')
        }
      } catch (e) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

// 商终管理 - 打开弹窗
const goToTerminals = async (store) => {
  currentStore.value = store
  showTerminalDialog.value = true
  showAddTerminal.value = false
  terminalForm.merchant_no = ''
  terminalForm.terminal_no = ''
  terminalForm.account_no = ''
  await loadTerminals(store.id)
  const res = await getAccounts(1)
  if (res.code === 0) accounts.value = res.data || []
}

// 加载商终列表
const loadTerminals = async (storeId) => {
  loadingTerminals.value = true
  try {
    const res = await getTerminalsByStore(storeId)
    if (res.code === 0) terminals.value = res.data || []
  } catch (e) {
    ElMessage.error('加载商终列表失败')
  } finally {
    loadingTerminals.value = false
  }
}

// 绑定商终
const handleBindTerminal = async () => {
  if (!terminalForm.merchant_no || !terminalForm.terminal_no) {
    ElMessage.warning('请填写商户号和终端号'); return
  }
  try {
    const res = await bindTerminal({
      store_id: currentStore.value.id,
      merchant_no: terminalForm.merchant_no,
      terminal_no: terminalForm.terminal_no,
      account_no: terminalForm.account_no || ''
    })
    if (res.code === 0) {
      ElMessage.success('绑定成功')
      showAddTerminal.value = false
      terminalForm.merchant_no = ''
      terminalForm.terminal_no = ''
      terminalForm.account_no = ''
      await loadTerminals(currentStore.value.id)
    } else {
      ElMessage.error(res.message || '绑定失败')
    }
  } catch (e) {
    ElMessage.error('绑定失败')
  }
}

// 解绑商终
const handleUnbindTerminal = (terminal) => {
  ElMessageBox.confirm(`确定要解绑终端「${terminal.terminal_no}」吗？`, '解绑确认', { type: 'warning' })
    .then(async () => {
      try {
        const res = await apiUnbindTerminal(terminal.id)
        if (res.code === 0) {
          ElMessage.success('解绑成功')
          await loadTerminals(currentStore.value.id)
        } else {
          ElMessage.error(res.message || '解绑失败')
        }
      } catch (e) {
        ElMessage.error('解绑失败')
      }
    })
    .catch(() => {})
}

onMounted(() => {
  loadStores()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-body { padding: 20px; }
</style>

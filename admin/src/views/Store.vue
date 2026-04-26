<template>
  <div class="page">
    <div class="page-title">🏪 门店管理</div>

    <!-- 筛选和操作 -->
    <div class="card">
      <div class="card-body search-bar">
        <el-select v-model="filterAccountId" placeholder="筛选账户" clearable style="width: 200px" @change="fetchTerminals">
          <el-option v-for="acc in accountList" :key="acc.id" :label="acc.accountName" :value="acc.accountNo" />
        </el-select>
        <el-button type="primary" @click="showBindDialog = true">+ 绑定商终</el-button>
      </div>
    </div>

    <!-- 商终列表 -->
    <div class="card">
      <div class="card-header">商终列表</div>
      <div class="card-body">
        <el-table :data="terminals" v-loading="loading" stripe>
          <el-table-column prop="merchant_no" label="商户号" width="180"/>
          <el-table-column prop="merchant_name" label="商户名称" width="180"/>
          <el-table-column prop="terminal_no" label="终端号" width="150"/>
          <el-table-column prop="account_no" label="绑定账户号" width="200"/>
          <el-table-column prop="bind_status" label="绑定状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.bind_status === '00' ? 'success' : 'warning'">
                {{ row.bind_status === '00' ? '已绑定' : '未绑定' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="绑定时间" width="170">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button v-if="row.bind_status !== '00'" type="primary" link size="small" @click="handleBind(row)">绑定</el-button>
              <el-button v-else type="danger" link size="small" @click="handleUnbind(row)">解绑</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next"
            @size-change="fetchTerminals"
            @current-change="fetchTerminals"
          />
        </div>
      </div>
    </div>

    <!-- 绑定商终弹窗 -->
    <el-dialog v-model="showBindDialog" title="绑定商终" width="500px">
      <el-form :model="bindForm" :rules="bindRules" ref="bindFormRef" label-width="100px">
        <el-form-item label="选择账户" prop="account_no">
          <el-select v-model="bindForm.account_no" placeholder="请选择要绑定的账户" style="width: 100%">
            <el-option v-for="acc in accountList" :key="acc.id" :label="acc.accountName" :value="acc.accountNo">
              <span>{{ acc.accountName }}</span>
              <span style="float: right; color: #999; font-size: 12px">{{ acc.mobile }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="商户号" prop="merchant_no">
          <el-input v-model="bindForm.merchant_no" placeholder="请输入商户号"/>
        </el-form-item>
        <el-form-item label="商户名称" prop="merchant_name">
          <el-input v-model="bindForm.merchant_name" placeholder="请输入商户名称"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBindDialog = false">取消</el-button>
        <el-button type="primary" :loading="binding" @click="handleBindSubmit">确认绑定</el-button>
      </template>
    </el-dialog>

    <!-- 解绑确认弹窗 -->
    <el-dialog v-model="showUnbindDialog" title="解绑商终" width="400px">
      <el-alert type="warning" :closable="false" style="margin-bottom: 20px">
        <template #title>解绑后该商终将无法使用支付功能，确定要解绑吗？</template>
      </el-alert>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="商户号">{{ unbindTarget?.merchant_no }}</el-descriptions-item>
        <el-descriptions-item label="商户名称">{{ unbindTarget?.merchant_name }}</el-descriptions-item>
        <el-descriptions-item label="绑定账户">{{ unbindTarget?.account_no }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showUnbindDialog = false">取消</el-button>
        <el-button type="danger" :loading="unbinding" @click="handleUnbindConfirm">确认解绑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getTerminals, bindTerminal, unbindTerminal } from '@/api/store'
import { getMerchantList } from '@/api/merchant'

const loading = ref(false)
const binding = ref(false)
const unbinding = ref(false)
const showBindDialog = ref(false)
const showUnbindDialog = ref(false)
const bindFormRef = ref()
const unbindTarget = ref(null)

const accountList = ref([])
const terminals = ref([])
const filterAccountId = ref(null)

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const bindForm = reactive({
  account_no: '',
  merchant_no: '',
  merchant_name: ''
})

const bindRules = {
  account_no: [{ required: true, message: '请选择账户', trigger: 'change' }],
  merchant_no: [{ required: true, message: '请输入商户号', trigger: 'blur' }],
  merchant_name: [{ required: true, message: '请输入商户名称', trigger: 'blur' }]
}

const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const fetchAccountList = async () => {
  try {
    const res = await getMerchantList({ status: 'ACTIVE' })
    if (res.code === 0) {
      accountList.value = (res.data || []).map((item) => ({
        id: item.id,
        accountName: item.register_name,
        mobile: item.legal_mobile,
        accountNo: item.qzt_response?.account_no
      }))
    }
  } catch (e) {
    console.error('获取账户列表失败:', e)
  }
}

const fetchTerminals = async () => {
  loading.value = true
  try {
    const res = await getTerminals({
      account_no: filterAccountId.value || undefined,
      page: pagination.page,
      page_size: pagination.pageSize
    })
    if (res.code === 0) {
      terminals.value = (res.data?.list || res.data || []).map((item, idx) => ({
        id: idx,
        merchant_no: item.merchant_no || item.merchantNo,
        merchant_name: item.merchant_name || item.merchantName || '-',
        terminal_no: item.terminal_no || item.terminalNo || '-',
        account_no: item.account_no || item.accountNo || '-',
        bind_status: item.bind_status || item.bindStatus || '00',
        created_at: item.created_at || item.bindTime || new Date().toISOString()
      }))
      pagination.total = terminals.value.length
    }
  } catch (e) {
    console.error('获取商终列表失败:', e)
  } finally {
    loading.value = false
  }
}

const handleBind = (row) => {
  bindForm.account_no = row.account_no
  bindForm.merchant_no = row.merchant_no
  bindForm.merchant_name = row.merchant_name
  showBindDialog.value = true
}

const handleBindSubmit = async () => {
  await bindFormRef.value?.validate()

  binding.value = true
  try {
    const res = await bindTerminal({
      account_no: bindForm.account_no,
      merchant_no: bindForm.merchant_no,
      merchant_name: bindForm.merchant_name
    })

    if (res.code === 0) {
      ElMessage.success('绑定成功')
      showBindDialog.value = false
      bindForm.account_no = ''
      bindForm.merchant_no = ''
      bindForm.merchant_name = ''
      fetchTerminals()
    } else {
      ElMessage.error(res.message || '绑定失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '绑定失败')
  } finally {
    binding.value = false
  }
}

const handleUnbind = (row) => {
  unbindTarget.value = row
  showUnbindDialog.value = true
}

const handleUnbindConfirm = async () => {
  if (!unbindTarget.value) return

  unbinding.value = true
  try {
    const res = await unbindTerminal({
      account_no: unbindTarget.value.account_no,
      merchant_no: unbindTarget.value.merchant_no
    })

    if (res.code === 0) {
      ElMessage.success('解绑成功')
      showUnbindDialog.value = false
      unbindTarget.value = null
      fetchTerminals()
    } else {
      ElMessage.error(res.message || '解绑失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '解绑失败')
  } finally {
    unbinding.value = false
  }
}

onMounted(() => {
  fetchAccountList()
  fetchTerminals()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
.search-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
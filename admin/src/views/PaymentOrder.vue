<template>
  <div class="page">
    <div class="page-title">📋 付款订单</div>

    <!-- 筛选条件 -->
    <div class="card">
      <div class="card-body search-bar">
        <el-select v-model="filterMerchantId" placeholder="筛选账户" clearable style="width: 200px" @change="handleFilter">
          <el-option v-for="acc in accountList" :key="acc.id" :label="acc.accountName" :value="acc.id" />
        </el-select>
        <el-date-picker v-model="filterDateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px" @change="handleFilter" />
        <el-button type="primary" @click="showCreateDialog = true">+ 创建付款订单</el-button>
      </div>
    </div>

    <!-- 订单列表 -->
    <div class="card">
      <div class="card-header">付款订单列表</div>
      <div class="card-body">
        <el-table :data="orders" v-loading="loading" stripe>
          <el-table-column prop="order_no" label="订单号" width="200"/>
          <el-table-column prop="payer_name" label="付款方" width="150">
            <template #default="{ row }">
              {{ getPayerName(row.merchant_id) }}
            </template>
          </el-table-column>
          <el-table-column prop="receiver_name" label="收款方" width="150"/>
          <el-table-column prop="amount" label="订单金额" width="120">
            <template #default="{row}">
              <span class="money">¥{{ (row.amount / 100).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="statusType[row.status]">{{ statusMap[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="170">
            <template #default="{row}">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next"
            @size-change="fetchOrders"
            @current-change="fetchOrders"
          />
        </div>
      </div>
    </div>

    <!-- 创建付款弹窗 -->
    <el-dialog v-model="showCreateDialog" title="创建付款订单" width="500px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="付款账户" prop="merchant_id">
          <el-select v-model="form.merchant_id" placeholder="请选择付款账户" style="width:100%" @change="onPayerChange">
            <el-option v-for="acc in accountList" :key="acc.id" :label="acc.accountName" :value="acc.id">
              <span>{{ acc.accountName }}</span>
              <span style="float: right; color: #999; font-size: 12px">{{ acc.mobile }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="付款余额">
          <span class="balance-display">¥{{ payerBalance.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="收款方" prop="receiver_account">
          <el-select v-model="form.receiver_account" placeholder="请选择收款方" style="width:100%">
            <el-option v-for="acc in receiverList" :key="acc.id" :label="`${acc.accountName} (${acc.splitRole || '其他'})`" :value="acc.accountNo">
              <span>{{ acc.accountName }}</span>
              <span style="float: right; color: #999; font-size: 12px; margin-left: 8px">{{ acc.splitRole || '其他' }}</span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="分账金额" prop="amount">
          <el-input v-model.number="form.amount" placeholder="请输入分账金额" style="width:100%">
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="选填" style="width:100%"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认提交</el-button>
      </template>
    </el-dialog>

    <!-- 订单详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="订单详情" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="订单号">{{ currentOrder.order_no }}</el-descriptions-item>
        <el-descriptions-item label="付款方">{{ getPayerName(currentOrder.merchant_id) }}</el-descriptions-item>
        <el-descriptions-item label="收款方">{{ currentOrder.receiver_name }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ (currentOrder.amount / 100).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType[currentOrder.status]">{{ statusMap[currentOrder.status] || currentOrder.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(currentOrder.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ currentOrder.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getMerchantList } from '@/api/merchant'
import { getAccountBalance } from '@/api/account'
import { getTradeOrders } from '@/api/trade'
import { applySplit } from '@/api/split'

const loading = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const submitting = ref(false)
const formRef = ref()

const accountList = ref([])
const receiverList = ref([])
const orders = ref([])
const currentOrder = ref({})

const filterMerchantId = ref(null)
const filterDateRange = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const form = reactive({
  merchant_id: null,
  receiver_account: '',
  amount: null,
  remark: ''
})

const formRules = {
  merchant_id: [{ required: true, message: '请选择付款账户', trigger: 'change' }],
  receiver_account: [{ required: true, message: '请选择收款方', trigger: 'change' }],
  amount: [{ required: true, message: '请输入分账金额', trigger: 'blur' }]
}

const payerBalance = ref(0)

const statusMap = {
  'PENDING': '处理中',
  'SUCCESS': '成功',
  'FAILED': '失败'
}

const statusType = {
  'PENDING': 'warning',
  'SUCCESS': 'success',
  'FAILED': 'danger'
}

const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const getPayerName = (merchantId) => {
  const acc = accountList.value.find(a => a.id === merchantId)
  return acc?.accountName || '-'
}

const fetchAccountList = async () => {
  try {
    const res = await getMerchantList({ status: 'ACTIVE' })
    if (res.code === 0) {
      accountList.value = (res.data || []).map((item) => ({
        id: item.id,
        accountName: item.register_name,
        mobile: item.legal_mobile,
        accountNo: item.qzt_response?.account_no,
        splitRole: item.split_role
      }))

      // 收款方列表（导游、司机、其他）
      receiverList.value = accountList.value.filter(a =>
        ['guide', 'driver', 'other'].includes(a.splitRole)
      )
    }
  } catch (e) {
    console.error('获取账户列表失败:', e)
  }
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await getTradeOrders({
      merchant_id: filterMerchantId.value || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.code === 0) {
      orders.value = res.data?.list || []
      pagination.total = res.data?.total || 0
    }
  } catch (e) {
    console.error('获取订单列表失败:', e)
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  pagination.page = 1
  fetchOrders()
}

const onPayerChange = async (merchantId) => {
  if (!merchantId) {
    payerBalance.value = 0
    return
  }
  try {
    const res = await getAccountBalance(merchantId)
    if (res.code === 0) {
      payerBalance.value = res.data?.balance || 0
    }
  } catch (e) {
    console.error('获取余额失败:', e)
  }
}

const handleSubmit = async () => {
  await formRef.value?.validate()

  if (form.amount > payerBalance.value) {
    ElMessage.warning('分账金额不能超过付款余额')
    return
  }

  submitting.value = true
  try {
    const res = await applySplit({
      merchant_id: form.merchant_id,
      total_amount: form.amount,
      split_amount: form.amount,
      receiver_account: form.receiver_account,
      remark: form.remark
    })

    if (res.code === 0) {
      ElMessage.success('付款订单提交成功')
      showCreateDialog.value = false
      form.merchant_id = null
      form.receiver_account = ''
      form.amount = null
      form.remark = ''
      payerBalance.value = 0
      fetchOrders()
    } else {
      ElMessage.error(res.message || '提交失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const viewDetail = (row) => {
  currentOrder.value = row
  showDetailDialog.value = true
}

onMounted(() => {
  fetchAccountList()
  fetchOrders()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
.search-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.money { color: #1976D2; font-weight: 600; }
.balance-display { font-size: 18px; font-weight: 700; color: #1976D2; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
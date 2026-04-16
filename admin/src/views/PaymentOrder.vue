<template>
  <div class="page">
    <div class="page-title">📋 付款订单</div>

    <!-- 过滤栏 -->
    <div class="card">
      <div class="card-body search-bar">
        <el-select v-model="filters.account_no" placeholder="选择账户" clearable style="width:200px" @change="loadOrders">
          <el-option v-for="acc in accounts" :key="acc.account_no"
            :label="acc.account_no" :value="acc.account_no" />
        </el-select>
        <el-select v-model="filters.status" placeholder="订单状态" clearable style="width:140px" @change="loadOrders">
          <el-option label="全部" value="" />
          <el-option label="待支付" value="PENDING" />
          <el-option label="已支付" value="SUCCESS" />
          <el-option label="已关闭" value="CLOSED" />
        </el-select>
        <el-button type="primary" @click="loadOrders">搜索</el-button>
        <el-button @click="filters = { account_no: '', status: '' }; loadOrders()">重置</el-button>
        <div class="flex-spacer"></div>
        <el-button type="primary" @click="showBatchCreate = true">批量创建订单</el-button>
      </div>
    </div>

    <!-- 订单列表 -->
    <div class="card">
      <div class="card-body">
        <el-table :data="orders" v-loading="loading" stripe>
          <el-table-column prop="out_order_no" label="商户订单号" width="200" />
          <el-table-column prop="account_no" label="账户编号" width="160" />
          <el-table-column prop="payee_account_no" label="收款方账户" width="160" />
          <el-table-column prop="amount" label="订单金额" width="120">
            <template #default="{row}">¥{{ formatAmount(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="statusType[row.status]">{{ statusMap[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="split_status" label="分账状态" width="110">
            <template #default="{row}">
              <el-tag size="small">{{ splitStatusMap[row.split_status] || row.split_status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="170">
            <template #default="{row}">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{row}">
              <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
              <el-button v-if="row.status === 'SUCCESS' && row.split_status === 'UNSPLIT'"
                type="warning" link size="small" @click="goToSplit(row)">分账</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 批量创建弹窗 -->
    <el-dialog v-model="showBatchCreate" title="批量创建订单" width="700px">
      <div style="margin-bottom:12px;color:#666;font-size:13px">
        每行一个订单，格式：商户订单号,收款方账户,金额（分）<br/>
        示例：OUT_001,ACC123456,10000
      </div>
      <el-input v-model="batchText" type="textarea" :rows="8" placeholder="OUT_001,ACC123456,10000&#10;OUT_002,ACC654321,20000" />
      <template #footer>
        <el-button @click="showBatchCreate=false">取消</el-button>
        <el-button type="primary" :loading="batchSubmitting" @click="handleBatchCreate">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOrders, batchCreateOrders } from '@/api/trade'
import { getAccounts } from '@/api/account'

const accounts = ref([])
const orders = ref([])
const loading = ref(false)
const showBatchCreate = ref(false)
const batchText = ref('')
const batchSubmitting = ref(false)

const filters = reactive({ account_no: '', status: '' })

const statusMap = { PENDING: '待支付', SUCCESS: '已支付', CLOSED: '已关闭' }
const statusType = { PENDING: 'warning', SUCCESS: 'success', CLOSED: 'info' }
const splitStatusMap = { UNSPLIT: '未分账', SPLITTED: '已分账', PARTIAL: '部分分账' }

const formatTime = (t) => t ? t.replace('T', ' ').substring(0, 19) : '-'
const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0.00'
  return (amount / 100).toFixed(2)
}

const loadAccounts = async () => {
  try {
    const res = await getAccounts(1)
    if (res.code === 0) accounts.value = res.data || []
  } catch (e) {
    console.error('加载账户列表失败', e)
  }
}

const loadOrders = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.account_no) params.account_no = filters.account_no
    if (filters.status) params.status = filters.status
    const res = await getOrders(params)
    if (res.code === 0) orders.value = res.data || []
  } catch (e) {
    ElMessage.error('加载订单失败')
  } finally {
    loading.value = false
  }
}

const handleBatchCreate = async () => {
  const lines = batchText.value.trim().split('\n').filter(l => l.trim())
  if (!lines.length) { ElMessage.warning('请输入订单数据'); return }
  const orderList = lines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    return {
      out_order_no: parts[0] || '',
      account_no: parts[1] || filters.account_no || '',
      payee_account_no: parts[1] || '',
      amount: parseInt(parts[2]) || 0
    }
  }).filter(o => o.out_order_no && o.payee_account_no)
  if (!orderList.length) { ElMessage.warning('没有有效的订单数据'); return }
  batchSubmitting.value = true
  try {
    const res = await batchCreateOrders(orderList)
    if (res.code === 0) {
      ElMessage.success(`成功创建 ${orderList.length} 个订单`)
      showBatchCreate.value = false
      batchText.value = ''
      await loadOrders()
    } else {
      ElMessage.error(res.message || '批量创建失败')
    }
  } catch (e) {
    ElMessage.error('批量创建失败')
  } finally {
    batchSubmitting.value = false
  }
}

const viewDetail = (row) => { ElMessage.info(`订单详情: ${row.out_order_no}`) }
const goToSplit = (row) => { ElMessage.info(`跳转分账: ${row.out_order_no}`) }

onMounted(async () => {
  await loadAccounts()
  await loadOrders()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-body { padding: 20px; }
.search-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.flex-spacer { flex: 1; }
</style>

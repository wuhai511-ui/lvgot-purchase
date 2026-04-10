<template>
  <div class="split-page">
    <section class="page-head card">
      <div>
        <div class="page-title">分账记录</div>
        <div class="page-subtitle">围绕商户资金链路展示，重点看状态、对象关系和异常提醒。</div>
      </div>
      <div class="page-head__stats">
        <div class="mini-stat"><span>分账总额</span><strong>¥{{ formatMoney(summary.successAmount) }}</strong></div>
        <div class="mini-stat"><span>处理中</span><strong>{{ summary.pendingCount }} 笔</strong></div>
        <div class="mini-stat"><span>异常待处理</span><strong>{{ summary.failedCount }} 笔</strong></div>
      </div>
    </section>

    <section class="card toolbar-card">
      <div class="toolbar-row">
        <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
        <el-select v-model="filterStatus" placeholder="分账状态" clearable>
          <el-option label="全部状态" value="" />
          <el-option label="处理中" value="PENDING" />
          <el-option label="已到账" value="SUCCESS" />
          <el-option label="异常待处理" value="FAILED" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索订单号 / 分账单号 / 收款对象" clearable />
        <el-button type="primary" @click="fetchRecords">筛选</el-button>
      </div>
    </section>

    <section class="card table-card">
      <el-table :data="filteredRecords" v-loading="loading" stripe>
        <el-table-column label="分账链路" min-width="260">
          <template #default="{ row }">
            <div class="chain-title">商户 → {{ row.receiver_name || '收款对象' }}</div>
            <div class="chain-meta">{{ row.order_no || row.split_no }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="split_no" label="分账单号" min-width="180" />
        <el-table-column label="交易金额" width="140"><template #default="{ row }">¥{{ formatMoney(row.total_amount || 0) }}</template></el-table-column>
        <el-table-column label="分账金额" width="140"><template #default="{ row }"><span class="money">¥{{ formatMoney(row.split_amount || 0) }}</span></template></el-table-column>
        <el-table-column label="状态" width="130"><template #default="{ row }"><span class="status-pill" :class="pillClass(row.status)">{{ statusMap[row.status] || row.status }}</span></template></el-table-column>
        <el-table-column label="时间" width="180"><template #default="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column>
        <el-table-column label="提醒" min-width="220"><template #default="{ row }">{{ reminderText(row) }}</template></el-table-column>
      </el-table>

      <div class="table-footer">
        <div class="table-hint">优先处理状态异常和长期处理中记录，避免个人端提现被阻塞。</div>
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="fetchRecords" @current-change="fetchRecords" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getSplitRecords } from '@/api/split'
import { formatMoney } from '@/utils/format'

const loading = ref(false)
const records = ref([])
const dateRange = ref([])
const filterStatus = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusMap = { PENDING: '处理中', SUCCESS: '已到账', FAILED: '异常待处理' }
const formatTime = (time) => (time ? time.replace('T', ' ').substring(0, 19) : '-')
const pillClass = (status) => (status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning')
const reminderText = (row) => row.status === 'FAILED' ? '建议检查收款方账户状态或重试分账。' : row.status === 'PENDING' ? '处理中，建议关注个人端是否等待到账。' : '分账完成，可继续关注提现转化。'

const filteredRecords = computed(() => {
  const term = keyword.value.trim().toLowerCase()
  return records.value.filter((row) => {
    const hitStatus = !filterStatus.value || row.status === filterStatus.value
    const hitKeyword = !term || [row.split_no, row.order_no, row.receiver_name].some((item) => String(item || '').toLowerCase().includes(term))
    return hitStatus && hitKeyword
  })
})

const summary = computed(() => ({
  successAmount: records.value.filter((row) => row.status === 'SUCCESS').reduce((sum, row) => sum + (parseFloat(row.split_amount) || 0), 0),
  pendingCount: records.value.filter((row) => row.status === 'PENDING').length,
  failedCount: records.value.filter((row) => row.status === 'FAILED').length
}))

const fetchRecords = async () => {
  loading.value = true
  try {
    const res = await getSplitRecords({ page: page.value, pageSize: pageSize.value, status: filterStatus.value })
    if (res.code === 0) {
      records.value = res.data || []
      total.value = records.value.length
    }
  } catch (error) {
    console.error('获取分账记录失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchRecords)
</script>

<style scoped lang="scss">
@import '@/styles/variables.scss';
.split-page { display: grid; gap: 18px; }
.page-head, .toolbar-card, .table-card { padding: 22px; }
.page-head { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
.page-head__stats { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 12px; }
.mini-stat { min-width: 140px; padding: 16px; border-radius: 16px; background: linear-gradient(180deg, #ffffff 0%, #f7fbf9 100%); border: 1px solid $border-color; }
.mini-stat span { display: block; font-size: 12px; color: $text-muted; }
.mini-stat strong { display: block; margin-top: 8px; color: $text-color; font-size: 20px; }
.toolbar-row { display: grid; grid-template-columns: 1.2fr 160px 1fr auto; gap: 12px; }
.chain-title { font-size: 14px; font-weight: 700; color: $text-color; }
.chain-meta { margin-top: 6px; font-size: 12px; color: $text-muted; }
.table-footer { margin-top: 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.table-hint { color: $text-secondary; font-size: 13px; }
@media (max-width: 1100px) { .page-head, .table-footer { flex-direction: column; align-items: stretch; } .page-head__stats, .toolbar-row { grid-template-columns: 1fr; } }
</style>

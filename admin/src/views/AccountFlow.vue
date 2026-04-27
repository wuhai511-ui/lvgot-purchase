<template>
  <div class="page">
    <div class="page-title">账户动账明细</div>

    <!-- 筛选区 -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-body" style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;">
        <el-select v-model="accountNo" placeholder="选择账户" style="width:240px;" filterable>
          <el-option v-for="acc in accounts" :key="acc.id" :label="acc.register_name + ' (' + (acc.qzt_account_no || '-') + ')'" :value="acc.qzt_account_no"/>
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD"/>
        <el-button type="primary" @click="loadData" :disabled="!accountNo">查询</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <!-- 流水列表 -->
    <div class="card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="交易时间" width="180">
          <template #default="{row}">{{ row.trade_time || row.created_at || '-' }}</template>
        </el-table-column>
        <el-table-column label="摘要" min-width="200">
          <template #default="{row}">{{ row.remark || row.summary || '-' }}</template>
        </el-table-column>
        <el-table-column label="收入" width="150" align="right">
          <template #default="{row}">
            <span style="color:#67C23A;" v-if="(row.income || 0) > 0">+¥{{ toYuan(row.income) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="支出" width="150" align="right">
          <template #default="{row}">
            <span style="color:#F56C6C;" v-if="(row.expense || 0) > 0">-¥{{ toYuan(row.expense) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="余额" width="150" align="right">
          <template #default="{row}">¥{{ toYuan(row.balance || 0) }}</template>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getAccountFlow } from '@/api/account'
import { getAvailableAccounts } from '@/api/store'

const route = useRoute()

const loading = ref(false)
const accountNo = ref('')
const dateRange = ref(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref([])
const accounts = ref([])

const toYuan = (val) => (parseInt(val || 0) / 100).toFixed(2)

const loadData = async () => {
  if (!accountNo.value) return
  loading.value = true
  try {
    const params = {
      account_no: accountNo.value,
      page: page.value,
      pageSize: pageSize.value
    }
    if (dateRange.value) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await getAccountFlow(params)
    if (res.code === 0) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    } else {
      list.value = []
      total.value = 0
    }
  } catch (e) {
    console.error('获取账户流水失败:', e)
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  accountNo.value = ''
  dateRange.value = null
  page.value = 1
  list.value = []
  total.value = 0
}

const fetchAccounts = async () => {
  try {
    const res = await getAvailableAccounts()
    if (res.code === 0) {
      accounts.value = res.data || []
    }
  } catch (e) {
    console.error('获取账户列表失败:', e)
  }
}

onMounted(() => {
  fetchAccounts()
  // 如果 URL 参数有 account_no，自动填入
  if (route.query.account_no) {
    accountNo.value = route.query.account_no
    loadData()
  }
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-body { padding: 20px; }
</style>

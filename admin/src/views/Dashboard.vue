<template>
  <div class="dashboard">
    <div class="page-title">📊 工作台</div>
    
    <!-- 账户余额卡片 -->
    <div class="balance-cards">
      <div class="balance-card main">
        <div class="balance-label">💼 主账户余额</div>
        <div class="balance-amount">¥{{ formatMoney(balanceInfo.balance) }}</div>
        <div class="balance-detail">
          <span>可用: ¥{{ formatMoney(balanceInfo.available_amount) }}</span>
          <span>冻结: ¥{{ formatMoney(balanceInfo.frozen_amount) }}</span>
        </div>
      </div>
      <div class="balance-card">
        <div class="balance-label">🏦 待结算金额</div>
        <div class="balance-amount">¥{{ formatMoney(balanceInfo.frozen_amount) }}</div>
      </div>
      <div class="balance-card">
        <div class="balance-label">📜 累计分账</div>
        <div class="balance-amount">¥{{ formatMoney(totalSplitAmount) }}</div>
      </div>
      <div class="balance-card">
        <div class="balance-label">👥 账户总数</div>
        <div class="balance-amount">{{ accountCount }}</div>
        <div class="balance-detail">
          <span>已开户: {{ activeAccountCount }}</span>
          <span>待开户: {{ pendingAccountCount }}</span>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="card">
      <div class="card-header">💡 快捷操作</div>
      <div class="card-body shortcuts">
        <el-button type="primary" @click="$router.push('/account')">💰 账户列表</el-button>
        <el-button type="success" @click="$router.push('/account-opening')">📝 申请开户</el-button>
        <el-button type="warning" @click="$router.push('/recharge')">🔄 充值</el-button>
        <el-button @click="$router.push('/withdraw')">📤 提现</el-button>
        <el-button @click="$router.push('/split-record')">📋 分账记录</el-button>
        <el-button @click="$router.push('/bank-card')">💳 银行卡</el-button>
        <el-button @click="$router.push('/tour-group')">🎒 旅行团</el-button>
        <el-button @click="$router.push('/split-rule')">📐 分账规则</el-button>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-row">
      <div class="card chart-card">
        <div class="card-header">📈 近7日交易趋势</div>
        <div class="card-body">
          <v-chart :option="tradeChartOption" autoresize style="height: 280px" />
        </div>
      </div>
      <div class="card chart-card">
        <div class="card-header">💰 分账金额分布</div>
        <div class="card-body">
          <v-chart :option="splitPieOption" autoresize style="height: 280px" />
        </div>
      </div>
    </div>

    <!-- 数据统计 -->
    <div class="card">
      <div class="card-header">📊 业务概览</div>
      <div class="card-body stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ todayTradeCount }}</div>
          <div class="stat-label">今日交易笔数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">¥{{ formatMoney(todayTradeAmount) }}</div>
          <div class="stat-label">今日交易金额</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ todaySplitCount }}</div>
          <div class="stat-label">今日分账笔数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">¥{{ formatMoney(todaySplitAmount) }}</div>
          <div class="stat-label">今日分账金额</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ activeTourCount }}</div>
          <div class="stat-label">进行中旅行团</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ pendingWithdrawCount }}</div>
          <div class="stat-label">待处理提现</div>
        </div>
      </div>
    </div>

    <!-- 最近交易 -->
    <div class="card">
      <div class="card-header">📜 最近分账记录</div>
      <div class="card-body">
        <el-table :data="recentRecords" v-loading="loading" stripe>
          <el-table-column prop="split_no" label="分账单号" width="200"/>
          <el-table-column prop="receiver_name" label="收款方" width="150"/>
          <el-table-column prop="split_amount" label="金额" width="120">
            <template #default="{row}"><span class="money">¥{{ formatMoney(row.split_amount) }}</span></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="statusType[row.status]">{{ statusMap[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="时间" width="170">
            <template #default="{row}">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 待办事项 -->
    <div class="card">
      <div class="card-header">📋 待办事项</div>
      <div class="card-body">
        <div class="todo-list">
          <div class="todo-item" v-for="todo in todoList" :key="todo.id" @click="handleTodo(todo)">
            <el-badge :value="todo.count" :type="todo.type" class="todo-badge">
              <span class="todo-text">{{ todo.title }}</span>
            </el-badge>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import { 
  TitleComponent, TooltipComponent, LegendComponent, 
  GridComponent 
} from 'echarts/components'
import VChart from 'vue-echarts'
import { ArrowRight } from '@element-plus/icons-vue'
import { getAccountBalance } from '@/api/account'
import { getSplitRecords } from '@/api/split'
import { getMerchantList } from '@/api/merchant'
import { formatMoney } from '@/utils/format'

// 注册 ECharts 组件
use([CanvasRenderer, LineChart, PieChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const router = useRouter()
const loading = ref(false)
const balanceInfo = ref({ balance: 0, frozen_amount: 0, available_amount: 0 })
const recentRecords = ref([])
const totalSplitAmount = ref(0)

// 统计数据
const accountCount = ref(0)
const activeAccountCount = ref(0)
const pendingAccountCount = ref(0)
const todayTradeCount = ref(0)
const todayTradeAmount = ref(0)
const todaySplitCount = ref(0)
const todaySplitAmount = ref(0)
const activeTourCount = ref(0)
const pendingWithdrawCount = ref(0)

// 待办事项
const todoList = computed(() => [
  { id: 1, title: '待开户申请', count: pendingAccountCount.value, type: 'warning', path: '/account' },
  { id: 2, title: '待处理提现', count: pendingWithdrawCount.value, type: 'danger', path: '/withdraw' },
  { id: 3, title: '进行中旅行团', count: activeTourCount.value, type: 'primary', path: '/tour-group' }
])

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

// 交易趋势图表配置
const tradeChartOption = ref({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { 
    type: 'category', 
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    boundaryGap: false
  },
  yAxis: { type: 'value' },
  series: [{
    name: '交易金额',
    type: 'line',
    smooth: true,
    areaStyle: { opacity: 0.3 },
    data: [0, 0, 0, 0, 0, 0, 0],
    itemStyle: { color: '#1976D2' }
  }]
})

// 分账分布饼图配置
const splitPieOption = ref({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: '5%', left: 'center' },
  series: [{
    name: '分账分布',
    type: 'pie',
    radius: ['40%', '70%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
    label: { show: false, position: 'center' },
    emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
    labelLine: { show: false },
    data: [
      { value: 0, name: '商户', itemStyle: { color: '#1976D2' } },
      { value: 0, name: '旅行社', itemStyle: { color: '#4CAF50' } },
      { value: 0, name: '导游', itemStyle: { color: '#FF9800' } },
      { value: 0, name: '平台', itemStyle: { color: '#9C27B0' } }
    ]
  }]
})

const formatTime = (time) => {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 19)
}

const handleTodo = (todo) => {
  if (todo.path) {
    router.push(todo.path)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    // 获取账户余额
    const balanceRes = await getAccountBalance()
    if (balanceRes.code === 0) {
      balanceInfo.value = balanceRes.data
    }
    
    // 获取分账记录
    const splitRes = await getSplitRecords({ pageSize: 10 })
    if (splitRes.code === 0) {
      recentRecords.value = splitRes.data || []
      totalSplitAmount.value = recentRecords.value
        .filter(r => r.status === 'SUCCESS')
        .reduce((sum, r) => sum + (parseFloat(r.split_amount) || 0), 0)
    }

    // 获取账户列表统计
    const merchantRes = await getMerchantList()
    if (merchantRes.code === 0) {
      const merchants = merchantRes.data || []
      accountCount.value = merchants.length
      activeAccountCount.value = merchants.filter(m => m.status === 'ACTIVE').length
      pendingAccountCount.value = merchants.filter(m => m.status === 'PENDING' || m.status === 'PERSONAL_PENDING').length
    }

    // 模拟图表数据（实际应从后端获取）
    tradeChartOption.value.series[0].data = [3200, 4500, 3800, 5200, 4800, 6100, 5500]
    splitPieOption.value.series[0].data = [
      { value: 45000, name: '商户', itemStyle: { color: '#1976D2' } },
      { value: 25000, name: '旅行社', itemStyle: { color: '#4CAF50' } },
      { value: 15000, name: '导游', itemStyle: { color: '#FF9800' } },
      { value: 5000, name: '平台', itemStyle: { color: '#9C27B0' } }
    ]

    // 模拟统计数据
    todayTradeCount.value = 128
    todayTradeAmount.value = 156800
    todaySplitCount.value = 86
    todaySplitAmount.value = 45200
    activeTourCount.value = 12
    pendingWithdrawCount.value = 3

  } catch (e) {
    console.error('获取数据失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px; }

/* 余额卡片 */
.balance-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.balance-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.balance-card.main { background: linear-gradient(135deg, #1976D2, #42a5f5); color: #fff; }
.balance-label { font-size: 14px; color: #888; margin-bottom: 8px; }
.balance-card.main .balance-label { color: rgba(255,255,255,0.8); }
.balance-amount { font-size: 24px; font-weight: 700; }
.balance-detail { margin-top: 8px; font-size: 12px; display: flex; gap: 16px; opacity: 0.8; }

/* 卡片通用 */
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.card-body { padding: 20px; }
.shortcuts { display: flex; gap: 12px; flex-wrap: wrap; }

/* 图表区域 */
.chart-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px; }
.chart-card { min-height: 360px; }

/* 统计网格 */
.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; text-align: center; }
.stat-item { padding: 16px; background: #f8f9fa; border-radius: 8px; }
.stat-value { font-size: 24px; font-weight: 700; color: #1976D2; margin-bottom: 8px; }
.stat-label { font-size: 13px; color: #666; }

/* 待办事项 */
.todo-list { display: flex; flex-direction: column; gap: 12px; }
.todo-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.todo-item:hover { background: #e3f2fd; }
.todo-badge { margin-right: 12px; }
.todo-text { font-size: 14px; color: #333; }

/* 响应式 */
@media (max-width: 1200px) {
  .balance-cards { grid-template-columns: repeat(2, 1fr); }
  .chart-row { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .balance-cards { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>

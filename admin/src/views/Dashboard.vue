<template>
  <div class="dashboard-page">
    <section class="hero card">
      <div>
        <div class="hero-kicker">商户经营总览</div>
        <h1>把今天的收款、分账和提现动作放在一张工作台里。</h1>
        <p>面向旅购通商户与门店经营者设计，先看经营状态，再完成高频资金动作。</p>
      </div>
      <div class="hero-side surface-muted">
        <div class="hero-side__label">账户状态</div>
        <div class="hero-side__value">正常经营中</div>
        <div class="hero-side__meta">
          <span class="status-pill success">可分账</span>
          <span class="status-pill info">可提现</span>
        </div>
        <div class="hero-side__foot">最近一次到账预计 T+1 完成，当前无异常阻塞。</div>
      </div>
    </section>

    <section class="overview-grid">
      <article class="metric-card metric-card--featured">
        <div class="metric-card__label">可提现金额</div>
        <div class="metric-card__value">¥{{ formatMoney(balanceInfo.available_amount || 0) }}</div>
        <div class="metric-card__meta">冻结金额 ¥{{ formatMoney(balanceInfo.frozen_amount || 0) }}</div>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">今日收款</div>
        <div class="metric-card__value">¥{{ formatMoney(todayTradeAmount) }}</div>
        <div class="metric-card__meta">共 {{ todayTradeCount }} 笔交易</div>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">待分账金额</div>
        <div class="metric-card__value">¥{{ formatMoney(balanceInfo.frozen_amount || 0) }}</div>
        <div class="metric-card__meta">今日分账 {{ todaySplitCount }} 笔</div>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">门店表现</div>
        <div class="metric-card__value">{{ activeStoreCount }}</div>
        <div class="metric-card__meta">家门店有交易动静</div>
      </article>
    </section>

    <section class="workbench-grid">
      <article class="card action-card">
        <div class="section-heading">
          <div>
            <h2>快捷动作</h2>
            <p>优先完成商户每天最常用的资金任务。</p>
          </div>
        </div>
        <div class="quick-actions">
          <button v-for="item in quickActions" :key="item.path" class="quick-action" @click="router.push(item.path)">
            <div class="quick-action__icon">{{ item.icon }}</div>
            <div>
              <div class="quick-action__title">{{ item.title }}</div>
              <div class="quick-action__desc">{{ item.desc }}</div>
            </div>
          </button>
        </div>
      </article>

      <article class="card insight-card">
        <div class="section-heading">
          <div>
            <h2>今日经营节奏</h2>
            <p>把经营指标、待处理事项和资金提醒放在一起看。</p>
          </div>
        </div>
        <div class="insight-list">
          <div class="insight-row"><span>累计分账金额</span><strong>¥{{ formatMoney(totalSplitAmount) }}</strong></div>
          <div class="insight-row"><span>待处理提现</span><strong>{{ pendingWithdrawCount }} 笔</strong></div>
          <div class="insight-row"><span>进行中的团队协同</span><strong>{{ activeTourCount }} 个</strong></div>
          <div class="insight-row"><span>账户资料待补充</span><strong>{{ pendingAccountCount }} 项</strong></div>
        </div>
      </article>
    </section>

    <section class="content-grid">
      <article class="card">
        <div class="section-heading">
          <div>
            <h2>最近分账动态</h2>
            <p>快速确认资金从哪来、分到哪里、有没有卡点。</p>
          </div>
          <el-button text @click="router.push('/split-record')">查看全部</el-button>
        </div>
        <div class="feed-list" v-loading="loading">
          <div v-for="record in recentRecords.slice(0, 5)" :key="record.split_no" class="feed-item">
            <div>
              <div class="feed-title">商户 → {{ record.receiver_name || '分账对象' }}</div>
              <div class="feed-desc">{{ formatTime(record.created_at) }} · {{ record.order_no || record.split_no }}</div>
            </div>
            <div class="feed-side">
              <div class="feed-amount">¥{{ formatMoney(record.split_amount) }}</div>
              <span class="status-pill" :class="pillClass(record.status)">{{ statusMap[record.status] || record.status }}</span>
            </div>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="section-heading">
          <div>
            <h2>待处理事项</h2>
            <p>只保留真的需要商户马上处理的任务。</p>
          </div>
        </div>
        <div class="todo-stack">
          <button v-for="todo in todoList" :key="todo.id" class="todo-item" @click="handleTodo(todo)">
            <div>
              <div class="todo-title">{{ todo.title }}</div>
              <div class="todo-desc">{{ todo.desc }}</div>
            </div>
            <div class="todo-count">{{ todo.count }}</div>
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAccountBalance } from '@/api/account'
import { getSplitRecords } from '@/api/split'
import { getMerchantList } from '@/api/merchant'
import { formatMoney } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const balanceInfo = ref({ balance: 0, frozen_amount: 0, available_amount: 0 })
const recentRecords = ref([])
const totalSplitAmount = ref(0)
const activeStoreCount = ref(9)
const pendingAccountCount = ref(0)
const todayTradeCount = ref(128)
const todayTradeAmount = ref(156800)
const todaySplitCount = ref(86)
const activeTourCount = ref(12)
const pendingWithdrawCount = ref(3)

const statusMap = { PENDING: '处理中', SUCCESS: '已到账', FAILED: '异常待处理' }
const quickActions = [
  { path: '/split-record', icon: '分', title: '查看分账', desc: '跟进资金链路与状态' },
  { path: '/withdraw', icon: '提', title: '发起提现', desc: '确认到账规则和提现进度' },
  { path: '/store', icon: '店', title: '门店管理', desc: '查看门店活跃和经营表现' },
  { path: '/account', icon: '户', title: '账户资料', desc: '维护商户主体与结算资料' }
]

const todoList = computed(() => [
  { id: 1, title: '待处理提现', desc: '优先确认到账中的申请与失败原因。', count: pendingWithdrawCount.value, path: '/withdraw' },
  { id: 2, title: '待完善账户资料', desc: '补充资料后可减少提现与分账阻塞。', count: pendingAccountCount.value, path: '/account' },
  { id: 3, title: '进行中的团队协同', desc: '查看今日导游、司机等协同分账动态。', count: activeTourCount.value, path: '/tour-group' }
])

const formatTime = (time) => (!time ? '-' : time.replace('T', ' ').substring(0, 19))
const pillClass = (status) => (status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning')
const handleTodo = (todo) => todo.path && router.push(todo.path)

const fetchData = async () => {
  loading.value = true
  try {
    const [balanceRes, splitRes, merchantRes] = await Promise.all([getAccountBalance(), getSplitRecords({ pageSize: 10 }), getMerchantList()])
    if (balanceRes.code === 0) balanceInfo.value = balanceRes.data || balanceInfo.value
    if (splitRes.code === 0) {
      recentRecords.value = splitRes.data || []
      totalSplitAmount.value = recentRecords.value.filter((item) => item.status === 'SUCCESS').reduce((sum, item) => sum + (parseFloat(item.split_amount) || 0), 0)
      pendingWithdrawCount.value = recentRecords.value.filter((item) => item.status === 'PENDING').length || pendingWithdrawCount.value
    }
    if (merchantRes.code === 0) {
      const merchants = merchantRes.data || []
      activeStoreCount.value = Math.max(merchants.filter((item) => item.status === 'ACTIVE').length, activeStoreCount.value)
      pendingAccountCount.value = merchants.filter((item) => ['PENDING', 'PERSONAL_PENDING'].includes(item.status)).length
    }
  } catch (error) {
    console.error('获取工作台数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped lang="scss">
@import '@/styles/variables.scss';
.dashboard-page { display: grid; gap: 20px; }
.hero { display: grid; grid-template-columns: 1.4fr 0.8fr; gap: 20px; padding: 28px; }
.hero-kicker { display: inline-flex; padding: 6px 12px; border-radius: 999px; background: rgba(223,245,241,0.9); color: $primary-strong; font-size: 12px; font-weight: 700; }
.hero h1 { margin-top: 16px; font-size: 34px; line-height: 1.3; color: $text-color; }
.hero p { margin-top: 12px; max-width: 720px; color: $text-secondary; line-height: 1.8; }
.hero-side { border-radius: $radius-md; padding: 22px; border: 1px solid $border-color; }
.hero-side__label { font-size: 12px; color: $text-muted; }
.hero-side__value { margin-top: 10px; font-size: 28px; font-weight: 700; }
.hero-side__meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.hero-side__foot { margin-top: 16px; color: $text-secondary; line-height: 1.7; }
.overview-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.metric-card { padding: 22px; background: rgba(255,255,255,0.92); border: 1px solid rgba(215,229,225,0.8); border-radius: $radius-md; box-shadow: $shadow-sm; }
.metric-card--featured { background: $gradient-brand; color: #fff; }
.metric-card__label { font-size: 13px; color: inherit; opacity: 0.82; }
.metric-card__value { margin-top: 10px; font-size: 30px; font-weight: 700; }
.metric-card__meta { margin-top: 8px; font-size: 13px; color: inherit; opacity: 0.76; }
.workbench-grid, .content-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; }
.action-card, .insight-card, .content-grid > .card { padding: 22px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.section-heading h2 { font-size: 18px; color: $text-color; }
.section-heading p { margin-top: 6px; color: $text-secondary; line-height: 1.7; }
.quick-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.quick-action { border: 1px solid $border-color; border-radius: 18px; background: linear-gradient(180deg, #ffffff 0%, #f7fbf9 100%); padding: 18px; display: flex; gap: 14px; align-items: flex-start; text-align: left; cursor: pointer; }
.quick-action__icon { width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: rgba(15,118,110,0.1); color: $primary-color; font-weight: 700; }
.quick-action__title { font-size: 15px; font-weight: 700; color: $text-color; }
.quick-action__desc { margin-top: 6px; font-size: 13px; line-height: 1.6; color: $text-secondary; }
.insight-list, .todo-stack, .feed-list { display: grid; gap: 12px; }
.insight-row, .feed-item, .todo-item { border: 1px solid rgba(215,229,225,0.8); border-radius: 16px; background: #fbfdfc; }
.insight-row { display: flex; justify-content: space-between; align-items: center; padding: 16px; color: $text-secondary; }
.insight-row strong { color: $text-color; font-size: 16px; }
.feed-item, .todo-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px; }
.feed-title, .todo-title { font-size: 15px; font-weight: 700; color: $text-color; }
.feed-desc, .todo-desc { margin-top: 6px; color: $text-secondary; font-size: 13px; }
.feed-side { text-align: right; }
.feed-amount { font-size: 18px; font-weight: 700; color: $warning-color; margin-bottom: 8px; }
.todo-item { cursor: pointer; text-align: left; }
.todo-count { min-width: 42px; height: 42px; border-radius: 14px; background: rgba(15,118,110,0.1); color: $primary-strong; display: flex; align-items: center; justify-content: center; font-weight: 700; }
@media (max-width: 1200px) { .hero, .workbench-grid, .content-grid { grid-template-columns: 1fr; } .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 768px) { .hero, .metric-card, .action-card, .insight-card, .content-grid > .card { padding: 18px; } .hero h1 { font-size: 26px; } .overview-grid, .quick-actions { grid-template-columns: 1fr; } }
</style>

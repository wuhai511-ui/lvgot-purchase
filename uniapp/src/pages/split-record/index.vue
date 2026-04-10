<template>
  <view class="page-container record-page">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">资金记录</text>
    </view>

    <view class="section-card tabs-card">
      <view class="filter-tabs">
        <view v-for="item in filters" :key="item.value" class="filter-tab" :class="{ active: filter === item.value }" @click="filter = item.value">{{ item.label }}</view>
      </view>
    </view>

    <view class="section-card summary-card">
      <view class="summary-row">
        <view><view class="summary-label">入账金额</view><view class="summary-value is-in">¥{{ incomeTotal }}</view></view>
        <view><view class="summary-label">提现金额</view><view class="summary-value is-out">¥{{ withdrawTotal }}</view></view>
        <view><view class="summary-label">处理中</view><view class="summary-value">{{ pendingCount }} 笔</view></view>
      </view>
    </view>

    <view class="section-card list-card">
      <view v-if="filteredRecords.length === 0" class="empty-state">
        <text class="empty-icon">○</text>
        <text>当前筛选下暂无资金记录</text>
      </view>
      <view v-else class="record-list">
        <view v-for="item in filteredRecords" :key="item.id" class="record-item">
          <view>
            <view class="record-title">{{ item.title }}</view>
            <view class="record-time">{{ item.time }}</view>
          </view>
          <view class="record-side">
            <view class="record-amount" :class="item.amountClass">{{ item.displayAmount }}</view>
            <view class="status-badge" :class="item.badgeClass">{{ item.badgeText }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useSplitStore } from '@/store/split'

const splitStore = useSplitStore()
const filter = ref('all')
const filters = [{ label: '全部', value: 'all' }, { label: '入账', value: 'income' }, { label: '提现', value: 'withdraw' }, { label: '处理中', value: 'pending' }]

const records = computed(() => {
  const source = splitStore.splitRecords.length > 0 ? splitStore.splitRecords : [
    { id: 'F001', title: '旅行社分账到账', amount: 820, type: 'income', status: 'success', time: '2026-04-08 09:20' },
    { id: 'F002', title: '提现处理中', amount: 500, type: 'withdraw', status: 'pending', time: '2026-04-07 18:10' },
    { id: 'F003', title: '旅行社分账到账', amount: 1260, type: 'income', status: 'success', time: '2026-04-07 14:50' },
    { id: 'F004', title: '提现到账', amount: 600, type: 'withdraw', status: 'success', time: '2026-04-06 11:40' }
  ]

  return source.map((item) => ({
    id: item.id,
    title: item.title || item.toName,
    type: item.type || (String(item.toName || '').includes('提现') ? 'withdraw' : 'income'),
    status: item.status,
    time: item.time || item.createTime,
    displayAmount: `${(item.type || '').includes('withdraw') ? '-' : '+'}¥${Number(item.amount || 0).toFixed(2)}`,
    amountClass: (item.type || '').includes('withdraw') ? 'is-out' : 'is-in',
    badgeText: item.status === 'success' ? '已到账' : item.status === 'pending' ? '处理中' : '异常待处理',
    badgeClass: item.status === 'success' ? 'success' : item.status === 'pending' ? 'warning' : 'danger',
    rawAmount: Number(item.amount || 0)
  }))
})

const filteredRecords = computed(() => records.value.filter((item) => filter.value === 'all' ? true : filter.value === 'pending' ? item.status === 'pending' : item.type === filter.value))
const incomeTotal = computed(() => records.value.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.rawAmount, 0).toFixed(2))
const withdrawTotal = computed(() => records.value.filter((item) => item.type === 'withdraw').reduce((sum, item) => sum + item.rawAmount, 0).toFixed(2))
const pendingCount = computed(() => records.value.filter((item) => item.status === 'pending').length)
const goBack = () => uni.navigateBack()
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.record-page { padding-bottom: 24px; }
.filter-tabs { display: flex; gap: 8px; }
.filter-tab { flex: 1; text-align: center; padding: 10px 0; border-radius: 999px; background: $brand-mist; color: $text-secondary; font-size: 13px; }
.filter-tab.active { background: $brand-color; color: #fff; font-weight: 700; }
.summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.summary-label { font-size: 12px; color: $text-muted; }
.summary-value { margin-top: 8px; font-size: 18px; font-weight: 700; color: $text-color; }
.summary-value.is-in { color: $success-color; }
.summary-value.is-out { color: $warning-color; }
.record-list { display: grid; gap: 14px; }
.record-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #edf3f1; }
.record-item:last-child { padding-bottom: 0; border-bottom: none; }
.record-title { font-size: 14px; font-weight: 700; color: $text-color; }
.record-time { margin-top: 4px; font-size: 12px; color: $text-muted; }
.record-side { text-align: right; }
.record-amount { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.record-amount.is-in { color: $success-color; }
.record-amount.is-out { color: $warning-color; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 0; color: $text-muted; }
.empty-icon { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: $brand-mist; color: $brand-color; }
@media (max-width: 360px) { .summary-row { grid-template-columns: 1fr; } }
</style>

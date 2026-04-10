<template>
  <view class="page-container wallet-page">
    <view class="wallet-hero">
      <view class="wallet-hero__top">
        <view>
          <view class="wallet-role">{{ roleLabel }}</view>
          <view class="wallet-name">{{ accountStore.currentAccount.name }}</view>
          <view class="wallet-subtitle">面向导游、司机等个人角色的资金钱包，只做到账查看与提现动作。</view>
        </view>
        <view class="status-badge" :class="accountStatusClass">{{ accountStatusText }}</view>
      </view>

      <view class="wallet-balance-card">
        <view class="wallet-balance__label">可提现金额</view>
        <view class="wallet-balance__amount">¥{{ withdrawableAmount }}</view>
        <view class="wallet-balance__meta">今日入账 ¥{{ todayIncome }} · 本月到账 ¥{{ monthIncome }}</view>
        <view class="wallet-balance__actions">
          <van-button type="primary" round size="small" @click="navigateTo('/pages/withdraw')">立即提现</van-button>
          <van-button plain round size="small" @click="navigateTo('/pages/split-record')">查看资金记录</van-button>
        </view>
      </view>
    </view>

    <view v-if="showUpgradeNotice" class="section-card notice-card">
      <view>
        <view class="section-title">提现额度提醒</view>
        <view class="section-desc">当前账户仍受单笔 1000 元限制，完成升级认证后可解除限制并提升到账体验。</view>
      </view>
      <van-button type="primary" plain round size="small" @click="navigateTo('/pages/account-upgrade')">去升级</van-button>
    </view>

    <view class="section-card summary-card">
      <view class="summary-grid">
        <view class="summary-item">
          <view class="summary-item__label">待到账</view>
          <view class="summary-item__value">¥{{ pendingAmount }}</view>
        </view>
        <view class="summary-item">
          <view class="summary-item__label">最近提现</view>
          <view class="summary-item__value">{{ latestWithdrawStatus }}</view>
        </view>
        <view class="summary-item">
          <view class="summary-item__label">冻结金额</view>
          <view class="summary-item__value">¥{{ frozenAmount }}</view>
        </view>
      </view>
    </view>

    <view class="section-card quick-card">
      <view class="section-title">常用操作</view>
      <view class="section-desc">聚焦到账查看、提现和账户安全，不再承载商户收款入口。</view>
      <view class="quick-grid">
        <view v-for="item in quickItems" :key="item.path" class="quick-item" @click="navigateTo(item.path)">
          <view class="quick-item__icon">{{ item.icon }}</view>
          <view class="quick-item__title">{{ item.title }}</view>
          <view class="quick-item__desc">{{ item.desc }}</view>
        </view>
      </view>
    </view>

    <view class="section-card flow-card">
      <view class="section-title">最近资金动态</view>
      <view class="section-desc">帮助你判断哪些钱已到账，哪些正在处理，是否适合立即提现。</view>
      <view class="flow-list">
        <view v-for="item in fundFeed" :key="item.id" class="flow-item">
          <view>
            <view class="flow-item__title">{{ item.title }}</view>
            <view class="flow-item__time">{{ item.time }}</view>
          </view>
          <view class="flow-item__side">
            <view class="flow-item__amount" :class="item.amountClass">{{ item.amount }}</view>
            <view class="status-badge" :class="item.badgeClass">{{ item.status }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useAccountStore } from '@/store/account'
import { useSplitStore } from '@/store/split'

const accountStore = useAccountStore()
const splitStore = useSplitStore()

const roleLabel = computed(() => accountStore.currentAccount.type === 'guide' ? '导游资金钱包' : accountStore.currentAccount.type === 'driver' ? '司机资金钱包' : '个人资金钱包')
const withdrawableAmount = computed(() => Number(accountStore.currentAccount.balance || 0).toFixed(2))
const frozenAmount = computed(() => Number(accountStore.currentAccount.frozenBalance || 0).toFixed(2))
const accountStatusText = computed(() => accountStore.currentAccount.status === 'VALID' ? '已可提现' : '待完成认证')
const accountStatusClass = computed(() => accountStore.currentAccount.status === 'VALID' ? 'success' : 'warning')
const showUpgradeNotice = computed(() => accountStore.currentAccount.status !== 'VALID')

const normalizedRecords = computed(() => {
  const source = splitStore.splitRecords.length > 0 ? splitStore.splitRecords : [
    { id: 'R001', toName: '旅行社分账到账', amount: 820, status: 'success', createTime: '2026-04-08 09:20' },
    { id: 'R002', toName: '提现处理中', amount: 500, status: 'pending', createTime: '2026-04-07 18:10' },
    { id: 'R003', toName: '旅行社分账到账', amount: 1260, status: 'success', createTime: '2026-04-07 14:50' }
  ]
  return source.map((item) => ({
    id: item.id,
    title: item.toName,
    amount: Number(item.amount || 0),
    status: item.status,
    time: item.createTime
  }))
})

const todayIncome = computed(() => normalizedRecords.value.filter((item) => item.status === 'success').slice(0, 2).reduce((sum, item) => sum + item.amount, 0).toFixed(2))
const monthIncome = computed(() => normalizedRecords.value.filter((item) => item.status === 'success').reduce((sum, item) => sum + item.amount, 0).toFixed(2))
const pendingAmount = computed(() => normalizedRecords.value.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0).toFixed(2))
const latestWithdrawStatus = computed(() => normalizedRecords.value.some((item) => item.title.includes('提现') && item.status === 'pending') ? '处理中' : '暂无进行中')

const quickItems = [
  { path: '/pages/withdraw', icon: '提', title: '立即提现', desc: '确认到账规则后发起提现' },
  { path: '/pages/split-record', icon: '账', title: '资金记录', desc: '查看最近到账与提现进度' },
  { path: '/pages/bankcard', icon: '卡', title: '银行卡', desc: '维护到账银行卡信息' },
  { path: '/pages/help', icon: '问', title: '到账帮助', desc: '查看到账与认证说明' }
]

const fundFeed = computed(() => normalizedRecords.value.slice(0, 4).map((item) => ({
  id: item.id,
  title: item.title,
  time: item.time,
  amount: `${item.title.includes('提现') ? '-' : '+'}¥${item.amount.toFixed(2)}`,
  amountClass: item.title.includes('提现') ? 'is-out' : 'is-in',
  status: item.status === 'success' ? '已到账' : item.status === 'pending' ? '处理中' : '异常待处理',
  badgeClass: item.status === 'success' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'
})))

const navigateTo = (path) => {
  const finalPath = path.includes('/index') ? path : `${path}/index`
  uni.navigateTo({ url: finalPath })
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.wallet-page { padding-bottom: 24px; }
.wallet-hero { padding: 22px 16px 0; background: $brand-gradient; color: #fff; border-radius: 0 0 28px 28px; box-shadow: $shadow-md; }
.wallet-hero__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.wallet-role { font-size: 12px; letter-spacing: 1px; opacity: 0.8; }
.wallet-name { margin-top: 8px; font-size: 24px; font-weight: 700; }
.wallet-subtitle { margin-top: 10px; max-width: 280px; line-height: 1.7; font-size: 12px; opacity: 0.84; }
.wallet-balance-card { margin-top: 18px; padding: 22px 20px; border-radius: $border-radius-lg; background: rgba(255,255,255,0.94); color: $text-color; transform: translateY(18px); box-shadow: $shadow-lg; }
.wallet-balance__label { font-size: 13px; color: $text-muted; }
.wallet-balance__amount { margin-top: 8px; font-size: 36px; font-weight: 700; color: $brand-strong; }
.wallet-balance__meta { margin-top: 8px; font-size: 13px; color: $text-secondary; }
.wallet-balance__actions { display: flex; gap: 10px; margin-top: 18px; }
.notice-card { margin-top: 34px; display: flex; justify-content: space-between; align-items: center; gap: 12px; background: linear-gradient(180deg, #fffdf8 0%, #ffffff 100%); }
.summary-card { margin-top: 0; }
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.summary-item { padding: 14px; border-radius: $border-radius-md; background: $brand-mist; }
.summary-item__label { font-size: 12px; color: $text-muted; }
.summary-item__value { margin-top: 8px; font-size: 18px; font-weight: 700; color: $text-color; }
.quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 14px; }
.quick-item { padding: 16px; border-radius: $border-radius-md; background: linear-gradient(180deg, #ffffff 0%, #f7fbf9 100%); border: 1px solid $border-color; }
.quick-item__icon { width: 38px; height: 38px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: rgba(15,118,110,0.1); color: $brand-strong; font-size: 16px; font-weight: 700; }
.quick-item__title { margin-top: 12px; font-size: 15px; font-weight: 700; color: $text-color; }
.quick-item__desc { margin-top: 6px; font-size: 12px; line-height: 1.6; color: $text-secondary; }
.flow-list { margin-top: 14px; display: grid; gap: 12px; }
.flow-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #edf3f1; }
.flow-item:last-child { border-bottom: none; }
.flow-item__title { font-size: 14px; font-weight: 700; }
.flow-item__time { margin-top: 4px; font-size: 12px; color: $text-muted; }
.flow-item__side { text-align: right; }
.flow-item__amount { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.flow-item__amount.is-in { color: $success-color; }
.flow-item__amount.is-out { color: $warning-color; }
@media (max-width: 360px) { .summary-grid, .quick-grid { grid-template-columns: 1fr; } }
</style>

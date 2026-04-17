<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">账户详情</text>
    </view>

    <view class="account-card">
      <view class="account-header">
        <view class="avatar-icon">{{ accountStore.currentAccount.name?.[0] || '游' }}</view>
        <view class="account-info">
          <view class="account-name">{{ accountStore.currentAccount.name }}</view>
          <view class="account-type">{{ accountStore.currentAccount.typeName }} · Lv.{{ accountStore.currentAccount.level }}</view>
        </view>
      </view>

      <view class="divider"></view>

      <view class="info-row"><text class="info-label">账户编号</text><text class="info-value">{{ accountStore.currentAccount.accountNo }}</text></view>
      <view class="info-row"><text class="info-label">账户状态</text><text class="status-tag" :class="accountStore.currentAccount.status?.toLowerCase()">{{ accountStore.currentAccount.status }}</text></view>
      <view class="info-row"><text class="info-label">审核状态</text><text class="info-value">{{ auditText }}</text></view>
      <view class="info-row"><text class="info-label">创建时间</text><text class="info-value">{{ accountStore.currentAccount.createTime }}</text></view>
    </view>

    <view class="ledger-card">
      <view class="ledger-title">📒 Ledger 账簿</view>
      <view class="info-row"><text class="info-label">账簿编号</text><text class="info-value">LDG2026030003</text></view>
      <view class="info-row"><text class="info-label">账簿余额</text><text class="info-value primary">¥{{ accountStore.currentAccount.balance }}</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useAccountStore } from '@/store/account'
const accountStore = useAccountStore()
const auditText = computed(() => {
  const map = { not_required:'无需审核', pending:'审核中', passed:'已通过', rejected:'已拒绝' }
  return map[accountStore.currentAccount.auditStatus] || accountStore.currentAccount.auditStatus
})
const goBack = () => uni.navigateBack()
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.account-card, .ledger-card { margin:16px; padding:20px; background:#fff; border-radius:$border-radius-lg; box-shadow:$shadow-md; }
.account-header { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
.avatar-icon { width:56px; height:56px; border-radius:50%; background:$primary-gradient; display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px; font-weight:bold; }
.account-name { font-size:18px; font-weight:bold; }
.account-type { font-size:13px; color:#888; margin-top:2px; }
.divider { height:1px; background:#f0f0f0; margin-bottom:16px; }
.info-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f9f9f9; }
.info-label { font-size:14px; color:#888; }
.info-value { font-size:14px; color:#333; font-weight:500; }
.info-value.primary { color:$primary-color; font-weight:bold; font-size:16px; }
.status-tag { padding:2px 10px; border-radius:10px; font-size:12px; }
.status-tag.valid { background:#e8f5e9; color:#4CAF50; }
.status-tag.invalid { background:#ffebee; color:#E53935; }
.ledger-title { font-size:15px; font-weight:600; margin-bottom:12px; }
</style>

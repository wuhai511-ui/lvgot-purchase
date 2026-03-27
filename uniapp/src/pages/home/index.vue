<template>
  <view class="page-container">
    <!-- 顶部渐变背景 -->
    <view class="home-header">
      <view class="user-info">
        <view class="avatar">{{ userRole === 'merchant' ? '商' : '导' }}</view>
        <view class="name">{{ accountStore.currentAccount.name }}</view>
        <view class="account-no">{{ accountStore.currentAccount.accountNo }}</view>
      </view>
    </view>

    <!-- 余额卡片 -->
    <view class="balance-card">
      <view class="balance-label">账户余额（元）</view>
      <view class="balance-amount">{{ accountStore.currentAccount.balance }}</view>
      <view class="balance-frozen">冻结：{{ accountStore.currentAccount.frozenBalance }}元</view>
      <view class="balance-actions">
        <van-button v-if="userRole === 'merchant'" type="primary" size="small" round @click="goRecharge">充值</van-button>
        <van-button type="warning" size="small" round @click="goWithdraw">提现</van-button>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-grid">
      <view class="menu-item" v-for="item in menuItems" :key="item.path" @click="navigateTo(item.path)">
        <view class="menu-icon" :style="{background: item.bg}">{{ item.emoji }}</view>
        <view class="menu-text">{{ item.text }}</view>
      </view>
    </view>

    <!-- 最近分账记录 (仅商户可见，或如果有需要都可见，暂保留) -->
    <view class="section">
      <view class="section-title">最近收入/分账</view>
      <view class="split-list">
        <view class="split-item" v-for="item in splitRecords" :key="item.id">
          <view class="split-info">
            <view class="split-to">{{ item.toName }}</view>
            <view class="split-time">{{ item.createTime }}</view>
          </view>
          <view class="split-amount">+{{ item.amount }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAccountStore } from '@/store/account'
import { useSplitStore } from '@/store/split'

const accountStore = useAccountStore()
const splitStore = useSplitStore()

const userRole = computed(() => accountStore.currentAccount.type)

const allMenuItems = [
  { text: '充值', path: '/pages/recharge/index', emoji: '💰', bg: '#e3f2fd', roles: ['merchant'] },
  { text: '提现', path: '/pages/withdraw/index', emoji: '💵', bg: '#fce4ec', roles: ['merchant', 'guide'] },
  { text: '收款码', path: '/pages/qrcode/index', emoji: '💴', bg: '#fff8e1', roles: ['merchant'] },
  { text: '分账记录', path: '/pages/split-record/index', emoji: '📋', bg: '#e8f5e9', roles: ['merchant'] },
  { text: '交易流水', path: '/pages/order/index', emoji: '📝', bg: '#f3e5f5', roles: ['merchant'] },
  { text: '银行卡', path: '/pages/bankcard/index', emoji: '💳', bg: '#e0f7fa', roles: ['merchant', 'guide'] },
  { text: '账户升级', path: '/pages/account-upgrade/index', emoji: '⬆️', bg: '#fbe9e7', roles: ['guide'] },
  { text: '门店绑定', path: '/pages/store-bind/index', emoji: '🏫', bg: '#ede7f6', roles: ['merchant'] },
]

const menuItems = computed(() => {
  return allMenuItems.filter(item => item.roles.includes(userRole.value))
})

const splitRecords = ref([])

onMounted(() => {
  // 模拟加载数据
  splitRecords.value = splitStore.splitRecords.length > 0
    ? splitStore.splitRecords
    : [{ id: 'SPL001', toName: '李四', amount: 200, createTime: '2026-03-26 10:00' }]
})

const navigateTo = (path) => {
  uni.navigateTo({ url: path })
}

const goRecharge = () => navigateTo('/pages/recharge/index')
const goWithdraw = () => navigateTo('/pages/withdraw/index')
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.home-header {
  background: $primary-gradient;
  padding: 40px 20px 60px;
  color: #fff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.name {
  font-size: 18px;
  font-weight: 600;
}

.account-no {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
}

.balance-card {
  background: #fff;
  margin: -40px 16px 16px;
  border-radius: $border-radius-lg;
  padding: 20px;
  box-shadow: $shadow-md;
}

.balance-label {
  font-size: 12px;
  color: #888;
}

.balance-amount {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin: 8px 0;
}

.balance-frozen {
  font-size: 12px;
  color: #888;
  margin-bottom: 16px;
}

.balance-actions {
  display: flex;
  gap: 12px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 16px;
  margin-bottom: 16px;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.menu-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.menu-text {
  font-size: 12px;
  color: #333;
}

.section {
  padding: 0 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  border-left: 3px solid $primary-color;
  padding-left: 8px;
}

.split-list {
  background: #fff;
  border-radius: $border-radius-md;
  overflow: hidden;
}

.split-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.split-item:last-child {
  border-bottom: none;
}

.split-to {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.split-time {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.split-amount {
  font-size: 16px;
  color: $success-color;
  font-weight: 600;
}
</style>

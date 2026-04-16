<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">账户列表</text>
    </view>

    <!-- 账户列表 -->
    <view class="account-list">
      <view
        v-for="item in accounts"
        :key="item.account_no"
        class="account-card"
        :class="{ active: item.account_no === currentAccountNo }"
        @click="switchAccount(item)"
      >
        <view class="card-left">
          <view class="account-avatar">{{ item.account_no?.slice(-4) || '?' }}</view>
          <view class="account-meta">
            <view class="account-no">{{ item.account_no }}</view>
            <view class="account-type-tag">{{ getAccountTypeName(item.account_type) }}</view>
          </view>
        </view>
        <view class="card-right">
          <view class="balance">¥{{ (item.balance / 100).toFixed(2) }}</view>
          <view v-if="item.account_no === currentAccountNo" class="current-badge">当前</view>
        </view>
      </view>
      <view v-if="loading" class="loading">加载中...</view>
      <view v-if="!loading && accounts.length === 0" class="empty">暂无可用账户</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onLoad } from 'vue'
import { getAccounts } from '@/api/account'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()
const accounts = ref([])
const currentAccountNo = ref('')
const loading = ref(false)

onLoad(async () => {
  await loadAccounts()
})

const loadAccounts = async () => {
  loading.value = true
  try {
    const res = await getAccounts(1) // merchantId 需替换为实际登录商户 ID
    if (res.code === 0) {
      const list = res.data || []
      accountStore.setAccounts(list)
      accounts.value = list
      currentAccountNo.value = accountStore.currentAccountNo
    }
  } catch (e) {
    console.warn('[Account] loadAccounts error', e)
  } finally {
    loading.value = false
  }
}

const switchAccount = (item) => {
  accountStore.selectAccount(item.account_no)
  currentAccountNo.value = item.account_no
  uni.showToast({ title: `已切换至 ${item.account_no.slice(-6)}`, icon: 'success' })
}

const getAccountTypeName = (type) => {
  const map = { PERSONAL: '个人', ENTERPRISE: '企业', MERCHANT: '商户' }
  return map[type] || type || '账户'
}

const goBack = () => uni.navigateBack()
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.account-list { padding: 16px; }
.account-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: $shadow-sm;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.account-card.active {
  border-color: $primary-color;
  background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
}
.card-left { display: flex; align-items: center; gap: 12px; }
.account-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: $primary-gradient;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 14px; font-weight: bold;
}
.account-no { font-size: 14px; color: #333; font-weight: 600; }
.account-type-tag {
  font-size: 11px;
  color: #888;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 4px;
  display: inline-block;
}
.card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.balance { font-size: 16px; font-weight: bold; color: $primary-color; }
.current-badge {
  background: $primary-color;
  color: #fff;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
}
.loading, .empty {
  text-align: center;
  padding: 48px 0;
  color: #999;
  font-size: 28rpx;
}
</style>

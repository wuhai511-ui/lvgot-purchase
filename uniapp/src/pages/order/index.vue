<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">付款订单</text>
    </view>

    <!-- 账户 + 状态过滤栏 -->
    <view class="filter-bar">
      <picker mode="selector" :range="accounts" range-key="account_no" @change="onAccountChange">
        <view class="picker-value">
          {{ selectedAccountNo || '全部账户' }}
          <text class="arrow">▼</text>
        </view>
      </picker>
      <picker mode="selector" :range="statusOptions" range-key="label" @change="onStatusChange">
        <view class="picker-value">
          {{ selectedStatusLabel }}
          <text class="arrow">▼</text>
        </view>
      </picker>
    </view>

    <!-- 订单列表 -->
    <scroll-view scroll-y class="order-list" @scrolltolower="loadMore">
      <view v-for="item in orders" :key="item.id" class="order-card">
        <view class="order-header">
          <text class="order-no">{{ item.out_order_no || item.id }}</text>
          <text class="order-status" :class="item.status">{{ statusMap[item.status] || item.status }}</text>
        </view>
        <view class="order-info">
          <text>账户：{{ item.account_no }}</text>
          <text>收款：{{ item.payee_account_no }}</text>
          <text class="amount">¥{{ (item.amount / 100).toFixed(2) }}</text>
        </view>
        <view class="order-footer">
          <text class="time">{{ formatTime(item.created_at) }}</text>
          <view v-if="item.status === 'SUCCESS' && item.split_status === 'UNSPLIT'" class="split-btn" @click="goSplit(item)">
            分账
          </view>
        </view>
      </view>
      <view v-if="loading" class="loading">加载中...</view>
      <view v-if="!loading && orders.length === 0" class="empty">暂无订单</view>
    </scroll-view>

    <!-- 底部批量创建按钮 -->
    <view class="bottom-bar">
      <button type="primary" @click="showBatchCreate = true">批量创建订单</button>
    </view>

    <!-- 批量创建弹窗 -->
    <uni-popup v-if="showBatchCreate" type="bottom">
      <view class="batch-sheet">
        <view class="batch-title">批量创建订单</view>
        <textarea v-model="batchText" placeholder="每行一个：订单号,账户,收款账户,金额(元)" class="batch-input" />
        <view class="batch-actions">
          <button @click="showBatchCreate=false">取消</button>
          <button type="primary" @click="handleBatchCreate">确认</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, onLoad } from 'vue'
import { getOrders, batchCreateOrders } from '@/api/order'
import { getAccounts } from '@/api/account'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()
const accounts = ref([])
const selectedAccountNo = ref('')
const selectedStatus = ref('')
const orders = ref([])
const loading = ref(false)
const showBatchCreate = ref(false)
const batchText = ref('')

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待支付', value: 'PENDING' },
  { label: '已支付', value: 'SUCCESS' },
  { label: '已关闭', value: 'CLOSED' },
]
const statusMap = { PENDING: '待支付', SUCCESS: '已支付', CLOSED: '已关闭' }

const selectedStatusLabel = computed(() =>
  statusOptions.find(s => s.value === selectedStatus.value)?.label || '全部状态'
)

onLoad(async () => {
  const accs = accountStore.accounts
  if (accs.length) {
    accounts.value = accs
    selectedAccountNo.value = accountStore.currentAccountNo || ''
  } else {
    const res = await getAccounts(1)
    if (res.code === 0) {
      accounts.value = res.data || []
      accountStore.setAccounts(accounts.value)
      selectedAccountNo.value = accountStore.currentAccountNo || ''
    }
  }
  await loadOrders()
})

const loadOrders = async () => {
  loading.value = true
  const params = {}
  if (selectedAccountNo.value) params.account_no = selectedAccountNo.value
  if (selectedStatus.value) params.status = selectedStatus.value
  try {
    const res = await getOrders(params)
    if (res.code === 0) orders.value = res.data || []
  } catch (e) {
    console.warn('[Order] loadOrders error', e)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => { await loadOrders() }

const onAccountChange = (e) => {
  const idx = e.detail.value
  const acc = accounts.value[idx]
  selectedAccountNo.value = acc?.account_no || ''
  if (selectedAccountNo.value) accountStore.selectAccount(selectedAccountNo.value)
  loadOrders()
}

const onStatusChange = (e) => {
  selectedStatus.value = statusOptions[e.detail.value].value
  loadOrders()
}

const handleBatchCreate = async () => {
  const lines = batchText.value.trim().split('\n').filter(l => l.trim())
  if (!lines.length) { uni.showToast({ title: '请输入订单数据', icon: 'none' }); return }
  const orderList = lines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    return {
      out_order_no: parts[0] || '',
      account_no: parts[1] || selectedAccountNo.value || '',
      payee_account_no: parts[2] || '',
      amount: Math.round(parseFloat(parts[3] || 0) * 100),
    }
  })
  try {
    const res = await batchCreateOrders(orderList)
    if (res.code === 0) {
      uni.showToast({ title: `创建成功 ${orderList.length} 个`, icon: 'success' })
      showBatchCreate.value = false
      batchText.value = ''
      loadOrders()
    } else {
      uni.showToast({ title: res.message || '创建失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

const goSplit = (order) => {
  uni.navigateTo({ url: `/pages/split/index?order_id=${order.id}&account_no=${order.account_no}` })
}

const formatTime = (t) => t ? t.replace('T', ' ').substring(0, 16) : '-'

const goBack = () => uni.navigateBack()
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page { min-height: 100vh; background: #f5f5f5; padding-bottom: 80px; }
.filter-bar { display: flex; gap: 16rpx; padding: 16rpx 24rpx; background: #fff; border-bottom: 1rpx solid #eee; }
.picker-value { background: #f0f0f0; padding: 10rpx 20rpx; border-radius: 8rpx; font-size: 26rpx; display: flex; align-items: center; gap: 8rpx; }
.arrow { font-size: 20rpx; color: #888; }
.order-list { padding: 24rpx; }
.order-card { background: #fff; border-radius: $border-radius-md; padding: 24rpx; margin-bottom: 20rpx; box-shadow: $shadow-sm; }
.order-header { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.order-no { font-size: 28rpx; color: #333; font-weight: 600; }
.order-status { font-size: 24rpx; }
.order-status.SUCCESS { color: #07c160; }
.order-status.PENDING { color: #ff9500; }
.order-status.CLOSED { color: #999; }
.order-info { display: flex; flex-direction: column; gap: 6rpx; font-size: 26rpx; color: #666; }
.order-info .amount { font-size: 32rpx; color: #333; font-weight: bold; margin-top: 8rpx; }
.order-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; }
.time { font-size: 24rpx; color: #999; }
.split-btn { background: $primary-color; color: #fff; padding: 8rpx 24rpx; border-radius: 6rpx; font-size: 24rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 24rpx; background: #fff; border-top: 1rpx solid #eee; }
.batch-sheet { background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx; }
.batch-title { font-size: 32rpx; font-weight: bold; margin-bottom: 24rpx; }
.batch-input { background: #f5f5f5; border-radius: 8rpx; padding: 24rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 200rpx; }
.batch-actions { display: flex; gap: 24rpx; margin-top: 24rpx; }
.loading, .empty { text-align: center; padding: 48rpx; color: #999; font-size: 28rpx; }
</style>

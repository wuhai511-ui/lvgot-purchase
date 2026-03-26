<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">付款订单</text>
    </view>

    <view class="filter-tabs">
      <view v-for="f in filters" :key="f.value" class="filter-tab" :class="{active: filter===f.value}" @click="filter=f.value">{{ f.label }}</view>
    </view>

    <view class="order-list">
      <view v-if="filteredOrders.length===0" class="empty"><text>📭</text><text>暂无订单</text></view>
      <view v-else v-for="o in filteredOrders" :key="o.id" class="order-card" @click="goDetail(o.id)">
        <view class="order-header">
          <text class="merchant">{{ o.merchantName }}</text>
          <text class="status-tag" :class="o.status">{{ statusText[o.status] }}</text>
        </view>
        <view class="order-footer">
          <text class="order-no">{{ o.id }}</text>
          <text class="order-amount">¥{{ o.amount }}</text>
        </view>
        <view class="order-time">{{ o.createTime }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
const filter = ref('all')
const filters = [{label:'全部',value:'all'},{label:'待支付',value:'pending'},{label:'已支付',value:'paid'},{label:'已退款',value:'refunded'}]
const statusText = {pending:'待支付', paid:'已支付', refunded:'已退款'}
const orders = [
  {id:'ORD2026032601', merchantName:'免税店A', amount:500, status:'paid', createTime:'2026-03-26 10:00'},
  {id:'ORD2026032602', merchantName:'旅游大巴', amount:1200, status:'paid', createTime:'2026-03-26 09:30'},
  {id:'ORD2026032603', merchantName:'景区门票', amount:300, status:'pending', createTime:'2026-03-26 08:00'},
  {id:'ORD2026032604', merchantName:'酒店预订', amount:800, status:'refunded', createTime:'2026-03-25 14:00'},
]
const filteredOrders = computed(() => filter.value==='all' ? orders : orders.filter(o=>o.status===filter.value))
const goBack = () => uni.navigateBack()
const goDetail = (id) => uni.showModal({title:'订单详情', content:`订单号: ${id}`, showCancel:false})
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.filter-tabs { display:flex; background:#fff; padding:0 16px; border-bottom:1px solid #eee; }
.filter-tab { flex:1; text-align:center; padding:12px 0; font-size:13px; color:#666; border-bottom:2px solid transparent; }
.filter-tab.active { color:$primary-color; border-bottom-color:$primary-color; font-weight:600; }
.order-list { padding: 16px; }
.order-card { background:#fff; border-radius:$border-radius-md; padding:14px; margin-bottom:10px; box-shadow:$shadow-sm; }
.order-header { display:flex; justify-content:space-between; margin-bottom:10px; }
.merchant { font-size:14px; font-weight:600; }
.status-tag { font-size:11px; padding:2px 8px; border-radius:10px; }
.status-tag.paid { background:#e8f5e9; color:#4CAF50; }
.status-tag.pending { background:#fff8e1; color:#FF9800; }
.status-tag.refunded { background:#f5f5f5; color:#888; }
.order-footer { display:flex; justify-content:space-between; margin-bottom:4px; }
.order-no { font-size:12px; color:#888; }
.order-amount { font-size:16px; font-weight:bold; color:#333; }
.order-time { font-size:11px; color:#bbb; }
.empty { text-align:center; padding:60px 0; color:#888; display:flex; flex-direction:column; align-items:center; gap:12px; }
</style>

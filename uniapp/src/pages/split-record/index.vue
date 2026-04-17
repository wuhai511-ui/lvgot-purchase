<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">分账记录</text>
    </view>

    <view class="filter-tabs">
      <view v-for="f in filters" :key="f.value" class="filter-tab" :class="{active: filter===f.value}" @click="filter=f.value">{{ f.label }}</view>
    </view>

    <view class="record-list">
      <view v-if="filteredRecords.length===0" class="empty">
        <text>📭</text>
        <text>暂无记录</text>
      </view>
      <view v-else v-for="r in filteredRecords" :key="r.id" class="record-item">
        <view class="record-left">
          <view class="record-to">{{ r.toName }}</view>
          <view class="record-time">{{ r.createTime }}</view>
        </view>
        <view class="record-right">
          <view class="record-amount">+{{ r.amount }}</view>
          <view class="status-tag" :class="r.status">{{ statusText[r.status] }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSplitStore } from '@/store/split'
const splitStore = useSplitStore()
const filter = ref('all')
const filters = [{label:'全部',value:'all'},{label:'成功',value:'success'},{label:'失败',value:'failed'},{label:'处理中',value:'pending'}]
const statusText = { success:'成功', failed:'失败', pending:'处理中' }
const allRecords = splitStore.splitRecords.length > 0 ? splitStore.splitRecords : [
  {id:'S001', toName:'李四(导游)', amount:200, status:'success', createTime:'2026-03-26 10:00'},
  {id:'S002', toName:'张司机', amount:500, status:'success', createTime:'2026-03-26 09:00'},
  {id:'S003', toName:'王导游', amount:300, status:'pending', createTime:'2026-03-25 18:00'},
]
const filteredRecords = computed(() => filter.value==='all' ? allRecords : allRecords.filter(r=>r.status===filter.value))
const goBack = () => uni.navigateBack()
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.filter-tabs { display:flex; background:#fff; padding:0 16px; border-bottom:1px solid #eee; }
.filter-tab { flex:1; text-align:center; padding:12px 0; font-size:13px; color:#666; border-bottom:2px solid transparent; }
.filter-tab.active { color:$primary-color; border-bottom-color:$primary-color; font-weight:600; }
.record-list { padding: 0 16px; }
.record-item { display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid #f5f5f5; }
.record-to { font-size:14px; font-weight:500; }
.record-time { font-size:12px; color:#888; margin-top:2px; }
.record-amount { font-size:16px; font-weight:600; color:$success-color; text-align:right; }
.status-tag { font-size:11px; padding:2px 8px; border-radius:10px; text-align:center; margin-top:4px; }
.status-tag.success { background:#e8f5e9; color:#4CAF50; }
.status-tag.failed { background:#ffebee; color:#E53935; }
.status-tag.pending { background:#fff8e1; color:#FF9800; }
.empty { text-align:center; padding:60px 0; color:#888; display:flex; flex-direction:column; align-items:center; gap:12px; font-size:14px; }
</style>

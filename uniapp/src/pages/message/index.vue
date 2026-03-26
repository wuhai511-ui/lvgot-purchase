<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">消息通知</text>
    </view>
    <view class="filter-tabs">
      <view v-for="t in tabs" :key="t" class="filter-tab" :class="{active: activeTab===t}" @click="activeTab=t">{{ t }}</view>
    </view>
    <view class="msg-list">
      <view v-if="filteredMsgs.length===0" class="empty"><text>📭</text><text>暂无消息</text></view>
      <view v-else v-for="m in filteredMsgs" :key="m.id" class="msg-item">
        <view class="msg-icon">{{ m.type==='系统'?'🔔':m.type==='交易'?'💰':'📢' }}</view>
        <view class="msg-content">
          <view class="msg-title">{{ m.title }}</view>
          <view class="msg-desc">{{ m.desc }}</view>
          <view class="msg-time">{{ m.time }}</view>
        </view>
        <view v-if="m.unread" class="unread-dot"></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
const activeTab = ref('全部')
const tabs = ['全部','系统','交易','公告']
const messages = [
  {id:1, type:'系统', title:'账户升级提醒', desc:'您的账户已通过审核', time:'2026-03-26 10:00', unread:true},
  {id:2, type:'交易', title:'分账到账通知', desc:'收到分账 ¥200.00', time:'2026-03-26 09:30', unread:true},
  {id:3, type:'公告', title:'系统维护通知', desc:'将于3月28日凌晨维护', time:'2026-03-25 18:00', unread:false},
]
const filteredMsgs = computed(() => activeTab.value==='全部' ? messages : messages.filter(m=>m.type===activeTab.value))
const goBack = () => uni.navigateBack()
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.filter-tabs { display:flex; background:#fff; padding:0 16px; border-bottom:1px solid #eee; }
.filter-tab { flex:1; text-align:center; padding:12px 0; font-size:13px; color:#666; border-bottom:2px solid transparent; }
.filter-tab.active { color:$primary-color; border-bottom-color:$primary-color; font-weight:600; }
.msg-list { padding:0 16px; }
.msg-item { display:flex; align-items:flex-start; gap:12px; padding:14px 0; border-bottom:1px solid #f5f5f5; }
.msg-icon { font-size:22px; margin-top:2px; }
.msg-title { font-size:14px; font-weight:600; }
.msg-desc { font-size:12px; color:#888; margin-top:4px; }
.msg-time { font-size:11px; color:#bbb; margin-top:4px; }
.unread-dot { width:8px; height:8px; border-radius:50%; background:#E53935; margin-top:4px; }
.empty { text-align:center; padding:60px 0; display:flex; flex-direction:column; align-items:center; gap:12px; color:#888; }
</style>

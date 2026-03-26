<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">账户升级</text>
    </view>

    <view class="current-status">
      <view class="status-label">当前账户类型</view>
      <view class="status-badge">{{ accountStore.currentAccount.typeName }}</view>
      <view class="status-desc">
        <text v-if="accountStore.currentAccount.auditStatus==='not_required'">✅ 无需审核，自动通过</text>
        <text v-else-if="accountStore.currentAccount.auditStatus==='pending'">⏱ 审核中</text>
        <text v-else>✅ 已通过审核</text>
      </view>
    </view>

    <view class="upgrade-card">
      <view class="upgrade-icon">⬆️</view>
      <view class="upgrade-title">升级为{{ accountStore.currentAccount.type==='personal' ? '企业账户' : '高级账户' }}</view>
      <view class="upgrade-desc">升级后享受更多功能和服务</view>
      <view class="upgrade-features">
        <view class="feature-item" v-for="f in features" :key="f">{{ f }}</view>
      </view>
      <van-button type="primary" block round @click="doUpgrade" :loading="loading">立即升级</van-button>
    </view>

    <van-dialog show="{{ showAuth }}" title="人脸认证" @confirm="onAuthSuccess" @cancel="showAuth=false" show-cancel-button>
      <view style="padding:30px;text-align:center">
        <view style="font-size:48px;margin-bottom:12px">📸</view>
        <view>请在光线充足的环境下</view>
        <view>进行人脸识别</view>
      </view>
    </van-dialog>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useAccountStore } from '@/store/account'
const accountStore = useAccountStore()
const loading = ref(false)
const showAuth = ref(false)
const features = ['✅ 更高分账额度', '✅ 优先客服支持', '✅ 更多支付方式', '✅ 企业专属服务']
const goBack = () => uni.navigateBack()
const doUpgrade = () => { showAuth.value = true }
const onAuthSuccess = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    accountStore.currentAccount.auditStatus = 'passed'
    uni.showToast({ title: '升级成功', icon: 'success' })
  }, 1500)
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.current-status { margin:16px; padding:20px; background:#fff; border-radius:$border-radius-lg; text-align:center; box-shadow:$shadow-md; }
.status-label { font-size:13px; color:#888; margin-bottom:8px; }
.status-badge { display:inline-block; padding:6px 20px; background:$primary-gradient; color:#fff; border-radius:20px; font-size:16px; font-weight:600; margin-bottom:8px; }
.status-desc { font-size:13px; color:#888; }
.upgrade-card { margin:16px; padding:24px; background:#fff; border-radius:$border-radius-lg; text-align:center; box-shadow:$shadow-md; }
.upgrade-icon { font-size:48px; margin-bottom:12px; }
.upgrade-title { font-size:18px; font-weight:bold; margin-bottom:8px; }
.upgrade-desc { font-size:13px; color:#888; margin-bottom:16px; }
.upgrade-features { text-align:left; margin-bottom:20px; }
.feature-item { font-size:14px; color:#333; padding:6px 0; }
</style>

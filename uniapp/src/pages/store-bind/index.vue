<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">门店(商户号)绑定</text>
    </view>

    <view class="form-card">
      <view class="card-title">绑定钱账通商户</view>
      <view class="desc">请在下方输入您在拉卡拉/钱账通注册的商户号以完成系统绑定关联。</view>
      <van-field
        v-model="merchantNo"
        label="拉卡拉商户号"
        placeholder="请输入商户号，例如: 822..."
        required
        clearable
        size="large"
      />
      <view class="bind-action">
        <van-button type="primary" block round @click="bindMerchant" :loading="loading">
          立即绑定
        </van-button>
      </view>
    </view>

    <view class="section">
      <view class="section-title">已绑定的商户号</view>
      <view class="store-list">
        <view v-if="boundList.length === 0" class="empty">暂无绑定记录</view>
        <view v-else v-for="item in boundList" :key="item.merchantNo" class="store-item">
          <view class="store-info">
            <view class="store-name">商户号: {{ item.merchantNo }}</view>
            <view class="store-meta">
              <text class="store-area">绑定时间: {{ item.bindTime }}</text>
            </view>
          </view>
          <view class="binded-tag">已绑定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const merchantNo = ref('')
const loading = ref(false)
const boundList = ref([
  { merchantNo: '82239401239', bindTime: '2026-03-20 12:00:00' }
])

const goBack = () => uni.navigateBack()

const bindMerchant = () => {
  if (!merchantNo.value.trim()) {
    uni.showToast({ title: '请输入商户号', icon: 'none' })
    return
  }
  loading.value = true
  // Mock API call to bind merchant ID
  setTimeout(() => {
    loading.value = false
    boundList.value.unshift({
      merchantNo: merchantNo.value.trim(),
      bindTime: new Date().toLocaleString().replace(/\//g, '-')
    })
    uni.showToast({ title: '绑定成功', icon: 'success' })
    merchantNo.value = ''
  }, 1000)
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.nav-back { font-size: 20px; color: #333; margin-right: 12px; }
.nav-title { font-size: 16px; font-weight: 500; color: #333; }

.form-card {
  margin: 16px;
  padding: 20px 16px;
  background: #fff;
  border-radius: $border-radius-md;
  box-shadow: $shadow-md;
}
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.desc { font-size: 13px; color: #666; margin-bottom: 16px; }
.bind-action { margin-top: 24px; }

.section { padding: 0 16px; margin-top: 24px; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; border-left: 3px solid $primary-color; padding-left: 8px; }

.store-list { background: #fff; border-radius: $border-radius-md; overflow: hidden; padding: 16px; }
.store-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-bottom: 1px solid #eee;
}
.store-item:last-child { border-bottom: none; }
.store-name { font-size: 14px; font-weight: 500; color: #333; }
.store-meta { margin-top: 6px; }
.store-area { font-size: 12px; color: #888; }
.binded-tag { padding: 4px 12px; background: #e8f5e9; color: #4caf50; border-radius: 12px; font-size: 12px; }
.empty { text-align: center; color: #999; font-size: 14px; padding: 20px; }
</style>

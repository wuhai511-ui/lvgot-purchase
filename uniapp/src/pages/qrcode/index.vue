<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">收款码</text>
    </view>

    <view class="qrcode-card">
      <view class="qrcode-amount-label">收款金额（元）</view>
      <view class="qrcode-amount">¥{{ amount || '0.00' }}</view>
      <view class="qrcode-box">
        <!-- 模拟二维码 SVG -->
        <svg width="180" height="180" viewBox="0 0 180 180">
          <rect fill="#fff" width="180" height="180"/>
          <g fill="#000">
            <rect x="20" y="20" width="50" height="50"/>
            <rect x="110" y="20" width="50" height="50"/>
            <rect x="20" y="110" width="50" height="50"/>
            <rect x="30" y="30" width="30" height="30" fill="#fff"/>
            <rect x="40" y="40" width="10" height="10"/>
            <rect x="120" y="30" width="30" height="30" fill="#fff"/>
            <rect x="30" y="120" width="30" height="30" fill="#fff"/>
            <rect x="80" y="80" width="20" height="20"/>
          </g>
        </svg>
      </view>
      <view class="qrcode-tip">向商家出示此码即可完成支付</view>
      <view class="save-btn" @click="saveQrcode">保存图片</view>
    </view>

    <view class="amount-input-card">
      <view class="amount-label">设置固定金额</view>
      <input class="amount-input" type="digit" v-model="amount" placeholder="不填则由用户输入" />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
const amount = ref('')
const goBack = () => uni.navigateBack()
const saveQrcode = () => uni.showToast({title:'已保存到相册', icon:'success'})
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.qrcode-card { margin:16px; padding:30px 20px; background:#fff; border-radius:$border-radius-lg; text-align:center; box-shadow:$shadow-md; }
.qrcode-amount-label { font-size:13px; color:#888; margin-bottom:8px; }
.qrcode-amount { font-size:28px; font-weight:bold; color:$primary-color; margin-bottom:20px; }
.qrcode-box { display:inline-block; padding:16px; background:#fff; border-radius:$border-radius-md; box-shadow:0 2px 8px rgba(0,0,0,0.1); margin-bottom:16px; }
.qrcode-tip { font-size:12px; color:#888; margin-bottom:20px; }
.save-btn { display:inline-block; padding:10px 32px; background:$primary-gradient; color:#fff; border-radius:20px; font-size:14px; cursor:pointer; }
.amount-input-card { margin:0 16px; padding:16px; background:#fff; border-radius:$border-radius-md; }
.amount-label { font-size:13px; color:#888; margin-bottom:8px; }
.amount-input { font-size:16px; padding:10px; border:1px solid #eee; border-radius:$border-radius-sm; width:100%; }
</style>

<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">帮助与客服</text>
    </view>

    <view class="section-title">常见问题</view>
    <van-collapse v-model="activeFaqs" accordion>
      <van-collapse-item title="如何开通账户？" name="1">个人用户无需审核，自动通过。企业用户需人工审核，约1-3个工作日。</van-collapse-item>
      <van-collapse-item title="分账需要手续费吗？" name="2">平台不收取分账手续费，但提现有0.1%手续费补贴。</van-collapse-item>
      <van-collapse-item title="如何绑定门店？" name="3">在"门店绑定"页面搜索门店，点击绑定即可。</van-collapse-item>
      <van-collapse-item title="账户升级需要什么条件？" name="4">个人账户升级需完成人脸识别认证，企业账户升级需补充营业执照。</van-collapse-item>
    </van-collapse>

    <view class="service-section">
      <view class="section-title">联系客服</view>
      <view class="service-item">
        <text>📞</text><text>客服电话：400-888-8888</text>
      </view>
      <view class="service-item">
        <text>💬</text><text>在线客服（工作日 9:00-18:00）</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
const activeFaqs = ref([])
const goBack = () => uni.navigateBack()
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.section-title { font-size:16px; font-weight:600; padding:16px 16px 8px; border-left:3px solid $primary-color; margin-left:8px; }
.service-section { margin-top:16px; }
.service-item { display:flex; align-items:center; gap:10px; padding:14px 16px; background:#fff; border-bottom:1px solid #f5f5f5; font-size:14px; }
</style>

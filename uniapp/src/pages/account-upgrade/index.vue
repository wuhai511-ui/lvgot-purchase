<template>
  <view class="page-container">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">账户升级</text>
    </view>

    <!-- 已完成人脸识别 -->
    <view v-if="verifyStatus === 'verified'" class="success-card">
      <view class="success-icon">🎉</view>
      <view class="success-title">已完成人脸识别</view>
      <view class="success-desc">您的账户提现限额已解除</view>
      <view class="limit-info">
        <van-icon name="checked" color="#52c41a" size="20px" />
        <text>提现限额：无限额</text>
      </view>
      <van-button type="primary" block round @click="goBack" style="margin-top:24px;">完成</van-button>
    </view>

    <!-- 待升级 -->
    <view v-else-if="verifyStatus === 'pending'" class="upgrade-card">
      <view class="upgrade-icon">🔓</view>
      <view class="upgrade-title">解除提现限额</view>
      <view class="upgrade-desc">
        当前账户提现限额 <text class="warn-text">1000元/笔</text><br/>
        完成人脸识别即可解除限额
      </view>

      <view class="limit-status">
        <view class="limit-badge">
          <text class="limit-label">当前提现限额</text>
          <text class="limit-value">1000元/笔</text>
        </view>
        <view class="limit-badge unlocked">
          <text class="limit-label">解锁后限额</text>
          <text class="limit-value unlocked">无限额</text>
        </view>
      </view>

      <view class="upgrade-steps">
        <view class="step-item">
          <text class="step-num">1</text>
          <text>点击「立即升级」按钮</text>
        </view>
        <view class="step-item">
          <text class="step-num">2</text>
          <text>在跳转页面完成人脸识别</text>
        </view>
        <view class="step-item">
          <text class="step-num">3</text>
          <text>系统自动更新限额状态</text>
        </view>
      </view>

      <van-button
        type="primary"
        block
        round
        :loading="loading"
        @click="doUpgrade"
        class="upgrade-btn"
      >
        立即升级
      </van-button>

      <view class="upgrade-tip">
        💡 人脸识别结果将在 <text class="warn-strong">1-2个工作日</text> 内生效
      </view>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loadingPage" class="loading-card">
      <van-loading type="spinner" size="40px" />
      <view style="font-size:14px;color:#666;margin-top:12px;">加载中...</view>
    </view>

    <!-- 加载失败 -->
    <view v-else class="error-card">
      <view style="font-size:48px;margin-bottom:12px;">😅</view>
      <view style="font-size:15px;color:#666;margin-bottom:16px;">加载失败</view>
      <van-button type="primary" plain block round @click="fetchFaceStatus">重试</van-button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAccountStore } from '@/store/account.js'

const accountStore = useAccountStore()
const verifyStatus = ref('idle') // idle=加载中, pending=待升级, verified=已认证
const loading = ref(false)
const loadingPage = ref(true)
const h5Url = ref('')
const merchantId = ref('')

const goBack = () => uni.navigateBack()

// 获取商户在人脸识别中的状态
const fetchFaceStatus = async () => {
  loadingPage.value = true
  try {
    // 获取当前商户ID（从 store 或本地存储）
    const merchantInfo = accountStore.currentAccount || {}
    merchantId.value = merchantInfo.merchantId || merchantInfo.id || ''

    if (!merchantId.value) {
      // 没有商户ID，默认显示待升级状态
      verifyStatus.value = 'pending'
      loadingPage.value = false
      return
    }

    let res
    try {
      res = await uni.request({
        url: `https://bgualqb.cn/api/v1/merchants/${merchantId.value}/face-recognition-url`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: {}
      })
      res = res.data
    } catch (e) {
      console.warn('[Face Recognition] BFF not available, using mock:', e)
      // BFF 未上线，降级
      res = { code: -1 }
    }

    if (res.code === 0 && res.data) {
      if (res.data.already_verified === true) {
        verifyStatus.value = 'verified'
      } else if (res.data.h5_url) {
        h5Url.value = res.data.h5_url
        verifyStatus.value = 'pending'
      } else {
        verifyStatus.value = 'pending'
      }
    } else {
      // BFF 未上线，降级显示待升级
      verifyStatus.value = 'pending'
    }
  } catch (e) {
    console.warn('[Face Recognition] Error:', e)
    verifyStatus.value = 'pending'
  } finally {
    loadingPage.value = false
  }
}

// 发起升级
const doUpgrade = () => {
  if (!h5Url.value) {
    // 如果没有 URL，生成一个 mock URL
    h5Url.value = `https://qztuat.xc-fintech.com/qzt-h5/face-verify?merchant_id=${merchantId.value}&redirect=${encodeURIComponent(location.origin + '/pages/account-upgrade/index')}`
  }

  loading.value = true
  try {
    window.location.href = h5Url.value
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFaceStatus()
})
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container { min-height: 100vh; background: #f5f5f5; }

.nav-bar {
  display: flex; align-items: center;
  padding: 16px; background: #fff;
  border-bottom: 1px solid #eee;
  margin-bottom: 12px;
}
.nav-back { font-size: 20px; margin-right: 12px; }
.nav-title { font-size: 16px; font-weight: 600; }

.success-card {
  margin: 32px 16px; padding: 32px 16px; background: #fff;
  border-radius: $border-radius-md; text-align: center;
  box-shadow: $shadow-md;
}
.success-icon { font-size: 56px; margin-bottom: 12px; }
.success-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.success-desc { font-size: 13px; color: #666; margin-bottom: 16px; }
.limit-info {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; font-size: 14px; color: #52c41a; font-weight: 500;
  padding: 10px; background: #f6ffed; border-radius: 8px;
  margin-bottom: 8px;
}

.upgrade-card {
  margin: 16px; padding: 24px 20px;
  background: #fff; border-radius: $border-radius-lg;
  box-shadow: $shadow-md;
  text-align: center;
}
.upgrade-icon { font-size: 56px; margin-bottom: 12px; }
.upgrade-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.upgrade-desc { font-size: 14px; color: #666; line-height: 1.8; margin-bottom: 20px; }
.warn-text { color: #d4380d; font-weight: 600; }
.warn-strong { color: #d4380d; font-weight: 600; }

.limit-status {
  display: flex; gap: 12px; margin-bottom: 24px;
}
.limit-badge {
  flex: 1; padding: 14px 10px;
  background: #fff7e6; border: 1px solid #ffd591;
  border-radius: $border-radius-md; text-align: center;
}
.limit-badge.unlocked {
  background: #f6ffed; border-color: #b7eb8f;
}
.limit-label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; }
.limit-value { font-size: 15px; font-weight: 700; color: #d4380d; }
.limit-value.unlocked { color: #52c41a; }

.upgrade-steps {
  text-align: left; margin-bottom: 24px;
  padding: 16px; background: #f8f9fa;
  border-radius: $border-radius-md;
}
.step-item {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: #666; line-height: 2.2;
}
.step-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: $primary-color; color: #fff;
  font-size: 11px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.upgrade-btn { margin-bottom: 12px; }
.upgrade-tip { font-size: 12px; color: #999; }

.loading-card {
  margin: 80px 16px; padding: 40px;
  background: #fff; border-radius: $border-radius-md;
  text-align: center; box-shadow: $shadow-md;
  display: flex; flex-direction: column; align-items: center;
}

.error-card {
  margin: 80px 16px; padding: 40px;
  background: #fff; border-radius: $border-radius-md;
  text-align: center; box-shadow: $shadow-md;
}
</style>

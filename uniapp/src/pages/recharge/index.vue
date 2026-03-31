<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">{{ showGuide ? '充值引导' : '充值' }}</text>
    </view>

    <!-- 充值表单 -->
    <template v-if="!showGuide">
      <view class="balance-hint">当前余额：¥ {{ accountStore.currentAccount.balance }}</view>

      <view class="amount-card">
        <view class="amount-label">充值金额</view>
        <view class="amount-input-wrap">
          <text class="yuan">¥</text>
          <input class="amount-input" type="digit" v-model="amount" placeholder="0.00" />
        </view>
        <view class="quick-amounts">
          <view v-for="a in [100,500,1000,2000]" :key="a"
            class="quick-btn" :class="{active: amount==a}"
            @click="amount=a">{{ a }}</view>
        </view>
      </view>

      <view class="pay-methods">
        <view class="method-title">支付方式</view>
        <view class="method-item" :class="{active: payMethod==='balance'}" @click="payMethod='balance'">
          <text>💰</text><text>账户余额</text><text v-if="payMethod==='balance'" class="check">✓</text>
        </view>
        <view class="method-item" :class="{active: payMethod==='wechat'}" @click="payMethod='wechat'">
          <text>💚</text><text>微信支付</text><text v-if="payMethod==='wechat'" class="check">✓</text>
        </view>
        <view class="method-item" :class="{active: payMethod==='alipay'}" @click="payMethod='alipay'">
          <text>💙</text><text>支付宝</text><text v-if="payMethod==='alipay'" class="check">✓</text>
        </view>
      </view>

      <van-button type="primary" block round class="submit-btn" @click="doRecharge" :loading="loading">确认充值</van-button>
    </template>

    <!-- 充值引导页：待转账状态 -->
    <template v-if="showGuide">
      <view class="guide-card">
        <view class="guide-title">📋 充值收款账户</view>

        <view class="info-row">
          <text class="info-key">户名</text>
          <text class="info-val">拉卡拉支付股份有限公司</text>
        </view>
        <view class="info-row">
          <text class="info-key">账号</text>
          <text class="info-val">{{ rechargeInfo.accountNo || '***1234' }}</text>
        </view>
        <view class="info-row">
          <text class="info-key">开户行</text>
          <text class="info-val">招商银行北京分行营业部</text>
        </view>
        <view class="info-row">
          <text class="info-key">充值金额</text>
          <text class="info-val amount-highlight">¥{{ rechargeInfo.amount }}</text>
        </view>

        <view class="order-section">
          <view class="order-label">充值订单号</view>
          <view class="order-no">{{ rechargeInfo.orderNo }}</view>
          <van-button size="small" plain type="primary" @click="copyOrderNo" style="margin-top:8px;">📋 复制订单号</van-button>
        </view>

        <view class="expire-row">
          <text class="info-key">有效期至</text>
          <text class="info-val">{{ rechargeInfo.expireTime }}</text>
        </view>

        <view class="warning-box">
          ⚠️ 请使用 <text class="warn-strong">同名账户</text> 转账，转账时务必在备注中填写 <text class="warn-strong">充值订单号</text>
        </view>
      </view>

      <view class="notice-card">
        <view class="notice-item">💡 转账完成后，充值金额将在 <text class="warn-strong">1-2个工作日</text> 内到账</view>
        <view class="notice-item">💡 请确保转账金额与充值订单金额一致，否则无法自动到账</view>
        <view class="notice-item">💡 到账后会有短信通知</view>
      </view>

      <!-- 充值状态 -->
      <view class="status-card">
        <view class="status-row">
          <text>充值状态：</text>
          <van-tag v-if="rechargeStatus === 'pending'" type="warning">⏳ 转账中...</van-tag>
          <van-tag v-else-if="rechargeStatus === 'success'" type="success">✅ 已到账</van-tag>
          <van-tag v-else-if="rechargeStatus === 'failed'" type="danger">❌ 失败</van-tag>
          <van-tag v-else type="info">📝 待转账</van-tag>
        </view>
        <van-button v-if="rechargeStatus === 'success'" type="primary" block round @click="handleBack" style="margin-top:12px;">
          返回充值页
        </van-button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()
const amount = ref(500)
const payMethod = ref('balance')
const loading = ref(false)

// 充值引导页状态
const showGuide = ref(false)
const rechargeInfo = reactive({
  orderNo: '',
  accountNo: '',
  amount: '',
  expireTime: '',
})
const rechargeStatus = ref('idle')
let pollTimer = null

const goBack = () => {
  if (showGuide.value) {
    showGuide.value = false
  } else {
    uni.navigateBack()
  }
}

// 复制订单号
const copyOrderNo = () => {
  uni.setClipboardData({
    data: rechargeInfo.orderNo,
    success: () => {
      uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '复制失败', icon: 'none' })
    }
  })
}

// 停止轮询
const stopPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 轮询充值状态
const startPoll = (orderNo) => {
  stopPoll()
  pollTimer = setInterval(async () => {
    try {
      const res = await uni.request({
        url: `https://bgualqb.cn/api/qzt/recharge/status`,
        method: 'POST',
        data: { order_no: orderNo }
      })
      const data = res.data
      if (data.code === 0 && data.data) {
        const status = data.data.status || data.data.recharge_state
        if (status === 'SUCCESS' || status === 'success' || status === 'recharged') {
          rechargeStatus.value = 'success'
          uni.showToast({ title: '充值已到账！', icon: 'success' })
          stopPoll()
        } else if (status === 'FAILED' || status === 'failed') {
          rechargeStatus.value = 'failed'
          stopPoll()
        } else {
          rechargeStatus.value = 'pending'
        }
      }
    } catch (e) {
      console.warn('[Recharge Poll Error]', e)
    }
  }, 10000)
}

// 发起充值
const doRecharge = async () => {
  if (!amount.value || amount.value <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' }); return
  }

  loading.value = true
  try {
    const res = await uni.request({
      url: `https://bgualqb.cn/api/qzt/recharge/pre-order`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { amount: amount.value, account_type: 'lakala' }
    })

    const data = res.data
    if (data.code === 0 && data.data) {
      Object.assign(rechargeInfo, {
        orderNo: data.data.order_no || `CZ${Date.now()}`,
        accountNo: data.data.account_no || '***1234',
        amount: amount.value,
        expireTime: data.data.expire_time || new Date(Date.now() + 24 * 3600 * 1000).toLocaleString(),
      })
    } else {
      // BFF 未上线，降级 Mock
      console.warn('[Recharge] BFF not available, mock fallback')
      Object.assign(rechargeInfo, {
        orderNo: `CZ${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.random().toString().slice(2,8)}`,
        accountNo: '***1234',
        amount: amount.value,
        expireTime: new Date(Date.now() + 24 * 3600 * 1000).toLocaleString(),
      })
    }

    rechargeStatus.value = 'idle'
    showGuide.value = true
    startPoll(rechargeInfo.orderNo)

  } catch (e) {
    console.warn('[Recharge] API error, using mock:', e)
    // 降级 Mock
    Object.assign(rechargeInfo, {
      orderNo: `CZ${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.random().toString().slice(2,8)}`,
      accountNo: '***1234',
      amount: amount.value,
      expireTime: new Date(Date.now() + 24 * 3600 * 1000).toLocaleString(),
    })
    rechargeStatus.value = 'idle'
    showGuide.value = true
  } finally {
    loading.value = false
  }
}

// 返回
const handleBack = () => {
  showGuide.value = false
  rechargeStatus.value = 'idle'
  amount.value = 500
  stopPoll()
}

onBeforeUnmount(() => {
  stopPoll()
})
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.balance-hint { text-align: center; color: #888; font-size: 13px; padding: 12px; }
.amount-card { margin: 16px; padding: 20px; background: #fff; border-radius: $border-radius-lg; box-shadow: $shadow-md; }
.amount-label { font-size: 13px; color: #888; margin-bottom: 8px; }
.amount-input-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.yuan { font-size: 28px; font-weight: bold; color: #333; }
.amount-input { font-size: 28px; font-weight: bold; color: #333; border: none; outline: none; flex: 1; }
.quick-amounts { display: flex; gap: 10px; }
.quick-btn { flex: 1; padding: 8px 0; text-align: center; border-radius: 20px; border: 1px solid #eee; font-size: 14px; color: #666; }
.quick-btn.active { background: $primary-color; color: #fff; border-color: $primary-color; }
.pay-methods { margin: 0 16px; }
.method-title { font-size: 14px; color: #888; margin-bottom: 10px; }
.method-item { display: flex; align-items: center; gap: 10px; padding: 14px; background: #fff; border-radius: $border-radius-md; margin-bottom: 8px; cursor: pointer; }
.method-item.active { border: 1px solid $primary-color; }
.check { margin-left: auto; color: $primary-color; font-size: 16px; }
.submit-btn { margin: 20px 16px; }

/* 引导页样式 */
.guide-card {
  margin: 16px; padding: 20px;
  background: #fff; border-radius: $border-radius-lg;
  box-shadow: $shadow-md;
}
.guide-title { font-size: 16px; font-weight: 700; color: #333; margin-bottom: 16px; }
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid #f5f5f5;
}
.info-key { font-size: 13px; color: #888; }
.info-val { font-size: 14px; color: #333; font-weight: 500; }
.amount-highlight { color: $primary-color; font-size: 16px; }
.warn-strong { color: #d4380d; font-weight: 600; }

.order-section {
  margin: 16px 0; padding: 14px;
  background: #f0f9ff; border-radius: 8px;
  border: 1px solid #d0e8ff;
}
.order-label { font-size: 12px; color: #888; margin-bottom: 6px; }
.order-no { font-size: 15px; color: #1890ff; font-weight: 700; letter-spacing: 1px; word-break: break-all; }

.expire-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0;
}

.warning-box {
  margin-top: 12px;
  padding: 12px 14px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  font-size: 13px;
  color: #7d5a00;
  line-height: 1.7;
}

.notice-card {
  margin: 0 16px 16px;
  padding: 14px 16px;
  background: #f8f9fa;
  border-radius: $border-radius-md;
}
.notice-item { font-size: 13px; color: #666; line-height: 2; }

.status-card {
  margin: 0 16px;
  padding: 14px 16px;
  background: #fff;
  border-radius: $border-radius-md;
  box-shadow: $shadow-sm;
}
.status-row { display: flex; align-items: center; gap: 10px; font-size: 14px; }
</style>

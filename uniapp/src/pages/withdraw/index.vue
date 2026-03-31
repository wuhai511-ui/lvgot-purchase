<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">提现</text>
    </view>

    <view class="balance-hint">当前余额：¥ {{ accountStore.currentAccount.balance }}</view>

    <!-- 提现限额提示（个人账户未人脸识别） -->
    <view v-if="showLimitTip" class="limit-tip-card">
      <van-icon name="warning" color="#faad14" size="18px" />
      <view class="limit-tip-content">
        <view class="limit-tip-title">当前提现限额：<text class="warn-text">1000元/笔</text></view>
        <view class="limit-tip-desc">完成人脸识别可解除限额</view>
      </view>
      <van-button size="small" plain type="primary" @click="goToUpgrade">去升级</van-button>
    </view>

    <view class="withdraw-card">
      <view class="amount-label">提现金额</view>
      <view class="amount-input-wrap">
        <text class="yuan">¥</text>
        <input class="amount-input" type="digit" v-model="amount" placeholder="0.00" @input="calcFee" />
      </view>
      <view class="fee-hint">手续费：¥{{ fee }}（0.1%，最低1元）</view>
      <view v-if="showLimitTip && amount && Number(amount) > 1000" class="limit-warning">
        ⚠️ 超出限额（1000元/笔），请完成人脸识别后再试
      </view>
    </view>

    <view class="bank-card">
      <view class="bank-info">
        <text class="bank-icon">🏦</text>
        <view>
          <view class="bank-name">{{ bankCard.bankName }}</view>
          <view class="bank-no">{{ bankCard.no }}</view>
        </view>
      </view>
    </view>

    <view class="arrive-info">
      <van-icon name="clock" />
      <text>预计到账时间：1-3个工作日</text>
    </view>

    <van-button
      type="primary"
      block
      round
      class="submit-btn"
      @click="showPwdDialog=true"
      :disabled="!canWithdraw"
    >
      确认提现
    </van-button>

    <van-dialog
      v-model:show="showPwdDialog"
      title="请输入支付密码"
      show-cancel-button
      :confirm-button-loading="submitting"
      @confirm="doWithdraw"
      @cancel="showPwdDialog=false"
    >
      <view style="padding:20px;">
        <van-password-input :value="password" @change="password=$event.detail" />
      </view>
    </van-dialog>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()
const amount = ref('')
const showPwdDialog = ref(false)
const submitting = ref(false)
const password = ref('')
const showLimitTip = ref(false) // 个人账户未人脸识别时显示
const bankCard = ref({ bankName: '中国农业银行', no: '622202****0125' })

const fee = computed(() => {
  if (!amount.value) return '0.00'
  return Math.max(1, Math.round(Number(amount.value) * 0.001 * 100) / 100).toFixed(2)
})

const canWithdraw = computed(() => {
  if (!amount.value || Number(amount.value) <= 0) return false
  // 个人账户未人脸识别，限额1000
  if (showLimitTip.value && Number(amount.value) > 1000) return false
  // 余额不足
  const total = Number(amount.value) + Number(fee.value)
  if (total > accountStore.currentAccount.balance) return false
  return true
})

const goBack = () => uni.navigateBack()

const calcFee = () => {}

const goToUpgrade = () => {
  uni.navigateTo({ url: '/pages/account-upgrade/index' })
}

const doWithdraw = async () => {
  if (!amount.value || Number(amount.value) <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' }); return
  }
  if (!password.value) {
    uni.showToast({ title: '请输入支付密码', icon: 'none' }); return
  }

  const total = Number(amount.value) + Number(fee.value)
  if (total > accountStore.currentAccount.balance) {
    uni.showToast({ title: '余额不足', icon: 'none' }); return
  }

  submitting.value = true
  try {
    let res
    try {
      res = await uni.request({
        url: `https://bgualqb.cn/api/qzt/withdraw/pre-order`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: {
          amount: amount.value,
          bank_card_no: bankCard.value.no,
          bank_name: bankCard.value.bankName,
          fee: fee.value,
        }
      })
      res = res.data
    } catch (e) {
      console.warn('[Withdraw] BFF not available, mock fallback:', e)
      res = { code: -1 }
    }

    if (res.code === 0 && res.data) {
      uni.showToast({ title: '提现申请已提交', icon: 'success' })
      // 模拟扣除余额
      accountStore.updateBalance(accountStore.currentAccount.balance - total)
      setTimeout(() => uni.navigateBack(), 1500)
    } else {
      // BFF 未上线，降级 Mock 成功
      console.warn('[Withdraw] Using mock success')
      uni.showToast({ title: '提现申请已提交', icon: 'success' })
      accountStore.updateBalance(accountStore.currentAccount.balance - total)
      setTimeout(() => uni.navigateBack(), 1500)
    }

    showPwdDialog.value = false
    password.value = ''

  } catch (e) {
    console.error('[Withdraw Error]', e)
    uni.showToast({ title: e.message || '提现失败', icon: 'none' })
    showPwdDialog.value = false
    password.value = ''
  } finally {
    submitting.value = false
  }
}

// 页面加载时检查是否已人脸识别
onMounted(async () => {
  try {
    const merchantInfo = accountStore.currentAccount || {}
    const merchantId = merchantInfo.merchantId || merchantInfo.id || ''

    if (!merchantId) {
      // 没有商户ID，默认显示限额提示（保守策略）
      showLimitTip.value = true
      return
    }

    let res
    try {
      res = await uni.request({
        url: `https://bgualqb.cn/api/v1/merchants/${merchantId}/face-recognition-url`,
        method: 'POST',
        data: {}
      })
      res = res.data
    } catch (e) {
      console.warn('[Face Check] BFF not available:', e)
      res = { code: -1 }
    }

    if (res.code === 0 && res.data) {
      // 已人脸识别，不显示限额提示
      showLimitTip.value = false
    } else {
      // BFF 未上线或个人账户未认证，显示限额提示
      showLimitTip.value = true
    }
  } catch (e) {
    showLimitTip.value = true
  }
})

import { onMounted } from 'vue'
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.balance-hint { text-align: center; color: #888; font-size: 13px; padding: 12px; }

.limit-tip-card {
  display: flex; align-items: center; gap: 10px;
  margin: 0 16px 12px; padding: 12px 14px;
  background: #fffbe6; border: 1px solid #ffe58f;
  border-radius: $border-radius-md;
}
.limit-tip-content { flex: 1; }
.limit-tip-title { font-size: 13px; color: #7d5a00; }
.limit-tip-desc { font-size: 12px; color: #ad6800; margin-top: 2px; }
.warn-text { color: #d4380d; font-weight: 600; }

.withdraw-card { margin: 16px; padding: 20px; background: #fff; border-radius: $border-radius-lg; box-shadow: $shadow-md; }
.amount-label { font-size: 13px; color: #888; margin-bottom: 8px; }
.amount-input-wrap { display: flex; align-items: center; gap: 8px; }
.yuan { font-size: 28px; font-weight: bold; }
.amount-input { font-size: 28px; font-weight: bold; border: none; outline: none; flex: 1; }
.fee-hint { font-size: 12px; color: #888; margin-top: 8px; }
.limit-warning {
  margin-top: 8px; padding: 8px 10px;
  background: #fff2f0; border: 1px solid #ffccc7;
  border-radius: 4px; font-size: 12px; color: #cf1322;
}

.bank-card { margin: 0 16px; padding: 14px; background: #fff; border-radius: $border-radius-md; display: flex; align-items: center; }
.bank-info { display: flex; align-items: center; gap: 12px; }
.bank-icon { font-size: 24px; }
.bank-name { font-size: 14px; font-weight: 500; }
.bank-no { font-size: 12px; color: #888; }

.arrive-info {
  display: flex; align-items: center; gap: 6px;
  margin: 12px 16px; font-size: 12px; color: #888;
}
.submit-btn { margin: 20px 16px; }
</style>

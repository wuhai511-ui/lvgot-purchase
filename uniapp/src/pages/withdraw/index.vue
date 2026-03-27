<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">提现</text>
    </view>

    <view class="balance-hint">当前余额：¥ {{ accountStore.currentAccount.balance }}</view>

    <view class="withdraw-card">
      <view class="amount-label">提现金额</view>
      <view class="amount-input-wrap">
        <text class="yuan">¥</text>
        <input class="amount-input" type="digit" v-model="amount" placeholder="0.00" @input="calcFee" />
      </view>
      <view class="fee-hint">手续费：¥{{ fee }}（0.1%）</view>
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

    <van-button type="primary" block round class="submit-btn" @click="showPwdDialog=true">确认提现</van-button>

    <van-dialog v-model:show="showPwdDialog" title="请输入支付密码" show-cancel-button @confirm="doWithdraw" @cancel="showPwdDialog=false">
      <van-password-input :value="password" @change="password=$event.detail" />
    </van-dialog>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAccountStore } from '@/store/account'
const accountStore = useAccountStore()
const amount = ref('')
const showPwdDialog = ref(false)
const password = ref('')
const bankCard = ref({ bankName: '中国农业银行', no: '622202****0125' })
const fee = computed(() => amount.value ? Math.max(1, Math.round(amount.value * 0.001 * 100) / 100).toFixed(2) : '0.00')
const goBack = () => uni.navigateBack()
const calcFee = () => {}
const doWithdraw = () => {
  if (!amount.value || amount.value <= 0) { uni.showToast({ title: '请输入金额', icon: 'none' }); return }
  uni.showToast({ title: '提现成功', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 1000)
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.balance-hint { text-align: center; color: #888; font-size: 13px; padding: 12px; }
.withdraw-card { margin: 16px; padding: 20px; background: #fff; border-radius: $border-radius-lg; box-shadow: $shadow-md; }
.amount-label { font-size: 13px; color: #888; margin-bottom: 8px; }
.amount-input-wrap { display: flex; align-items: center; gap: 8px; }
.yuan { font-size: 28px; font-weight: bold; }
.amount-input { font-size: 28px; font-weight: bold; border: none; outline: none; flex: 1; }
.fee-hint { font-size: 12px; color: #888; margin-top: 8px; }
.bank-card { margin: 0 16px; padding: 14px; background: #fff; border-radius: $border-radius-md; display: flex; align-items: center; }
.bank-info { display: flex; align-items: center; gap: 12px; }
.bank-icon { font-size: 24px; }
.bank-name { font-size: 14px; font-weight: 500; }
.bank-no { font-size: 12px; color: #888; }
.submit-btn { margin: 20px 16px; }
</style>

<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">充值</text>
    </view>

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
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useAccountStore } from '@/store/account'
const accountStore = useAccountStore()
const amount = ref(500)
const payMethod = ref('balance')
const loading = ref(false)
const goBack = () => uni.navigateBack()
const doRecharge = () => {
  if (!amount.value || amount.value <= 0) { uni.showToast({ title: '请输入金额', icon: 'none' }); return }
  loading.value = true
  setTimeout(() => {
    loading.value = false
    uni.showToast({ title: '充值成功', icon: 'success' })
    accountStore.updateBalance(accountStore.currentAccount.balance + Number(amount.value))
    setTimeout(() => uni.navigateBack(), 1000)
  }, 1200)
}
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
</style>

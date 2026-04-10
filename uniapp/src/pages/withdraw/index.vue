<template>
  <view class="page-container withdraw-page">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">提现</text>
    </view>

    <view class="section-card top-card">
      <view class="top-card__label">当前可提现</view>
      <view class="top-card__amount">¥{{ availableBalance }}</view>
      <view class="top-card__meta">到账银行卡：{{ bankCard.bankName }} {{ bankCard.no }}</view>
    </view>

    <view v-if="showLimitTip" class="section-card limit-card">
      <view>
        <view class="section-title">认证后可提更高额度</view>
        <view class="section-desc">当前单笔提现限制为 1000 元，完成升级认证后即可解除限制。</view>
      </view>
      <van-button type="primary" plain round size="small" @click="goToUpgrade">去升级</van-button>
    </view>

    <view class="section-card form-card">
      <view class="section-title">填写提现金额</view>
      <view class="amount-wrap">
        <text class="amount-unit">¥</text>
        <input class="amount-input" type="digit" v-model="amount" placeholder="0.00" />
      </view>
      <view class="preset-list">
        <view v-for="preset in presets" :key="preset" class="preset-item" @click="applyPreset(preset)">¥{{ preset }}</view>
      </view>
      <view class="settlement-box">
        <view class="settlement-line"><text>手续费参考</text><text>¥{{ fee }}</text></view>
        <view class="settlement-line"><text>预计到账</text><text>¥{{ netAmount }}</text></view>
        <view class="settlement-line"><text>到账时效</text><text>预计 T+1</text></view>
      </view>
      <view v-if="showLimitTip && Number(amount) > 1000" class="warning-box">当前金额超过认证前单笔限制，请先完成升级认证。</view>
    </view>

    <view class="section-card tips-card">
      <view class="section-title">提现说明</view>
      <view class="tip-item">1. 只有已到账资金才会进入可提现余额。</view>
      <view class="tip-item">2. 提现发起后，建议在资金记录页查看处理进度。</view>
      <view class="tip-item">3. 若到账银行卡异常，请先在银行卡页面更新信息。</view>
    </view>

    <view class="submit-area">
      <van-button type="primary" block round class="submit-btn" :disabled="!canWithdraw" @click="showPwdDialog = true">确认提现</van-button>
    </view>

    <van-dialog v-model:show="showPwdDialog" title="输入支付密码" show-cancel-button :confirm-button-loading="submitting" @confirm="doWithdraw" @cancel="showPwdDialog = false">
      <view style="padding: 20px">
        <van-password-input :value="password" @change="password = $event.detail" />
      </view>
    </van-dialog>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()
const amount = ref('')
const showPwdDialog = ref(false)
const submitting = ref(false)
const password = ref('')
const showLimitTip = ref(false)
const bankCard = ref({ bankName: '中国农业银行', no: '622202****0125' })
const presets = [200, 500, 1000, 2000]

const availableBalance = computed(() => Number(accountStore.currentAccount.balance || 0).toFixed(2))
const fee = computed(() => !amount.value ? '0.00' : Math.max(1, Number(amount.value) * 0.001).toFixed(2))
const netAmount = computed(() => !amount.value ? '0.00' : Math.max(Number(amount.value) - Number(fee.value), 0).toFixed(2))
const canWithdraw = computed(() => {
  if (!amount.value || Number(amount.value) <= 0) return false
  if (showLimitTip.value && Number(amount.value) > 1000) return false
  return Number(amount.value) + Number(fee.value) <= Number(accountStore.currentAccount.balance || 0)
})

const applyPreset = (preset) => { amount.value = String(preset) }
const goBack = () => uni.navigateBack()
const goToUpgrade = () => uni.navigateTo({ url: '/pages/account-upgrade/index' })

const doWithdraw = async () => {
  if (!amount.value || Number(amount.value) <= 0) { uni.showToast({ title: '请输入提现金额', icon: 'none' }); return }
  if (!password.value) { uni.showToast({ title: '请输入支付密码', icon: 'none' }); return }
  if (Number(amount.value) + Number(fee.value) > Number(accountStore.currentAccount.balance || 0)) { uni.showToast({ title: '余额不足', icon: 'none' }); return }

  submitting.value = true
  try {
    uni.showToast({ title: '提现申请已提交', icon: 'success' })
    accountStore.updateBalance(Number(accountStore.currentAccount.balance || 0) - Number(amount.value) - Number(fee.value))
    showPwdDialog.value = false
    password.value = ''
    setTimeout(() => uni.navigateBack(), 1200)
  } catch (error) {
    uni.showToast({ title: error.message || '提现失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  showLimitTip.value = accountStore.currentAccount.status !== 'VALID'
})
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.withdraw-page { padding-bottom: 30px; }
.top-card { margin-top: 8px; background: $brand-gradient; color: #fff; box-shadow: $shadow-lg; }
.top-card__label { font-size: 12px; opacity: 0.84; }
.top-card__amount { margin-top: 8px; font-size: 36px; font-weight: 700; }
.top-card__meta { margin-top: 8px; font-size: 12px; opacity: 0.78; }
.limit-card { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.amount-wrap { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
.amount-unit { font-size: 26px; font-weight: 700; color: $brand-strong; }
.amount-input { flex: 1; font-size: 34px; font-weight: 700; color: $text-color; border: none; outline: none; background: transparent; }
.preset-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
.preset-item { text-align: center; padding: 10px 0; border-radius: 999px; background: $brand-mist; color: $brand-strong; font-size: 13px; }
.settlement-box { margin-top: 18px; padding: 16px; border-radius: $border-radius-md; background: linear-gradient(180deg, #ffffff 0%, #f7fbf9 100%); border: 1px solid $border-color; }
.settlement-line { display: flex; justify-content: space-between; font-size: 13px; color: $text-secondary; padding: 6px 0; }
.warning-box { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: rgba(221,107,32,0.12); color: $warning-color; font-size: 12px; }
.tip-item { margin-top: 10px; font-size: 13px; line-height: 1.7; color: $text-secondary; }
.submit-area { padding: 0 16px; }
.submit-btn { margin-top: 4px; }
@media (max-width: 360px) { .preset-list { grid-template-columns: repeat(2, 1fr); } }
</style>

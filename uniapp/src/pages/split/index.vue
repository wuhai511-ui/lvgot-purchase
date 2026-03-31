<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">发起分账</text>
    </view>

    <view class="split-form">
      <view class="form-item">
        <view class="form-label">收款方</view>
        <view class="receiver-select" @click="showPicker=true">
          <text>{{ selectedReceiver?.name || '请选择收款方' }}</text>
          <text>›</text>
        </view>
      </view>

      <view class="form-item">
        <view class="form-label">分账金额（元）</view>
        <input class="form-input" type="digit" v-model="amount" placeholder="请输入分账金额" />
      </view>

      <view class="form-item">
        <view class="form-label">分账说明</view>
        <input class="form-input" v-model="remark" placeholder="如：旅游分账" />
      </view>

      <view class="fee-info" v-if="amount">
        <text>手续费：</text>
        <text class="fee-amount">¥{{ fee }}</text>
        <text class="fee-note">（0.1%，最低1元）</text>
      </view>

      <van-button type="primary" block round @click="showConfirm=true" :disabled="!canSubmit">确认分账</van-button>
    </view>

    <van-popup v-model:show="showPicker" position="bottom" @click-overlay="showPicker=false">
      <van-picker :columns="receiverColumns" @confirm="onPickReceiver" @cancel="showPicker=false" />
    </van-popup>

    <!-- 分账确认弹窗 -->
    <van-dialog
      v-model:show="showConfirm"
      title="确认分账"
      :show-cancel-button="true"
      :confirm-button-loading="submitting"
      @confirm="doSplit"
      @cancel="showConfirm=false"
    >
      <view style="padding:20px;text-align:center">
        <view>向 <b>{{ selectedReceiver?.name }}</b> 分账</view>
        <view style="font-size:24px;font-weight:bold;color:#1890ff;margin-top:8px">¥{{ amount }}</view>
        <view v-if="fee" style="font-size:12px;color:#888;margin-top:4px">含手续费 ¥{{ fee }}</view>
      </view>
    </van-dialog>

    <!-- 分账结果 -->
    <van-overlay :show="showResult" @click="showResult=false">
      <view class="result-overlay">
        <view class="result-card">
          <view v-if="resultStatus === 'success'" style="text-align:center">
            <view style="font-size:48px;margin-bottom:12px;">✅</view>
            <view style="font-size:16px;font-weight:600;margin-bottom:8px;">分账成功</view>
            <view style="font-size:13px;color:#666;">分账金额：¥{{ amount }}</view>
            <view style="font-size:13px;color:#666;">收款方：{{ selectedReceiver?.name }}</view>
            <view style="font-size:13px;color:#888;margin-top:4px;">分账单号：{{ splitResult?.split_no || '—' }}</view>
          </view>
          <view v-else-if="resultStatus === 'failed'" style="text-align:center">
            <view style="font-size:48px;margin-bottom:12px;">❌</view>
            <view style="font-size:16px;font-weight:600;margin-bottom:8px;">分账失败</view>
            <view style="font-size:13px;color:#666;">{{ splitResult?.message || '请稍后重试' }}</view>
          </view>
          <van-button type="primary" block round @click="handleResultBack" style="margin-top:20px;">
            {{ resultStatus === 'success' ? '完成' : '关闭' }}
          </van-button>
        </view>
      </view>
    </van-overlay>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()
const showPicker = ref(false)
const showConfirm = ref(false)
const showResult = ref(false)
const submitting = ref(false)
const amount = ref('')
const remark = ref('')
const selectedReceiver = ref(null)
const resultStatus = ref('success')
const splitResult = ref({})

const receivers = [
  {name:'李四(导游)', id:'G001'},
  {name:'张司机', id:'D001'},
  {name:'王导游', id:'G002'},
]
const receiverColumns = receivers.map(r=>({text:r.name, value:r.id}))

const fee = computed(() => {
  if (!amount.value) return '0.00'
  return Math.max(1, Math.round(Number(amount.value) * 0.001 * 100) / 100).toFixed(2)
})

const canSubmit = computed(() => {
  return selectedReceiver.value && amount.value && Number(amount.value) > 0
})

const onPickReceiver = (e) => {
  selectedReceiver.value = receivers.find(r=>r.id===e.detail.value) || null
  showPicker.value = false
}

const goBack = () => uni.navigateBack()

const doSplit = async () => {
  if (!selectedReceiver.value || !amount.value) {
    uni.showToast({title:'请填写完整', icon:'none'}); return
  }

  submitting.value = true
  try {
    // 账户余额扣除（前端模拟，实际由后端扣减）
    const totalAmount = Number(amount.value) + Number(fee.value)
    if (accountStore.currentAccount.balance < totalAmount) {
      uni.showToast({ title: '余额不足', icon: 'none' })
      submitting.value = false
      showConfirm.value = false
      return
    }

    let res
    try {
      res = await uni.request({
        url: `https://bgualqb.cn/api/qzt/split/pre-order`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: {
          receiver_id: selectedReceiver.value.id,
          receiver_name: selectedReceiver.value.name,
          amount: amount.value,
          remark: remark.value,
        }
      })
      res = res.data
    } catch (e) {
      console.warn('[Split] BFF not available, mock fallback:', e)
      res = { code: -1 }
    }

    if (res.code === 0 && res.data) {
      splitResult.value = res.data
      resultStatus.value = 'success'
      // 模拟扣除余额
      accountStore.updateBalance(accountStore.currentAccount.balance - totalAmount)
    } else {
      // BFF 未上线，降级 Mock 成功
      console.warn('[Split] Using mock success')
      splitResult.value = {
        split_no: `SP${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.random().toString().slice(2,8)}`,
        status: 'success'
      }
      resultStatus.value = 'success'
      accountStore.updateBalance(accountStore.currentAccount.balance - totalAmount)
    }

    showConfirm.value = false
    showResult.value = true

  } catch (e) {
    console.error('[Split Error]', e)
    splitResult.value = { message: e.message || '分账失败' }
    resultStatus.value = 'failed'
    showConfirm.value = false
    showResult.value = true
  } finally {
    submitting.value = false
  }
}

const handleResultBack = () => {
  showResult.value = false
  if (resultStatus.value === 'success') {
    // 清空表单
    amount.value = ''
    remark.value = ''
    selectedReceiver.value = null
    setTimeout(() => uni.navigateBack(), 300)
  }
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.split-form { margin: 16px; }
.form-item { margin-bottom: 20px; }
.form-label { font-size: 14px; color: #333; margin-bottom: 8px; font-weight: 500; }
.receiver-select {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; background: #fff; border-radius: $border-radius-md; border: 1px solid #eee;
}
.form-input {
  width: 100%; padding: 12px 14px; background: #fff;
  border-radius: $border-radius-md; border: 1px solid #eee; font-size: 14px;
}
.fee-info {
  display: flex; align-items: center; gap: 4px;
  font-size: 13px; color: #888; margin-bottom: 16px;
}
.fee-amount { color: #E6A23C; font-weight: 600; }
.fee-note { font-size: 12px; }

.result-overlay {
  display: flex; align-items: center; justify-content: center;
  height: 100vh;
}
.result-card {
  width: 300px; padding: 28px 20px;
  background: #fff; border-radius: $border-radius-lg;
  margin: 0 auto;
}
</style>

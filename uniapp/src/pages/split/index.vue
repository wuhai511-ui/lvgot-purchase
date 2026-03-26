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

      <van-button type="primary" block round @click="showConfirm=true">确认分账</van-button>
    </view>

    <van-popup show="{{ showPicker }}" position="bottom" @click-overlay="showPicker=false">
      <van-picker :columns="receiverColumns" @confirm="onPickReceiver" @cancel="showPicker=false" />
    </van-popup>

    <van-dialog show="{{ showConfirm }}" title="确认分账" @confirm="doSplit" @cancel="showConfirm=false">
      <view style="padding:20px;text-align:center">
        <view>向 <b>{{ selectedReceiver?.name }}</b> 分账</view>
        <view style="font-size:24px;font-weight:bold;color:$primary-color;margin-top:8px">¥{{ amount }}</view>
      </view>
    </van-dialog>
  </view>
</template>

<script setup>
import { ref } from 'vue'
const showPicker = ref(false)
const showConfirm = ref(false)
const amount = ref('')
const remark = ref('')
const selectedReceiver = ref(null)
const receivers = [
  {name:'李四(导游)', id:'G001'},
  {name:'张司机', id:'D001'},
  {name:'王导游', id:'G002'},
]
const receiverColumns = receivers.map(r=>({text:r.name, value:r.id}))
const onPickReceiver = (e) => { selectedReceiver.value = receivers.find(r=>r.id===e.detail.value) || null; showPicker.value=false }
const goBack = () => uni.navigateBack()
const doSplit = () => {
  if(!selectedReceiver.value || !amount.value) { uni.showToast({title:'请填写完整',icon:'none'}); return }
  uni.showToast({title:'分账成功',icon:'success'})
  setTimeout(()=>uni.navigateBack(), 1000)
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.split-form { margin:16px; }
.form-item { margin-bottom:20px; }
.form-label { font-size:14px; color:#333; margin-bottom:8px; font-weight:500; }
.receiver-select { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:#fff; border-radius:$border-radius-md; border:1px solid #eee; }
.form-input { width:100%; padding:12px 14px; background:#fff; border-radius:$border-radius-md; border:1px solid #eee; font-size:14px; }
</style>

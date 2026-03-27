<template>
  <view class="page-container">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">商户开户</text>
    </view>

    <!-- 开户进度 -->
    <view class="progress-bar">
      <view class="step" :class="{active: step>=1, done: step>1}">
        <view class="step-dot">1</view>
        <text class="step-label">填资料</text>
      </view>
      <view class="step-line" :class="{done: step>1}"></view>
      <view class="step" :class="{active: step>=2, done: step>2}">
        <view class="step-dot">2</view>
        <text class="step-label">银行户开户</text>
      </view>
      <view class="step-line" :class="{done: step>2}"></view>
      <view class="step" :class="{active: step>=3, done: step>3}">
        <view class="step-dot">3</view>
        <text class="step-label">支付账户开户</text>
      </view>
    </view>

    <!-- 开户状态提示 -->
    <view v-if="openStatus.text" class="status-tip" :class="openStatus.type">
      <text>{{ openStatus.text }}</text>
    </view>

    <!-- Step 1: 填写企业资料 -->
    <view v-show="step === 1" class="form-card">
      <view class="card-title">企业基本信息</view>
      <van-field v-model="form.register_name" label="企业名称" placeholder="请输入企业全称" required />
      <van-field v-model="form.short_name" label="企业简称" placeholder="请输入企业简称" />
      <van-field v-model="form.legal_name" label="法人姓名" placeholder="请输入法人姓名" required />
      <van-field v-model="form.legal_id" label="法人身份证号" placeholder="请输入18位身份证号" required />
      <van-field v-model="form.legal_mobile" label="法人手机号" type="tel" placeholder="请输入手机号" required />

      <view class="card-title" style="margin-top:16px">营业执照信息</view>
      <van-field v-model="form.business_license" label="统一社会信用代码" placeholder="18位统一社会信用代码" required />
      <van-field v-model="form.business_license_name" label="营业执照名称" placeholder="同企业名称" />
      <van-field v-model="form.address" label="企业地址" placeholder="请输入详细地址" />

      <view class="card-title" style="margin-top:16px">经办人信息</view>
      <van-field v-model="form.operator_name" label="经办人姓名" placeholder="请输入经办人姓名" />
      <van-field v-model="form.operator_id" label="经办人身份证号" placeholder="请输入18位身份证号" />
      <van-field v-model="form.operator_mobile" label="经办人手机号" type="tel" placeholder="请输入手机号" />

      <van-button type="primary" block round :loading="loading" @click="submitBasicInfo">
        下一步：开通银行户
      </van-button>
    </view>

    <!-- Step 2: 银行开户中 -->
    <view v-show="step === 2" class="form-card" style="text-align:center;padding:40px 16px;">
      <van-loading type="spinner" size="48px" style="margin:0 auto 16px;" />
      <view style="font-size:16px;font-weight:600;margin-bottom:8px;">银行户开户中...</view>
      <view style="font-size:13px;color:#999;">请在新页面完成信息填写和签约</view>
      <van-button type="primary" block round style="margin-top:24px" @click="checkBankStatus" :loading="polling">
        我已完成开户，查看结果
      </van-button>
      <van-button plain block round style="margin-top:12px" @click="retryBank">
        重新获取开户页面
      </van-button>
    </view>

    <!-- Step 3: 支付账户开户 -->
    <view v-show="step === 3" class="form-card" style="text-align:center;padding:40px 16px;">
      <van-loading type="spinner" size="48px" style="margin:0 auto 16px;" />
      <view style="font-size:16px;font-weight:600;margin-bottom:8px;">支付账户开户中...</view>
      <view style="font-size:13px;color:#999;">请在新页面完成信息填写</view>
      <van-button type="primary" block round style="margin-top:24px" @click="checkPayAccountStatus" :loading="polling">
        我已完成开户，查看结果
      </van-button>
      <van-button plain block round style="margin-top:12px" @click="retryPayAccount">
        重新获取开户页面
      </van-button>
    </view>

    <!-- Step 4: 完成 -->
    <view v-show="step === 4" class="form-card" style="text-align:center;padding:40px 16px;">
      <view style="font-size:48px;margin-bottom:16px;">🎉</view>
      <view style="font-size:18px;font-weight:600;margin-bottom:8px;">开户完成！</view>
      <view style="font-size:13px;color:#666;margin-bottom:24px;">
        商户ID：{{ accountStore.qztAccount.merchantId }}<br/>
        银行户：{{ accountStore.qztAccount.bankAccountNo || '开户中' }}<br/>
        支付账户：{{ accountStore.qztAccount.accountNo || '开户中' }}
      </view>
      <van-button type="primary" block round @click="goBack">返回首页</van-button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAccountStore } from '@/store/account.js'
import { bankApi, accountApi } from '@/api/qianztong/index.js'

const accountStore = useAccountStore()
const step = ref(1)
const loading = ref(false)
const polling = ref(false)

const openStatus = ref({ type: '', text: '' })

// 生成全局唯一编号
function genOutRequestNo() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 10)
}

const form = reactive({
  register_name: '',
  short_name: '',
  enterprise_type: '1',         // 1=企业，2=个体工商户
  legal_name: '',
  legal_id: '',
  legal_mobile: '',
  business_license: '',
  business_license_name: '',
  address: '',
  operator_name: '',
  operator_id: '',
  operator_mobile: '',
})

// 缓存 out_request_no
let bankOutRequestNo = ''
let payAccountOutRequestNo = ''

const goBack = () => uni.navigateBack()

// ---------- Step 1: 提交资料 ----------
async function submitBasicInfo() {
  // 简单校验
  if (!form.register_name || !form.legal_name || !form.legal_id || !form.legal_mobile) {
    uni.showToast({ title: '请填写必填项', icon: 'none' }); return
  }
  if (!/^\d{17}[\dXx]$/.test(form.legal_id)) {
    uni.showToast({ title: '请输入正确的身份证号', icon: 'none' }); return
  }

  loading.value = true
  try {
    // 第一步：获取银行开户页面
    bankOutRequestNo = genOutRequestNo()
    const bankRes = await bankApi.getOpenPageUrl({
      out_request_no: bankOutRequestNo,
      register_name: form.register_name,
      enterprise_type: form.enterprise_type,
      legal_name: form.legal_name,
      legal_id: form.legal_id,
      legal_mobile: form.legal_mobile,
      address: form.address,
      operator_name: form.operator_name,
      operator_id: form.operator_id,
      operator_mobile: form.operator_mobile,
    })

    // 跳转银行开户页面
    if (bankRes.url) {
      // 保存表单数据到缓存
      uni.setStorageSync('merchantOpenForm', JSON.stringify(form))
      // 打开银行开户 H5 页面
      window.location.href = bankRes.url
      step.value = 2
    } else {
      uni.showToast({ title: '银行开户页面获取失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ---------- Step 2: 重新获取银行开户页面 ----------
async function retryBank() {
  if (!bankOutRequestNo) { bankOutRequestNo = genOutRequestNo() }
  polling.value = true
  try {
    const res = await bankApi.getOpenPageUrl({ out_request_no: bankOutRequestNo, ...form })
    if (res.url) window.location.href = res.url
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' })
  } finally {
    polling.value = false
  }
}

// ---------- Step 2: 查询银行开户结果 ----------
async function checkBankStatus() {
  if (!bankOutRequestNo) { uni.showToast({ title: '请先完成开户', icon: 'none' }); return }
  polling.value = true
  try {
    const res = await bankApi.queryOpenResult({ out_request_no: bankOutRequestNo })
    // merchant_status: OPEN_SUCCESS / OPEN_FAIL / BIND_SUCCESS / BIND_FAIL
    if (res.bank_account_no) {
      accountStore.setQztAccount({ bankAccountNo: res.bank_account_no, bankAccountStatus: res.status || 'OPEN_SUCCESS' })
      // 进入支付账户开户
      await openPayAccount()
    } else if (res.status === 'OPEN_FAIL') {
      openStatus.value = { type: 'error', text: `银行开户失败：${res.fail_reason || '未知原因'}` }
    } else {
      uni.showToast({ title: '银行户尚未开通，请完成页面填写', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '查询失败', icon: 'none' })
  } finally {
    polling.value = false
  }
}

// ---------- Step 3: 开通支付账户 ----------
async function openPayAccount() {
  payAccountOutRequestNo = genOutRequestNo()
  step.value = 3
  polling.value = true
  try {
    const res = await accountApi.getOpenPageUrl({
      out_request_no: payAccountOutRequestNo,
      register_name: form.register_name,
      short_name: form.short_name || form.register_name,
      enterprise_type: form.enterprise_type,
      legal_name: form.legal_name,
      legal_id: form.legal_id,
      legal_mobile: form.legal_mobile,
      business_license: form.business_license,
      business_license_name: form.business_license_name || form.register_name,
      address: form.address,
      operator_name: form.operator_name,
      operator_id: form.operator_id,
      operator_mobile: form.operator_mobile,
    })
    if (res.url) {
      window.location.href = res.url
    } else {
      uni.showToast({ title: '支付账户开户页面获取失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '支付账户开户失败', icon: 'none' })
  } finally {
    polling.value = false
  }
}

// ---------- Step 3: 重新获取支付账户开户页面 ----------
async function retryPayAccount() {
  if (!payAccountOutRequestNo) { payAccountOutRequestNo = genOutRequestNo() }
  polling.value = true
  try {
    const res = await accountApi.getOpenPageUrl({ out_request_no: payAccountOutRequestNo, ...form })
    if (res.url) window.location.href = res.url
  } catch (e) {
    uni.showToast({ title: e.message || '获取失败', icon: 'none' })
  } finally {
    polling.value = false
  }
}

// ---------- Step 3: 查询支付账户开户结果 ----------
async function checkPayAccountStatus() {
  if (!payAccountOutRequestNo) { uni.showToast({ title: '请先完成开户', icon: 'none' }); return }
  polling.value = true
  try {
    const res = await accountApi.queryOpenResult({ out_request_no: payAccountOutRequestNo })
    if (res.merchant_id) {
      accountStore.setQztAccount({
        merchantId: res.merchant_id,
        accountNo: res.account_no || '',
        payAccountStatus: res.status || 'OPEN_SUCCESS',
        openStep: 3,
      })
      step.value = 4
    } else if (res.status === 'OPEN_FAIL') {
      openStatus.value = { type: 'error', text: `支付账户开户失败：${res.fail_reason || '未知原因'}` }
    } else {
      uni.showToast({ title: '支付账户尚未开通，请完成页面填写', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '查询失败', icon: 'none' })
  } finally {
    polling.value = false
  }
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container { min-height: 100vh; background: #f5f5f5; }

.nav-bar {
  display: flex; align-items: center;
  padding: 16px; background: #fff;
  border-bottom: 1px solid #eee;
}
.nav-back { font-size: 20px; margin-right: 12px; }
.nav-title { font-size: 16px; font-weight: 600; }

.progress-bar {
  display: flex; align-items: center; justify-content: center;
  padding: 20px 32px; background: #fff; margin-bottom: 12px;
}
.step { display: flex; flex-direction: column; align-items: center; }
.step-dot {
  width: 24px; height: 24px; border-radius: 50%;
  background: #ddd; color: #fff; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.step.active .step-dot { background: $primary-color; }
.step.done .step-dot { background: #52c41a; }
.step-label { font-size: 11px; color: #999; }
.step.active .step-label { color: $primary-color; font-weight: 600; }
.step-line {
  flex: 1; height: 2px; background: #ddd; margin: 0 8px; margin-bottom: 18px;
}
.step-line.done { background: #52c41a; }

.status-tip {
  margin: 0 16px 12px; padding: 10px 14px; border-radius: 6px; font-size: 13px;
}
.status-tip.error { background: #fff2f0; color: #cf1322; border: 1px solid #ffccc7; }
.status-tip.success { background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }

.form-card {
  margin: 0 16px 16px; padding: 16px;
  background: #fff; border-radius: $border-radius-md;
  box-shadow: $shadow-md;
}
.card-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
</style>

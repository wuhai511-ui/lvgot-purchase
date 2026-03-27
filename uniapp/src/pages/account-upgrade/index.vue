<template>
  <view class="page-container">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">{{ accountType === 'travel' ? '旅行社开户' : '导演开户' }}</text>
    </view>

    <!-- 账户类型切换 -->
    <view class="type-selector">
      <view class="type-item" :class="{active: accountType==='travel'}" @click="accountType='travel'">
        <view class="type-icon">🏢</view>
        <view class="type-name">旅行社</view>
        <view class="type-desc">企业类型</view>
      </view>
      <view class="type-item" :class="{active: accountType==='guide'}" @click="accountType='guide'">
        <view class="type-icon">🎬</view>
        <view class="type-name">导演/个人</view>
        <view class="type-desc">个人类型</view>
      </view>
    </view>

    <!-- 开户进度 -->
    <view v-if="openDone" class="success-card">
      <view class="success-icon">🎉</view>
      <view class="success-title">{{ accountType==='travel'?'旅行社':'个人' }}账户开户完成</view>
      <view class="success-info">
        <text>账户号：{{ accountStore.qztAccount.accountNo || '—' }}</text>
      </view>
      <van-button type="primary" block round @click="goBack">完成</van-button>
    </view>

    <!-- 旅行社表单 -->
    <view v-else-if="accountType==='travel'" class="form-card">
      <view class="card-title">旅行社信息</view>
      <van-field v-model="travelForm.register_name" label="企业名称" placeholder="请输入旅行社全称" required />
      <van-field v-model="travelForm.short_name" label="企业简称" placeholder="请输入简称" />
      <van-field v-model="travelForm.legal_name" label="法人姓名" placeholder="请输入法人姓名" required />
      <van-field v-model="travelForm.legal_id" label="法人身份证号" placeholder="18位身份证号" required />
      <van-field v-model="travelForm.legal_mobile" label="法人手机号" type="tel" placeholder="请输入手机号" required />
      <van-field v-model="travelForm.business_license" label="统一社会信用代码" placeholder="18位信用代码" required />
      <van-field v-model="travelForm.address" label="企业地址" placeholder="请输入详细地址" />
      <van-button type="primary" block round :loading="loading" @click="submitTravel">
        确认开户
      </van-button>
    </view>

    <!-- 导演/个人表单 -->
    <view v-else class="form-card">
      <view class="card-title">个人信息</view>
      <van-field v-model="personalForm.name" label="姓名" placeholder="请输入真实姓名" required />
      <van-field v-model="personalForm.id_no" label="身份证号" placeholder="18位身份证号" required />
      <van-field v-model="personalForm.mobile" label="手机号" type="tel" placeholder="请输入手机号" required />
      <van-button type="primary" block round :loading="loading" @click="submitPersonal">
        确认开户
      </van-button>
    </view>

    <!-- 等待页面 -->
    <view v-if="opening" class="opening-card">
      <van-loading type="spinner" size="40px" />
      <view style="font-size:15px;font-weight:600;margin-top:12px;">开户页面生成中...</view>
      <view style="font-size:13px;color:#999;margin-top:6px;">即将跳转到钱账通开户页面</view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAccountStore } from '@/store/account.js'
import { accountApi } from '@/api/qianztong/index.js'

const accountStore = useAccountStore()
const accountType = ref('travel')   // 'travel' | 'guide'
const loading = ref(false)
const opening = ref(false)
const openDone = ref(false)

function genOutRequestNo() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 10)
}

const travelForm = reactive({
  register_name: '',
  short_name: '',
  legal_name: '',
  legal_id: '',
  legal_mobile: '',
  business_license: '',
  address: '',
})

const personalForm = reactive({
  name: '',
  id_no: '',
  mobile: '',
})

const goBack = () => uni.navigateBack()

// 旅行社开户
async function submitTravel() {
  if (!travelForm.register_name || !travelForm.legal_name || !travelForm.legal_id || !travelForm.legal_mobile) {
    uni.showToast({ title: '请填写必填项', icon: 'none' }); return
  }
  if (!/^\d{17}[\dXx]$/.test(travelForm.legal_id)) {
    uni.showToast({ title: '身份证号格式错误', icon: 'none' }); return
  }

  loading.value = true
  try {
    const outRequestNo = genOutRequestNo()
    const res = await accountApi.getOpenPageUrl({
      out_request_no: outRequestNo,
      register_name: travelForm.register_name,
      short_name: travelForm.short_name || travelForm.register_name,
      enterprise_type: '1',    // 企业
      legal_name: travelForm.legal_name,
      legal_id: travelForm.legal_id,
      legal_mobile: travelForm.legal_mobile,
      business_license: travelForm.business_license,
      business_license_name: travelForm.register_name,
      address: travelForm.address,
    })

    if (res.url) {
      // 缓存 out_request_no 用于后续查结果
      uni.setStorageSync('qztPayAccountOutNo', outRequestNo)
      // 旅行社标记
      uni.setStorageSync('qztAccountType', 'travel')
      window.location.href = res.url
      // 轮询结果
      openDone.value = true
      accountStore.setQztAccount({ merchantId: res.merchant_id, payAccountStatus: 'OPEN_SUCCESS' })
    } else {
      uni.showToast({ title: '获取开户页面失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// 个人开户（导演）
async function submitPersonal() {
  if (!personalForm.name || !personalForm.id_no || !personalForm.mobile) {
    uni.showToast({ title: '请填写必填项', icon: 'none' }); return
  }
  if (!/^\d{17}[\dXx]$/.test(personalForm.id_no)) {
    uni.showToast({ title: '身份证号格式错误', icon: 'none' }); return
  }

  loading.value = true
  try {
    const outRequestNo = genOutRequestNo()
    const res = await accountApi.getOpenPageUrl({
      out_request_no: outRequestNo,
      register_name: personalForm.name,
      short_name: personalForm.name,
      enterprise_type: '3',    // 个人
      legal_name: personalForm.name,
      legal_id: personalForm.id_no,
      legal_mobile: personalForm.mobile,
    })

    if (res.url) {
      uni.setStorageSync('qztPayAccountOutNo', outRequestNo)
      uni.setStorageSync('qztAccountType', 'guide')
      window.location.href = res.url
      openDone.value = true
      accountStore.setQztAccount({ payAccountStatus: 'OPEN_SUCCESS' })
    } else {
      uni.showToast({ title: '获取开户页面失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    loading.value = false
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

.type-selector {
  display: flex; gap: 12px; padding: 16px; background: #fff; margin-bottom: 12px;
}
.type-item {
  flex: 1; text-align: center; padding: 16px; border-radius: $border-radius-md;
  border: 2px solid #eee; cursor: pointer; transition: all 0.2s;
}
.type-item.active { border-color: $primary-color; background: rgba(48,130,246,0.04); }
.type-icon { font-size: 32px; margin-bottom: 8px; }
.type-name { font-size: 14px; font-weight: 600; color: #333; }
.type-desc { font-size: 12px; color: #999; margin-top: 4px; }

.form-card {
  margin: 0 16px 16px; padding: 16px;
  background: #fff; border-radius: $border-radius-md;
  box-shadow: $shadow-md;
}
.card-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; }

.success-card {
  margin: 32px 16px; padding: 32px 16px; background: #fff;
  border-radius: $border-radius-md; text-align: center;
  box-shadow: $shadow-md;
}
.success-icon { font-size: 56px; margin-bottom: 12px; }
.success-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.success-info { font-size: 13px; color: #666; margin-bottom: 24px; line-height: 1.8; }

.opening-card {
  margin: 48px 16px; padding: 32px; background: #fff;
  border-radius: $border-radius-md; text-align: center;
  box-shadow: $shadow-md; display: flex; flex-direction: column; align-items: center;
}
</style>

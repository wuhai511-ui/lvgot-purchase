<template>
  <view class="page-container">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">导游开户</text>
    </view>

    <!-- 开户进度 -->
    <view v-if="openDone" class="success-card">
      <view class="success-icon">🎉</view>
      <view class="success-title">个人账户开户完成</view>
      <view class="success-info">
        <text>账户号：{{ accountStore.qztAccount.accountNo || '—' }}</text>
      </view>
      <van-button type="primary" block round @click="goBack">完成</van-button>
    </view>

    <!-- 导游/个人表单 -->
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
const loading = ref(false)
const opening = ref(false)
const openDone = ref(false)

function genOutRequestNo() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 10)
}

const personalForm = reactive({
  name: '',
  id_no: '',
  mobile: '',
})

const goBack = () => uni.navigateBack()

// 个人开户（导游）
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

    if (res && res.url) {
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
  margin-bottom: 12px;
}
.nav-back { font-size: 20px; margin-right: 12px; }
.nav-title { font-size: 16px; font-weight: 600; }

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

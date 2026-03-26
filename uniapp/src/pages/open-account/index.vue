<template>
  <view class="page-container">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">账户开户</text>
    </view>

    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view class="tab" :class="{active: activeTab==='personal'}" @click="activeTab='personal'">个人开户</view>
      <view class="tab" :class="{active: activeTab==='company'}" @click="activeTab='company'">企业开户</view>
    </view>

    <!-- 个人开户表单 -->
    <view v-show="activeTab==='personal'" class="form-card">
      <van-field v-model="personalForm.name" label="姓名" placeholder="请输入真实姓名" required />
      <van-field v-model="personalForm.phone" label="手机号" type="tel" placeholder="请输入手机号" required />
      <van-field v-model="personalForm.idCard" label="身份证号" placeholder="请输入身份证号码" required />
      <van-field v-model="personalForm.bankAccount" label="银行卡号" placeholder="请输入银行卡号" />
      <van-field v-model="personalForm.bankName" label="开户行" placeholder="如：中国工商银行" />
      <van-button type="primary" block round @click="submitPersonal" :loading="loading">提交开户</van-button>
    </view>

    <!-- 企业开户表单 -->
    <view v-show="activeTab==='company'" class="form-card">
      <van-field v-model="companyForm.name" label="企业名称" placeholder="请输入企业全称" required />
      <van-field v-model="companyForm.businessLicenseNo" label="统一社会信用代码" placeholder="请输入营业执照号" required />
      <van-field v-model="companyForm.legalPerson" label="法人姓名" placeholder="请输入法人姓名" required />
      <van-field v-model="companyForm.legalIdCard" label="法人身份证号" placeholder="请输入法人身份证号码" required />
      <van-field v-model="companyForm.phone" label="联系人手机号" type="tel" placeholder="请输入手机号" required />
      <van-field v-model="companyForm.bankAccount" label="对公银行账户" placeholder="请输入对公账户号" />
      <van-field v-model="companyForm.bankName" label="开户行" placeholder="如：中国建设银行" />
      <van-button type="primary" block round @click="submitCompany" :loading="loading">提交开户</van-button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('personal')
const loading = ref(false)

const personalForm = ref({ name:'', phone:'', idCard:'', bankAccount:'', bankName:'' })
const companyForm = ref({ name:'', businessLicenseNo:'', legalPerson:'', legalIdCard:'', phone:'', bankAccount:'', bankName:'' })

const goBack = () => uni.navigateBack()
const submitPersonal = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  }, 1000)
}
const submitCompany = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    uni.showToast({ title: '提交成功，审核中', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1000)
  }, 1000)
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.nav-back { font-size: 20px; margin-right: 12px; }
.nav-title { font-size: 16px; font-weight: 600; }

.tab-bar {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 14px;
  color: #666;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.tab.active {
  color: $primary-color;
  border-bottom-color: $primary-color;
  font-weight: 600;
}

.form-card {
  margin: 16px;
  padding: 16px;
  background: #fff;
  border-radius: $border-radius-md;
  box-shadow: $shadow-md;
}
</style>

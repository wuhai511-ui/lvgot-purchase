<template>
  <view class="login-page">
    <view class="header">
      <view class="title">旅购通</view>
      <view class="subtitle">登录工作台</view>
    </view>
    
    <view class="form-container">
      <view class="role-selector">
        <text class="role-label">请选择登录身份：</text>
        <van-radio-group v-model="role" direction="horizontal">
          <van-radio name="merchant">商店/旅行社</van-radio>
          <van-radio name="guide">导游/其他</van-radio>
        </van-radio-group>
      </view>

      <van-field
        v-model="phone"
        type="tel"
        label="手机号"
        placeholder="测试: 15801852984"
        clearable
        size="large"
      />
      <van-field
        v-model="code"
        center
        clearable
        label="验证码"
        placeholder="测试: 111111"
        size="large"
      >
        <template #button>
          <van-button size="small" type="primary" plain @click="sendCode" :disabled="countdown > 0">
            {{ countdown > 0 ? countdown + 's' : '发送验证码' }}
          </van-button>
        </template>
      </van-field>
      
      <view class="submit-btn">
        <van-button type="primary" block block-round @click="handleLogin">登录 / 查账</van-button>
      </view>
      <view class="tips">
        <text>未开户请联系旅行社或收单商户后台开通</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useAccountStore } from '@/store/account'

const phone = ref('')
const code = ref('')
const countdown = ref(0)
const role = ref('guide') // default
const accountStore = useAccountStore()

const sendCode = () => {
  if (!/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
  
  if (phone.value === '15801852984') {
    code.value = '111111'
    uni.showToast({ title: '测试环境：验证码自动获取成功', icon: 'none' })
  } else {
    uni.showToast({ title: '体验账号未被授权', icon: 'none' })
  }
}

const handleLogin = () => {
  if (!/^1\d{10}$/.test(phone.value)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (!code.value) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  
  if (phone.value !== '15801852984' || code.value !== '111111') {
    uni.showToast({ title: '手机号或验证码错误，请使用测试账号', icon: 'none' })
    return
  }
  
  uni.showLoading({ title: '登录中...' })
  setTimeout(() => {
    uni.hideLoading()
    // Simulated token
    uni.setStorageSync('user_token', 'token_xxxxxx')
    uni.setStorageSync('user_phone', phone.value)
    uni.setStorageSync('user_role', role.value)
    accountStore.currentAccount.type = role.value
    accountStore.currentAccount.typeName = role.value === 'merchant' ? '商店/旅行社' : '导游'
    accountStore.currentAccount.name = role.value === 'merchant' ? '测试旅游商店' : '李四 (导游)'
    
    uni.showToast({ title: '登录成功' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/home/index' })
    }, 1000)
  }, 1000)
}
</script>

<style lang="scss">
.login-page {
  padding: 40px 20px;
  background-color: #fff;
  min-height: 100vh;
}
.header {
  margin-bottom: 40px;
  .title {
    font-size: 32px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
  }
  .subtitle {
    font-size: 16px;
    color: #666;
  }
}
.form-container {
  padding-top: 20px;
  .role-selector {
    padding: 0 16px 20px 16px;
    .role-label {
      display: block;
      font-size: 14px;
      color: #666;
      margin-bottom: 12px;
    }
  }
  .submit-btn {
    margin-top: 40px;
    margin-bottom: 15px;
  }
  .tips {
    text-align: center;
    font-size: 13px;
    color: #999;
  }
}
</style>

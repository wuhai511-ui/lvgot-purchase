<template>
  <view class="login-page">
    <view class="header">
      <view class="title">旅购通</view>
      <view class="subtitle">导游 / 结算方 登录</view>
    </view>
    
    <view class="form-container">
      <van-field
        v-model="phone"
        type="tel"
        label="手机号"
        placeholder="请输入注册手机号"
        clearable
        size="large"
      />
      <van-field
        v-model="code"
        center
        clearable
        label="验证码"
        placeholder="请输入短信验证码"
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

const phone = ref('')
const code = ref('')
const countdown = ref(0)

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
  uni.showToast({ title: '验证码发送成功', icon: 'success' })
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
  
  uni.showLoading({ title: '登录中...' })
  setTimeout(() => {
    uni.hideLoading()
    // Simulated token
    uni.setStorageSync('user_token', 'token_xxxxxx')
    uni.setStorageSync('user_phone', phone.value)
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

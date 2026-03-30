<template>
  <div class="login-page">
    <div class="login-card">
      <h2>旅购通商户工作台</h2>
      <p class="subtitle">登录后可进行账户管理、分账、提现等操作</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
        <el-form-item prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" size="large" prefix-icon="📱" />
        </el-form-item>
        <el-form-item prop="code">
          <el-input v-model="form.code" placeholder="请输入验证码" size="large" prefix-icon="🔐" style="width: 60%" />
          <el-button size="large" style="width: 38%; margin-left: 2%" :disabled="countdown > 0" @click="sendCode">
            {{ countdown > 0 ? countdown + 's' : '获取验证码' }}
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="tips">任意验证码均可登录成功（Mock模式）</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { setToken, setMerchantInfo } from '@/utils/storage'
import { merchantLogin } from '@/api/merchant'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const countdown = ref(0)

const form = reactive({ phone: '', code: '' })
const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

let timer = null
const sendCode = () => {
  if (!form.phone) { ElMessage.warning('请先输入手机号'); return }
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
  ElMessage.success('验证码已发送')
}

const handleLogin = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    // Mock登录成功
    const mockToken = 'mock_jwt_token_' + Date.now()
    const mockMerchantInfo = {
      id: 1,
      phone: form.phone,
      name: '测试商户',
      accountNo: 'LAK2026030001',
      status: 'active' // 或 'pending' 引导开户
    }
    setToken(mockToken)
    setMerchantInfo(mockMerchantInfo)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1976D2, #42a5f5); }
.login-card { background: #fff; border-radius: 16px; padding: 40px; width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
.login-card h2 { text-align: center; color: #1a1a1a; margin-bottom: 8px; }
.subtitle { text-align: center; color: #888; font-size: 14px; margin-bottom: 32px; }
.tips { text-align: center; color: #aaa; font-size: 12px; margin-top: 16px; }
</style>

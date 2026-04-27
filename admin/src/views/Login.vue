<template>
  <div class="login-page">
    <div class="login-card">
      <h2>旅购通商户工作台</h2>
      <p class="subtitle">请使用运营后台分配的租户账号登录</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" size="large" prefix-icon="👤" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" size="large" prefix-icon="🔐" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { setToken, setMerchantInfo } from '@/utils/storage'
import { login } from '@/api/auth'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    const res = await login(form.username, form.password)
    if (res.code === 0) {
      setToken(res.data.token)
      setMerchantInfo(res.data.tenant)
      ElMessage.success(`欢迎，${res.data.tenant.tenant_name}`)
      router.push('/')
    } else {
      ElMessage.error(res.message || '登录失败')
    }
  } catch (err) {
    ElMessage.error('登录失败，请检查账号密码')
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
</style>

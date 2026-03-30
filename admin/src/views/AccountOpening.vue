<template>
  <div class="page">
    <div class="page-title">📝 开户申请</div>
    <div class="card">
      <div class="card-header">商户信息填写</div>
      <div class="card-body">
        <el-form :model="form" label-width="120px">
          <el-form-item label="商户名称" required>
            <el-input v-model="form.name" placeholder="请输入商户名称" style="width:400px"/>
          </el-form-item>
          <el-form-item label="商户类型" required>
            <el-select v-model="form.type" placeholder="请选择" style="width:400px">
              <el-option label="商户" value="merchant"/>
              <el-option label="旅行社" value="travel"/>
            </el-select>
          </el-form-item>
          <el-form-item label="身份证号" required>
            <el-input v-model="form.idCard" placeholder="请输入法人身份证号" style="width:400px"/>
          </el-form-item>
          <el-form-item label="营业执照">
            <el-upload :before-upload="handleUpload" :auto-upload="false" ref="uploadRef">
              <el-button>上传营业执照</el-button>
              <template #tip>
                <div class="el-upload__tip">支持 jpg/png/pdf，大小不超过5MB</div>
              </template>
            </el-upload>
          </el-form-item>
          <el-form-item label="身份证照片" required>
            <el-upload :before-upload="handleIdCardUpload" :auto-upload="false" ref="idCardUploadRef" list-type="picture">
              <el-button>上传身份证正反面</el-button>
            </el-upload>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">提交开户申请</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
    <div class="card" v-if="submitResult">
      <div class="card-header">📋 开户状态</div>
      <div class="card-body">
        <el-result :icon="submitResult.icon" :title="submitResult.title" :sub-title="submitResult.subTitle">
          <template #extra>
            <el-button v-if="submitResult.action" type="primary" @click="handleRedirect">前往钱账通完成认证</el-button>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const form = reactive({ name: '', type: 'merchant', idCard: '', businessLicense: null, idCardFiles: [] })
const submitting = ref(false)
const submitResult = ref(null)
const uploadRef = ref()
const idCardUploadRef = ref()

const handleUpload = (file) => { form.businessLicense = file; return false }
const handleIdCardUpload = (file) => { form.idCardFiles.push(file); return false }

const handleSubmit = async () => {
  if (!form.name || !form.type || !form.idCard) { ElMessage.warning('请填写完整信息'); return }
  submitting.value = true
  await new Promise(r => setTimeout(r, 1500)) // Mock BFF调用
  // Mock: 返回跳转URL
  const mockRedirectUrl = 'https://qzt.example.com/h5开户?merchantId=mock_123'
  submitResult.value = {
    icon: 'warning',
    title: '信息已提交',
    subTitle: '正在跳转钱账通完成实名认证...',
    action: mockRedirectUrl
  }
  submitting.value = false
  ElMessage.success('提交成功，正在跳转...')
  setTimeout(() => { window.location.href = mockRedirectUrl }, 1500)
}
const handleRedirect = () => { window.location.href = submitResult.value.action }
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>

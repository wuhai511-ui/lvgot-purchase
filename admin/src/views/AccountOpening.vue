<template>
  <div class="page">
    <div class="page-title">📝 商户开户申请</div>

    <!-- 开户主体类型选择 -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-header">开户主体</div>
      <div class="card-body">
        <el-radio-group v-model="subjectType" size="default">
          <el-radio-button value="enterprise">企业商户</el-radio-button>
          <el-radio-button value="personal">个人商户（导游等）</el-radio-button>
        </el-radio-group>
        <div class="subject-tip" v-if="subjectType === 'personal'">
          <el-icon><InfoFilled /></el-icon>
          提交后将跳转至钱账通完成后续入驻流程
        </div>
        <div class="subject-tip" v-else>
          <el-icon><InfoFilled /></el-icon>
          提交后将跳转至钱账通完成后续入驻流程
        </div>
      </div>
    </div>

    <!-- ==================== 企业商户表单（精简版）==================== -->
    <template v-if="subjectType === 'enterprise'">
      <div class="card">
        <div class="card-header">基本信息</div>
        <div class="card-body">
          <el-form :model="form" :rules="simpleRules" ref="formRef" label-width="140px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="商户名称" prop="name">
                  <el-input v-model="form.name" placeholder="请输入商户名称"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="法人手机号" prop="legalPhone">
                  <el-input v-model="form.legalPhone" placeholder="请输入法人手机号" maxlength="11"/>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>
    </template>

    <!-- ==================== 个人商户表单（精简版）==================== -->
    <template v-else-if="subjectType === 'personal'">
      <div class="card">
        <div class="card-header">基本信息</div>
        <div class="card-body">
          <el-form :model="personalForm" :rules="personalSimpleRules" ref="personalFormRef" label-width="140px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="姓名" prop="name">
                  <el-input v-model="personalForm.name" placeholder="请输入真实姓名"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="手机号" prop="mobile">
                  <el-input v-model="personalForm.mobile" placeholder="请输入手机号" maxlength="11"/>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>
    </template>

    <div class="submit-area">
      <el-button @click="$router.push('/')">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交并跳转开户</el-button>
    </div>

    <!-- 跳转提示 -->
    <el-dialog v-model="showResult" title="提示" width="400px" :close-on-click-modal="false" :show-close="false">
      <div v-if="submitResult && submitResult.code === 0" style="text-align:center;padding:16px 0">
        <el-result icon="success" title="正在跳转..." sub-title="即将打开钱账通开户页面">
          <template #extra>
            <el-button type="primary" @click="doRedirect(submitResult.data.redirectUrl)">打开钱账通</el-button>
          </template>
        </el-result>
      </div>
      <div v-else-if="submitResult" style="text-align:center;padding:16px 0">
        <el-result icon="error" title="提交失败" :sub-title="submitResult.message || '请重试'"/>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { openAccount, applyPersonal } from '@/api/merchant'

const subjectType = ref('enterprise')

const formRef = ref()
const personalFormRef = ref()
const submitting = ref(false)
const showResult = ref(false)
const submitResult = ref(null)

const form = reactive({
  name: '',
  legalPhone: '',
})

const simpleRules = {
  name: [{ required: true, message: '请输入商户名称', trigger: 'blur' }],
  legalPhone: [
    { required: true, message: '请输入法人手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
}

const personalForm = reactive({
  name: '',
  mobile: '',
})

const personalSimpleRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
}

const handleSubmit = async () => {
  if (subjectType.value === 'enterprise') {
    await submitEnterprise()
  } else {
    await submitPersonal()
  }
}

const submitEnterprise = async () => {
  await formRef.value?.validate()

  submitting.value = true
  try {
    const result = await openAccount({
      name: form.name,
      legal_mobile: form.legalPhone,
      back_url: window.location.origin + '/admin/#/account-opening',
      source: 'WORKBENCH'
    })

    submitResult.value = result
    showResult.value = true

    if (result.code === 0 && result.data?.redirectUrl) {
      doRedirect(result.data.redirectUrl)
    }
  } catch (e) {
    submitResult.value = { code: -1, message: e.message || '提交失败，请重试' }
    showResult.value = true
  } finally {
    submitting.value = false
  }
}

const submitPersonal = async () => {
  await personalFormRef.value?.validate()

  submitting.value = true
  try {
    const result = await applyPersonal({
      out_request_no: String(Date.now()),
      register_name: personalForm.name,
      legal_mobile: personalForm.mobile,
      enterprise_type: '3',
      back_url: window.location.origin + '/admin/#/account-opening',
    })

    submitResult.value = result
    showResult.value = true

    if (result.code === 0 && result.data?.redirectUrl) {
      doRedirect(result.data.redirectUrl)
    }
  } catch (e) {
    submitResult.value = { code: -1, message: e.message || '提交失败，请重试' }
    showResult.value = true
  } finally {
    submitting.value = false
  }
}

const doRedirect = (url) => {
  if (!url) return
  window.open(url, '_blank')
}
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.card-body { padding: 20px; }
.submit-area { display: flex; justify-content: center; gap: 16px; padding: 24px 0; }
.subject-tip {
  margin-top: 12px;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #d0e8ff;
}
</style>

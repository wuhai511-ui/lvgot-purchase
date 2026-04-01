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

// ============ 开户主体类型 ============
const subjectType = ref('enterprise')

// ============ refs ============
const formRef = ref()
const formRef2 = ref()
const personalFormRef = ref()
const personalFormRef2 = ref()
const submitting = ref(false)
const showResult = ref(false)
const submitResult = ref(null)
const verifyStatus = ref('pending')

// ============ 企业商户文件列表 ============
const idCardFrontList = ref([])
const idCardBackList = ref([])
const licenseList = ref([])
const bankList = ref([])

// ============ 个人商户文件列表 ============
const personalIdFrontList = ref([])
const personalIdBackList = ref([])

// OCR 加载状态
const ocrLoading = reactive({ front: false, license: false, personalFront: false })

// ============ 企业商户表单数据 ============
const form = reactive({
  name: '',
  businessType: '',
  legalName: '',
  legalPhone: '',
  legalIdCard: '',
  industryCode: '',
  businessAddress: '',
  businessScope: '',
  licenseNo: '',
  accountType: 'CORPORATE',
  bankName: '',
  bankCardNo: '',
  bankAccountName: '',
  bankBranchName: '',
  openPermitNo: '',
})

const rules = {
  name: [{ required: true, message: '请输入商户名称', trigger: 'blur' }],
  businessType: [{ required: true, message: '请选择企业类型', trigger: 'change' }],
  legalName: [{ required: true, message: '请输入法人姓名', trigger: 'blur' }],
  legalPhone: [
    { required: true, message: '请输入法人手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  legalIdCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' }
  ],
  industryCode: [{ required: true, message: '请选择行业类型', trigger: 'change' }],
  businessAddress: [{ required: true, message: '请输入经营地址', trigger: 'blur' }],
  licenseNo: [{ required: true, message: '请输入营业执照号', trigger: 'blur' }],
  accountType: [{ required: true, message: '请选择账户类型', trigger: 'change' }],
  bankName: [{ required: true, message: '请输入开户行名称', trigger: 'blur' }],
  bankCardNo: [{ required: true, message: '请输入银行卡号', trigger: 'blur' }],
  bankAccountName: [{ required: true, message: '请输入开户名', trigger: 'blur' }],
}

// ============ 个人商户表单数据 ============
const personalForm = reactive({
  name: '',
  mobile: '',
  idCardNo: '',
  roleType: 'GUIDE',
  bankName: '',
  bankCardNo: '',
  bankAccountName: '',
  bankProvince: '',
  bankCity: '',
  bankBranchName: '',
})

const personalRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  idCardNo: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' }
  ],
  roleType: [{ required: true, message: '请选择角色类型', trigger: 'change' }],
  bankName: [{ required: true, message: '请输入开户行名称', trigger: 'blur' }],
  bankCardNo: [{ required: true, message: '请输入银行卡号', trigger: 'blur' }],
  bankAccountName: [{ required: true, message: '请输入开户名', trigger: 'blur' }],
  bankProvince: [{ required: true, message: '请输入开户省', trigger: 'blur' }],
  bankCity: [{ required: true, message: '请输入开户市', trigger: 'blur' }],
  bankBranchName: [{ required: true, message: '请输入开户支行', trigger: 'blur' }],
}

// ============ 企业商户 OCR（已实现） ============
const doOCR = async (type) => {
  let fileList = []
  let fieldMap = {}

  if (type === 'front') {
    if (!idCardFrontList.value.length) { ElMessage.warning('请先上传身份证正面照片'); return }
    fileList = idCardFrontList.value
    fieldMap = { id_card_name: 'legalName', id_card_no: 'legalIdCard' }
    ocrLoading.front = true
  } else if (type === 'license') {
    if (!licenseList.value.length) { ElMessage.warning('请先上传营业执照照片'); return }
    fileList = licenseList.value
    fieldMap = { biz_license_credit_code: 'licenseNo', biz_license_name: 'name', biz_license_address: 'businessAddress', biz_license_scope: 'businessScope' }
    ocrLoading.license = true
  }

  try {
    const file = fileList[0].raw
    const fileKey = await uploadFile(file)
    const ocrResult = await callOCR(fileKey, type)
    if (ocrResult.status !== '1') {
      throw new Error('OCR识别失败：' + (ocrResult.error_message || '未知错误'))
    }
    for (const [ocrField, formField] of Object.entries(fieldMap)) {
      if (ocrResult[ocrField] && form[formField] !== undefined) {
        form[formField] = ocrResult[ocrField]
      }
    }
    ElMessage.success('OCR识别成功，已自动填充表单')
  } catch (e) {
    ElMessage.error(e.message || 'OCR识别失败，请手动输入')
  } finally {
    ocrLoading.front = false
    ocrLoading.license = false
  }
}

// ============ 个人商户 OCR（身份证正面） ============
const doPersonalOCR = async (type) => {
  if (!personalIdFrontList.value.length) { ElMessage.warning('请先上传身份证正面照片'); return }
  ocrLoading.personalFront = true
  try {
    const file = personalIdFrontList.value[0].raw
    const fileKey = await uploadFile(file)
    const ocrResult = await callOCR(fileKey, 'front')
    if (ocrResult.status !== '1') {
      throw new Error('OCR识别失败：' + (ocrResult.error_message || '未知错误'))
    }
    if (ocrResult.id_card_name) personalForm.name = ocrResult.id_card_name
    if (ocrResult.id_card_no) personalForm.idCardNo = ocrResult.id_card_no
    ElMessage.success('OCR识别成功，已自动填充姓名和身份证号')
  } catch (e) {
    ElMessage.error(e.message || 'OCR识别失败，请手动输入')
  } finally {
    ocrLoading.personalFront = false
  }
}

// ============ 文件上传工具（复用 qzt-client 的实现） ============
import { qztFileUpload } from '@/utils/qzt-client.js'
const uploadFileToQzt = async (rawFile, fileName, ext) => {
  return qztFileUpload(rawFile, fileName, ext)
}

// ============ 统一提交 ============
const handleSubmit = async () => {
  if (subjectType.value === 'enterprise') {
    await submitEnterprise()
  } else {
    await submitPersonal()
  }
}

// ============ 企业商户提交 ============
const submitEnterprise = async () => {
  await formRef.value?.validate()
  await formRef2.value?.validate()
  if (!idCardFrontList.value.length || !idCardBackList.value.length || !licenseList.value.length) {
    ElMessage.warning('请上传全部证件照片'); return
  }

  submitting.value = true
  try {
    const [idCardFrontKey, idCardBackKey, licenseKey, bankCardKey] = await Promise.all([
      uploadFileToQzt(idCardFrontList.value[0].raw, idCardFrontList.value[0].name, 'jpg'),
      uploadFileToQzt(idCardBackList.value[0].raw, idCardBackList.value[0].name, 'jpg'),
      uploadFileToQzt(licenseList.value[0].raw, licenseList.value[0].name, 'jpg'),
      bankList.value.length
        ? uploadFileToQzt(bankList.value[0].raw, bankList.value[0].name, 'jpg')
        : Promise.resolve('')
    ])

    const result = await openAccount({
      ...form,
      idCardFrontKey,
      idCardBackKey,
      licenseKey,
      bankCardKey,
    })

    submitResult.value = result
    verifyStatus.value = 'pending'
    showResult.value = true
  } catch (e) {
    submitResult.value = { code: -1, message: e.message || '提交失败，请重试' }
    showResult.value = true
  } finally {
    submitting.value = false
  }
}

// ============ 个人商户提交 ============
const submitPersonal = async () => {
  await personalFormRef.value?.validate()
  await personalFormRef2.value?.validate()
  if (!personalIdFrontList.value.length || !personalIdBackList.value.length) {
    ElMessage.warning('请上传身份证正面和背面照片'); return
  }

  submitting.value = true
  try {
    const result = await applyPersonal({
      out_request_no: String(Date.now()),
      register_name: personalForm.name,
      legal_mobile: personalForm.mobile,
      enterprise_type: '3', // 个人
      back_url: window.location.href,
      id_card_no: personalForm.idCardNo,
      bank_name: personalForm.bankName,
      bank_account_no: personalForm.bankCardNo,
      bank_account_name: personalForm.bankAccountName,
      bank_province: personalForm.bankProvince,
      bank_city: personalForm.bankCity,
      bank_branch_name: personalForm.bankBranchName,
    })

    submitResult.value = result
    showResult.value = true
  } catch (e) {
    submitResult.value = { code: -1, message: e.message || '提交失败，请重试' }
    showResult.value = true
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.card-body { padding: 20px; }
.upload-item { }
.upload-label { font-size: 14px; color: #333; margin-bottom: 8px; }
.submit-area { display: flex; justify-content: center; gap: 16px; padding: 24px 0; }
.qr-wrapper { text-align: center; padding: 20px 0; }
.qr-tip { font-size: 15px; color: #333; margin-bottom: 20px; font-weight: 500; }
.qr-box { display: flex; justify-content: center; background: #fafafa; padding: 16px; border-radius: 8px; margin-bottom: 12px; }
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

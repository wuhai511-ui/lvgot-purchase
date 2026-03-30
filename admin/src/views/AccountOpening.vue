<template>
  <div class="page">
    <div class="page-title">📝 商户开户申请</div>
    <div class="card">
      <div class="card-header">商户基本信息</div>
      <div class="card-body">
        <el-form :model="form" label-width="140px" :rules="rules" ref="formRef">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="商户名称" prop="name" required>
                <el-input v-model="form.name" placeholder="请输入商户名称"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="企业类型" prop="businessType" required>
                <el-select v-model="form.businessType" placeholder="请选择企业类型" style="width:100%">
                  <el-option label="有限责任公司" value="LIMITED"/>
                  <el-option label="个体工商户" value="INDIVIDUAL"/>
                  <el-option label="个人独资企业" value="SOLE_PROPRIETOR"/>
                  <el-option label="合伙企业" value="PARTNERSHIP"/>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="法人姓名" prop="legalName" required>
                <el-input v-model="form.legalName" placeholder="请输入法人姓名"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="法人手机号" prop="legalPhone" required>
                <el-input v-model="form.legalPhone" placeholder="请输入法人手机号" maxlength="11"/>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="法人身份证号" prop="legalIdCard" required>
                <el-input v-model="form.legalIdCard" placeholder="请输入法人身份证号" maxlength="18"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="行业类型" prop="industryCode" required>
                <el-select v-model="form.industryCode" placeholder="请选择行业类型" style="width:100%">
                  <el-option label="旅游服务" value="TOURISM"/>
                  <el-option label="交通运输" value="TRANSPORT"/>
                  <el-option label="餐饮服务" value="CATERING"/>
                  <el-option label="零售批发" value="RETAIL"/>
                  <el-option label="其他" value="OTHER"/>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="经营地址" prop="businessAddress" required>
            <el-input v-model="form.businessAddress" placeholder="请输入详细经营地址"/>
          </el-form-item>

          <el-form-item label="经营范围" prop="businessScope">
            <el-input v-model="form.businessScope" type="textarea" :rows="2" placeholder="请输入经营范围"/>
          </el-form-item>

          <el-form-item label="营业执照号" prop="licenseNo" required>
            <el-input v-model="form.licenseNo" placeholder="请输入统一社会信用代码"/>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="card">
      <div class="card-header">证件照片上传 <span style="font-size:12px;color:#888;font-weight:400">（支持钱账通OCR自动识别）</span></div>
      <div class="card-body">
        <el-row :gutter="20">
          <el-col :span="8">
            <div class="upload-item">
              <div class="upload-label">法人身份证（正面）<span style="color:#E6A23C">*</span></div>
              <el-upload
                :auto-upload="false"
                :limit="1"
                accept="image/*"
                :on-change="(f) => handleIdCardFrontChange(f)"
                list-type="picture"
                :file-list="idCardFrontList"
              >
                <el-button>点击上传</el-button>
                <template #tip>
                  <div class="el-upload__tip">支持jpg/png，建议分辨率≥1024×768</div>
                </template>
              </el-upload>
              <el-button v-if="form.legalIdCard" size="small" type="primary" style="margin-top:8px" :loading="ocrLoading.front" @click="doOCR('front')">🔍 OCR识别</el-button>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="upload-item">
              <div class="upload-label">法人身份证（反面）<span style="color:#E6A23C">*</span></div>
              <el-upload :auto-upload="false" :limit="1" accept="image/*" :on-change="(f) => handleIdCardBackChange(f)" list-type="picture" :file-list="idCardBackList">
                <el-button>点击上传</el-button>
              </el-upload>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="upload-item">
              <div class="upload-label">营业执照照片<span style="color:#E6A23C">*</span></div>
              <el-upload :auto-upload="false" :limit="1" accept="image/*" :on-change="(f) => handleLicenseChange(f)" list-type="picture" :file-list="licenseList">
                <el-button>点击上传</el-button>
              </el-upload>
              <el-button v-if="form.licenseNo" size="small" type="primary" style="margin-top:8px" :loading="ocrLoading.license" @click="doOCR('license')">🔍 OCR识别</el-button>
            </div>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top:20px">
          <el-col :span="12">
            <div class="upload-item">
              <div class="upload-label">结算账户信息照片<span style="color:#E6A23C">*</span>（银行卡/开户许可证）</div>
              <el-upload :auto-upload="false" :limit="1" accept="image/*" :on-change="(f) => handleBankChange(f)" list-type="picture" :file-list="bankList">
                <el-button>点击上传</el-button>
              </el-upload>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <div class="card">
      <div class="card-header">结算账户信息</div>
      <div class="card-body">
        <el-form :model="form" :rules="rules" ref="formRef2">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="结算账户类型" prop="accountType" required>
                <el-select v-model="form.accountType" placeholder="请选择账户类型" style="width:100%">
                  <el-option label="对公账户" value="CORPORATE"/>
                  <el-option label="对私账户" value="PERSONAL"/>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开户行名称" prop="bankName" required>
                <el-input v-model="form.bankName" placeholder="请输入开户行名称"/>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="银行卡号" prop="bankCardNo" required>
                <el-input v-model="form.bankCardNo" placeholder="请输入银行卡号" maxlength="23"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开户名" prop="bankAccountName" required>
                <el-input v-model="form.bankAccountName" placeholder="请输入开户名"/>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开户支行">
                <el-input v-model="form.bankBranchName" placeholder="请输入开户支行（如：北京朝阳支行）"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item v-if="form.accountType === 'CORPORATE'" label="开户许可证号" prop="openPermitNo">
                <el-input v-model="form.openPermitNo" placeholder="请输入开户许可证号"/>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </div>

    <div class="submit-area">
      <el-button @click="$router.push('/')">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">提交开户申请</el-button>
    </div>

    <!-- 开户结果 -->
    <el-dialog v-model="showResult" title="开户申请状态" width="450px" :close-on-click-modal="false">
      <el-result
        v-if="submitResult"
        :icon="submitResult.code === 0 ? 'success' : 'error'"
        :title="submitResult.code === 0 ? '提交成功' : '提交失败'"
        :sub-title="submitResult.message || ''"
      >
        <template #extra v-if="submitResult.code === 0 && submitResult.data?.redirectUrl">
          <el-button type="primary" @click="redirectToQZT">前往钱账通完成认证</el-button>
        </template>
      </el-result>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadFile } from '@/api/merchant'
import { openAccount } from '@/api/merchant'

const formRef = ref()
const formRef2 = ref()
const submitting = ref(false)
const showResult = ref(false)
const submitResult = ref(null)

// 文件列表
const idCardFrontList = ref([])
const idCardBackList = ref([])
const licenseList = ref([])
const bankList = ref([])

// OCR 加载状态
const ocrLoading = reactive({ front: false, license: false })

// 表单数据
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
  // file_key 列表（上传后填充）
  idCardFrontKey: '',
  idCardBackKey: '',
  licenseKey: '',
  bankCardKey: '',
})

const rules = {
  name: [{ required: true, message: '请输入商户名称', trigger: 'blur' }],
  businessType: [{ required: true, message: '请选择企业类型', trigger: 'change' }],
  legalName: [{ required: true, message: '请输入法人姓名', trigger: 'blur' }],
  legalPhone: [{ required: true, message: '请输入法人手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  legalIdCard: [{ required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' }],
  industryCode: [{ required: true, message: '请选择行业类型', trigger: 'change' }],
  businessAddress: [{ required: true, message: '请输入经营地址', trigger: 'blur' }],
  licenseNo: [{ required: true, message: '请输入营业执照号', trigger: 'blur' }],
  accountType: [{ required: true, message: '请选择账户类型', trigger: 'change' }],
  bankName: [{ required: true, message: '请输入开户行名称', trigger: 'blur' }],
  bankCardNo: [{ required: true, message: '请输入银行卡号', trigger: 'blur' }],
  bankAccountName: [{ required: true, message: '请输入开户名', trigger: 'blur' }],
}

// 文件变化处理
const handleIdCardFrontChange = (file) => { idCardFrontList.value = [file]; }
const handleIdCardBackChange = (file) => { idCardBackList.value = [file]; }
const handleLicenseChange = (file) => { licenseList.value = [file]; }
const handleBankChange = (file) => { bankList.value = [file]; }

// OCR 识别（调用钱账通/飞书Bitable OCR）
const doOCR = async (type) => {
  let file = null
  let fieldMap = {}

  if (type === 'front') {
    if (!idCardFrontList.value.length) { ElMessage.warning('请先上传身份证正面照片'); return }
    file = idCardFrontList.value[0].raw
    fieldMap = { name: 'legalName', id_number: 'legalIdCard' }
    ocrLoading.front = true
  } else if (type === 'license') {
    if (!licenseList.value.length) { ElMessage.warning('请先上传营业执照照片'); return }
    file = licenseList.value[0].raw
    fieldMap = { credit_code: 'licenseNo', name: 'name', address: 'businessAddress' }
    ocrLoading.license = true
  }

  try {
    // 1. 上传图片到文件服务
    const fileKey = await uploadFile(file)

    // 2. 调用飞书Bitable OCR（这里用Mock，实际替换为真实调用）
    const ocrResult = await callFeishuOCR(fileKey, type)

    // 3. 回填识别结果到表单
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

// 飞书Bitable OCR 调用
const callFeishuOCR = (fileKey, type) => {
  // TODO: 替换为真实的飞书Bitable OCR token和table_id
  // const BITABLE_TOKEN = 'xxx'
  // const TABLE_ID = 'xxx'
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (type === 'front') {
        resolve({ name: form.legalName || '张三', id_number: form.legalIdCard || '110101199001011234' })
      } else if (type === 'license') {
        resolve({
          credit_code: form.licenseNo || '91110000MA2ABCD3E4',
          name: form.name || '北京某旅游有限公司',
          address: form.businessAddress || '北京市朝阳区某街道'
        })
      }
    }, 1500)
  })
}

// 提交开户申请
const handleSubmit = async () => {
  await formRef.value?.validate()
  await formRef2.value?.validate()

  // 校验证件照片
  if (!idCardFrontList.value.length || !idCardBackList.value.length || !licenseList.value.length) {
    ElMessage.warning('请上传全部证件照片'); return
  }

  submitting.value = true
  try {
    // 1. 上传证件照片
    const [idCardFrontKey, idCardBackKey, licenseKey, bankCardKey] = await Promise.all([
      uploadFile(idCardFrontList.value[0].raw),
      uploadFile(idCardBackList.value[0].raw),
      uploadFile(licenseList.value[0].raw),
      bankList.value.length ? uploadFile(bankList.value[0].raw) : Promise.resolve('')
    ])

    form.idCardFrontKey = idCardFrontKey
    form.idCardBackKey = idCardBackKey
    form.licenseKey = licenseKey
    form.bankCardKey = bankCardKey

    // 2. 调用钱账通开户接口
    const result = await openAccount(form)
    submitResult.value = result
    showResult.value = true
  } catch (e) {
    submitResult.value = { code: -1, message: e.message || '提交失败，请重试' }
    showResult.value = true
  } finally {
    submitting.value = false
  }
}

const redirectToQZT = () => {
  if (submitResult.value?.data?.redirectUrl) {
    window.location.href = submitResult.value.data.redirectUrl
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
</style>

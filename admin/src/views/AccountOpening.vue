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
        <div class="subject-tip">
          <el-icon><InfoFilled /></el-icon>
          提交后将跳转至钱账通完成后续入驻流程
        </div>
      </div>
    </div>

    <!-- 分账角色选择 -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-header">
        分账角色
        <span class="required-tag">（必选）</span>
      </div>
      <div class="card-body">
        <el-radio-group v-model="splitRole" size="default" @change="handleRoleChange">
          <el-radio-button value="shop">旅行商店</el-radio-button>
          <el-radio-button value="agency">旅行社</el-radio-button>
          <el-radio-button value="guide">导游</el-radio-button>
          <el-radio-button value="driver">司机</el-radio-button>
          <el-radio-button value="other">其他</el-radio-button>
        </el-radio-group>
        <div class="role-tip">
          <el-icon><InfoFilled /></el-icon>
          <span v-if="splitRole === 'shop'">旅行商店：可创建旅行团、设置分账规则、接收分账</span>
          <span v-else-if="splitRole === 'agency'">旅行社：可创建旅行团、设置分账规则、执行分账</span>
          <span v-else-if="splitRole === 'guide'">导游：可接收分账，需上传导游证</span>
          <span v-else-if="splitRole === 'driver'">司机：可接收分账</span>
          <span v-else-if="splitRole === 'other'">其他角色：可接收分账</span>
          <span v-else>请选择分账角色</span>
        </div>
      </div>
    </div>

    <!-- ==================== 企业商户表单 ==================== -->
    <template v-if="subjectType === 'enterprise'">
      <div class="card">
        <div class="card-header">基本信息</div>
        <div class="card-body">
          <el-form :model="enterpriseForm" :rules="enterpriseRules" ref="enterpriseFormRef" label-width="140px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="入网类型" prop="enterpriseType">
                  <el-radio-group v-model="enterpriseForm.enterpriseType">
                    <el-radio value="1">企业</el-radio>
                    <el-radio value="2">个体工商户</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="商户名称" prop="name">
                  <el-input v-model="enterpriseForm.name" placeholder="请输入营业执照上的商户名称"/>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="法人姓名" prop="legalName">
                  <el-input v-model="enterpriseForm.legalName" placeholder="请输入法人姓名"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="法人手机号" prop="legalPhone">
                  <el-input v-model="enterpriseForm.legalPhone" placeholder="请输入法人手机号" maxlength="11"/>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="法人身份证号" prop="legalIdCard">
                  <el-input v-model="enterpriseForm.legalIdCard" placeholder="请输入法人身份证号" maxlength="18"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="统一社会信用代码" prop="licenseNo">
                  <el-input v-model="enterpriseForm.licenseNo" placeholder="请输入统一社会信用代码"/>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="经营地址" prop="address">
                  <el-input v-model="enterpriseForm.address" placeholder="请输入经营地址"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系人邮箱" prop="email">
                  <el-input v-model="enterpriseForm.email" placeholder="请输入联系人邮箱"/>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 证件信息（可选） -->
      <div class="card">
        <div class="card-header">
          证件信息
          <span class="optional-tag">（可选，后续在钱账通页面补充）</span>
        </div>
        <div class="card-body">
          <el-form label-width="140px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="营业执照">
                  <el-upload
                    class="uploader"
                    action="#"
                    :show-file-list="false"
                    :auto-upload="false"
                    @change="(file) => handleFileChange('license', file)"
                  >
                    <img v-if="enterpriseForm.licenseImg" :src="enterpriseForm.licenseImg" class="preview-img"/>
                    <div v-else class="upload-placeholder">
                      <el-icon><Plus /></el-icon>
                      <span>上传营业执照</span>
                    </div>
                  </el-upload>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="法人身份证正面">
                  <el-upload
                    class="uploader"
                    action="#"
                    :show-file-list="false"
                    :auto-upload="false"
                    @change="(file) => handleFileChange('idCardFront', file)"
                  >
                    <img v-if="enterpriseForm.idCardFrontImg" :src="enterpriseForm.idCardFrontImg" class="preview-img"/>
                    <div v-else class="upload-placeholder">
                      <el-icon><Plus /></el-icon>
                      <span>上传身份证正面</span>
                    </div>
                  </el-upload>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="法人身份证反面">
                  <el-upload
                    class="uploader"
                    action="#"
                    :show-file-list="false"
                    :auto-upload="false"
                    @change="(file) => handleFileChange('idCardBack', file)"
                  >
                    <img v-if="enterpriseForm.idCardBackImg" :src="enterpriseForm.idCardBackImg" class="preview-img"/>
                    <div v-else class="upload-placeholder">
                      <el-icon><Plus /></el-icon>
                      <span>上传身份证反面</span>
                    </div>
                  </el-upload>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>
    </template>

    <!-- ==================== 个人商户表单 ==================== -->
    <template v-else-if="subjectType === 'personal'">
      <div class="card">
        <div class="card-header">基本信息</div>
        <div class="card-body">
          <el-form :model="personalForm" :rules="personalRules" ref="personalFormRef" label-width="140px">
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
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="身份证号" prop="idCard">
                  <el-input v-model="personalForm.idCard" placeholder="请输入身份证号（必填）" maxlength="18"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系地址" prop="address">
                  <el-input v-model="personalForm.address" placeholder="请输入联系地址（可选）"/>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 银行卡信息（个人开户必填） -->
      <div class="card">
        <div class="card-header">
          银行卡信息
          <span class="required-tag">（必填）</span>
        </div>
        <div class="card-body">
          <el-form :model="personalForm" :rules="personalRules" ref="personalBankFormRef" label-width="140px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="银行账户类型" prop="bankType">
                  <el-radio-group v-model="personalForm.bankType">
                    <el-radio value="2">对私（个人银行卡）</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="开户银行" prop="bankCode">
                  <el-select v-model="personalForm.bankCode" placeholder="选择银行" filterable style="width: 100%">
                    <el-option v-for="bank in bankList" :key="bank.code" :label="bank.name" :value="bank.code"/>
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="银行卡号" prop="bankCardNo">
                  <el-input v-model="personalForm.bankCardNo" placeholder="请输入银行卡号" maxlength="19"/>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="持卡人姓名" prop="bankCardName">
                  <el-input v-model="personalForm.bankCardName" placeholder="请输入持卡人姓名（与身份证一致）"/>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="开户省份" prop="bankProvince">
                  <el-input v-model="personalForm.bankProvince" placeholder="省份"/>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="开户城市" prop="bankCity">
                  <el-input v-model="personalForm.bankCity" placeholder="城市"/>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="开户支行" prop="bankBranch">
                  <el-input v-model="personalForm.bankBranch" placeholder="支行名称"/>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 证件信息（可选） -->
      <div class="card">
        <div class="card-header">
          证件信息
          <span class="optional-tag">（可选，后续在钱账通页面补充）</span>
        </div>
        <div class="card-body">
          <el-form label-width="140px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="身份证正面">
                  <el-upload
                    class="uploader"
                    action="#"
                    :show-file-list="false"
                    :auto-upload="false"
                    @change="(file) => handleFileChange('idCardFront', file, 'personal')"
                  >
                    <img v-if="personalForm.idCardFrontImg" :src="personalForm.idCardFrontImg" class="preview-img"/>
                    <div v-else class="upload-placeholder">
                      <el-icon><Plus /></el-icon>
                      <span>上传身份证正面</span>
                    </div>
                  </el-upload>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="身份证反面">
                  <el-upload
                    class="uploader"
                    action="#"
                    :show-file-list="false"
                    :auto-upload="false"
                    @change="(file) => handleFileChange('idCardBack', file, 'personal')"
                  >
                    <img v-if="personalForm.idCardBackImg" :src="personalForm.idCardBackImg" class="preview-img"/>
                    <div v-else class="upload-placeholder">
                      <el-icon><Plus /></el-icon>
                      <span>上传身份证反面</span>
                    </div>
                  </el-upload>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 导游证上传（仅导游角色需要） -->
      <div class="card" v-if="splitRole === 'guide'">
        <div class="card-header">
          导游证
          <span class="required-tag">（必填）</span>
        </div>
        <div class="card-body">
          <el-form label-width="140px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="导游证照片">
                  <el-upload
                    class="uploader"
                    action="#"
                    :show-file-list="false"
                    :auto-upload="false"
                    @change="(file) => handleFileChange('guideCert', file, 'personal')"
                  >
                    <img v-if="personalForm.guideCertImg" :src="personalForm.guideCertImg" class="preview-img"/>
                    <div v-else class="upload-placeholder">
                      <el-icon><Plus /></el-icon>
                      <span>上传导游证</span>
                    </div>
                  </el-upload>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="导游证编号">
                  <el-input v-model="personalForm.guideCertNo" placeholder="请输入导游证编号"/>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>
    </template>

    <div class="submit-area">
      <el-button @click="$router.push('/account')">取消</el-button>
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
import { InfoFilled, Plus } from '@element-plus/icons-vue'
import { openAccount, applyPersonal } from '@/api/merchant'

const subjectType = ref('enterprise')
const splitRole = ref('shop') // 分账角色：shop=旅行商店, agency=旅行社, guide=导游, driver=司机, other=其他

const enterpriseFormRef = ref()
const personalFormRef = ref()
const submitting = ref(false)
const showResult = ref(false)
const submitResult = ref(null)

// 企业商户表单
const enterpriseForm = reactive({
  enterpriseType: '1', // 默认企业
  name: '',
  legalName: '',
  legalPhone: '',
  legalIdCard: '',
  licenseNo: '',
  address: '',
  email: '',
  licenseImg: '',
  idCardFrontImg: '',
  idCardBackImg: '',
})

// 个人商户表单
const personalForm = reactive({
  name: '',
  mobile: '',
  idCard: '',
  address: '',
  // 银行卡信息
  bankType: '2', // 默认对私
  bankCode: '',
  bankCardNo: '',
  bankCardName: '',
  bankProvince: '',
  bankCity: '',
  bankBranch: '',
  // 证件照片
  idCardFrontImg: '',
  idCardBackImg: '',
  // 导游证信息
  guideCertImg: '',
  guideCertNo: '',
})

// 银行列表
const bankList = [
  { code: '01020000', name: '中国工商银行' },
  { code: '01030000', name: '中国农业银行' },
  { code: '01040000', name: '中国银行' },
  { code: '01050000', name: '中国建设银行' },
  { code: '03080000', name: '招商银行' },
  { code: '03030000', name: '光大银行' },
  { code: '03020000', name: '中信银行' },
  { code: '03050000', name: '民生银行' },
  { code: '03060000', name: '广发银行' },
  { code: '03070000', name: '平安银行' },
  { code: '03100000', name: '浦发银行' },
  { code: '03090000', name: '兴业银行' },
  { code: '04012900', name: '北京银行' },
  { code: '04031000', name: '上海银行' },
  { code: '04083300', name: '宁波银行' }
]

// 企业商户校验规则
const enterpriseRules = {
  enterpriseType: [{ required: true, message: '请选择入网类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入商户名称', trigger: 'blur' }],
  legalName: [{ required: true, message: '请输入法人姓名', trigger: 'blur' }],
  legalPhone: [
    { required: true, message: '请输入法人手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  legalIdCard: [
    { required: true, message: '请输入法人身份证号', trigger: 'blur' },
    { pattern: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' }
  ],
  licenseNo: [{ required: true, message: '请输入统一社会信用代码', trigger: 'blur' }],
}

// 个人商户校验规则
const personalRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  mobile: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' }
  ],
  bankCode: [{ required: true, message: '请选择开户银行', trigger: 'change' }],
  bankCardNo: [
    { required: true, message: '请输入银行卡号', trigger: 'blur' },
    { pattern: /^\d{16,19}$/, message: '银行卡号格式不正确', trigger: 'blur' }
  ],
  bankCardName: [{ required: true, message: '请输入持卡人姓名', trigger: 'blur' }],
  bankProvince: [{ required: true, message: '请输入开户省份', trigger: 'blur' }],
  bankCity: [{ required: true, message: '请输入开户城市', trigger: 'blur' }],
  bankBranch: [{ required: true, message: '请输入开户支行', trigger: 'blur' }],
}

// 文件上传处理
const handleFileChange = (field, file, formType = 'enterprise') => {
  if (!file.raw) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    if (formType === 'personal') {
      personalForm[field + 'Img'] = e.target.result
    } else {
      enterpriseForm[field + 'Img'] = e.target.result
    }
  }
  reader.readAsDataURL(file.raw)
}

// 角色变更处理
const handleRoleChange = (role) => {
  // 如果选择导游角色，自动切换到个人商户
  if (role === 'guide' || role === 'driver') {
    subjectType.value = 'personal'
  }
}

// 提交表单
const handleSubmit = async () => {
  if (subjectType.value === 'enterprise') {
    await submitEnterprise()
  } else {
    await submitPersonal()
  }
}

// 提交企业商户
const submitEnterprise = async () => {
  await enterpriseFormRef.value?.validate()

  submitting.value = true
  try {
    const result = await openAccount({
      name: enterpriseForm.name,
      legal_mobile: enterpriseForm.legalPhone,
      legal_name: enterpriseForm.legalName,
      legal_id_card: enterpriseForm.legalIdCard,
      license_no: enterpriseForm.licenseNo,
      enterprise_type: enterpriseForm.enterpriseType,
      split_role: splitRole.value, // 分账角色
      address: enterpriseForm.address,
      email: enterpriseForm.email,
      back_url: window.location.origin + '/#/account-opening',
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

// 提交个人商户（使用 open.split.account.apply 6.9 接口）
const submitPersonal = async () => {
  await personalFormRef.value?.validate()

  // 导游角色必须上传导游证
  if (splitRole.value === 'guide' && !personalForm.guideCertImg) {
    ElMessage.error('导游角色必须上传导游证照片')
    return
  }

  submitting.value = true
  try {
    // 个人开户使用 open.split.account.apply (6.9) 直接申请
    const result = await openAccount({
      name: personalForm.name,
      legal_mobile: personalForm.mobile,
      legal_name: personalForm.name,
      legal_id_card: personalForm.idCard,
      address: personalForm.address,
      enterprise_type: '3', // 个人
      split_role: splitRole.value, // 分账角色
      // 银行卡信息
      bank_type: personalForm.bankType,
      bank_code: personalForm.bankCode,
      bank_card_no: personalForm.bankCardNo,
      bank_card_name: personalForm.bankCardName,
      bank_province: personalForm.bankProvince,
      bank_city: personalForm.bankCity,
      bank_branch: personalForm.bankBranch,
      // 导游证信息
      guide_cert_img: personalForm.guideCertImg,
      guide_cert_no: personalForm.guideCertNo,
      back_url: window.location.origin + '/api/merchant/callback',
      source: 'WORKBENCH'
    })

    submitResult.value = result
    showResult.value = true

    // 个人开户无 H5 页面，直接显示结果
    if (result.code === 0) {
      if (result.data?.status === '01') {
        ElMessage.success('开户成功！')
      } else if (result.data?.status === '00') {
        ElMessage.info('开户申请已受理，请等待审核')
      } else if (result.data?.status === '03') {
        ElMessage.info('需要进行电子签约')
      } else {
        ElMessage.info('开户申请已提交')
      }
    }
  } catch (e) {
    submitResult.value = { code: -1, message: e.message || '提交失败，请重试' }
    showResult.value = true
  } finally {
    submitting.value = false
  }
}

// 跳转
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
.optional-tag { font-size: 12px; color: #999; font-weight: 400; margin-left: 8px; }
.required-tag { font-size: 12px; color: #f56c6c; font-weight: 400; margin-left: 8px; }
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
.role-tip {
  margin-top: 12px;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f0fdf4;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

/* 上传组件样式 */
.uploader { width: 100%; }
.uploader :deep(.el-upload) { width: 100%; border: 1px dashed #d9d9d9; border-radius: 6px; cursor: pointer; position: relative; overflow: hidden; transition: border-color 0.3s; }
.uploader :deep(.el-upload:hover) { border-color: #1976D2; }
.upload-placeholder { width: 100%; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #8c939d; font-size: 12px; gap: 8px; }
.upload-placeholder .el-icon { font-size: 24px; }
.preview-img { width: 100%; height: 120px; object-fit: cover; display: block; }
</style>

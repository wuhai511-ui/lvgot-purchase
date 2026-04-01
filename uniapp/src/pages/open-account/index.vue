<template>
  <view class="page-container">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">商户入驻</text>
    </view>

    <!-- 开户进度 -->
    <view class="progress-bar">
      <view class="step" :class="{active: step>=1, done: step>1}">
        <view class="step-dot">1</view>
        <text class="step-label">填资料</text>
      </view>
      <view class="step-line" :class="{done: step>1}"></view>
      <view class="step" :class="{active: step>=2, done: step>2}">
        <view class="step-dot">2</view>
        <text class="step-label">上传证件</text>
      </view>
      <view class="step-line" :class="{done: step>2}"></view>
      <view class="step" :class="{active: step>=3, done: step>3}">
        <view class="step-dot">3</view>
        <text class="step-label">人脸识别</text>
      </view>
      <view class="step-line" :class="{done: step>3}"></view>
      <view class="step" :class="{active: step>=4, done: step>4}">
        <view class="step-dot">4</view>
        <text class="step-label">完成</text>
      </view>
    </view>

    <!-- 错误提示 -->
    <view v-if="errorMsg" class="error-tip">
      <text>{{ errorMsg }}</text>
    </view>

    <!-- Step 1: 填写商户基本信息 -->
    <scroll-view v-show="step === 1" class="form-scroll" scroll-y>
      <view class="form-card">
        <view class="card-title">商户入驻</view>
        <view class="card-desc">填写基本信息后，将跳转至钱账通完成后续入驻流程</view>

        <van-field v-model="form.merchant_name" label="商户名称" placeholder="请输入商户全称" required />
        <van-field v-model="form.legal_mobile" label="手机号码" type="tel" placeholder="请输入手机号码" required />

        <van-button type="primary" block round :loading="uploading" @click="submitStep2" style="margin-top:24px;">
          提交并获取开户页面
        </van-button>
      </view>
    </scroll-view>

    <!-- Step 3: 跳转H5人脸识别 -->
    <view v-show="step === 3" class="form-card" style="text-align:center;padding:60px 16px;">
      <van-loading type="spinner" size="48px" style="margin:0 auto 16px;" />
      <view style="font-size:16px;font-weight:600;margin-bottom:8px;">正在跳转到钱账通...</view>
      <view style="font-size:13px;color:#999;margin-bottom:16px;">请在跳转页面完成人脸识别验证</view>
      <van-button type="primary" block round @click="goToH5" v-if="h5Url">
        立即跳转
      </van-button>
      <van-button plain block round @click="step = 2" style="margin-top:12px;">
        返回修改资料
      </van-button>
    </view>

    <!-- Step 4: 完成 -->
    <view v-show="step === 4" class="form-card" style="text-align:center;padding:60px 16px;">
      <view style="font-size:48px;margin-bottom:16px;">🎉</view>
      <view style="font-size:18px;font-weight:600;margin-bottom:8px;">提交成功！</view>
      <view style="font-size:13px;color:#666;margin-bottom:16px;">
        商户名称：{{ form.merchant_name }}<br/>
        提交时间：{{ submitTime }}
      </view>
      <view style="font-size:13px;color:#999;margin-bottom:24px;">
        请在钱账通页面完成人脸识别<br/>
        开户结果将通过短信通知
      </view>
      <van-button type="primary" block round @click="goBack">返回首页</van-button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { submitMerchantApply } from '@/api/merchant/index.js'
import { qztRequest } from '@/api/qianztong/index.js'

const step = ref(1)
const loading = ref(false)
const uploading = ref(false)
const errorMsg = ref('')
const h5Url = ref('')
const submitTime = ref('')

// OCR 加载状态
const ocrLoading = reactive({
  legal_front: false,
  license: false,
})

// 商户ID（用于后续查询状态）
let merchantId = ''
let outRequestNo = ''

const form = reactive({
  // 企业信息
  merchant_name: '',
  merchant_shortname: '',
  service_phone: '',
  business_license_type: '1',  // 1=三证合一，2=普通
  business_license_no: '',
  business_license_province: '',
  business_license_city: '',
  business_license_address: '',
  business_address: '',
  // 法人信息
  legal_name: '',
  legal_id_card_no: '',
  legal_id_card_expire: '',
  legal_phone: '',
  // 结算账户
  bank_account_type: '1',  // 1=对公
  bank_name: '',
  bank_account_name: '',
  bank_account_no: '',
  bank_province: '',
  bank_city: '',
  bank_branch_name: '',
  bank_union_code: '',
  // 证件照片（上传后的base64）
  legal_id_card_front: '',
  legal_id_card_back: '',
  business_license_img: '',
  bank_account_permit: '',
})

// 文件上传后的 file_key
const fileKeys = reactive({
  legal_id_card_front: '',
  legal_id_card_back: '',
  business_license_img: '',
  bank_account_permit: '',
})

const goBack = () => uni.navigateBack()

// ---------- 选择图片 ----------
async function handleChooseImage(field) {
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    })

    const filePath = res.tempFilePaths[0]
    // 显示预览
    form[field] = filePath

    // 读取文件内容
    const fs = uni.getFileSystemManager()
    const base64 = await new Promise((resolve, reject) => {
      fs.readFile({
        filePath: filePath,
        encoding: 'base64',
        success: (r) => resolve(r.data),
        fail: reject
      })
    })

    // 保存 base64 用于后续上传
    form[field + '_base64'] = base64

  } catch (e) {
    console.error('选择图片失败:', e)
    uni.showToast({ title: '选择图片失败', icon: 'none' })
  }
}

// ---------- OCR 识别 ----------
/**
 * 调用 BFF OCR 接口
 * type: legal_front=身份证正面, license=营业执照
 */
async function doOCR(type) {
  let imageField = ''
  let ocrFieldMap = {}

  if (type === 'legal_front') {
    if (!form.legal_id_card_front) {
      uni.showToast({ title: '请先上传身份证正面照片', icon: 'none' }); return
    }
    ocrLoading.legal_front = true
    imageField = 'legal_id_card_front'
    ocrFieldMap = { legal_name: 'legal_name', legal_id_card_no: 'legal_id_card_no' }
  } else if (type === 'license') {
    if (!form.business_license_img) {
      uni.showToast({ title: '请先上传营业执照照片', icon: 'none' }); return
    }
    ocrLoading.license = true
    imageField = 'business_license_img'
    ocrFieldMap = { merchant_name: 'merchant_name', business_license_no: 'business_license_no', business_license_address: 'business_license_address' }
  }

  try {
    // 1. 先上传图片获取 file_key
    uni.showLoading({ title: '上传中...', mask: true })
    const ext = imageField.includes('img') ? 'jpg' : 'jpg'
    const fileName = `${imageField}.${ext}`
    const uploadResult = await uploadFile(fileName, ext, form[imageField + '_base64'])
    const fileKey = uploadResult.file_key || uploadResult
    uni.hideLoading()

    // 2. 调用 BFF OCR 接口
    const ocrTypeMap = { legal_front: '2', license: '1' }
    let ocrResult

    try {
      ocrResult = await uni.request({
        url: `https://bgualqb.cn/api/v1/merchants/ocr`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: { file_key: fileKey, type: ocrTypeMap[type] }
      })
      ocrResult = ocrResult.data
    } catch (e) {
      console.warn('[OCR] BFF not available, using mock:', e)
      // BFF 未上线时降级
      ocrResult = { status: '1', id_card_name: '', id_card_no: '', merchant_name: '', business_license_no: '', business_license_address: '' }
    }

    if (ocrResult.status !== '1') {
      throw new Error(ocrResult.error_message || 'OCR识别失败')
    }

    // 3. 回填表单
    for (const [ocrField, formField] of Object.entries(ocrFieldMap)) {
      if (ocrResult[ocrField] && form[formField] !== undefined) {
        form[formField] = ocrResult[ocrField]
      }
    }

    uni.showToast({ title: 'OCR识别成功，已自动填充', icon: 'success' })
  } catch (e) {
    console.warn('[OCR Error]', e)
    uni.showToast({ title: '识别失败，请手动输入', icon: 'none' })
  } finally {
    ocrLoading.legal_front = false
    ocrLoading.license = false
    uni.hideLoading()
  }
}

// ---------- Step 1: 提交基本信息 ----------
function submitStep1() {
  const required = [
    'merchant_name', 'merchant_shortname', 'service_phone',
    'business_license_province', 'business_license_city', 'business_license_address', 'business_address',
    'legal_name', 'legal_id_card_no', 'legal_id_card_expire', 'legal_phone',
    'bank_name', 'bank_account_name', 'bank_account_no', 'bank_province', 'bank_city', 'bank_branch_name'
  ]

  for (const field of required) {
    if (!form[field]) {
      errorMsg.value = `请填写${field}字段`
      uni.showToast({ title: errorMsg.value, icon: 'none' })
      return
    }
  }

  if (!/^\d{17}[\dXx]$/.test(form.legal_id_card_no)) {
    errorMsg.value = '请输入正确的身份证号'
    uni.showToast({ title: errorMsg.value, icon: 'none' })
    return
  }

  errorMsg.value = ''
  step.value = 2
}

// ---------- Step 2: 获取 H5 开户页面 ----------
async function submitStep2() {
  if (!form.legal_name || !form.legal_mobile) {
    uni.showToast({ title: '请填写必填信息', icon: 'none' })
    return
  }

  uploading.value = true
  errorMsg.value = ''

  try {
    uni.showLoading({ title: '获取开户页面...', mask: true })

    const applyResult = await submitMerchantApply({
      out_request_no: String(Date.now()),
      merchant_name: form.merchant_name,
      legal_mobile: form.legal_mobile,
      enterprise_type: '3',
    })

    uni.hideLoading()

    if (applyResult.code === 0) {
      merchantId = applyResult.data.merchant_id
      outRequestNo = applyResult.data.out_request_no
      h5Url.value = applyResult.data.h5_url

      step.value = 3
      submitTime.value = new Date().toLocaleString()

      if (h5Url.value) {
        setTimeout(() => {
          goToH5()
        }, 1500)
      }
    } else {
      uni.showToast({ title: applyResult.message || '提交失败', icon: 'none' })
    }

  } catch (e) {
    uni.hideLoading()
    console.error('提交申请失败:', e)
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    uploading.value = false
  }
}

// ---------- 跳转H5 ----------
function goToH5() {
  if (h5Url.value) {
    window.location.href = h5Url.value
  }
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container { min-height: 100vh; background: #f5f5f5; }

.nav-bar {
  display: flex; align-items: center;
  padding: 16px; background: #fff;
  border-bottom: 1px solid #eee;
}
.nav-back { font-size: 20px; margin-right: 12px; }
.nav-title { font-size: 16px; font-weight: 600; }

.progress-bar {
  display: flex; align-items: center; justify-content: center;
  padding: 20px 32px; background: #fff; margin-bottom: 12px;
}
.step { display: flex; flex-direction: column; align-items: center; }
.step-dot {
  width: 24px; height: 24px; border-radius: 50%;
  background: #ddd; color: #fff; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.step.active .step-dot { background: $primary-color; }
.step.done .step-dot { background: #52c41a; }
.step-label { font-size: 11px; color: #999; }
.step.active .step-label { color: $primary-color; font-weight: 600; }
.step-line {
  flex: 1; height: 2px; background: #ddd; margin: 0 4px; margin-bottom: 18px;
}
.step-line.done { background: #52c41a; }

.form-scroll { height: calc(100vh - 180px); }

.error-tip {
  margin: 0 16px 12px; padding: 10px 14px;
  background: #fff2f0; color: #cf1322;
  border: 1px solid #ffccc7; border-radius: 6px;
  font-size: 13px;
}

.form-card {
  margin: 0 16px 16px; padding: 16px;
  background: #fff; border-radius: $border-radius-md;
  box-shadow: $shadow-md;
}
.card-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }

.upload-tip { font-size: 12px; color: #999; margin-bottom: 16px; }
.upload-section { margin-bottom: 20px; }
.upload-label { font-size: 13px; color: #666; margin-bottom: 8px; }
.upload-box {
  width: 100%; height: 160px;
  border: 1px dashed #ddd; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.upload-placeholder {
  display: flex; flex-direction: column; align-items: center;
  color: #999;
}
.upload-placeholder .icon { font-size: 32px; margin-bottom: 8px; }
.preview-img { width: 100%; height: 100%; }
.ocr-btn-wrap {
  margin-top: 8px;
  display: flex;
  justify-content: flex-start;
}
</style>

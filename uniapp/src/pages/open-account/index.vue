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

    <!-- Step 1: 填写企业资料 -->
    <scroll-view v-show="step === 1" class="form-scroll" scroll-y>
      <view class="form-card">
        <view class="card-title">企业基本信息</view>
        <van-field v-model="form.merchant_name" label="商户名称" placeholder="请输入商户全称" required />
        <van-field v-model="form.merchant_shortname" label="商户简称" placeholder="请输入商户简称" />
        <van-field v-model="form.service_phone" label="客服电话" type="tel" placeholder="请输入客服电话" required />
        
        <view class="card-title" style="margin-top:16px">营业执照信息</view>
        <van-radio-group v-model="form.business_license_type" direction="horizontal" style="padding:12px 0;">
          <van-radio name="1" style="margin-right:20px;">三证合一</van-radio>
          <van-radio name="2">普通营业执照</van-radio>
        </van-radio-group>
        <van-field v-model="form.business_license_no" label="营业执照号" placeholder="请输入营业执照号" />
        <van-field v-model="form.business_license_province" label="营业执照省" placeholder="如：上海市" required />
        <van-field v-model="form.business_license_city" label="营业执照市" placeholder="如：上海市" required />
        <van-field v-model="form.business_license_address" label="详细地址" placeholder="请输入营业执照上的详细地址" required />
        <van-field v-model="form.business_address" label="实际经营地址" placeholder="请输入实际经营地址" required />

        <view class="card-title" style="margin-top:16px">法人信息</view>
        <van-field v-model="form.legal_name" label="法人姓名" placeholder="请输入法人姓名" required />
        <van-field v-model="form.legal_id_card_no" label="法人身份证号" placeholder="请输入18位身份证号" required />
        <van-field v-model="form.legal_id_card_expire" label="身份证有效期" placeholder="格式：20241231" required />
        <van-field v-model="form.legal_phone" label="法人手机号" type="tel" placeholder="请输入法人手机号" required />

        <view class="card-title" style="margin-top:16px">结算账户信息</view>
        <van-field v-model="form.bank_name" label="开户行名称" placeholder="如：招商银行上海分行" required />
        <van-field v-model="form.bank_account_name" label="账户名称" placeholder="同商户名称或企业名称" required />
        <van-field v-model="form.bank_account_no" label="账号" placeholder="请输入银行账号" required />
        <van-field v-model="form.bank_province" label="开户省" placeholder="如：上海市" required />
        <van-field v-model="form.bank_city" label="开户市" placeholder="如：上海市" required />
        <van-field v-model="form.bank_branch_name" label="开户支行" placeholder="如：浦东支行" required />
        <van-field v-model="form.bank_union_code" label="联行号" placeholder="请输入支行联行号" />

        <van-button type="primary" block round :loading="loading" @click="submitStep1" style="margin-top:24px;">
          下一步：上传证件照片
        </van-button>
      </view>
    </scroll-view>

    <!-- Step 2: 上传证件照片 -->
    <scroll-view v-show="step === 2" class="form-scroll" scroll-y>
      <view class="form-card">
        <view class="card-title">上传证件照片</view>
        <view class="upload-tip">请上传清晰的证件照片，支持 JPG、PNG 格式</view>

        <view class="upload-section">
          <view class="upload-label">法人身份证正面 *</view>
          <view class="upload-box" @click="chooseImage('legal_id_card_front')">
            <image v-if="form.legal_id_card_front" :src="form.legal_id_card_front" mode="aspectFit" class="preview-img" />
            <view v-else class="upload-placeholder">
              <text class="icon">📷</text>
              <text>点击上传</text>
            </view>
          </view>
        </view>

        <view class="upload-section">
          <view class="upload-label">法人身份证背面 *</view>
          <view class="upload-box" @click="chooseImage('legal_id_card_back')">
            <image v-if="form.legal_id_card_back" :src="form.legal_id_card_back" mode="aspectFit" class="preview-img" />
            <view v-else class="upload-placeholder">
              <text class="icon">📷</text>
              <text>点击上传</text>
            </view>
          </view>
        </view>

        <view class="upload-section">
          <view class="upload-label">营业执照 *</view>
          <view class="upload-box" @click="chooseImage('business_license_img')">
            <image v-if="form.business_license_img" :src="form.business_license_img" mode="aspectFit" class="preview-img" />
            <view v-else class="upload-placeholder">
              <text class="icon">📷</text>
              <text>点击上传</text>
            </view>
          </view>
        </view>

        <view class="upload-section">
          <view class="upload-label">银行账户证明（开户许可证）</view>
          <view class="upload-box" @click="chooseImage('bank_account_permit')">
            <image v-if="form.bank_account_permit" :src="form.bank_account_permit" mode="aspectFit" class="preview-img" />
            <view v-else class="upload-placeholder">
              <text class="icon">📷</text>
              <text>点击上传</text>
            </view>
          </view>
        </view>

        <van-button type="primary" block round :loading="uploading" @click="submitStep2" style="margin-top:24px;">
          下一步：提交申请
        </van-button>
        <van-button plain block round @click="step = 1" style="margin-top:12px;">上一步</van-button>
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
import { chooseImage } from '@/utils/uni.js'
import { uploadFile, submitMerchantApply } from '@/api/merchant.js'

const step = ref(1)
const loading = ref(false)
const uploading = ref(false)
const errorMsg = ref('')
const h5Url = ref('')
const submitTime = ref('')

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

// 兼容 uniapp 的 chooseImage
function chooseImage(field) {
  handleChooseImage(field)
}

// ---------- Step 1: 提交基本信息 ----------
function submitStep1() {
  // 必填校验
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
  
  // 身份证号格式校验
  if (!/^\d{17}[\dXx]$/.test(form.legal_id_card_no)) {
    errorMsg.value = '请输入正确的身份证号'
    uni.showToast({ title: errorMsg.value, icon: 'none' })
    return
  }
  
  errorMsg.value = ''
  step.value = 2
}

// ---------- Step 2: 上传证件 + 提交申请 ----------
async function submitStep2() {
  // 校验必传照片
  if (!form.legal_id_card_front_base64 || !form.legal_id_card_back_base64 || !form.business_license_img_base64) {
    uni.showToast({ title: '请上传必填的证件照片', icon: 'none' })
    return
  }

  uploading.value = true
  errorMsg.value = ''

  try {
    // 1. 上传证件照片到钱账通，获取 file_key
    const uploadFields = ['legal_id_card_front', 'legal_id_card_back', 'business_license_img']
    if (form.bank_account_permit_base64) uploadFields.push('bank_account_permit')

    for (const field of uploadFields) {
      if (form[field + '_base64']) {
        uni.showLoading({ title: `上传${field}...`, mask: true })
        
        const ext = field.includes('img') ? 'jpg' : 'jpg'
        const result = await uploadFile(`${field}.${ext}`, ext, form[field + '_base64'])
        
        fileKeys[field] = result.file_key
        uni.hideLoading()
      }
    }

    // 2. 提交商户开户申请
    uni.showLoading({ title: '提交申请中...', mask: true })
    
    const applyResult = await submitMerchantApply({
      merchant_name: form.merchant_name,
      merchant_shortname: form.merchant_shortname,
      service_phone: form.service_phone,
      business_license_type: parseInt(form.business_license_type),
      business_license_no: form.business_license_no,
      business_license_province: form.business_license_province,
      business_license_city: form.business_license_city,
      business_license_address: form.business_license_address,
      business_address: form.business_address,
      legal_name: form.legal_name,
      legal_id_card_no: form.legal_id_card_no,
      legal_id_card_expire: form.legal_id_card_expire,
      legal_phone: form.legal_phone,
      bank_account_type: form.bank_account_type,
      bank_name: form.bank_name,
      bank_account_name: form.bank_account_name,
      bank_account_no: form.bank_account_no,
      bank_province: form.bank_province,
      bank_city: form.bank_city,
      bank_branch_name: form.bank_branch_name,
      bank_union_code: form.bank_union_code,
      legal_id_card_front: fileKeys.legal_id_card_front,
      legal_id_card_back: fileKeys.legal_id_card_back,
      business_license_img: fileKeys.business_license_img,
      bank_account_permit: fileKeys.bank_account_permit
    })

    uni.hideLoading()

    if (applyResult.code === 0) {
      merchantId = applyResult.data.merchant_id
      outRequestNo = applyResult.data.out_request_no
      h5Url.value = applyResult.data.h5_url
      
      step.value = 3
      submitTime.value = new Date().toLocaleString()
      
      // 自动跳转
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
</style>
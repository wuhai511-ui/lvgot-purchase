<template>
  <div class="page">
    <div class="page-title">📤 提现申请</div>

    <!-- 账户选择器 -->
    <div class="card">
      <div class="card-header">提现账户</div>
      <div class="card-body">
        <el-row :gutter="20" align="middle">
          <el-col :span="6">
            <el-select v-model="selectedMerchantId" placeholder="选择提现账户" style="width: 100%" @change="handleAccountChange">
              <el-option v-for="acc in accountList" :key="acc.id" :label="acc.accountName" :value="acc.id">
                <span>{{ acc.accountName }}</span>
                <span style="float: right; color: #999; font-size: 12px">{{ acc.mobile }}</span>
              </el-option>
            </el-select>
          </el-col>
          <el-col :span="6">
            <div class="balance-display">
              <span class="balance-label">账户余额：</span>
              <span class="balance-value">¥{{ accountBalance.toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="balance-display">
              <span class="balance-label">可提现余额：</span>
              <span class="balance-value available">¥{{ availableBalance.toFixed(2) }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 提现表单 -->
    <div class="card" v-if="!showSmsConfirm">
      <div class="card-header">提现信息</div>
      <div class="card-body">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
          <el-form-item label="提现金额" prop="amount">
            <el-input v-model.number="form.amount" placeholder="请输入提现金额" style="width:300px">
              <template #prepend>¥</template>
            </el-input>
          </el-form-item>
          <el-form-item label="收款银行卡" prop="bank_card_no">
            <el-select v-model="form.bank_card_no" placeholder="选择银行卡" style="width:300px">
              <el-option v-for="card in bankCards" :key="card.id" :label="`${card.bank_name} (${card.card_no_masked})`" :value="card.card_no"/>
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" placeholder="选填" style="width:300px"/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleApplyWithdraw" :disabled="!selectedMerchantId">申请提现</el-button>
            <span v-if="!selectedMerchantId" style="color: #999; margin-left: 12px">请先选择提现账户</span>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- SMS 确认弹窗 -->
    <el-dialog v-model="showSmsConfirm" title="短信验证确认" width="450px" :close-on-click-modal="false">
      <el-alert type="info" :closable="false" style="margin-bottom: 20px">
        <template #title>
          提现申请已发起，短信验证码已发送至您的手机，请输入验证码完成提现。
        </template>
      </el-alert>
      <el-form :model="smsForm" ref="smsFormRef" label-width="100px">
        <el-form-item label="提现金额">
          <span class="amount-highlight">¥{{ form.amount }}</span>
        </el-form-item>
        <el-form-item label="验证码" prop="sms_code" :rules="[{ required: true, message: '请输入验证码', trigger: 'blur' }]">
          <el-input v-model="smsForm.sms_code" placeholder="请输入短信验证码" style="width: 200px" maxlength="6">
            <template #append>
              <el-button :disabled="countdown > 0" @click="resendSms">
                {{ countdown > 0 ? `${countdown}s 后重发` : '重新发送' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelWithdraw">取消</el-button>
        <el-button type="primary" :loading="confirming" @click="handleConfirmWithdraw">确认提现</el-button>
      </template>
    </el-dialog>

    <!-- 提现记录 -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">📜 提现记录</div>
      <div class="card-body">
        <el-table :data="records" v-loading="loadingRecords" stripe>
          <el-table-column prop="transaction_no" label="提现单号" width="200"/>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{row}">¥{{ row.amount }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="statusType[row.status]">{{ statusMap[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="时间">
            <template #default="{row}">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { applyWithdraw, confirmWithdraw, getWithdrawRecords } from '@/api/withdraw'
import { getBankCards } from '@/api/bankCard'
import { getAccountBalance } from '@/api/account'
import { getMerchantList } from '@/api/merchant'

const route = useRoute()
const formRef = ref()
const smsFormRef = ref()
const submitting = ref(false)
const confirming = ref(false)
const loadingRecords = ref(false)
const showSmsConfirm = ref(false)
const countdown = ref(0)

let countdownTimer = null

const selectedMerchantId = ref(null)
const accountList = ref([])
const accountBalance = ref(0)
const availableBalance = ref(0)

const form = reactive({
  amount: null,
  bank_card_no: '',
  remark: ''
})

const smsForm = reactive({
  sms_code: ''
})

const withdrawOrder = reactive({
  out_request_no: '',
  withdraw_seq_no: '',
  account_no: ''
})

const rules = {
  amount: [{ required: true, message: '请输入提现金额', trigger: 'blur' }],
  bank_card_no: [{ required: true, message: '请选择银行卡', trigger: 'change' }]
}

const bankCards = ref([])
const records = ref([])

const statusMap = { 'PENDING': '处理中', 'SUCCESS': '成功', 'FAILED': '失败', 'SMS_PENDING': '待验证' }
const statusType = { 'PENDING': 'warning', 'SUCCESS': 'success', 'FAILED': 'danger', 'SMS_PENDING': 'info' }

const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const fetchAccountList = async () => {
  try {
    const res = await getMerchantList({ status: 'ACTIVE' })
    if (res.code === 0) {
      accountList.value = (res.data || []).map((item) => ({
        id: item.id,
        accountName: item.register_name,
        mobile: item.legal_mobile,
        accountNo: item.qzt_response?.account_no
      }))

      // 如果 URL 带有 merchant_id 参数，自动选中
      if (route.query.merchant_id) {
        selectedMerchantId.value = parseInt(route.query.merchant_id)
        handleAccountChange(selectedMerchantId.value)
      } else if (accountList.value.length > 0) {
        selectedMerchantId.value = accountList.value[0].id
        handleAccountChange(selectedMerchantId.value)
      }
    }
  } catch (e) {
    console.error('获取账户列表失败:', e)
  }
}

const handleAccountChange = async (merchantId) => {
  if (!merchantId) return

  // 获取余额
  try {
    const res = await getAccountBalance(merchantId)
    if (res.code === 0) {
      accountBalance.value = res.data?.balance || 0
      availableBalance.value = res.data?.available_amount || 0
    }
  } catch (e) {
    console.error('获取余额失败:', e)
  }

  // 获取银行卡
  try {
    const res = await getBankCards(merchantId)
    if (res.code === 0) {
      bankCards.value = res.data || []
    }
  } catch (e) {
    console.error('获取银行卡失败:', e)
  }

  // 获取提现记录
  fetchRecords()
}

const fetchRecords = async () => {
  if (!selectedMerchantId.value) return

  loadingRecords.value = true
  try {
    const res = await getWithdrawRecords({ merchant_id: selectedMerchantId.value, pageSize: 10 })
    if (res.code === 0) records.value = res.data || []
  } catch (e) {
    console.error('获取提现记录失败:', e)
  } finally {
    loadingRecords.value = false
  }
}

const handleApplyWithdraw = async () => {
  if (!selectedMerchantId.value) {
    ElMessage.warning('请先选择提现账户')
    return
  }

  await formRef.value?.validate()

  if (form.amount > availableBalance.value) {
    ElMessage.warning('提现金额不能超过可提现余额')
    return
  }

  const account = accountList.value.find(a => a.id === selectedMerchantId.value)
  if (!account) {
    ElMessage.error('账户信息异常')
    return
  }

  submitting.value = true
  try {
    const res = await applyWithdraw({
      merchant_id: selectedMerchantId.value,
      account_no: account.accountNo,
      amount: form.amount,
      bank_card_no: form.bank_card_no,
      remark: form.remark
    })

    if (res.code === 0) {
      // 进入短信确认阶段
      withdrawOrder.out_request_no = res.data?.out_request_no || res.data?.transaction_no
      withdrawOrder.withdraw_seq_no = res.data?.withdraw_seq_no
      withdrawOrder.account_no = account.accountNo
      showSmsConfirm.value = true
      startCountdown()
      ElMessage.success('短信验证码已发送')
    } else {
      ElMessage.error(res.message || '提现申请失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '提现申请失败')
  } finally {
    submitting.value = false
  }
}

const startCountdown = () => {
  countdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
    }
  }, 1000)
}

const resendSms = async () => {
  // 重新发起提现申请（会触发短信）
  try {
    const account = accountList.value.find(a => a.id === selectedMerchantId.value)
    await applyWithdraw({
      merchant_id: selectedMerchantId.value,
      account_no: account.accountNo,
      amount: form.amount,
      bank_card_no: form.bank_card_no,
      remark: form.remark
    })
    startCountdown()
    ElMessage.success('验证码已重新发送')
  } catch (e) {
    ElMessage.error('发送验证码失败')
  }
}

const handleConfirmWithdraw = async () => {
  await smsFormRef.value?.validate()

  confirming.value = true
  try {
    const res = await confirmWithdraw({
      out_request_no: withdrawOrder.out_request_no,
      account_no: withdrawOrder.account_no,
      withdraw_seq_no: withdrawOrder.withdraw_seq_no,
      sms_code: smsForm.sms_code
    })

    if (res.code === 0) {
      ElMessage.success('提现成功')
      showSmsConfirm.value = false
      smsForm.sms_code = ''
      // 重置表单
      form.amount = null
      form.bank_card_no = ''
      form.remark = ''
      // 刷新数据
      handleAccountChange(selectedMerchantId.value)
    } else {
      ElMessage.error(res.message || '提现确认失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '提现确认失败')
  } finally {
    confirming.value = false
  }
}

const cancelWithdraw = () => {
  showSmsConfirm.value = false
  smsForm.sms_code = ''
}

onMounted(() => {
  fetchAccountList()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
.balance-display { display: flex; align-items: center; }
.balance-label { color: #666; font-size: 14px; }
.balance-value { font-size: 20px; font-weight: 700; color: #1976D2; margin-left: 8px; }
.balance-value.available { color: #4CAF50; }
.amount-highlight { font-size: 20px; font-weight: 700; color: #FF5722; }
</style>
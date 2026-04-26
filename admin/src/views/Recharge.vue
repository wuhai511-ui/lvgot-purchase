<template>
  <div class="page">
    <div class="page-title">🔄 账户充值</div>

    <!-- 账户选择器 -->
    <div class="card">
      <div class="card-header">充值账户</div>
      <div class="card-body">
        <el-row :gutter="20" align="middle">
          <el-col :span="6">
            <el-select v-model="selectedMerchantId" placeholder="选择充值账户" style="width: 100%" @change="handleAccountChange">
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
              <span class="balance-label">可充值额度：</span>
              <span class="balance-value available">¥{{ availableAmount.toFixed(2) }}</span>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- 充值表单 -->
    <div class="card" v-if="!showResult">
      <div class="card-header">充值信息</div>
      <div class="card-body">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
          <el-form-item label="充值金额" prop="amount">
            <el-input v-model.number="form.amount" placeholder="请输入充值金额" style="width:300px">
              <template #prepend>¥</template>
            </el-input>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" placeholder="选填" style="width:300px"/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleRecharge" :disabled="!selectedMerchantId">确认充值</el-button>
            <span v-if="!selectedMerchantId" style="color: #999; margin-left: 12px">请先选择充值账户</span>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 充值结果 -->
    <div class="card" v-else>
      <div class="card-header">充值结果</div>
      <div class="card-body">
        <el-result v-if="result.status === 'SUCCESS'" icon="success" title="充值成功" :sub-title="`充值金额: ¥${result.amount}`">
          <template #extra>
            <el-button type="primary" @click="resetForm">继续充值</el-button>
          </template>
        </el-result>
        <el-result v-else-if="result.status === 'PENDING'" icon="warning" title="充值处理中" sub-title="请稍后查询充值记录">
          <template #extra>
            <el-button type="primary" @click="$router.push('/recharge-records')">查看记录</el-button>
          </template>
        </el-result>
        <el-result v-else icon="error" title="充值失败" :sub-title="result.message">
          <template #extra>
            <el-button type="primary" @click="resetForm">重新充值</el-button>
          </template>
        </el-result>
      </div>
    </div>

    <!-- 收款账户信息弹窗 -->
    <el-dialog v-model="showPayeeDialog" title="转账信息" width="520px" :close-on-click-modal="false">
      <div class="payee-info">
        <div class="payee-alert">
          <el-icon style="color: #e6a23c; font-size: 18px; margin-right: 8px;"><WarningFilled /></el-icon>
          <span>请使用以下收款账户信息完成转账，转账完成后系统会自动确认到账</span>
        </div>
        <el-descriptions :column="1" border style="margin-top: 16px;">
          <el-descriptions-item label="充值订单号" label-width="140px">
            <span class="highlight-value">{{ payeeInfo.recharge_order_no }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="充值金额" label-width="140px">
            <span class="highlight-value money">¥{{ payeeInfo.amount }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="收款账户" label-width="140px">{{ payeeInfo.payee_acc_no }}</el-descriptions-item>
          <el-descriptions-item label="收款账户名" label-width="140px">{{ payeeInfo.payee_acc_name }}</el-descriptions-item>
          <el-descriptions-item label="收款开户银行" label-width="140px">{{ payeeInfo.payee_bank }}</el-descriptions-item>
          <el-descriptions-item label="收款开户行号" label-width="140px">{{ payeeInfo.payee_bank_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收款开户名" label-width="140px">{{ payeeInfo.payee_bank_name }}</el-descriptions-item>
          <el-descriptions-item label="收款开户地区" label-width="140px">{{ payeeInfo.payee_bank_area }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button type="primary" @click="showPayeeDialog = false; showResult = true">我已转账，查看结果</el-button>
        <el-button @click="resetForm">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 充值记录 -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">📜 最近充值记录</div>
      <div class="card-body">
        <el-table :data="records" v-loading="loadingRecords" stripe>
          <el-table-column prop="transaction_no" label="充值单号" width="200"/>
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
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import { applyRecharge, getRechargeRecords } from '@/api/recharge'
import { getAccountBalance } from '@/api/account'
import { getMerchantList } from '@/api/merchant'

const route = useRoute()
const formRef = ref()
const submitting = ref(false)
const showResult = ref(false)
const showPayeeDialog = ref(false)
const loadingRecords = ref(false)

const selectedMerchantId = ref(null)
const accountList = ref([])
const accountBalance = ref(0)
const availableAmount = ref(0)

const form = reactive({
  amount: null,
  remark: ''
})

const rules = {
  amount: [{ required: true, message: '请输入充值金额', trigger: 'blur' }]
}

const records = ref([])
const result = reactive({
  status: '',
  amount: 0,
  message: ''
})

const payeeInfo = reactive({
  recharge_order_no: '',
  amount: 0,
  payee_acc_no: '',
  payee_acc_name: '',
  payee_bank: '',
  payee_bank_no: '',
  payee_bank_name: '',
  payee_bank_area: ''
})

const statusMap = {
  'PENDING': '处理中',
  'SUCCESS': '成功',
  'FAILED': '失败'
}

const statusType = {
  'PENDING': 'warning',
  'SUCCESS': 'success',
  'FAILED': 'danger'
}

const formatTime = (time) => {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 19)
}

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

  try {
    const res = await getAccountBalance(merchantId)
    if (res.code === 0) {
      accountBalance.value = res.data?.balance || 0
      availableAmount.value = res.data?.available_amount || 0
    }
  } catch (e) {
    console.error('获取余额失败:', e)
  }

  fetchRecords()
}

const fetchRecords = async () => {
  if (!selectedMerchantId.value) return

  loadingRecords.value = true
  try {
    const res = await getRechargeRecords({ merchant_id: selectedMerchantId.value, pageSize: 5 })
    if (res.code === 0) {
      records.value = res.data || []
    }
  } catch (e) {
    console.error('获取充值记录失败:', e)
  } finally {
    loadingRecords.value = false
  }
}

const handleRecharge = async () => {
  if (!selectedMerchantId.value) {
    ElMessage.warning('请先选择充值账户')
    return
  }

  await formRef.value?.validate()

  submitting.value = true
  try {
    const res = await applyRecharge({
      merchant_id: selectedMerchantId.value,
      amount: form.amount,
      remark: form.remark
    })

    if (res.code === 0) {
      // 保存收款账户信息，弹窗展示
      payeeInfo.recharge_order_no = res.data.recharge_order_no || ''
      payeeInfo.amount = form.amount
      payeeInfo.payee_acc_no = res.data.payee_acc_no || ''
      payeeInfo.payee_acc_name = res.data.payee_acc_name || ''
      payeeInfo.payee_bank = res.data.payee_bank || ''
      payeeInfo.payee_bank_no = res.data.payee_bank_no || ''
      payeeInfo.payee_bank_name = res.data.payee_bank_name || ''
      payeeInfo.payee_bank_area = res.data.payee_bank_area || ''

      showPayeeDialog.value = true
      fetchRecords()
      handleAccountChange(selectedMerchantId.value)
    } else {
      ElMessage.error(res.message || '充值申请失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '充值申请失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.amount = null
  form.remark = ''
  showResult.value = false
  showPayeeDialog.value = false
}

onMounted(() => {
  fetchAccountList()
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
.payee-info { padding: 8px 0; }
.payee-alert {
  display: flex; align-items: center;
  padding: 12px 16px; background: #fdf6ec;
  border: 1px solid #faecd8; border-radius: 8px;
  color: #666; font-size: 13px; line-height: 1.6;
}
.highlight-value { font-weight: 600; font-family: monospace; }
.highlight-value.money { color: #1976D2; font-size: 16px; }
</style>

<template>
  <div class="page">
    <div class="page-title">🔄 账户充值</div>

    <!-- 充值表单 -->
    <div class="card" v-if="!showResult">
      <div class="card-header">充值信息</div>
      <div class="card-body">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
          <!-- 账户选择器 -->
          <el-form-item label="充值账户" prop="account_no">
            <el-select v-model="form.account_no" placeholder="请选择充值账户" style="width:300px" @change="onAccountChange">
              <el-option v-for="acc in accounts" :key="acc.account_no"
                :label="`${acc.account_no} ${acc.account_name ? '(' + acc.account_name + ')' : ''}`"
                :value="acc.account_no" />
            </el-select>
            <div v-if="selectedAccount" class="account-hint">
              账户余额：¥{{ formatAmount(selectedAccount.balance) }}&nbsp;&nbsp;
              账户类型：{{ selectedAccount.account_type === 'PERSONAL' ? '个人' : '企业' }}
            </div>
          </el-form-item>
          <el-form-item label="充值金额" prop="amount">
            <el-input v-model.number="form.amount" placeholder="请输入充值金额" style="width:300px">
              <template #prepend>¥</template>
            </el-input>
          </el-form-item>
          <el-form-item label="银行卡" prop="bank_card_no">
            <el-select v-model="form.bank_card_no" placeholder="选择银行卡" style="width:300px">
              <el-option v-for="card in bankCards" :key="card.id" :label="`${card.bank_name} (${card.card_no_masked})`" :value="card.card_no"/>
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" placeholder="选填" style="width:300px"/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleRecharge">确认充值</el-button>
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

    <!-- 充值记录 -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">📜 最近充值记录</div>
      <div class="card-body">
        <el-table :data="records" v-loading="loadingRecords" stripe>
          <el-table-column prop="transaction_no" label="充值单号" width="200"/>
          <el-table-column prop="account_no" label="账户编号" width="160"/>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { applyRecharge, getRechargeRecords } from '@/api/recharge'
import { getAccounts } from '@/api/account'
import { getBankCards } from '@/api/bankCard'

const route = useRoute()
const formRef = ref()
const submitting = ref(false)
const showResult = ref(false)
const loadingRecords = ref(false)

// 账户选择
const selectedAccountNo = ref(route.query.account_no || '')
const accounts = ref([])
const selectedAccount = computed(() => accounts.value.find(a => a.account_no === selectedAccountNo.value))

const form = reactive({
  account_no: selectedAccountNo.value,
  amount: null,
  bank_card_no: '',
  remark: ''
})

const rules = {
  account_no: [{ required: true, message: '请选择充值账户', trigger: 'change' }],
  amount: [{ required: true, message: '请输入充值金额', trigger: 'blur' }],
  bank_card_no: [{ required: true, message: '请选择银行卡', trigger: 'change' }]
}

const bankCards = ref([])
const records = ref([])
const result = reactive({
  status: '',
  amount: 0,
  message: ''
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

const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0.00'
  return (amount / 100).toFixed(2)
}

const onAccountChange = (accountNo) => {
  selectedAccountNo.value = accountNo
}

const fetchAccounts = async () => {
  try {
    const res = await getAccounts(1) // merchantId 从登录态获取，此处硬编码 1
    if (res.code === 0) {
      accounts.value = res.data || []
      // 如果 URL 没有 account_no 但有账户列表，默认选第一个
      if (!selectedAccountNo.value && accounts.value.length > 0) {
        selectedAccountNo.value = accounts.value[0].account_no
        form.account_no = selectedAccountNo.value
      }
    }
  } catch (e) {
    console.error('加载账户列表失败', e)
  }
}

const fetchBankCards = async () => {
  try {
    const res = await getBankCards()
    if (res.code === 0) {
      bankCards.value = res.data || []
    }
  } catch (e) {
    console.error('获取银行卡失败:', e)
  }
}

const fetchRecords = async () => {
  loadingRecords.value = true
  try {
    const params = {}
    if (selectedAccountNo.value) params.account_no = selectedAccountNo.value
    const res = await getRechargeRecords(params)
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
  await formRef.value?.validate()

  submitting.value = true
  try {
    const res = await applyRecharge({
      account_no: form.account_no,
      amount: form.amount,
      bank_card_no: form.bank_card_no,
      remark: form.remark
    })

    if (res.code === 0) {
      result.status = res.data.status || 'PENDING'
      result.amount = form.amount
      result.message = res.data.message || ''
      showResult.value = true
      fetchRecords()
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
  form.bank_card_no = ''
  form.remark = ''
  showResult.value = false
}

onMounted(async () => {
  await fetchAccounts()
  await fetchBankCards()
  await fetchRecords()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
.account-hint { margin-top: 4px; color: #999; font-size: 12px; }
</style>

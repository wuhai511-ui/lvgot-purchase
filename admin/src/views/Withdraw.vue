<template>
  <div class="page">
    <div class="page-title">📤 提现申请</div>

    <div class="card">
      <div class="card-header">提现信息</div>
      <div class="card-body">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
          <el-form-item label="可提现余额">
            <span class="balance">¥{{ availableBalance }}</span>
          </el-form-item>
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
            <el-button type="primary" :loading="submitting" @click="handleWithdraw">确认提现</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { applyWithdraw, getWithdrawRecords } from '@/api/withdraw'
import { getBankCards } from '@/api/bankCard'
import { getAccountBalance } from '@/api/account'

const formRef = ref()
const submitting = ref(false)
const loadingRecords = ref(false)

const form = reactive({
  amount: null,
  bank_card_no: '',
  remark: ''
})

const rules = {
  amount: [{ required: true, message: '请输入提现金额', trigger: 'blur' }],
  bank_card_no: [{ required: true, message: '请选择银行卡', trigger: 'change' }]
}

const bankCards = ref([])
const records = ref([])
const balanceInfo = ref({ balance: 0, available_amount: 0 })

const availableBalance = computed(() => balanceInfo.value.available_amount || 0)

const statusMap = { 'PENDING': '处理中', 'SUCCESS': '成功', 'FAILED': '失败' }
const statusType = { 'PENDING': 'warning', 'SUCCESS': 'success', 'FAILED': 'danger' }

const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const fetchData = async () => {
  try {
    const [balanceRes, cardsRes] = await Promise.all([
      getAccountBalance(),
      getBankCards()
    ])
    if (balanceRes.code === 0) balanceInfo.value = balanceRes.data
    if (cardsRes.code === 0) bankCards.value = cardsRes.data || []
  } catch (e) {
    console.error('获取数据失败:', e)
  }
}

const fetchRecords = async () => {
  loadingRecords.value = true
  try {
    const res = await getWithdrawRecords({ pageSize: 10 })
    if (res.code === 0) records.value = res.data || []
  } catch (e) {
    console.error('获取提现记录失败:', e)
  } finally {
    loadingRecords.value = false
  }
}

const handleWithdraw = async () => {
  await formRef.value?.validate()
  
  if (form.amount > availableBalance.value) {
    ElMessage.warning('提现金额不能超过可提现余额')
    return
  }
  
  submitting.value = true
  try {
    const res = await applyWithdraw({
      amount: form.amount,
      bank_card_no: form.bank_card_no,
      remark: form.remark
    })
    
    if (res.code === 0) {
      ElMessage.success('提现申请已提交')
      form.amount = null
      form.bank_card_no = ''
      form.remark = ''
      fetchRecords()
      fetchData()
    } else {
      ElMessage.error(res.message || '提现申请失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '提现申请失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchRecords()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
.balance { font-size: 20px; font-weight: 700; color: #1976D2; }
</style>

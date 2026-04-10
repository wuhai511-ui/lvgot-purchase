<template>
  <div class="withdraw-page">
    <section class="hero card">
      <div>
        <div class="page-title">提现管理</div>
        <div class="page-subtitle">先看可提金额和到账规则，再发起申请并跟进进度。</div>
      </div>
      <div class="hero-balance">
        <span>当前可提现</span>
        <strong>¥{{ formatMoney(availableBalance) }}</strong>
        <small>到账方式：银行卡结算，预计 T+1</small>
      </div>
    </section>

    <section class="content-grid">
      <article class="card form-card">
        <div class="section-heading"><div><h2>发起提现</h2><p>支持按银行卡结算，输入金额时同步提示手续费和预计到账额。</p></div></div>
        <div class="rule-strip"><span class="status-pill info">到账预计 T+1</span><span class="status-pill warning">建议优先保留必要周转金</span></div>
        <el-form :model="form" :rules="rules" ref="formRef" label-width="110px" class="withdraw-form">
          <el-form-item label="可提现余额"><div class="amount-panel">¥{{ formatMoney(availableBalance) }}</div></el-form-item>
          <el-form-item label="提现金额" prop="amount"><el-input v-model.number="form.amount" placeholder="请输入提现金额"><template #prepend>¥</template></el-input></el-form-item>
          <el-form-item label="到账银行卡" prop="bank_card_no"><el-select v-model="form.bank_card_no" placeholder="请选择银行卡"><el-option v-for="card in bankCards" :key="card.id" :label="`${card.bank_name} (${card.card_no_masked})`" :value="card.card_no" /></el-select></el-form-item>
          <el-form-item label="备注说明"><el-input v-model="form.remark" placeholder="选填，用于内部备注" /></el-form-item>
        </el-form>
        <div class="settlement-card surface-muted"><div class="settlement-item"><span>手续费参考</span><strong>¥{{ estimatedFee }}</strong></div><div class="settlement-item"><span>预计到账</span><strong>¥{{ estimatedNetAmount }}</strong></div></div>
        <div class="form-actions"><el-button type="primary" :loading="submitting" @click="handleWithdraw">确认提现</el-button></div>
      </article>

      <article class="card side-card">
        <div class="section-heading"><div><h2>提现规则</h2><p>帮助商户快速理解到账时效与异常处理。</p></div></div>
        <div class="rule-list">
          <div class="rule-item"><strong>到账时效</strong><span>默认预计 T+1 到账，节假日顺延。</span></div>
          <div class="rule-item"><strong>风控提醒</strong><span>若账户资料缺失或银行卡异常，提现可能被驳回。</span></div>
          <div class="rule-item"><strong>建议动作</strong><span>提现前确认最近分账是否已到账，避免个人端提现预期落空。</span></div>
        </div>
      </article>
    </section>

    <section class="card record-card">
      <div class="section-heading"><div><h2>最近提现记录</h2><p>重点关注处理中和失败原因，避免重复申请。</p></div></div>
      <el-table :data="records" v-loading="loadingRecords" stripe>
        <el-table-column prop="transaction_no" label="提现单号" min-width="220" />
        <el-table-column label="提现金额" width="140"><template #default="{ row }">¥{{ formatMoney(row.amount || 0) }}</template></el-table-column>
        <el-table-column label="状态" width="130"><template #default="{ row }"><span class="status-pill" :class="pillClass(row.status)">{{ statusMap[row.status] || row.status }}</span></template></el-table-column>
        <el-table-column label="申请时间" width="180"><template #default="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column>
        <el-table-column label="说明" min-width="220"><template #default="{ row }">{{ recordHint(row.status) }}</template></el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { applyWithdraw, getWithdrawRecords } from '@/api/withdraw'
import { getBankCards } from '@/api/bankCard'
import { getAccountBalance } from '@/api/account'
import { formatMoney } from '@/utils/format'

const formRef = ref()
const submitting = ref(false)
const loadingRecords = ref(false)
const form = reactive({ amount: null, bank_card_no: '', remark: '' })
const rules = { amount: [{ required: true, message: '请输入提现金额', trigger: 'blur' }], bank_card_no: [{ required: true, message: '请选择到账银行卡', trigger: 'change' }] }
const bankCards = ref([])
const records = ref([])
const balanceInfo = ref({ balance: 0, available_amount: 0 })
const availableBalance = computed(() => Number(balanceInfo.value.available_amount || 0))
const estimatedFee = computed(() => !form.amount ? formatMoney(0) : formatMoney(Math.max(1, Number(form.amount) * 0.001)))
const estimatedNetAmount = computed(() => !form.amount ? formatMoney(0) : formatMoney(Math.max(Number(form.amount) - Math.max(1, Number(form.amount) * 0.001), 0)))
const statusMap = { PENDING: '处理中', SUCCESS: '已到账', FAILED: '异常待处理' }
const formatTime = (time) => (time ? time.replace('T', ' ').substring(0, 19) : '-')
const pillClass = (status) => (status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning')
const recordHint = (status) => status === 'FAILED' ? '请检查银行卡或资料是否完整后重试。' : status === 'PENDING' ? '银行处理中，建议暂勿重复申请。' : '已完成，可在个人端同步关注到账情况。'

const fetchData = async () => {
  try {
    const [balanceRes, cardsRes] = await Promise.all([getAccountBalance(), getBankCards()])
    if (balanceRes.code === 0) balanceInfo.value = balanceRes.data || balanceInfo.value
    if (cardsRes.code === 0) bankCards.value = cardsRes.data || []
  } catch (error) {
    console.error('获取提现数据失败:', error)
  }
}

const fetchRecords = async () => {
  loadingRecords.value = true
  try {
    const res = await getWithdrawRecords({ pageSize: 10 })
    if (res.code === 0) records.value = res.data || []
  } catch (error) {
    console.error('获取提现记录失败:', error)
  } finally {
    loadingRecords.value = false
  }
}

const handleWithdraw = async () => {
  await formRef.value?.validate()
  if (Number(form.amount) > availableBalance.value) { ElMessage.warning('提现金额不能超过可提现余额'); return }
  submitting.value = true
  try {
    const res = await applyWithdraw({ amount: form.amount, bank_card_no: form.bank_card_no, remark: form.remark })
    if (res.code === 0) {
      ElMessage.success('提现申请已提交')
      form.amount = null
      form.bank_card_no = ''
      form.remark = ''
      fetchData(); fetchRecords()
    } else {
      ElMessage.error(res.message || '提现申请失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '提现申请失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => { fetchData(); fetchRecords() })
</script>

<style scoped lang="scss">
@import '@/styles/variables.scss';
.withdraw-page { display: grid; gap: 18px; }
.hero, .form-card, .side-card, .record-card { padding: 22px; }
.hero { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.hero-balance { min-width: 280px; padding: 20px; border-radius: 18px; background: $gradient-brand; color: #fff; }
.hero-balance span, .hero-balance small { display: block; opacity: 0.84; }
.hero-balance strong { display: block; margin: 10px 0; font-size: 32px; }
.content-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; }
.section-heading { margin-bottom: 16px; }
.section-heading h2 { font-size: 18px; color: $text-color; }
.section-heading p { margin-top: 6px; color: $text-secondary; line-height: 1.7; }
.rule-strip { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.withdraw-form :deep(.el-input), .withdraw-form :deep(.el-select) { width: 100%; }
.amount-panel { font-size: 24px; font-weight: 700; color: $primary-strong; }
.settlement-card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 16px; border-radius: 18px; border: 1px solid $border-color; }
.settlement-item span { display: block; font-size: 12px; color: $text-muted; }
.settlement-item strong { display: block; margin-top: 8px; font-size: 20px; color: $text-color; }
.form-actions { margin-top: 18px; }
.rule-list { display: grid; gap: 12px; }
.rule-item { padding: 16px; border-radius: 16px; background: linear-gradient(180deg, #ffffff 0%, #f7fbf9 100%); border: 1px solid $border-color; }
.rule-item strong { display: block; color: $text-color; }
.rule-item span { display: block; margin-top: 8px; color: $text-secondary; line-height: 1.7; }
@media (max-width: 1100px) { .hero, .content-grid { grid-template-columns: 1fr; flex-direction: column; align-items: stretch; } }
</style>

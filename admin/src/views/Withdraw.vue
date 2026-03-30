<template>
  <div class="page">
    <div class="page-title">📤 提现申请</div>
    <div class="card">
      <div class="card-header">提现信息</div>
      <div class="card-body">
        <el-form :model="form" label-width="120px">
          <el-form-item label="提现账户">
            <el-select v-model="form.accountType" style="width:300px">
              <el-option label="拉卡拉账户" value="lakala"/>
              <el-option label="银行内部户" value="bank"/>
            </el-select>
          </el-form-item>
          <el-form-item label="可提现余额">
            <span class="money">¥80,000.00</span> <span style="color:#888;font-size:13px">（含银行内部户）</span>
          </el-form-item>
          <el-form-item label="提现金额" required>
            <el-input v-model.number="form.amount" placeholder="请输入提现金额" style="width:300px">
              <template #prepend>¥</template>
            </el-input>
          </el-form-item>
          <el-form-item label="到账银行卡">
            <el-select v-model="form.cardId" placeholder="请选择银行卡" style="width:300px">
              <el-option v-for="card in cards" :key="card.cardNo" :label="card.bankName + ' ' + card.cardNo.slice(-4)" :value="card.cardNo"/>
            </el-select>
          </el-form-item>
          <el-form-item label="手续费">
            <span style="color:#E6A23C">按钱账通运营后台配置收取</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleWithdraw">确认提现</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
    <div class="tips"><el-icon>💡</el-icon> 到账时间：1-3个工作日</div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
const form = reactive({ accountType: 'lakala', amount: null, cardId: '' })
const cards = ref([{ bankName: '中国农业银行', cardNo: '6228481234567890' }])
const submitting = ref(false)
const handleWithdraw = async () => {
  if (!form.amount || form.amount <= 0) { ElMessage.warning('请输入正确金额'); return }
  if (!form.cardId) { ElMessage.warning('请选择到账银行卡'); return }
  submitting.value = true
  await new Promise(r => setTimeout(r, 1200))
  submitting.value = false
  ElMessage.success('提现申请已提交')
  form.amount = null
}
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
.tips { color: #888; font-size: 13px; margin-top: 12px; display: flex; align-items: center; gap: 6px; }
</style>

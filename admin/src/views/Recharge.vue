<template>
  <div class="page">
    <div class="page-title">🔄 账户充值</div>
    <div class="card">
      <div class="card-header">充值信息</div>
      <div class="card-body">
        <el-form :model="form" label-width="120px">
          <el-form-item label="充值账户">
            <el-select v-model="form.accountType" style="width:300px">
              <el-option label="拉卡拉账户" value="lakala"/>
              <el-option label="银行内部户" value="bank"/>
            </el-select>
          </el-form-item>
          <el-form-item label="充值金额" required>
            <el-input v-model.number="form.amount" placeholder="请输入充值金额" style="width:300px">
              <template #prepend>¥</template>
            </el-input>
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
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
const form = reactive({ accountType: 'lakala', amount: null, remark: '' })
const submitting = ref(false)
const handleRecharge = async () => {
  if (!form.amount || form.amount <= 0) { ElMessage.warning('请输入正确金额'); return }
  submitting.value = true
  await new Promise(r => setTimeout(r, 1200))
  submitting.value = false
  ElMessage.success('充值成功')
  form.amount = null; form.remark = ''
}
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>

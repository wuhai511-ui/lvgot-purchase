<template>
  <div class="page">
    <div class="page-title">💳 银行卡管理</div>
    <div class="card">
      <div class="card-header">
        <span>已绑定银行卡</span>
        <el-button type="primary" size="small" @click="showBindDialog = true">+ 添加银行卡</el-button>
      </div>
      <div class="card-body">
        <el-table :data="cards" stripe v-if="cards.length">
          <el-table-column prop="bankName" label="银行名称" width="150"/>
          <el-table-column prop="cardNo" label="卡号" width="200">
            <template #default="{row}">{{ row.cardNo.replace(/(\d{4})\d+(\d{4})/, '$1****$2') }}</template>
          </el-table-column>
          <el-table-column prop="accountName" label="开户名" width="150"/>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}"><el-tag size="small" :type="row.status==='active'?'success':'warning'">{{ row.status==='active'?'正常':'绑定中' }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="bindTime" label="绑定时间" width="170"/>
          <el-table-column label="操作" width="120">
            <template #default="{row}">
              <el-button type="danger" size="small" @click="handleUnbind(row)">解绑</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂未绑定银行卡"/>
      </div>
    </div>

    <!-- 绑卡弹窗 -->
    <el-dialog v-model="showBindDialog" title="添加银行卡" width="450px">
      <el-form :model="bindForm" label-width="100px">
        <el-form-item label="开户银行" required>
          <el-select v-model="bindForm.bankCode" placeholder="请选择银行" style="width:100%">
            <el-option label="中国工商银行" value="ICBC"/>
            <el-option label="中国农业银行" value="ABC"/>
            <el-option label="中国建设银行" value="CCB"/>
            <el-option label="招商银行" value="CMB"/>
            <el-option label="支付宝" value="ALIPAY"/>
          </el-select>
        </el-form-item>
        <el-form-item label="银行卡号" required>
          <el-input v-model="bindForm.cardNo" placeholder="请输入银行卡号" maxlength="19"/>
        </el-form-item>
        <el-form-item label="开户名" required>
          <el-input v-model="bindForm.accountName" placeholder="请输入开户名"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBindDialog=false">取消</el-button>
        <el-button type="primary" :loading="binding" @click="handleBind">确认绑卡</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const cards = ref([
  { bankName: '中国农业银行', cardNo: '6228481234567890', accountName: '张三商行', status: 'active', bindTime: '2026-03-20 10:00:00' }
])
const showBindDialog = ref(false)
const binding = ref(false)
const bindForm = reactive({ bankCode: '', cardNo: '', accountName: '' })

const handleBind = async () => {
  if (!bindForm.bankCode || !bindForm.cardNo || !bindForm.accountName) { ElMessage.warning('请填写完整'); return }
  binding.value = true
  await new Promise(r => setTimeout(r, 1200))
  cards.value.push({ bankName: bindForm.bankCode, cardNo: bindForm.cardNo, accountName: bindForm.accountName, status: 'active', bindTime: new Date().toLocaleString() })
  showBindDialog.value = false
  binding.value = false
  ElMessage.success('绑卡成功')
}

const handleUnbind = (row) => {
  ElMessageBox.confirm('确定要解绑该银行卡吗？', '解绑确认', { type: 'warning' })
    .then(() => { cards.value = cards.value.filter(c => c.cardNo !== row.cardNo); ElMessage.success('已解绑') })
    .catch(() => {})
}
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>

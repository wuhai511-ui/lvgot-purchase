<template>
  <div class="page">
    <div class="page-title">💳 银行卡管理</div>

    <!-- 添加银行卡 -->
    <div class="card">
      <div class="card-header">绑定银行卡</div>
      <div class="card-body">
        <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="持卡人姓名" prop="bank_card_name">
                <el-input v-model="form.bank_card_name" placeholder="请输入持卡人姓名"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="银行卡号" prop="bank_card_no">
                <el-input v-model="form.bank_card_no" placeholder="请输入银行卡号" maxlength="19"/>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="银行" prop="bank_code">
                <el-select v-model="form.bank_code" placeholder="选择银行" filterable style="width: 100%">
                  <el-option v-for="bank in bankList" :key="bank.code" :label="bank.name" :value="bank.code"/>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="卡类型" prop="bank_type">
                <el-radio-group v-model="form.bank_type">
                  <el-radio value="1">借记卡</el-radio>
                  <el-radio value="2">信用卡</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="开户省份" prop="bank_province">
                <el-input v-model="form.bank_province" placeholder="省份"/>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="开户城市" prop="bank_city">
                <el-input v-model="form.bank_city" placeholder="城市"/>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="开户支行" prop="bank_branch">
                <el-input v-model="form.bank_branch" placeholder="支行名称"/>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleBind">绑定银行卡</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 已绑定银行卡列表 -->
    <div class="card">
      <div class="card-header">已绑定银行卡</div>
      <div class="card-body">
        <el-table :data="bankCards" v-loading="loading" stripe>
          <el-table-column prop="bank_name" label="银行" width="150"/>
          <el-table-column prop="card_no_masked" label="卡号" width="180"/>
          <el-table-column prop="card_type" label="卡类型" width="100">
            <template #default="{row}">
              <el-tag size="small">{{ row.card_type === 'DEBIT' ? '借记卡' : '信用卡' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="card_holder_name" label="持卡人" width="120"/>
          <el-table-column prop="is_default" label="默认" width="80">
            <template #default="{row}">
              <el-tag v-if="row.is_default" size="small" type="success">是</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="bind_time" label="绑定时间" width="170">
            <template #default="{row}">{{ formatTime(row.bind_time) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{row}">
              <el-button type="danger" link size="small" @click="handleUnbind(row)">解绑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBankCards, bindBankCard, unbindBankCard } from '@/api/bankCard'

const formRef = ref()
const submitting = ref(false)
const loading = ref(false)

const form = reactive({
  bank_card_no: '',
  bank_card_name: '',
  bank_code: '',
  bank_type: '1',
  bank_province: '',
  bank_city: '',
  bank_branch: ''
})

const rules = {
  bank_card_no: [{ required: true, message: '请输入银行卡号', trigger: 'blur' }],
  bank_card_name: [{ required: true, message: '请输入持卡人姓名', trigger: 'blur' }],
  bank_code: [{ required: true, message: '请选择银行', trigger: 'change' }],
  bank_province: [{ required: true, message: '请输入省份', trigger: 'blur' }],
  bank_city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
  bank_branch: [{ required: true, message: '请输入支行名称', trigger: 'blur' }]
}

const bankCards = ref([])

const bankList = [
  { code: '01020000', name: '中国工商银行' },
  { code: '01030000', name: '中国农业银行' },
  { code: '01040000', name: '中国银行' },
  { code: '01050000', name: '中国建设银行' },
  { code: '03080000', name: '招商银行' },
  { code: '03030000', name: '光大银行' },
  { code: '03020000', name: '中信银行' },
  { code: '03050000', name: '民生银行' },
  { code: '03060000', name: '广发银行' },
  { code: '03070000', name: '平安银行' },
  { code: '03100000', name: '浦发银行' },
  { code: '03090000', name: '兴业银行' },
  { code: '04012900', name: '北京银行' },
  { code: '04031000', name: '上海银行' },
  { code: '04083300', name: '宁波银行' }
]

const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const fetchBankCards = async () => {
  loading.value = true
  try {
    const res = await getBankCards()
    if (res.code === 0) bankCards.value = res.data || []
  } catch (e) {
    console.error('获取银行卡失败:', e)
  } finally {
    loading.value = false
  }
}

const handleBind = async () => {
  await formRef.value?.validate()
  
  submitting.value = true
  try {
    const res = await bindBankCard(form)
    if (res.code === 0) {
      ElMessage.success('银行卡绑定成功')
      formRef.value?.resetFields()
      fetchBankCards()
    } else {
      ElMessage.error(res.message || '绑定失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '绑定失败')
  } finally {
    submitting.value = false
  }
}

const handleUnbind = async (row) => {
  try {
    await ElMessageBox.confirm('确定要解绑该银行卡吗？', '提示', { type: 'warning' })
    const res = await unbindBankCard(row.id)
    if (res.code === 0) {
      ElMessage.success('解绑成功')
      fetchBankCards()
    } else {
      ElMessage.error(res.message || '解绑失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '解绑失败')
  }
}

onMounted(() => fetchBankCards())
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>

<template>
  <div class="page">
    <div class="page-title">📐 分账规则</div>
    <div style="margin-bottom:20px"><el-button type="primary" @click="showDialog=true">+ 新增规则</el-button></div>
    <div class="card">
      <div class="card-header">自动分账规则</div>
      <div class="card-body">
        <el-table :data="rules" stripe>
          <el-table-column prop="name" label="规则名称" width="150"/>
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{row}"><el-tag size="small">{{ row.type==='ratio'?'比例':'固定金额' }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="value" label="值" width="120">
            <template #default="{row}">{{ row.type==='ratio'?row.value+'%': '¥'+row.value }}</template>
          </el-table-column>
          <el-table-column prop="receiverName" label="收款方" width="150"/>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}"><el-switch v-model="row.status" active-text="开" inactive-text="关"/></template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{row}"><el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button></template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <el-dialog v-model="showDialog" title="新增分账规则" width="450px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="规则名称" required><el-input v-model="form.name" placeholder="如：导游抽成"/></el-form-item>
        <el-form-item label="分账类型" required>
          <el-radio-group v-model="form.type">
            <el-radio label="ratio">按比例</el-radio>
            <el-radio label="fixed">固定金额</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分账值" required>
          <el-input v-model.number="form.value" style="width:200px">
            <template #append>{{ form.type==='ratio'?'%':'元' }}</template>
          </el-input>
        </el-form-item>
        <el-form-item label="收款方" required>
          <el-select v-model="form.receiverAccountNo" style="width:100%">
            <el-option label="李四 (导游)" value="LAK2026030003"/>
            <el-option label="王五 (司机)" value="LAK2026030004"/>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog=false">取消</el-button>
        <el-button type="primary" @click="handleAdd">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
const rules = ref([
  { name: '导游抽成', type: 'ratio', value: 15, receiverName: '李四 (导游)', receiverAccountNo: 'LAK2026030003', status: true },
  { name: '司机固定抽', type: 'fixed', value: 50, receiverName: '王五 (司机)', receiverAccountNo: 'LAK2026030004', status: false },
])
const showDialog = ref(false)
const form = reactive({ name: '', type: 'ratio', value: null, receiverAccountNo: '' })
const handleAdd = () => {
  if (!form.name || !form.value || !form.receiverAccountNo) { ElMessage.warning('请填写完整'); return }
  rules.value.push({ ...form, receiverName: form.receiverAccountNo, status: false })
  showDialog.value = false; ElMessage.success('规则已添加')
}
const handleDelete = (row) => { rules.value = rules.value.filter(r => r !== row); ElMessage.success('已删除') }
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>

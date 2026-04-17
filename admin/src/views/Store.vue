<template>
  <div class="page">
    <div class="page-title">🏪 门店管理</div>
    <div style="margin-bottom:20px"><el-button type="primary" @click="showDialog=true">+ 新增门店</el-button></div>
    <div class="card">
      <div class="card-header">门店列表</div>
      <div class="card-body">
        <el-table :data="stores" stripe>
          <el-table-column prop="name" label="门店名称" width="180"/>
          <el-table-column prop="merchantNo" label="商户号" width="150"/>
          <el-table-column prop="terminalNo" label="终端号" width="120"/>
          <el-table-column prop="boundAccountName" label="绑定账户" width="150"/>
          <el-table-column prop="boundAccountNo" label="绑定账户号" width="180"/>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="row.status==='bound'?'success':'warning'">{{ row.status==='bound'?'已绑定':'未绑定' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{row}">
              <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleUnbind(row)">解绑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="showDialog" :title="editTarget?'编辑门店':'新增门店'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="门店名称" required><el-input v-model="form.name" placeholder="请输入门店名称"/></el-form-item>
        <el-form-item label="商户号" required><el-input v-model="form.merchantNo" placeholder="请输入商户号"/></el-form-item>
        <el-form-item label="终端号" required><el-input v-model="form.terminalNo" placeholder="请输入终端号"/></el-form-item>
        <el-form-item label="绑定账户">
          <el-select v-model="form.boundAccountNo" placeholder="请选择账户" style="width:100%">
            <el-option label="主账户 (LAK2026030001)" value="LAK2026030001"/>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog=false">取消</el-button>
        <el-button type="primary" @click="handleSave">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
const stores = ref([
  { name: '门店一(旗舰店)', merchantNo: 'M10001', terminalNo: 'T001', boundAccountName: '张三商行', boundAccountNo: 'LAK2026030001', status: 'bound' },
  { name: '门店二(分店)', merchantNo: 'M10002', terminalNo: 'T002', boundAccountName: '张三商行', boundAccountNo: 'LAK2026030001', status: 'bound' },
  { name: '门店三(新店)', merchantNo: '', terminalNo: '', boundAccountName: '', boundAccountNo: '', status: 'unbound' },
])
const showDialog = ref(false)
const editTarget = ref(null)
const form = reactive({ name: '', merchantNo: '', terminalNo: '', boundAccountNo: '' })
const handleEdit = (row) => { editTarget.value = row; Object.assign(form, row); showDialog.value = true }
const handleSave = () => {
  if (!form.name || !form.merchantNo || !form.terminalNo) { ElMessage.warning('请填写完整'); return }
  if (editTarget.value) { Object.assign(editTarget.value, form); ElMessage.success('修改成功') }
  else { stores.value.push({ ...form, boundAccountName: '张三商行', status: form.boundAccountNo ? 'bound' : 'unbound' }); ElMessage.success('新增成功') }
  showDialog.value = false
}
const handleUnbind = (row) => {
  ElMessageBox.confirm('确定要解绑该门店吗？解绑后该门店将无法使用支付功能。', '解绑确认', { type: 'warning' })
    .then(() => { row.status = 'unbound'; row.boundAccountName = ''; row.boundAccountNo = ''; ElMessage.success('已解绑') })
    .catch(() => {})
}
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>

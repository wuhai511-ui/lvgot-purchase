<template>
  <div class="page">
    <div class="page-title">👥 员工管理</div>
    <div style="margin-bottom:20px"><el-button type="primary" @click="showDialog=true">+ 新增员工</el-button></div>
    <div class="card">
      <div class="card-body">
        <el-table :data="employees" stripe>
          <el-table-column prop="name" label="姓名" width="120"/>
          <el-table-column prop="phone" label="手机号" width="150"/>
          <el-table-column prop="department" label="部门" width="120"/>
          <el-table-column prop="role" label="角色" width="120">
            <template #default="{row}"><el-tag size="small">{{ row.role }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}"><el-tag size="small" :type="row.status==='active'?'success':'info'">{{ row.status==='active'?'正常':'已禁用' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{row}">
              <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button :type="row.status==='active'?'warning':'success'" size="small" @click="handleToggle(row)">{{ row.status==='active'?'禁用':'启用' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <el-dialog v-model="showDialog" :title="editTarget?'编辑员工':'新增员工'" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名" required><el-input v-model="form.name" placeholder="请输入姓名"/></el-form-item>
        <el-form-item label="手机号" required><el-input v-model="form.phone" placeholder="请输入手机号"/></el-form-item>
        <el-form-item label="部门" required>
          <el-select v-model="form.department" style="width:100%">
            <el-option v-for="d in departments" :key="d.name" :label="d.name" :value="d.name"/>
          </el-select>
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="form.role" style="width:100%">
            <el-option label="管理员" value="管理员"/>
            <el-option label="财务" value="财务"/>
            <el-option label="操作员" value="操作员"/>
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
import { ElMessage } from 'element-plus'
const departments = ref([{ name: '财务部' }, { name: '运营部' }, { name: '技术部' }])
const employees = ref([
  { name: '赵六', phone: '15800000001', department: '财务部', role: '管理员', status: 'active' },
  { name: '钱七', phone: '15800000002', department: '运营部', role: '财务', status: 'active' },
])
const showDialog = ref(false), editTarget = ref(null)
const form = reactive({ name: '', phone: '', department: '', role: '' })
const handleEdit = (row) => { editTarget.value = row; Object.assign(form, row); showDialog.value = true }
const handleSave = () => {
  if (!form.name || !form.phone || !form.department || !form.role) { ElMessage.warning('请填写完整'); return }
  if (editTarget.value) { Object.assign(editTarget.value, form); ElMessage.success('修改成功') }
  else { employees.value.push({ ...form, status: 'active' }); ElMessage.success('新增成功') }
  showDialog.value = false
}
const handleToggle = (row) => { row.status = row.status === 'active' ? 'disabled' : 'active'; ElMessage.success(row.status === 'active' ? '已启用' : '已禁用') }
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-body { padding: 20px; }
</style>

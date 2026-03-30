<template>
  <div class="page">
    <div class="page-title">🏢 部门管理</div>
    <div style="margin-bottom:20px"><el-button type="primary" @click="showDialog=true">+ 新增部门</el-button></div>
    <div class="card">
      <div class="card-body">
        <el-table :data="departments" stripe>
          <el-table-column prop="name" label="部门名称" width="200"/>
          <el-table-column prop="manager" label="负责人" width="150"/>
          <el-table-column prop="staffCount" label="员工数" width="100"/>
          <el-table-column prop="createTime" label="创建时间" width="170"/>
          <el-table-column label="操作" width="150">
            <template #default="{row}">
              <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <el-dialog v-model="showDialog" :title="editTarget?'编辑部门':'新增部门'" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="部门名称" required><el-input v-model="form.name" placeholder="请输入部门名称"/></el-form-item>
        <el-form-item label="负责人"><el-input v-model="form.manager" placeholder="请输入负责人"/></el-form-item>
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
const departments = ref([
  { name: '财务部', manager: '张三', staffCount: 3, createTime: '2026-01-01 10:00:00' },
  { name: '运营部', manager: '李四', staffCount: 5, createTime: '2026-01-01 10:00:00' },
  { name: '技术部', manager: '王五', staffCount: 4, createTime: '2026-01-01 10:00:00' },
])
const showDialog = ref(false), editTarget = ref(null)
const form = reactive({ name: '', manager: '' })
const handleEdit = (row) => { editTarget.value = row; Object.assign(form, row); showDialog.value = true }
const handleSave = () => {
  if (!form.name) { ElMessage.warning('请填写部门名称'); return }
  if (editTarget.value) { Object.assign(editTarget.value, form); ElMessage.success('修改成功') }
  else { departments.value.push({ ...form, staffCount: 0, createTime: new Date().toLocaleString() }); ElMessage.success('新增成功') }
  showDialog.value = false
}
const handleDelete = (row) => { departments.value = departments.value.filter(d => d !== row); ElMessage.success('已删除') }
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-body { padding: 20px; }
</style>

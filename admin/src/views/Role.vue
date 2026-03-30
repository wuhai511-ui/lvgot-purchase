<template>
  <div class="page">
    <div class="page-title">🔐 角色管理</div>
    <div style="margin-bottom:20px"><el-button type="primary" @click="showDialog=true">+ 新增角色</el-button></div>
    <div class="card">
      <div class="card-body">
        <el-table :data="roles" stripe>
          <el-table-column prop="name" label="角色名称" width="150"/>
          <el-table-column prop="description" label="描述" min-width="200"/>
          <el-table-column prop="staffCount" label="关联员工数" width="120"/>
          <el-table-column label="操作" width="200">
            <template #default="{row}">
              <el-button type="primary" size="small" @click="handleEdit(row)">编辑权限</el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <el-dialog v-model="showDialog" :title="editTarget?'编辑角色':'新增角色'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="角色名称" required><el-input v-model="form.name" placeholder="如：财务"/></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" placeholder="角色描述"/></el-form-item>
        <el-form-item label="菜单权限" required>
          <el-checkbox-group v-model="form.menus">
            <el-checkbox label="账户总览" value="account"/>
            <el-checkbox label="开户申请" value="account-opening"/>
            <el-checkbox label="银行卡管理" value="bank-card"/>
            <el-checkbox label="充值" value="recharge"/>
            <el-checkbox label="提现申请" value="withdraw"/>
            <el-checkbox label="付款订单" value="payment"/>
            <el-checkbox label="分账规则" value="split-rule"/>
            <el-checkbox label="分账记录" value="split-record"/>
            <el-checkbox label="交易消息" value="trade-message"/>
            <el-checkbox label="门店管理" value="store"/>
            <el-checkbox label="员工管理" value="employee"/>
            <el-checkbox label="部门管理" value="department"/>
            <el-checkbox label="角色管理" value="role"/>
            <el-checkbox label="权限管理" value="permission"/>
          </el-checkbox-group>
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
const roles = ref([
  { name: '管理员', description: '拥有所有权限', staffCount: 2, menus: ['*'] },
  { name: '财务', description: '财务人员，可操作资金相关功能', staffCount: 1, menus: ['account', 'recharge', 'withdraw', 'payment', 'split-record', 'trade-message'] },
  { name: '操作员', description: '普通操作人员', staffCount: 0, menus: ['account', 'payment', 'split-record'] },
])
const showDialog = ref(false), editTarget = ref(null)
const form = reactive({ name: '', description: '', menus: [] })
const handleEdit = (row) => { editTarget.value = row; Object.assign(form, row); showDialog.value = true }
const handleSave = () => {
  if (!form.name || !form.menus.length) { ElMessage.warning('请填写完整'); return }
  if (editTarget.value) { Object.assign(editTarget.value, form); ElMessage.success('修改成功') }
  else { roles.value.push({ ...form, staffCount: 0 }); ElMessage.success('新增成功') }
  showDialog.value = false
}
const handleDelete = (row) => { roles.value = roles.value.filter(r => r !== row); ElMessage.success('已删除') }
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-body { padding: 20px; }
</style>

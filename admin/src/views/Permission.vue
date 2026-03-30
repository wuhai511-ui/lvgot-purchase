<template>
  <div class="page">
    <div class="page-title">⚙️ 权限管理</div>
    <div class="card">
      <div class="card-header">权限列表</div>
      <div class="card-body">
        <el-table :data="permissions" stripe>
          <el-table-column prop="code" label="权限代码" width="180"/>
          <el-table-column prop="name" label="权限名称" width="150"/>
          <el-table-column prop="description" label="描述" min-width="200"/>
        </el-table>
      </div>
    </div>
    <div class="card">
      <div class="card-header">角色-权限关联</div>
      <div class="card-body">
        <el-table :data="rolePermissions" stripe>
          <el-table-column prop="roleName" label="角色" width="150"/>
          <el-table-column prop="permissions" label="拥有权限" min-width="400">
            <template #default="{row}">
              <el-tag v-for="p in row.permissions" :key="p" size="small" style="margin-right:4px">{{ p }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const permissions = ref([
  { code: 'account:view', name: '账户查看', description: '查看账户余额和信息' },
  { code: 'account-opening:apply', name: '申请开户', description: '发起开户申请' },
  { code: 'bank-card:bind', name: '绑定银行卡', description: '绑定和解绑银行卡' },
  { code: 'recharge:create', name: '创建充值', description: '发起充值操作' },
  { code: 'withdraw:create', name: '申请提现', description: '发起提现操作' },
  { code: 'payment:create', name: '创建付款', description: '发起付款分账订单' },
  { code: 'split-rule:manage', name: '管理分账规则', description: '创建、编辑、删除分账规则' },
])
const rolePermissions = ref([
  { roleName: '管理员', permissions: ['全部权限'] },
  { roleName: '财务', permissions: ['账户查看', '创建充值', '申请提现', '创建付款', '管理分账规则'] },
  { roleName: '操作员', permissions: ['账户查看', '创建付款'] },
])
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>

<!-- admin/src/views/Tenant/TenantDetail.vue -->
<template>
  <div class="tenant-detail">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-button link type="primary" @click="$router.push('/tenants')">← 返回租户列表</el-button>
        </div>
      </template>

      <el-descriptions v-if="tenant" :column="2" border title="租户详情">
        <el-descriptions-item label="租户名称">{{ tenant.tenant_name }}</el-descriptions-item>
        <el-descriptions-item label="登录账号">{{ tenant.username }}</el-descriptions-item>
        <el-descriptions-item label="钱账通账号">{{ tenant.qzt_account_no || '未绑定' }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ tenant.contact_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ tenant.contact_mobile || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="tenant.status === 'ACTIVE'" type="success">启用</el-tag>
          <el-tag v-else type="danger">禁用</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="子商户数">{{ tenant.merchant_count || 0 }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ tenant.created_at }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>商户列表（该租户下所有角色）</span>
        </div>
      </template>

      <el-table :data="merchants" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="register_name" label="名称" min-width="150" />
        <el-table-column prop="legal_mobile" label="手机号" width="130" />
        <el-table-column prop="split_role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.split_role === 'merchant'" type="primary">商户</el-tag>
            <el-tag v-else-if="row.split_role === 'store'">门店</el-tag>
            <el-tag v-else-if="row.split_role === 'agency'" type="warning">旅行社</el-tag>
            <el-tag v-else-if="row.split_role === 'guide'" type="info">导游</el-tag>
            <el-tag v-else>{{ row.split_role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="qzt_account_no" label="钱账通账号" width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'ACTIVE'" type="success">激活</el-tag>
            <el-tag v-else-if="row.status === 'PENDING'" type="warning">待审核</el-tag>
            <el-tag v-else-if="row.status === 'REJECTED'" type="danger">驳回</el-tag>
            <el-tag v-else type="info">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTenantDetail } from '@/api/tenant'

const route = useRoute()
const tenant = ref(null)
const merchants = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await getTenantDetail(route.params.id)
    if (res.code === 0) {
      tenant.value = res.data
      merchants.value = res.data.merchants || []
    } else {
      ElMessage.error(res.message || '获取租户详情失败')
    }
  } catch (err) {
    ElMessage.error('获取租户详情失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tenant-detail {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

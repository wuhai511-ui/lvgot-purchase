<template>
  <div class="page">
    <div class="page-title">提现订单</div>

    <!-- 筛选区 -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-body" style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;">
        <el-select v-model="statusFilter" placeholder="状态" style="width:120px;" clearable>
          <el-option label="全部" value=""/>
          <el-option label="待处理" value="PENDING"/>
          <el-option label="成功" value="SUCCESS"/>
          <el-option label="失败" value="FAIL"/>
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="statusFilter = ''; loadData()">重置</el-button>
      </div>
    </div>

    <!-- 提现订单列表 -->
    <div class="card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="out_request_no" label="提现单号" width="220"/>
        <el-table-column prop="merchant_name" label="商户名称" width="150"/>
        <el-table-column label="金额" width="120" align="right">
          <template #default="{row}">¥{{ row.amount_yuan || toYuan(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{row}">
            <el-tag :type="row.status === 'SUCCESS' ? 'success' : row.status === 'FAIL' ? 'danger' : 'warning'" size="small">
              {{ row.status === 'SUCCESS' ? '成功' : row.status === 'FAIL' ? '失败' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200"/>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{row}">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
      </el-table>

      <div style="padding:16px;display:flex;justify-content:flex-end;">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getWithdrawOrders } from '@/api/order'

const loading = ref(false)
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref([])

const toYuan = (val) => (parseFloat(val || 0) / 100).toFixed(2)
const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const loadData = async () => {
  loading.value = true
  try {
    const res = await getWithdrawOrders({
      status: statusFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.code === 0) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    }
  } catch (e) {
    console.error('获取提现订单列表失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-body { padding: 20px; }
</style>

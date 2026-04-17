<template>
  <div class="page">
    <div class="page-title">📋 分账记录</div>

    <!-- 搜索筛选 -->
    <div class="card">
      <div class="card-body search-bar">
        <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px"/>
        <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 120px">
          <el-option label="全部" value=""/>
          <el-option label="处理中" value="PENDING"/>
          <el-option label="成功" value="SUCCESS"/>
          <el-option label="失败" value="FAILED"/>
        </el-select>
        <el-button type="primary" @click="fetchRecords">搜索</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="card">
      <div class="card-body">
        <el-table :data="records" v-loading="loading" stripe>
          <el-table-column prop="split_no" label="分账单号" width="200"/>
          <el-table-column prop="order_no" label="关联订单" width="200"/>
          <el-table-column prop="receiver_name" label="收款方" width="150"/>
          <el-table-column prop="total_amount" label="订单金额" width="120">
            <template #default="{row}">¥{{ row.total_amount }}</template>
          </el-table-column>
          <el-table-column prop="split_amount" label="分账金额" width="120">
            <template #default="{row}"><span class="money">¥{{ row.split_amount }}</span></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="statusType[row.status]">{{ statusMap[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="170">
            <template #default="{row}">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            @size-change="fetchRecords"
            @current-change="fetchRecords"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSplitRecords } from '@/api/split'

const loading = ref(false)
const records = ref([])
const dateRange = ref([])
const filterStatus = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const statusMap = { 'PENDING': '处理中', 'SUCCESS': '成功', 'FAILED': '失败' }
const statusType = { 'PENDING': 'warning', 'SUCCESS': 'success', 'FAILED': 'danger' }

const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const fetchRecords = async () => {
  loading.value = true
  try {
    const res = await getSplitRecords({
      page: page.value,
      pageSize: pageSize.value,
      status: filterStatus.value
    })
    if (res.code === 0) {
      records.value = res.data || []
      total.value = records.value.length
    }
  } catch (e) {
    console.error('获取分账记录失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchRecords())
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-body { padding: 20px; }
.search-bar { display: flex; gap: 12px; align-items: center; }
.money { color: #E6A23C; font-weight: 600; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>

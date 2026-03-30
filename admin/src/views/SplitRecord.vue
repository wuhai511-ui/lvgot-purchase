<template>
  <div class="page">
    <div class="page-title">📜 分账记录</div>
    <div class="card">
      <div class="card-body">
        <el-table :data="records" stripe>
          <el-table-column prop="splitNo" label="分账单号" width="200"/>
          <el-table-column prop="orderNo" label="关联订单" width="200"/>
          <el-table-column prop="payerName" label="付款方" width="150"/>
          <el-table-column prop="receiverName" label="收款方" width="150"/>
          <el-table-column prop="amount" label="分账金额" width="120">
            <template #default="{row}"><span class="money">¥{{ row.amount.toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}"><el-tag size="small" :type="row.status==='success'?'success':'warning'">{{ row.status }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170"/>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const records = ref([
  { splitNo: 'SP20260326001', orderNo: 'ORD20260326001', payerName: '顺风旅行社', receiverName: '李四 (导游)', amount: 750, status: 'success', createTime: '2026-03-26 10:30:00' },
  { splitNo: 'SP20260325001', orderNo: 'ORD20260326002', payerName: '顺风旅行社', receiverName: '李四 (导游)', amount: 1200, status: 'success', createTime: '2026-03-25 15:20:00' },
])
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-body { padding: 20px; }
</style>

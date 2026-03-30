<template>
  <div class="page">
    <div class="page-title">🔔 交易消息明细</div>
    <div class="card">
      <div class="card-header">消息列表</div>
      <div class="card-body">
        <!-- 搜索筛选 -->
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <el-input v-model="filters.merchantNo" placeholder="商户号" style="width:180px" clearable/>
          <el-input v-model="filters.tradeNo" placeholder="交易流水号" style="width:180px" clearable/>
          <el-select v-model="filters.type" placeholder="消息类型" style="width:150px" clearable>
            <el-option label="分账成功" value="split_success"/>
            <el-option label="分账失败" value="split_fail"/>
            <el-option label="提现成功" value="withdraw_success"/>
            <el-option label="提现失败" value="withdraw_fail"/>
            <el-option label="开户成功" value="account_open_success"/>
            <el-option label="绑卡成功" value="bind_success"/>
          </el-select>
          <el-date-picker v-model="filters.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:260px"/>
          <el-button @click="loadData">🔍 查询</el-button>
        </div>
        <el-table :data="messages" stripe>
          <el-table-column prop="merchantNo" label="商户号" width="150"/>
          <el-table-column prop="tradeNo" label="交易流水号" width="200"/>
          <el-table-column prop="type" label="消息类型" width="120">
            <template #default="{row}">
              <el-tag size="small" :type="row.type.includes('success')?'success':'danger'">{{ typeMap[row.type] || row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{row}"><span class="money">¥{{ row.amount?.toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column prop="message" label="消息内容" min-width="200"/>
          <el-table-column prop="createTime" label="接收时间" width="170"/>
        </el-table>
        <div style="margin-top:16px;text-align:right">
          <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" layout="prev,pager,next" @current-change="loadData"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
const filters = reactive({ merchantNo: '', tradeNo: '', type: '', dateRange: null })
const pagination = reactive({ page: 1, pageSize: 10, total: 2 })
const typeMap = { split_success: '分账成功', split_fail: '分账失败', withdraw_success: '提现成功', withdraw_fail: '提现失败', account_open_success: '开户成功', bind_success: '绑卡成功' }
const messages = ref([
  { merchantNo: 'LAK2026030001', tradeNo: 'T20260326001', type: 'split_success', amount: 750, message: '分账成功，金额已到账', createTime: '2026-03-26 10:30:00' },
  { merchantNo: 'LAK2026030001', tradeNo: 'T20260325002', type: 'withdraw_success', amount: 5000, message: '提现成功，预计1-3个工作日到账', createTime: '2026-03-25 16:30:00' },
])
const loadData = () => { /* Mock，无实际数据加载 */ }
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
</style>

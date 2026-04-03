<template>
  <div class="dashboard">
    <div class="page-title">📊 工作台</div>
    
    <!-- 账户余额卡片 -->
    <div class="balance-cards">
      <div class="balance-card main">
        <div class="balance-label">💼 主账户余额</div>
        <div class="balance-amount">¥{{ formatMoney(balanceInfo.balance) }}</div>
        <div class="balance-detail">
          <span>可用: ¥{{ formatMoney(balanceInfo.available_amount) }}</span>
          <span>冻结: ¥{{ formatMoney(balanceInfo.frozen_amount) }}</span>
        </div>
      </div>
      <div class="balance-card">
        <div class="balance-label">🏦 待结算金额</div>
        <div class="balance-amount">¥{{ formatMoney(balanceInfo.frozen_amount) }}</div>
      </div>
      <div class="balance-card">
        <div class="balance-label">📜 累计分账</div>
        <div class="balance-amount">¥{{ formatMoney(totalSplitAmount) }}</div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="card">
      <div class="card-header">💡 快捷操作</div>
      <div class="card-body shortcuts">
        <el-button type="primary" @click="$router.push('/account')">💰 账户列表</el-button>
        <el-button type="success" @click="$router.push('/account-opening')">📝 申请开户</el-button>
        <el-button type="warning" @click="$router.push('/recharge')">🔄 充值</el-button>
        <el-button @click="$router.push('/withdraw')">📤 提现</el-button>
        <el-button @click="$router.push('/split-record')">📋 分账记录</el-button>
        <el-button @click="$router.push('/bank-card')">💳 银行卡</el-button>
      </div>
    </div>

    <!-- 最近交易 -->
    <div class="card">
      <div class="card-header">📜 最近分账记录</div>
      <div class="card-body">
        <el-table :data="recentRecords" v-loading="loading" stripe>
          <el-table-column prop="split_no" label="分账单号" width="200"/>
          <el-table-column prop="receiver_name" label="收款方" width="150"/>
          <el-table-column prop="split_amount" label="金额" width="120">
            <template #default="{row}"><span class="money">¥{{ formatMoney(row.split_amount) }}</span></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="statusType[row.status]">{{ statusMap[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="时间" width="170">
            <template #default="{row}">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAccountBalance } from '@/api/account'
import { getSplitRecords } from '@/api/split'
import { formatMoney } from '@/utils/format'

const loading = ref(false)
const balanceInfo = ref({ balance: 0, frozen_amount: 0, available_amount: 0 })
const recentRecords = ref([])
const totalSplitAmount = ref(0)

const statusMap = {
  'PENDING': '处理中',
  'SUCCESS': '成功',
  'FAILED': '失败'
}

const statusType = {
  'PENDING': 'warning',
  'SUCCESS': 'success',
  'FAILED': 'danger'
}

const formatTime = (time) => {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 19)
}

const fetchData = async () => {
  loading.value = true
  try {
    // 获取账户余额
    const balanceRes = await getAccountBalance()
    if (balanceRes.code === 0) {
      balanceInfo.value = balanceRes.data
    }
    
    // 获取分账记录
    const splitRes = await getSplitRecords({ pageSize: 10 })
    if (splitRes.code === 0) {
      recentRecords.value = splitRes.data || []
      totalSplitAmount.value = recentRecords.value
        .filter(r => r.status === 'SUCCESS')
        .reduce((sum, r) => sum + (parseFloat(r.split_amount) || 0), 0)
    }
  } catch (e) {
    console.error('获取数据失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px; }
.balance-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.balance-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.balance-card.main { background: linear-gradient(135deg, #1976D2, #42a5f5); color: #fff; }
.balance-label { font-size: 14px; color: #888; margin-bottom: 8px; }
.balance-card.main .balance-label { color: rgba(255,255,255,0.8); }
.balance-amount { font-size: 24px; font-weight: 700; }
.balance-detail { margin-top: 8px; font-size: 12px; display: flex; gap: 16px; opacity: 0.8; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.card-body { padding: 20px; }
.shortcuts { display: flex; gap: 12px; flex-wrap: wrap; }
</style>

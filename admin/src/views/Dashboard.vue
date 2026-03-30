<template>
  <div class="dashboard">
    <div class="page-title">📊 工作台</div>
    
    <!-- 账户余额卡片 -->
    <div class="balance-cards">
      <div class="balance-card main">
        <div class="balance-label">💼 主账户余额</div>
        <div class="balance-amount">¥{{ formatMoney(totalBalance) }}</div>
      </div>
      <div class="balance-card">
        <div class="balance-label">🏦 拉卡拉账户</div>
        <div class="balance-amount">¥{{ formatMoney(lakalaBalance) }}</div>
      </div>
      <div class="balance-card">
        <div class="balance-label">🏛️ 银行内部户</div>
        <div class="balance-amount">¥{{ formatMoney(bankBalance) }}</div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="card">
      <div class="card-header">💡 快捷操作</div>
      <div class="card-body shortcuts">
        <el-button type="primary" @click="$router.push('/account-opening')">📝 申请开户</el-button>
        <el-button type="success" @click="$router.push('/recharge')">🔄 充值</el-button>
        <el-button type="warning" @click="$router.push('/withdraw')">📤 提现</el-button>
        <el-button @click="$router.push('/payment')">📋 付款分账</el-button>
        <el-button @click="$router.push('/bank-card')">💳 银行卡</el-button>
        <el-button @click="$router.push('/trade-message')">🔔 交易消息</el-button>
      </div>
    </div>

    <!-- 最近交易 -->
    <div class="card">
      <div class="card-header">📜 最近分账记录</div>
      <div class="card-body">
        <el-table :data="recentRecords" stripe>
          <el-table-column prop="splitNo" label="分账单号" width="200"/>
          <el-table-column prop="receiverName" label="收款方" width="150"/>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{row}"><span class="money">¥{{ formatMoney(row.amount) }}</span></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}"><el-tag size="small" type="success">{{ row.status }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="createTime" label="时间" width="170"/>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getAccountInfo } from '@/api/account'
import { getSplitRecords } from '@/api/trade'
import { formatMoney } from '@/utils/format'

// Mock数据
const accountInfo = ref({ lakalaBalance: 50000, bankBalance: 30000 })
const recentRecords = ref([
  { splitNo: 'SP20260326001', receiverName: '李四 (导游)', amount: 750, status: 'success', createTime: '2026-03-26 10:30:00' },
  { splitNo: 'SP20260325001', receiverName: '李四 (导游)', amount: 1200, status: 'success', createTime: '2026-03-25 15:20:00' },
  { splitNo: 'SP20260324001', receiverName: '王五 (司机)', amount: 500, status: 'success', createTime: '2026-03-24 09:00:00' },
])

const lakalaBalance = computed(() => accountInfo.value.lakalaBalance || 0)
const bankBalance = computed(() => accountInfo.value.bankBalance || 0)
const totalBalance = computed(() => lakalaBalance.value + bankBalance.value)
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
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.card-body { padding: 20px; }
.shortcuts { display: flex; gap: 12px; flex-wrap: wrap; }
</style>

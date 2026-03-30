<template>
  <div id="app">
    <div class="layout">
      <div class="sidebar">
        <div class="logo">
          <div class="logo-icon">💼</div>
          <span>钱账通运营后台</span>
        </div>
        <div class="menu-wrap">
          <div class="menu-item" :class="{active: activeMenu==='dashboard'}" @click="handleMenuSelect('dashboard')">📊 工作台</div>
          <div class="menu-item" :class="{active: activeMenu==='account-open'}" @click="handleMenuSelect('account-open')">📝 开户申请</div>
          <div class="menu-item" :class="{active: activeMenu==='account-list'}" @click="handleMenuSelect('account-list')">👥 账户列表</div>
          <div class="menu-item" :class="{active: activeMenu==='transaction-orders'}" @click="handleMenuSelect('transaction-orders')">📋 付款订单</div>
          <div class="menu-item" :class="{active: activeMenu==='split-record'}" @click="handleMenuSelect('split-record')">💰 余额分账</div>
          <div class="menu-item" :class="{active: activeMenu==='transaction-recharge'}" @click="handleMenuSelect('transaction-recharge')">🔄 账户充值转账</div>
          <div class="menu-item" :class="{active: activeMenu==='transaction-withdraw'}" @click="handleMenuSelect('transaction-withdraw')">📤 支付账户提现</div>
          <div class="menu-item" :class="{active: activeMenu==='transaction-subscribe'}" @click="handleMenuSelect('transaction-subscribe')">🔔 交易订阅</div>
          <div class="menu-item" :class="{active: activeMenu==='withdraw'}" @click="handleMenuSelect('withdraw')">🏧 提现管理</div>
          <div class="menu-item" :class="{active: activeMenu==='store'}" @click="handleMenuSelect('store')">🏪 门店管理</div>
          <div class="menu-item" :class="{active: activeMenu==='app-config'}" @click="handleMenuSelect('app-config')">⚙️ 应用配置</div>
        </div>
      </div>
      <div class="main">
        <div class="topbar">
          <div class="breadcrumb">
            <span>首页</span>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-current">{{ pageTitle }}</span>
          </div>
          <div class="topbar-right">
            <el-badge :value="pendingCount" :hidden="pendingCount===0" class="badge-item">
              <span class="badge-text">待审核</span>
            </el-badge>
            <div class="avatar">👤</div>
          </div>
        </div>
        <div class="content">

          <!-- 工作台 -->
          <div v-if="page==='dashboard'">
            <div class="page-title">📊 工作台</div>
            <div class="stat-row">
              <div class="stat-card">
                <div class="stat-icon stat-icon-blue">👥</div>
                <div class="stat-info">
                  <div class="stat-value">{{ accountList.length }}</div>
                  <div class="stat-label">账户总数</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon stat-icon-orange">⏳</div>
                <div class="stat-info">
                  <div class="stat-value">{{ pendingCount }}</div>
                  <div class="stat-label">待审核</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon stat-icon-green">💰</div>
                <div class="stat-info">
                  <div class="stat-value">¥{{ formatMoney(totalBalance) }}</div>
                  <div class="stat-label">账户总余额</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon stat-icon-red">📤</div>
                <div class="stat-info">
                  <div class="stat-value">{{ pendingWithdrawCount }}</div>
                  <div class="stat-label">待处理提现</div>
                </div>
              </div>
            </div>
            <div class="card">
              <div class="card-header">📌 今日待办</div>
              <div class="card-body">
                <div v-for="(item,idx) in todoList" :key="idx" class="todo-item" @click="handleTodoAction(item)">
                  <div class="todo-left">
                    <div class="todo-time">{{ item.time }}</div>
                    <div class="todo-title">{{ item.title }}</div>
                  </div>
                  <el-tag v-if="item.amount" type="warning" size="small">¥{{ item.amount.toLocaleString() }}</el-tag>
                  <el-tag size="small" class="todo-action-tag">{{ item.action }}</el-tag>
                </div>
              </div>
            </div>
            <div class="card">
              <div class="card-header">💡 快速操作</div>
              <div class="card-body card-body-flex">
                <el-button type="primary" plain @click="handleMenuSelect('account-open')">🔍 审核开户申请</el-button>
                <el-button type="warning" plain @click="handleMenuSelect('withdraw')">🏧 处理提现</el-button>
                <el-button type="success" plain @click="handleMenuSelect('split-record')">💰 查看分账记录</el-button>
                <el-button type="info" plain @click="handleMenuSelect('store')">🏪 管理门店</el-button>
              </div>
            </div>
          </div>

          <!-- 开户申请 -->
          <div v-if="page==='account-open'">
            <div class="page-title">📝 开户申请</div>
            <div class="card">
              <div class="card-header">待审核列表</div>
              <div class="card-body">
                <el-table :data="auditQueue.filter(r=>r.status==='pending')" stripe>
                  <el-table-column prop="accountNo" label="账户号" width="180"/>
                  <el-table-column prop="name" label="名称">
                    <template #default="{row}"><span v-html="decodeHTML(row.name)"></span></template>
                  </el-table-column>
                  <el-table-column prop="type" label="类型" width="100">
                    <template #default="{row}"><el-tag size="small">{{ getTypeLabel(row.type) }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="phone" label="手机号" width="130"/>
                  <el-table-column prop="submitTime" label="提交时间" width="170"/>
                  <el-table-column label="操作" width="200" fixed="right">
                    <template #default="{row}">
                      <el-button type="primary" size="small" @click="doApprove(row)">✅ 通过</el-button>
                      <el-button type="danger" size="small" @click="showRejectDialog(row)">❌ 驳回</el-button>
                      <el-button size="small" @click="showDetail(row)">🔍 详情</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 账户列表 -->
          <div v-if="page==='account-list'">
            <div class="page-title">👥 账户列表</div>
            <div class="card">
              <div class="card-body">
                <div class="filter-row">
                  <el-input v-model="accountFilters.keyword" placeholder="搜索账户号/名称" class="filter-input" clearable @change="loadAccounts"/>
                  <el-select v-model="accountFilters.type" placeholder="账户类型" class="filter-select" clearable @change="loadAccounts">
                    <el-option label="全部" value=""/>
                    <el-option label="商户" value="merchant"/>
                    <el-option label="导游" value="guide"/>
                    <el-option label="司机" value="driver"/>
                    <el-option label="普通用户" value="user"/>
                  </el-select>
                  <el-select v-model="accountFilters.status" placeholder="状态" class="filter-select" clearable @change="loadAccounts">
                    <el-option label="全部" value=""/>
                    <el-option label="正常" value="active"/>
                    <el-option label="冻结" value="frozen"/>
                    <el-option label="注销" value="closed"/>
                  </el-select>
                  <el-button @click="loadAccounts">🔍 搜索</el-button>
                </div>
                <el-table :data="accountList" stripe>
                  <el-table-column prop="accountNo" label="账户号" width="180"/>
                  <el-table-column prop="name" label="名称"/>
                  <el-table-column prop="type" label="类型" width="100">
                    <template #default="{row}"><el-tag size="small" type="primary">{{ row.type }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="balance" label="余额" width="120">
                    <template #default="{row}"><span class="money">¥{{ (row.balance||0).toLocaleString() }}</span></template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="90">
                    <template #default="{row}"><el-tag size="small" :type="getStatusType(row.status)">{{ row.status }}</el-tag></template>
                  </el-table-column>
                  <el-table-column label="操作" width="120">
                    <template #default="{row}">
                      <el-button type="primary" size="small" plain @click="showAccountDetail(row)">详情</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 付款订单 -->
          <div v-if="page==='transaction-orders'">
            <div class="page-title">📋 付款订单</div>
            <div class="card">
              <div class="card-body">
                <el-table :data="orderList" stripe>
                  <el-table-column prop="orderNo" label="订单号" width="200"/>
                  <el-table-column prop="outOrderNo" label="外部订单号" width="200"/>
                  <el-table-column prop="payerName" label="付款方" width="150"/>
                  <el-table-column prop="totalAmount" label="金额" width="120">
                    <template #default="{row}"><span class="money">¥{{ row.totalAmount.toLocaleString() }}</span></template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="100">
                    <template #default="{row}"><el-tag size="small" type="success">{{ row.status }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="创建时间" width="170"/>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 余额分账 -->
          <div v-if="page==='split-record'">
            <div class="page-title">💰 余额分账记录</div>
            <div class="card">
              <div class="card-body">
                <el-table :data="splitList" stripe>
                  <el-table-column prop="splitNo" label="分账单号" width="200"/>
                  <el-table-column prop="orderNo" label="关联订单" width="200"/>
                  <el-table-column prop="payerName" label="付款方" width="150"/>
                  <el-table-column prop="receiverName" label="收款方" width="150"/>
                  <el-table-column prop="amount" label="分账金额" width="120">
                    <template #default="{row}"><span class="money">¥{{ row.amount.toLocaleString() }}</span></template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="100">
                    <template #default="{row}"><el-tag size="small" type="success">{{ row.status }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="创建时间" width="170"/>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 充值转账 -->
          <div v-if="page==='transaction-recharge'">
            <div class="page-title">🔄 账户充值转账</div>
            <div class="card">
              <div class="card-body">
                <el-table :data="rechargeList" stripe>
                  <el-table-column prop="accountNo" label="账户号" width="180"/>
                  <el-table-column prop="accountName" label="账户名称" width="150"/>
                  <el-table-column prop="type" label="类型" width="100">
                    <template #default="{row}"><el-tag size="small" type="success">{{ row.type }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="amount" label="金额" width="120">
                    <template #default="{row}"><span class="money">¥{{ row.amount.toLocaleString() }}</span></template>
                  </el-table-column>
                  <el-table-column prop="balanceBefore" label="操作前余额" width="120">
                    <template #default="{row}">¥{{ row.balanceBefore.toLocaleString() }}</template>
                  </el-table-column>
                  <el-table-column prop="balanceAfter" label="操作后余额" width="120">
                    <template #default="{row}">¥{{ row.balanceAfter.toLocaleString() }}</template>
                  </el-table-column>
                  <el-table-column prop="operator" label="操作人" width="100"/>
                  <el-table-column prop="createTime" label="时间" width="170"/>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 支付账户提现 -->
          <div v-if="page==='transaction-withdraw'">
            <div class="page-title">📤 支付账户提现</div>
            <div class="card">
              <div class="card-body">
                <el-table :data="withdrawList" stripe>
                  <el-table-column prop="withdrawNo" label="提现单号" width="200"/>
                  <el-table-column prop="accountName" label="账户名称" width="150"/>
                  <el-table-column prop="bankName" label="银行" width="150"/>
                  <el-table-column prop="amount" label="申请金额" width="120">
                    <template #default="{row}"><span class="money">¥{{ row.amount.toLocaleString() }}</span></template>
                  </el-table-column>
                  <el-table-column prop="fee" label="手续费" width="90">
                    <template #default="{row}">¥{{ row.fee }}</template>
                  </el-table-column>
                  <el-table-column prop="realAmount" label="实际到账" width="120">
                    <template #default="{row}"><span class="money">¥{{ row.realAmount.toLocaleString() }}</span></template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="100">
                    <template #default="{row}"><el-tag size="small" :type="getStatusType(row.status)">{{ row.status }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="申请时间" width="170"/>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 交易订阅 -->
          <div v-if="page==='transaction-subscribe'">
            <div class="page-title">🔔 交易订阅管理</div>
            <div class="card">
              <div class="card-body">
                <el-table :data="webhookList" stripe>
                  <el-table-column prop="name" label="名称" width="150"/>
                  <el-table-column prop="eventType" label="事件类型" width="150"/>
                  <el-table-column prop="url" label="回调地址"/>
                  <el-table-column prop="status" label="状态" width="100">
                    <template #default="{row}"><el-tag size="small" :type="row.status?'success':'info'">{{ row.status?'启用':'停用' }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="创建时间" width="170"/>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 提现管理 -->
          <div v-if="page==='withdraw'">
            <div class="page-title">🏧 提现管理</div>
            <div class="card">
              <div class="card-body">
                <el-table :data="withdrawList" stripe>
                  <el-table-column prop="withdrawNo" label="提现单号" width="200"/>
                  <el-table-column prop="accountName" label="账户名称" width="150"/>
                  <el-table-column prop="bankName" label="银行" width="150"/>
                  <el-table-column prop="amount" label="申请金额" width="120">
                    <template #default="{row}"><span class="money">¥{{ row.amount.toLocaleString() }}</span></template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="100">
                    <template #default="{row}"><el-tag size="small" :type="getStatusType(row.status)">{{ row.status }}</el-tag></template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="申请时间" width="170"/>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 门店管理 -->
          <div v-if="page==='store'">
            <div class="page-title">🏪 门店管理</div>
            <div class="card">
              <div class="card-body">
                <el-table :data="storeList" stripe>
                  <el-table-column prop="name" label="门店名称" width="200"/>
                  <el-table-column prop="merchantNo" label="商户号" width="150"/>
                  <el-table-column prop="terminalNo" label="终端号" width="120"/>
                  <el-table-column prop="boundAccountName" label="绑定账户" width="150"/>
                  <el-table-column prop="boundAccountNo" label="绑定账户号" width="180"/>
                  <el-table-column prop="status" label="状态" width="100">
                    <template #default="{row}">
                      <el-tag size="small" :type="row.status==='bound'?'success':'warning'">{{ getStoreStatusLabel(row.status) }}</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 应用配置 -->
          <div v-if="page==='app-config'">
            <div class="page-title">⚙️ 应用配置</div>
            <div class="card">
              <div class="card-header">💡 功能开关</div>
              <div class="card-body">
                <div class="config-grid">
                  <div class="config-card">
                    <div class="config-card-title">🏦 银行内部账户</div>
                    <div class="config-card-desc">启用后支持银行内部账户互转功能</div>
                    <el-switch v-model="appConfig.enableBankInternalAccount" active-text="启用" inactive-text="停用"/>
                  </div>
                  <div class="config-card">
                    <div class="config-card-title">📝 电子合同</div>
                    <div class="config-card-desc">启用后支持电子合同签署功能</div>
                    <el-switch v-model="appConfig.enableEContract" active-text="启用" inactive-text="停用"/>
                  </div>
                </div>
                <div class="config-section">
                  <div class="config-card-title" style="margin-bottom:12px">🔐 认证方式配置</div>
                  <div class="auth-config-row">
                    <div class="auth-config-item">
                      <div class="auth-config-label">付款授权</div>
                      <el-select v-model="appConfig.paymentAuthType" class="auth-select">
                        <el-option label="短信验证" value="SMS"/>
                        <el-option label="免密" value="NONE"/>
                        <el-option label="人脸识别" value="FACE"/>
                      </el-select>
                    </div>
                    <div class="auth-config-item">
                      <div class="auth-config-label">提现授权</div>
                      <el-select v-model="appConfig.withdrawAuthType" class="auth-select">
                        <el-option label="短信验证" value="SMS"/>
                        <el-option label="免密" value="NONE"/>
                        <el-option label="人脸识别" value="FACE"/>
                      </el-select>
                    </div>
                  </div>
                </div>
                <div class="config-section">
                  <el-button type="primary" @click="saveAppConfig">💾 保存配置</el-button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const page = ref("dashboard")
const activeMenu = ref("dashboard")
const pageTitles = {
  "dashboard": "工作台",
  "account-open": "开户申请",
  "account-list": "账户列表",
  "transaction-orders": "付款订单",
  "split-record": "余额分账",
  "transaction-recharge": "账户充值转账",
  "transaction-withdraw": "支付账户提现",
  "transaction-subscribe": "交易订阅",
  "withdraw": "提现管理",
  "store": "门店管理",
  "app-config": "应用配置"
}
const pageTitle = ref("工作台")

const handleMenuSelect = (idx) => {
  page.value = idx
  activeMenu.value = idx
  pageTitle.value = pageTitles[idx] || idx
}

const getTypeLabel = (type) => {
  const map = { merchant: '商户', travel: '旅行社', guide: '导游', driver: '司机', user: '普通用户' }
  return map[type] || type
}

const getStatusType = (status) => {
  const map = {
    active: 'success', frozen: 'warning', closed: 'danger',
    success: 'success', pending: 'warning', failed: 'danger'
  }
  return map[status] || 'info'
}

const getStoreStatusLabel = (status) => status === 'bound' ? '已绑定' : '未绑定'

const formatMoney = (amount) => {
  if (amount == null) return '0'
  return amount.toLocaleString()
}

// Computed values
const totalBalance = computed(() => {
  return accountList.value.reduce((s, r) => s + (r.balance || 0), 0)
})

const pendingWithdrawCount = computed(() => {
  return withdrawList.value.filter(w => w.status === 'pending').length
})

// App Config
const appConfig = reactive({
  enableBankInternalAccount: false,
  enableEContract: false,
  paymentAuthType: "SMS",
  withdrawAuthType: "SMS"
})

const saveAppConfig = () => {
  fetch("https://bgualqb.cn/api/app/config/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appConfig)
  }).then(r => r.json()).then(d => {
    if (d.code === 0) alert("配置保存成功")
    else alert("保存失败：" + d.message)
  }).catch(() => alert("请求失败"))
}

// Audit
const auditQueue = ref([
  { accountNo: "LAK2026030005", name: "海风旅游商店", type: "merchant", phone: "135****5005", submitTime: "2026-03-25 09:00:00", status: "pending", rejectReason: "" }
])
const loadAudit = () => {
  fetch("https://bgualqb.cn/api/audit/list")
    .then(r => r.json())
    .then(d => { if (d.code === 0) auditQueue.value = d.data.list || [] })
    .catch(() => {})
}
const doApprove = (row) => {
  fetch("https://bgualqb.cn/api/audit/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountNo: row.accountNo })
  }).then(r => r.json()).then(d => {
    if (d.code === 0) { alert("审核通过"); loadAudit() }
    else alert(d.message)
  }).catch(() => alert("请求失败"))
}
const showRejectDialog = (row) => {
  const reason = prompt("请输入驳回原因：")
  if (reason) {
    fetch("https://bgualqb.cn/api/audit/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountNo: row.accountNo, reason })
    }).then(r => r.json()).then(d => {
      if (d.code === 0) { alert("已驳回"); loadAudit() }
      else alert(d.message)
    }).catch(() => alert("请求失败"))
  }
}
const showDetail = (row) => {
  const typeLabel = getTypeLabel(row.type)
  alert("账户号：" + row.accountNo + "\n名称：" + row.name + "\n类型：" + typeLabel + "\n手机号：" + row.phone)
}

// Accounts
const accountList = ref([])
const accountFilters = reactive({ type: "", status: "", keyword: "" })
const accountTotal = ref(0)
const loadAccounts = () => {
  const params = new URLSearchParams({ keyword: accountFilters.keyword, status: accountFilters.status, type: accountFilters.type })
  fetch("https://bgualqb.cn/api/account/list?" + params.toString())
    .then(r => r.json())
    .then(d => { if (d.code === 0) { accountList.value = d.data.list || []; accountTotal.value = d.data.total || 0 } })
    .catch(() => {})
}
const showAccountDetail = (row) => {
  alert("账户号：" + row.accountNo + "\n名称：" + row.name + "\n类型：" + row.type + "\n余额：¥" + (row.balance || 0).toLocaleString() + "\n状态：" + row.status)
}

// Orders
const orderList = ref([
  { orderNo: "ORD20260326001", outOrderNo: "XC20260326001", payerName: "顺风旅行社", payerAccountNo: "LAK2026030002", totalAmount: 5000, status: "success", createTime: "2026-03-26 10:30:00" },
  { orderNo: "ORD20260326002", outOrderNo: "XC20260326002", payerName: "顺风旅行社", payerAccountNo: "LAK2026030002", totalAmount: 8000, status: "success", createTime: "2026-03-25 15:20:00" }
])
const splitList = ref([
  { splitNo: "SP20260326001", orderNo: "ORD20260326001", payerName: "顺风旅行社", receiverName: "李四 (导游)", receiverAccountNo: "LAK2026030003", amount: 750, status: "success", createTime: "2026-03-26 10:30:00" },
  { splitNo: "SP20260325001", orderNo: "ORD20260326002", payerName: "顺风旅行社", receiverName: "李四 (导游)", receiverAccountNo: "LAK2026030003", amount: 1200, status: "success", createTime: "2026-03-25 15:20:00" }
])
const rechargeList = ref([
  { accountNo: "LAK2026030001", accountName: "张三商行", type: "recharge", amount: 50000, balanceBefore: 75680, balanceAfter: 125680, operator: "系统", createTime: "2026-03-20 10:00:00" }
])
const withdrawList = ref([
  { withdrawNo: "WD20260326001", accountName: "李四 (导游)", accountNo: "LAK2026030003", bankName: "中国农业银行", amount: 5000, fee: 5, realAmount: 4995, status: "pending", createTime: "2026-03-26 11:00:00" },
  { withdrawNo: "WD20260325002", accountName: "张三商行", accountNo: "LAK2026030001", bankName: "中国工商银行", amount: 20000, fee: 20, realAmount: 19980, status: "success", createTime: "2026-03-25 16:30:00" }
])
const webhookList = ref([
  { name: "小冲交易通知", eventType: "trade_success", url: "https://xc.lvgot.com/webhook/trade", status: true, createTime: "2026-03-20 10:00:00" },
  { name: "小冲提现通知", eventType: "withdraw_success", url: "https://xc.lvgot.com/webhook/withdraw", status: true, createTime: "2026-03-20 10:00:00" }
])
const storeList = ref([
  { name: "门店一(旗舰店)", merchantNo: "M10001", terminalNo: "T001", boundAccountName: "张三商行", boundAccountNo: "LAK2026030001", status: "bound" },
  { name: "门店二(分店)", merchantNo: "M10002", terminalNo: "T002", boundAccountName: "张三商行", boundAccountNo: "LAK2026030001", status: "bound" },
  { name: "门店三(新店)", merchantNo: "", terminalNo: "", boundAccountName: "", boundAccountNo: "", status: "unbound" }
])

const todoList = ref([
  { time: "2026-03-26 10:30", title: '商户“海风旅游商店”提交开户申请（待审核）', amount: null, action: "去审核", actionKey: "account-open" },
  { time: "2026-03-26 09:45", title: "订单#ORD20260326001分账处理", amount: 5000, action: "查看", actionKey: "split-record" },
  { time: "2026-03-26 09:20", title: "导游李四提交提现申请（待处理）", amount: 5000, action: "处理", actionKey: "withdraw" }
])
const handleTodoAction = (item) => { handleMenuSelect(item.actionKey) }

const pendingCount = ref(0)

const decodeHTML = (str) => {
  if (!str) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

// Init
loadAccounts()
loadAudit()
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }

.layout { display: flex; height: 100vh; }

.sidebar { width: 220px; background: #fff; border-right: 1px solid #e6e8eb; flex-shrink: 0; display: flex; flex-direction: column; }

.logo { padding: 20px 16px; border-bottom: 1px solid #e6e8eb; display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; color: #1976D2; }
.logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #1976D2, #42a5f5); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; }

.menu-wrap { flex: 1; overflow-y: auto; padding: 8px 0; }
.menu-item { padding: 12px 20px; cursor: pointer; font-size: 14px; color: #333; transition: all 0.15s; border-left: 3px solid transparent; }
.menu-item:hover { background: #f5f7fa; color: #1976D2; }
.menu-item.active { background: #e3f2fd; color: #1976D2; border-left-color: #1976D2; font-weight: 600; }

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.topbar { background: #fff; border-bottom: 1px solid #e6e8eb; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
.breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #666; }
.breadcrumb-sep { color: #ccc; }
.breadcrumb-current { color: #333; font-weight: 600; }
.topbar-right { display: flex; align-items: center; gap: 16px; }
.badge-text { font-size: 13px; color: #666; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: #1976D2; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; }

.content { flex: 1; overflow-y: auto; padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px; }

.stat-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 160px; background: #fff; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.stat-icon-blue { background: #e3f2fd; color: #1976D2; }
.stat-icon-orange { background: #fff3e0; color: #F57C00; }
.stat-icon-green { background: #e8f5e9; color: #4CAF50; }
.stat-icon-red { background: #fce4ec; color: #E53935; }
.stat-info { flex: 1; }
.stat-value { font-size: 22px; font-weight: 700; color: #1a1a1a; line-height: 1.3; }
.stat-label { font-size: 13px; color: #888; margin-top: 4px; }

.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 16px; overflow: hidden; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 16px 20px; }
.card-body-flex { display: flex; gap: 12px; flex-wrap: wrap; }

.todo-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.todo-item:last-child { border-bottom: none; }
.todo-item:hover .todo-title { color: #1976D2; }
.todo-left { flex: 1; }
.todo-time {font-size: 12px; color: #888; }
.todo-title { font-size: 14px; color: #333; margin-top: 2px; transition: color 0.15s; }
.todo-action-tag { cursor: pointer; color: #1976D2; border-color: #1976D2; }

.filter-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.filter-input { width: 200px; }
.filter-select { width: 140px; }

.money { font-weight: 600; color: #1a1a1a; }

.config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.config-card { background: #f9fafb; border-radius: 8px; padding: 16px; }
.config-card-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; }
.config-card-desc { font-size: 13px; color: #888; margin-bottom: 12px; }
.config-section { margin-top: 24px; }
.auth-config-row { display: flex; gap: 16px; flex-wrap: wrap; }
.auth-config-item { display: flex; align-items: center; gap: 12px; }
.auth-config-label { font-size: 13px; color: #666; }
.auth-select { width: 140px; }
</style>

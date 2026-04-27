<template>
  <div id="app">
    <div class="layout-shell">
      <aside class="sidebar">
        <div class="brand-block">
          <div class="brand-mark">旅</div>
          <div>
            <div class="brand-title">旅购通</div>
            <div class="brand-subtitle">商户工作台</div>
          </div>
        </div>

        <div class="merchant-card">
          <div class="merchant-card__label">当前商户</div>
          <div class="merchant-card__name">{{ merchantName }}</div>
          <div class="merchant-card__meta">
            <span class="status-pill success">账户正常</span>
            <span class="metric-chip">经营视图</span>
          </div>
        </div>

        <el-menu :default-active="activePath" class="sidebar-menu" router>
          <el-menu-item index="/">
            <span class="menu-emoji">◉</span>
            <template #title>商户工作台</template>
          </el-menu-item>

          <el-sub-menu index="fund-center">
            <template #title>
              <span class="menu-emoji">◎</span>
              <span>资金中心</span>
            </template>
            <el-menu-item index="/fund-management">账户资金</el-menu-item>
            <el-menu-item index="/recharge">充值</el-menu-item>
            <el-menu-item index="/split-record">分账记录</el-menu-item>
            <el-menu-item index="/withdraw">提现管理</el-menu-item>
            <el-menu-item index="/bank-card">银行卡管理</el-menu-item>
            <el-menu-item index="/reconciliation">对账中心</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="order-center">
            <template #title>
              <span class="menu-emoji">📋</span>
              <span>订单管理</span>
            </template>
            <el-menu-item index="/orders/pay">支付订单</el-menu-item>
            <el-menu-item index="/orders/withdraw">提现订单</el-menu-item>
            <el-menu-item index="/payment">付款订单</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="merchant-center">
            <template #title>
              <span class="menu-emoji">◌</span>
              <span>商户经营</span>
            </template>
            <el-menu-item index="/store">门店管理</el-menu-item>
            <el-menu-item index="/tour-group">团队协同</el-menu-item>
            <el-menu-item index="/account">账户资料</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="toolkit">
            <template #title>
              <span class="menu-emoji">✦</span>
              <span>经营工具</span>
            </template>
            <el-menu-item index="/ai-split">智能分账</el-menu-item>
            <el-menu-item index="/split-template">分账模板</el-menu-item>
            <el-menu-item index="/split-rule">分账规则</el-menu-item>
          </el-sub-menu>

          <el-menu-item index="/trade-message">
            <span class="menu-emoji">☼</span>
            <template #title>消息提醒</template>
          </el-menu-item>

          <el-sub-menu index="system-settings">
            <template #title>
              <span class="menu-emoji">⚙</span>
              <span>系统设置</span>
            </template>
            <el-menu-item index="/employee">员工管理</el-menu-item>
            <el-menu-item index="/department">部门管理</el-menu-item>
            <el-menu-item index="/role">角色管理</el-menu-item>
            <el-menu-item index="/permission">权限管理</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </aside>

      <main class="main-panel">
        <header class="topbar">
          <div>
            <div class="topbar-title">{{ currentMenuName }}</div>
            <div class="topbar-subtitle">围绕商户经营、分账协作和个人提现闭环设计的山海青绿工作台。</div>
          </div>
          <div class="topbar-actions" style="width: 100%;">
            <span class="metric-chip">门店 12 家</span>
            <span class="metric-chip">今日待处理 5 项</span>
            <el-button type="primary" plain @click="router.push('/withdraw')">去提现</el-button>
            <el-button @click="handleLogout">退出登录</el-button>
          </div>
        </header>

        <section class="content-panel">
          <router-view />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { removeToken, getMerchantInfo } from '../utils/storage'
import '../styles/global.scss'
import 'element-plus/dist/index.css'

const router = useRouter()
const route = useRoute()

const merchantInfo = ref(getMerchantInfo())
const merchantName = ref('旅购通示例商户')

const menuNameMap = {
  '/': '商户工作台',
  '/account': '账户资料',
  '/fund-management': '账户资金',
  '/bank-card': '银行卡管理',
  '/recharge': '充值中心',
  '/withdraw': '提现管理',
  '/payment': '付款订单',
  '/tour-group': '团队协同',
  '/store': '门店管理',
  '/orders/pay': '支付订单',
  '/orders/withdraw': '提现订单',
  '/account-flow': '账户明细',
  '/ai-split': '智能分账',
  '/split-template': '分账模板',
  '/split-rule': '分账规则',
  '/split-record': '分账记录',
  '/reconciliation': '对账中心',
  '/trade-message': '消息提醒',
  '/employee': '员工管理',
  '/department': '部门管理',
  '/role': '角色管理',
  '/permission': '权限管理'
}

const activePath = computed(() => route.path)
const currentMenuName = computed(() => menuNameMap[route.path] || '商户工作台')

const handleLogout = () => {
  removeToken()
  router.push('/login')
}

onMounted(() => {
  merchantInfo.value = getMerchantInfo()
  if (merchantInfo.value?.name) {
    merchantName.value = merchantInfo.value.name
  }
})
</script>

<style scoped lang="scss">
@import '../styles/variables.scss';

.layout-shell { min-height: 100vh; display: grid; grid-template-columns: 280px 1fr; }
.sidebar { padding: 22px 18px; background: rgba(255,255,255,0.78); border-right: 1px solid rgba(215,229,225,0.9); backdrop-filter: blur(18px); }
.brand-block { display: flex; align-items: center; gap: 14px; padding: 8px 8px 18px; }
.brand-mark { width: 52px; height: 52px; border-radius: 18px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 700; background: linear-gradient(135deg, #1976D2, #42a5f5); box-shadow: 0 2px 8px rgba(25,118,210,0.3); }
.brand-title { font-size: 18px; font-weight: 700; color: $text-color; }
.brand-subtitle { margin-top: 4px; font-size: 12px; color: #999; }
.merchant-card { padding: 16px; margin-bottom: 18px; border-radius: 12px; background: linear-gradient(180deg, rgba(223,245,241,0.8) 0%, rgba(255,255,255,0.95) 100%); border: 1px solid rgba(215,229,225,0.9); }
.merchant-card__label { font-size: 12px; color: #999; }
.merchant-card__name { margin-top: 8px; font-size: 18px; font-weight: 700; color: $text-color; }
.merchant-card__meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
:deep(.sidebar-menu) { border-right: none; background: transparent; }
:deep(.sidebar-menu .el-menu-item), :deep(.sidebar-menu .el-sub-menu__title) { height: 46px; line-height: 46px; border-radius: 14px; color: #666; margin-bottom: 6px; }
:deep(.sidebar-menu .el-menu-item:hover), :deep(.sidebar-menu .el-sub-menu__title:hover), :deep(.sidebar-menu .el-menu-item.is-active) { background: rgba(223,245,241,0.9); color: #1976D2; }
.menu-emoji { display: inline-block; width: 18px; margin-right: 10px; text-align: center; }
.main-panel { padding: 18px 22px 24px; }
.topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; padding: 8px 6px 20px; }
.topbar-title { font-size: 28px; font-weight: 700; color: $text-color; }
.topbar-subtitle { margin-top: 8px; max-width: 760px; color: #666; line-height: 1.7; }
.topbar-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.content-panel { min-height: calc(100vh - 110px); overflow-x: hidden; }
@media (max-width: 1200px) { .layout-shell { grid-template-columns: 1fr; } .sidebar { border-right: none; border-bottom: 1px solid rgba(215,229,225,0.9); } }
@media (max-width: 768px) { .main-panel { padding: 16px; } .topbar { flex-direction: column; } .topbar-title { font-size: 22px; } }
</style>

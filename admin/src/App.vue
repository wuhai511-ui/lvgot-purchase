<template>
  <div id="app">
    <div class="layout">
      <!-- 侧边栏 -->
      <div class="sidebar">
        <div class="logo">
          <div class="logo-icon">💼</div>
          <span class="logo-text">{{ merchantName }}</span>
        </div>
        <el-menu
          :default-active="activePath"
          class="sidebar-menu"
          :collapse="isCollapse"
          router
        >
          <!-- 工作台 -->
          <el-menu-item index="/">
            <span class="menu-icon">📊</span>
            <template #title>
              <span class="menu-name">工作台</span>
            </template>
          </el-menu-item>

          <!-- 账户中心 -->
          <el-sub-menu index="account-center">
            <template #title>
              <span class="menu-icon">💼</span>
              <span class="menu-name">账户中心</span>
            </template>
            <el-menu-item index="/account">账户列表</el-menu-item>
            <el-menu-item index="/fund-management">账户资金</el-menu-item>
            <el-menu-item index="/bank-card">银行卡管理</el-menu-item>
          </el-sub-menu>

          <!-- 资金管理 -->
          <el-sub-menu index="fund-management">
            <template #title>
              <span class="menu-icon">💵</span>
              <span class="menu-name">资金管理</span>
            </template>
            <el-menu-item index="/recharge">充值</el-menu-item>
            <el-menu-item index="/withdraw">提现申请</el-menu-item>
            <el-menu-item index="/payment">付款订单</el-menu-item>
          </el-sub-menu>

          <!-- 业务管理 -->
          <el-sub-menu index="business-management">
            <template #title>
              <span class="menu-icon">🎒</span>
              <span class="menu-name">业务管理</span>
            </template>
            <el-menu-item index="/tour-group">旅行团管理</el-menu-item>
            <el-menu-item index="/store">门店管理</el-menu-item>
          </el-sub-menu>

          <!-- 分账管理 -->
          <el-sub-menu index="split-management">
            <template #title>
              <span class="menu-icon">📐</span>
              <span class="menu-name">分账管理</span>
            </template>
            <el-menu-item index="/ai-split">🤖 AI智能分账</el-menu-item>
            <el-menu-item index="/split-template">分账模板</el-menu-item>
            <el-menu-item index="/split-rule">分账规则</el-menu-item>
            <el-menu-item index="/split-record">分账记录</el-menu-item>
          </el-sub-menu>
          
          <!-- 对账管理 -->
          <el-menu-item index="/reconciliation">
            <span class="menu-icon">📊</span>
            <template #title>
              <span class="menu-name">对账管理</span>
            </template>
          </el-menu-item>

          <!-- 消息中心 -->
          <el-menu-item index="/trade-message">
            <span class="menu-icon">🔔</span>
            <template #title>
              <span class="menu-name">消息中心</span>
            </template>
          </el-menu-item>

          <!-- 系统设置 -->
          <el-sub-menu index="system-settings">
            <template #title>
              <span class="menu-icon">⚙️</span>
              <span class="menu-name">系统设置</span>
            </template>
            <el-menu-item index="/employee">员工管理</el-menu-item>
            <el-menu-item index="/department">部门管理</el-menu-item>
            <el-menu-item index="/role">角色管理</el-menu-item>
            <el-menu-item index="/permission">权限管理</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>

      <!-- 主内容区 -->
      <div class="main">
        <div class="topbar">
          <div class="topbar-left">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item v-if="currentMenuName && currentMenuName !== '工作台'">
                {{ currentMenuName }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="topbar-right">
            <span class="merchant-name">{{ merchantName }}</span>
            <el-button type="danger" size="small" plain @click="handleLogout">退出</el-button>
          </div>
        </div>
        <div class="content">
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { removeToken, getMerchantInfo } from './utils/storage'
import './styles/global.scss'
import 'element-plus/dist/index.css'

const router = useRouter()
const route = useRoute()

const merchantName = ref('钱账通运营后台')
const isCollapse = ref(false)

// 菜单名称映射（用于面包屑）
const menuNameMap = {
  '/': '工作台',
  '/account': '账户列表',
  '/fund-management': '账户资金',
  '/bank-card': '银行卡管理',
  '/recharge': '充值',
  '/withdraw': '提现申请',
  '/payment': '付款订单',
  '/tour-group': '旅行团管理',
  '/store': '门店管理',
  '/ai-split': 'AI智能分账',
  '/split-template': '分账模板',
  '/split-rule': '分账规则',
  '/split-record': '分账记录',
  '/reconciliation': '对账管理',
  '/trade-message': '消息中心',
  '/employee': '员工管理',
  '/department': '部门管理',
  '/role': '角色管理',
  '/permission': '权限管理'
}

const merchantInfo = ref(getMerchantInfo())

const activePath = computed(() => route.path)

const currentMenuName = computed(() => {
  return menuNameMap[activePath.value] || ''
})

const handleLogout = () => {
  removeToken()
  router.push('/login')
}

onMounted(() => {
  merchantInfo.value = getMerchantInfo()
  if (merchantInfo.value && merchantInfo.value.name) {
    merchantName.value = merchantInfo.value.name
  }
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.layout {
  display: flex;
  height: 100vh;
}

/* 侧边栏 */
.sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid #e6e8eb;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 20px 16px;
  border-bottom: 1px solid #e6e8eb;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #1976D2, #42a5f5);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #1976D2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
}

.menu-icon {
  font-size: 16px;
  margin-right: 8px;
}

.menu-name {
  font-size: 14px;
}

/* 二级菜单样式 */
.sidebar-menu :deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
  padding-left: 20px !important;
}

.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background-color: #f5f7fa;
}

.sidebar-menu :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: #1976D2;
}

.sidebar-menu :deep(.el-menu-item) {
  height: 46px;
  line-height: 46px;
  padding-left: 52px !important;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background-color: #f5f7fa;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  color: #1976D2;
  background-color: #e3f2fd;
}

/* 子菜单展开时的背景 */
.sidebar-menu :deep(.el-sub-menu .el-menu) {
  background-color: #fafbfc;
}

/* 主内容区 */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f5f7fa;
}

.topbar {
  background: #fff;
  border-bottom: 1px solid #e6e8eb;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.merchant-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
</style>

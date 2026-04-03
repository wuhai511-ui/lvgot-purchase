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
          <el-menu-item
            v-for="item in menuList"
            :key="item.path"
            :index="item.path"
          >
            <span class="menu-icon">{{ item.icon }}</span>
            <template #title>
              <span class="menu-name">{{ item.name }}</span>
            </template>
          </el-menu-item>
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

// 动态菜单列表：未开户（pending）只显示基础菜单，已开户（active）显示全部
const menuList = computed(() => {
  if (!merchantInfo.value || merchantInfo.value.status !== 'active') {
    return [
      { name: '工作台', path: '/', icon: '📊' },
      { name: '账户列表', path: '/account', icon: '💰' },
      { name: '申请开户', path: '/account-opening', icon: '📝' },
    ]
  }
  return [
    { name: '工作台', path: '/', icon: '📊' },
    { name: '账户列表', path: '/account', icon: '💰' },
    { name: '开户申请', path: '/account-opening', icon: '📝' },
    { name: '银行卡管理', path: '/bank-card', icon: '💳' },
    { name: '充值', path: '/recharge', icon: '🔄' },
    { name: '提现申请', path: '/withdraw', icon: '📤' },
    { name: '付款订单', path: '/payment', icon: '📋' },
    { name: '分账规则', path: '/split-rule', icon: '📐' },
    { name: '分账记录', path: '/split-record', icon: '📜' },
    { name: '交易消息', path: '/trade-message', icon: '🔔' },
    { name: '门店管理', path: '/store', icon: '🏪' },
    { name: '员工管理', path: '/employee', icon: '👥' },
    { name: '部门管理', path: '/department', icon: '🏢' },
    { name: '角色管理', path: '/role', icon: '🔐' },
    { name: '权限管理', path: '/permission', icon: '⚙️' },
  ]
})

const merchantInfo = ref(getMerchantInfo())

const activePath = computed(() => route.path)

const currentMenuName = computed(() => {
  const item = menuList.find(m => m.path === activePath.value)
  return item ? item.name : ''
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

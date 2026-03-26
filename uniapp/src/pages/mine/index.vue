<template>
  <view class="page-container">
    <view class="mine-header">
      <view class="avatar-icon">{{ accountStore.currentAccount.name?.[0] || '游' }}</view>
      <view class="mine-name">{{ accountStore.currentAccount.name }}</view>
      <view class="mine-account">{{ accountStore.currentAccount.accountNo }}</view>
    </view>

    <view class="mine-menu">
      <view class="menu-item" v-for="item in menuItems" :key="item.path" @click="navigateTo(item.path)">
        <text class="menu-icon">{{ item.icon }}</text>
        <text class="menu-text">{{ item.text }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <view class="logout-btn">
      <van-button type="default" block round @click="logout">退出登录</van-button>
    </view>

    <view class="version">旅购通 v1.0.0</view>
  </view>
</template>

<script setup>
import { useAccountStore } from '@/store/account'
const accountStore = useAccountStore()
const menuItems = [
  {icon:'📋', text:'账户升级', path:'/pages/account-upgrade/index'},
  {icon:'💳', text:'银行卡管理', path:'/pages/bankcard/index'},
  {icon:'📌', text:'门店绑定', path:'/pages/store-bind/index'},
  {icon:'📬', text:'消息通知', path:'/pages/message/index'},
  {icon:'❓', text:'帮助与客服', path:'/pages/help/index'},
  {icon:'📄', text:'用户协议', path:'/pages/help/index'},
]
const navigateTo = (path) => uni.navigateTo({ url: path })
const logout = () => uni.showModal({title:'退出登录', content:'确定退出登录？', success:(r)=>{ if(r.confirm) uni.showToast({title:'已退出', icon:'none'}) }})
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.mine-header { background:$primary-gradient; padding:40px 20px 50px; text-align:center; color:#fff; }
.avatar-icon { width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 12px; }
.mine-name { font-size:18px; font-weight:bold; margin-bottom:4px; }
.mine-account { font-size:12px; opacity:0.8; }
.mine-menu { background:#fff; margin:-30px 16px 0; border-radius:$border-radius-lg; box-shadow:$shadow-md; overflow:hidden; }
.menu-item { display:flex; align-items:center; gap:12px; padding:16px; border-bottom:1px solid #f5f5f5; cursor:pointer; }
.menu-item:last-child { border-bottom:none; }
.menu-icon { font-size:18px; }
.menu-text { flex:1; font-size:14px; color:#333; }
.menu-arrow { color:#ccc; font-size:16px; }
.logout-btn { margin:20px 16px; }
.version { text-align:center; font-size:11px; color:#bbb; margin-top:10px; }
</style>

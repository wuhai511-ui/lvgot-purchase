import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '@/pages/login/index.vue'
import Home from '@/pages/home/index.vue'
import Account from '@/pages/account/index.vue'
import Recharge from '@/pages/recharge/index.vue'
import Withdraw from '@/pages/withdraw/index.vue'
import SplitRecord from '@/pages/split-record/index.vue'
import Order from '@/pages/order/index.vue'
import Qrcode from '@/pages/qrcode/index.vue'
import Bankcard from '@/pages/bankcard/index.vue'
import AccountUpgrade from '@/pages/account-upgrade/index.vue'
import StoreBind from '@/pages/store-bind/index.vue'
import Message from '@/pages/message/index.vue'
import Help from '@/pages/help/index.vue'
import OpenAccount from '@/pages/open-account/index.vue'
import Split from '@/pages/split/index.vue'
import Mine from '@/pages/mine/index.vue'

const routes = [
  { path: '/', redirect: '/pages/login' },
  { path: '/pages/login', component: Login },
  { path: '/pages/home', component: Home },
  { path: '/pages/account', component: Account },
  { path: '/pages/recharge', component: Recharge },
  { path: '/pages/withdraw', component: Withdraw },
  { path: '/pages/split-record', component: SplitRecord },
  { path: '/pages/order', component: Order },
  { path: '/pages/qrcode', component: Qrcode },
  { path: '/pages/bankcard', component: Bankcard },
  { path: '/pages/account-upgrade', component: AccountUpgrade },
  { path: '/pages/store-bind', component: StoreBind },
  { path: '/pages/message', component: Message },
  { path: '/pages/help', component: Help },
  { path: '/pages/open-account', component: OpenAccount },
  { path: '/pages/split', component: Split },
  { path: '/pages/mine', component: Mine },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('user_token') || ''
  if (!token && to.path !== '/pages/login') {
    // allow missing token for now, just to show how it works,
    // wait, if we enforce it, they will be forced to log in:
    next('/pages/login')
  } else {
    next()
  }
})

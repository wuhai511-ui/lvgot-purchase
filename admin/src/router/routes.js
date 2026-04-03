/**
 * 基础路由配置
 */
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import AccountList from '../views/AccountList.vue'
import AccountOpening from '../views/AccountOpening.vue'
import BankCard from '../views/BankCard.vue'
import Recharge from '../views/Recharge.vue'
import Withdraw from '../views/Withdraw.vue'
import TradeMessage from '../views/TradeMessage.vue'
import PaymentOrder from '../views/PaymentOrder.vue'
import SplitRule from '../views/SplitRule.vue'
import SplitRecord from '../views/SplitRecord.vue'
import Store from '../views/Store.vue'
import Role from '../views/Role.vue'
import Permission from '../views/Permission.vue'
import Department from '../views/Department.vue'
import Employee from '../views/Employee.vue'
import TourGroup from '../views/TourGroup.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/',
    name: 'Dashboard',
    meta: { requiresAuth: true },
    component: Dashboard,
  },
  {
    path: '/account',
    name: 'AccountList',
    meta: { requiresAuth: true },
    component: AccountList,
  },
  {
    path: '/account-opening',
    name: 'AccountOpening',
    meta: { requiresAuth: true },
    component: AccountOpening,
  },
  {
    path: '/bank-card',
    name: 'BankCard',
    meta: { requiresAuth: true },
    component: BankCard,
  },
  {
    path: '/recharge',
    name: 'Recharge',
    meta: { requiresAuth: true },
    component: Recharge,
  },
  {
    path: '/withdraw',
    name: 'Withdraw',
    meta: { requiresAuth: true },
    component: Withdraw,
  },
  {
    path: '/trade-message',
    name: 'TradeMessage',
    meta: { requiresAuth: true },
    component: TradeMessage,
  },
  {
    path: '/payment',
    name: 'PaymentOrder',
    meta: { requiresAuth: true },
    component: PaymentOrder,
  },
  {
    path: '/split-rule',
    name: 'SplitRule',
    meta: { requiresAuth: true },
    component: SplitRule,
  },
  {
    path: '/split-record',
    name: 'SplitRecord',
    meta: { requiresAuth: true },
    component: SplitRecord,
  },
  {
    path: '/store',
    name: 'Store',
    meta: { requiresAuth: true },
    component: Store,
  },
  {
    path: '/role',
    name: 'Role',
    meta: { requiresAuth: true },
    component: Role,
  },
  {
    path: '/permission',
    name: 'Permission',
    meta: { requiresAuth: true },
    component: Permission,
  },
  {
    path: '/department',
    name: 'Department',
    meta: { requiresAuth: true },
    component: Department,
  },
  {
    path: '/employee',
    name: 'Employee',
    meta: { requiresAuth: true },
    component: Employee,
  },
  {
    path: '/tour-group',
    name: 'TourGroup',
    meta: { requiresAuth: true },
    component: TourGroup,
  },
  {
    // 未匹配路由重定向到 /
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export default routes

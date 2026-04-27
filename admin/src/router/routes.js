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
import AiSplit from '../views/AiSplit.vue'
import SplitTemplate from '../views/SplitTemplate.vue'
import Reconciliation from '../views/Reconciliation.vue'
import FundManagement from '../views/FundManagement.vue'
import StoreDetail from '../views/StoreDetail.vue'
import AccountFlow from '../views/AccountFlow.vue'
import OrderPay from '../views/OrderPay.vue'
import OrderWithdraw from '../views/OrderWithdraw.vue'
import GuideList from '../views/Guide/GuideList.vue'
import TenantList from '../views/Tenant/TenantList.vue'
import TenantDetail from '../views/Tenant/TenantDetail.vue'
import AIModelList from '../views/AIModel/AIModelList.vue'

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
    path: '/tenants',
    name: 'TenantList',
    meta: { requiresAuth: true },
    component: TenantList,
  },
  {
    path: '/tenants/:id',
    name: 'TenantDetail',
    meta: { requiresAuth: true },
    component: TenantDetail,
  },
  {
    path: '/ai-models',
    name: 'AIModelList',
    meta: { requiresAuth: true },
    component: AIModelList,
  },
  {
    path: '/guides',
    name: 'GuideList',
    meta: { requiresAuth: true },
    component: GuideList,
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
    path: '/ai-split',
    name: 'AiSplit',
    meta: { requiresAuth: true },
    component: AiSplit,
  },
  {
    path: '/split-template',
    name: 'SplitTemplate',
    meta: { requiresAuth: true },
    component: SplitTemplate,
  },
  {
    path: '/reconciliation',
    name: 'Reconciliation',
    meta: { requiresAuth: true },
    component: Reconciliation,
  },
  {
    path: '/fund-management',
    name: 'FundManagement',
    meta: { requiresAuth: true },
    component: FundManagement,
  },
  {
    path: '/store',
    name: 'Store',
    meta: { requiresAuth: true },
    component: Store,
  },
  {
    path: '/store/:id',
    name: 'StoreDetail',
    meta: { requiresAuth: true },
    component: StoreDetail,
  },
  {
    path: '/account-flow',
    name: 'AccountFlow',
    meta: { requiresAuth: true },
    component: AccountFlow,
  },
  {
    path: '/orders/pay',
    name: 'OrderPay',
    meta: { requiresAuth: true },
    component: OrderPay,
  },
  {
    path: '/orders/withdraw',
    name: 'OrderWithdraw',
    meta: { requiresAuth: true },
    component: OrderWithdraw,
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

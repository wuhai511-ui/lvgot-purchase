// admin/src/api/index.js
import * as account from './account'
import * as bank from './bank'
import * as bankCard from './bankCard'
import * as guide from './guide'
import * as merchant from './merchant'
import * as order from './order'
import * as recharge from './recharge'
import * as split from './split'
import * as store from './store'
import * as system from './system'
import * as tenant from './tenant'
import * as trade from './trade'
import * as withdraw from './withdraw'

export default {
  account,
  bank,
  bankCard,
  guide,
  merchant,
  order,
  recharge,
  split,
  store,
  system,
  tenant,
  trade,
  withdraw
}

export { account, bank, bankCard, guide, merchant, order, recharge, split, store, system, tenant, trade, withdraw }

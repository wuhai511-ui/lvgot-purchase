// admin/src/api/index.js
import * as merchant from './merchant'
import * as guide from './guide'
import * as store from './store'
import * as tour from './tour'
import * as finance from './finance'
import * as split from './split'

export default {
  merchant,
  guide,
  store,
  tour,
  finance,
  split
}

export { merchant, guide, store, tour, finance, split }

/**
 * 钱账通·API 接口索引
 * 按业务模块组织的接口封装
 */
export { qztRequest, qztFileUpload } from './request.js'

// ========== 文件服务 ==========
export * as fileApi from './services/file.js'

// ========== 支付账户服务 ==========
export * as accountApi from './services/account.js'

// ========== 银行卡服务 ==========
export * as bankApi from './services/bank.js'

// ========== 分账服务 ==========
export * as splitApi from './services/split.js'

// ========== 交易查询服务 ==========
export * as tradeApi from './services/trade.js'

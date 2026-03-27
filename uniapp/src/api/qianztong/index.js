/**
 * 钱账通·API 接口索引
 * 完整接口文档：钱账通-支付账户V1.0.1-API(2)
 */
export { qztRequest, qztFileUpload } from './request.js'

export * as fileApi from './services/file.js'       // 文件上传/下载
export * as accountApi from './services/account.js' // 支付账户开户/充值/余额/流水
export * as bankApi from './services/bank.js'       // 银行卡开户/绑定/提现
export * as splitApi from './services/split.js'     // 分账/分账撤销
export * as tradeApi from './services/trade.js'     // 交易记录查询
export * as esignApi from './services/esign.js'     // 电子签章

/**
 * 交易模块 API
 */
import { get, post } from './request.js'

/**
 * 创建支付
 * @param {Object} data - 支付数据
 */
export function createPayment(data) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      paymentId: 'P' + Date.now(),
      qrCode: 'https://bgualqb.cn/qr/' + Date.now(),
      amount: data.amount,
      status: 'pending',
    },
  })
}

/**
 * 获取分账记录
 * @param {Object} params - 查询参数
 */
export function getSplitRecords(params) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      list: [
        {
          recordId: 'SR001',
          orderId: 'O001',
          amount: 100.00,
          splitRatio: 0.6,
          status: 'completed',
        },
      ],
      total: 1,
    },
  })
}

/**
 * 获取交易消息
 * @param {Object} params - 查询参数
 */
export function getTradeMessages(params) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      list: [
        {
          messageId: 'MSG001',
          type: 'payment',
          content: '收到一笔支付',
          createTime: new Date().toISOString(),
        },
      ],
      total: 1,
    },
  })
}

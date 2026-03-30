/**
 * 账户模块 API
 */
import { get, post } from './request.js'

/**
 * 获取账户信息
 */
export function getAccountInfo() {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      accountId: 'ACC001',
      balance: 100000.00,
      frozenBalance: 5000.00,
      availableBalance: 95000.00,
      currency: 'CNY',
    },
  })
}

/**
 * 账户充值
 * @param {Object} data - 充值数据 { amount, paymentMethod }
 */
export function recharge(data) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      transactionId: 'TX' + Date.now(),
      amount: data.amount,
      status: 'completed',
    },
  })
}

/**
 * 账户提现
 * @param {Object} data - 提现数据 { amount, bankCardId }
 */
export function withdraw(data) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      transactionId: 'TX' + Date.now(),
      amount: data.amount,
      status: 'pending',
    },
  })
}

/**
 * 银行卡模块 API
 */
import { get, post } from './request.js'

/**
 * 获取银行卡列表
 */
export function getBankCards() {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      list: [
        {
          cardId: 'CARD001',
          bankName: '中国银行',
          cardNo: '****1234',
          cardType: 'debit',
          isDefault: true,
        },
      ],
      total: 1,
    },
  })
}

/**
 * 绑定银行卡
 * @param {Object} data - 银行卡数据
 */
export function bindCard(data) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      cardId: 'CARD' + Date.now(),
      status: '绑卡成功',
    },
  })
}

/**
 * 解绑银行卡
 * @param {string} cardId - 银行卡ID
 */
export function unbindCard(cardId) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      cardId,
      status: '已解绑',
    },
  })
}

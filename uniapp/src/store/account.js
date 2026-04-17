import { defineStore } from 'pinia'

export const useAccountStore = defineStore('account', {
  state: () => ({
    // 当前登录账户
    currentAccount: {
      accountNo: 'LAK2026030003',
      name: '李四 (导游)',
      type: 'guide',         // guide=导游, travel=旅行社, merchant=商户
      typeName: '导游',
      level: 3,
      balance: 8560.00,
      frozenBalance: 0,
      status: 'VALID',
      auditStatus: 'not_required',
    },

    // 钱账通账户信息
    qztAccount: {
      merchantId: '',        // 商户ID
      accountNo: '',          // 支付账户号
      bankAccountNo: '',      // 银行内部户账号
      bankAccountStatus: '',  // 银行开户状态
      payAccountStatus: '',  // 支付账户开户状态
      openStep: 0,           // 开户步骤：0=未开户, 1=银行户已开, 2=支付账户已开
    },

    isLoggedIn: true,
  }),

  getters: {
    isMerchantOpen: (state) => !!state.qztAccount.merchantId && !!state.qztAccount.bankAccountNo,
    isPayAccountOpen: (state) => !!state.qztAccount.accountNo,
    openProgress: (state) => {
      if (!state.qztAccount.merchantId) return 0
      if (!state.qztAccount.bankAccountNo) return 1
      if (!state.qztAccount.accountNo) return 2
      return 3
    },
  },

  actions: {
    updateBalance(balance) {
      this.currentAccount.balance = balance
    },

    setQztAccount(data) {
      if (data.merchantId) this.qztAccount.merchantId = data.merchantId
      if (data.accountNo) this.qztAccount.accountNo = data.accountNo
      if (data.bankAccountNo) this.qztAccount.bankAccountNo = data.bankAccountNo
      if (data.bankAccountStatus) this.qztAccount.bankAccountStatus = data.bankAccountStatus
      if (data.payAccountStatus) this.qztAccount.payAccountStatus = data.payAccountStatus
      if (data.openStep !== undefined) this.qztAccount.openStep = data.openStep
    },

    clearQztAccount() {
      this.qztAccount = {
        merchantId: '',
        accountNo: '',
        bankAccountNo: '',
        bankAccountStatus: '',
        payAccountStatus: '',
        openStep: 0,
      }
    },
  },
})

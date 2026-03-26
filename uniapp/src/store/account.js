import { defineStore } from 'pinia'
export const useAccountStore = defineStore('account', {
  state: () => ({
    currentAccount: {
      accountNo: 'LAK2026030003',
      name: '李四 (导游)',
      type: 'guide',
      typeName: '导游',
      level: 3,
      balance: 8560.00,
      frozenBalance: 0,
      status: 'VALID',
      auditStatus: 'not_required',
    },
    isLoggedIn: true,
  }),
  actions: {
    updateBalance(balance) {
      this.currentAccount.balance = balance
    }
  }
})

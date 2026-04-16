import { defineStore } from 'pinia'

/**
 * Pinia Store — 全局账户状态管理（多账户模式）
 * 存储当前选中的 account_no，跨页面共享
 */
export const useAccountStore = defineStore('account', {
  state: () => ({
    currentAccountNo: '',        // 当前选中账户编号
    currentMerchantId: null,     // 当前商户 ID
    accounts: [],                // 账户列表缓存
    accountMap: {},             // account_no → account 映射
  }),

  getters: {
    currentAccount: (state) => state.accountMap[state.currentAccountNo] || null,
    hasAccount: (state) => !!state.currentAccountNo,
  },

  actions: {
    /**
     * 设置账户列表并自动选中第一个
     */
    setAccounts(accounts) {
      this.accounts = accounts
      this.accountMap = {}
      accounts.forEach(a => { this.accountMap[a.account_no] = a })
      // 自动选中第一个（如果当前没有选中）
      if (!this.currentAccountNo && accounts.length > 0) {
        this.currentAccountNo = accounts[0].account_no
      }
    },

    /**
     * 切换当前账户
     */
    selectAccount(accountNo) {
      if (this.accountMap[accountNo]) {
        this.currentAccountNo = accountNo
        // 同步写入本地存储
        uni.setStorageSync('currentAccountNo', accountNo)
      }
    },

    /**
     * 从本地存储恢复选中账户
     */
    restoreSelectedAccount() {
      const saved = uni.getStorageSync('currentAccountNo')
      if (saved && this.accountMap[saved]) {
        this.currentAccountNo = saved
      }
    },
  },
})

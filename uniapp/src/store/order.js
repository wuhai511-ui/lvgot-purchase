import { defineStore } from 'pinia'
export const useOrderStore = defineStore('order', {
  state: () => ({
    orderList: [],
    currentFilter: 'all',
  }),
  actions: {
    setFilter(filter) {
      this.currentFilter = filter
    }
  }
})

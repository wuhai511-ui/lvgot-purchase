import { defineStore } from 'pinia'
export const useSplitStore = defineStore('split', {
  state: () => ({
    splitRecords: [],
    pendingSplits: [],
  }),
  actions: {}
})

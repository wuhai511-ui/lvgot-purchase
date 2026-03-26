<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
// 引入全局样式
import '@/static/styles/common.scss'

onLaunch(() => {
  console.log('App Launch')
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局样式已迁移至 static/styles/common.scss */
page {
  background-color: #f5f5f5;
}
</style>

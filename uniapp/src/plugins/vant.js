/**
 * Vant 组件按需注册插件
 * 使用方式：在 main.js 中 import 并调用 app.use(vant)
 */
import Button from '@vant/weapp/button/index'
import Cell from '@vant/weapp/cell/index'
import CellGroup from '@vant/weapp/cell-group/index'
import Field from '@vant/weapp/field/index'
import Form from '@vant/weapp/form/index'
import Toast from '@vant/weapp/toast/index'

const vant = {
  install(app) {
    // 按需注册常用组件
    app.component('van-button', Button)
    app.component('van-cell', Cell)
    app.component('van-cell-group', CellGroup)
    app.component('van-field', Field)
    app.component('van-form', Form)
    app.component('van-toast', Toast)
  }
}

export default vant

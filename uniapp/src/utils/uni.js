// Uni API polyfill for H5/web
const uni = {
  navigateTo({ url, success, fail, complete }) {
    const handle = () => {
      if (success) success({ errMsg: 'navigateTo:ok' })
      if (complete) complete({ errMsg: 'navigateTo:ok' })
    }
    try {
      // Use hash-based routing for SPA
      const [path, query] = url.split('?')
      window.location.hash = path + (query ? '?' + query : '')
      handle()
    } catch (e) {
      if (fail) fail({ errMsg: 'navigateTo:fail' })
    }
  },
  navigateBack({ delta = 1, success, fail, complete }) {
    window.history.go(-delta)
    if (success) success({ errMsg: 'navigateBack:ok' })
    if (complete) complete({ errMsg: 'navigateBack:ok' })
  },
  switchTab({ url, success, fail, complete }) {
    window.location.hash = url
    if (success) success({ errMsg: 'switchTab:ok' })
    if (complete) complete({ errMsg: 'switchTab:ok' })
  },
  showToast({ title, icon = 'success', duration = 2000, success, fail, complete }) {
    const el = document.createElement('div')
    el.style.cssText = `position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;padding:12px 24px;border-radius:8px;z-index:99999;font-size:14px`
    el.textContent = title
    document.body.appendChild(el)
    setTimeout(() => { el.remove() }, duration)
    if (success) success({ errMsg: 'showToast:ok' })
    if (complete) complete({ errMsg: 'showToast:ok' })
  },
  showModal({ title, content, showCancel = true, success, fail, complete }) {
    const confirmed = window.confirm(content || title || '')
    const res = { errMsg: 'showModal:ok', confirm: confirmed, cancel: !confirmed }
    if (success) success(res)
    if (complete) complete(res)
  },
  showLoading({ title, mask, success, fail, complete }) {
    if (success) success({ errMsg: 'showLoading:ok' })
    if (complete) complete({ errMsg: 'showLoading:ok' })
  },
  hideLoading({ success, fail, complete }) {
    if (success) success({ errMsg: 'hideLoading:ok' })
    if (complete) complete({ errMsg: 'hideLoading:ok' })
  },
  getStorageSync(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
  },
  setStorageSync(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
  },
  removeStorageSync(key) {
    localStorage.removeItem(key)
  }
}

// Mount globally
window.uni = uni
export default uni

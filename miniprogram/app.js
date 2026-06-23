App({
  globalData: {
    theme: 'default' // default | dark | warm | minimal
  },
  onLaunch() {
    // 加载主题偏好
    try {
      const saved = wx.getStorageSync('kb_theme')
      if (saved) this.globalData.theme = saved
    } catch (e) {}
    // 初始化存储
    try {
      if (wx.getStorageSync('kb_docs') == null) wx.setStorageSync('kb_docs', [])
      if (wx.getStorageSync('kb_notes') == null) wx.setStorageSync('kb_notes', [])
    } catch (e) { console.error('初始化存储失败', e) }
    // 检查存储空间
    try {
      const info = wx.getStorageInfoSync()
      if (info.currentSize >= 8192) { // currentSize 单位为 KB，8192KB = 8MB
        wx.showToast({ title: '存储空间即将用尽，请及时清理', icon: 'none', duration: 3000 })
      }
    } catch (e) { console.warn('检查存储空间失败', e) }
    // 清理超过 90 天的问答历史
    try {
      const history = wx.getStorageSync('kb_qa_history') || []
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
      const filtered = history.filter(h => h.time > cutoff)
      if (filtered.length !== history.length) wx.setStorageSync('kb_qa_history', filtered)
    } catch (e) { console.warn('清理问答历史失败', e) }
  }
})

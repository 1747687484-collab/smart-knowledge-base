const storage = require('../../utils/storage')
const ai = require('../../utils/ai')
const { getThemeClass } = require('../../utils/theme')

const IC = '/assets/icons/svg'
Page({
  data: {
    question: '', docId: '', docTitle: '', onlyDoc: false, answer: '', sources: [],
    history: [], loading: false, themeClass: '', examples: ['帮我总结主要结论', '有哪些关键信息', '有没有提到风险', '下一步建议是什么'],
    icons: { qa: IC + '/message-circle.svg', copy: IC + '/copy.svg', search: IC + '/search.svg', brain: IC + '/brain.svg', database: IC + '/database.svg' }
  },
  _chunkCache: null,
  _chunkCacheTime: 0,
  onShow: function () {
    this.setData({ themeClass: getThemeClass() })
    this.syncDocTitle()
    this.loadHistory()
    this._updateExamples()
  },
  loadHistory: function () {
    try {
      const h = wx.getStorageSync('kb_qa_history') || []
      this.setData({ history: h.slice(0, 20) })
    } catch (e) {}
  },
  saveHistory: function (q, a) {
    try {
      let h = wx.getStorageSync('kb_qa_history') || []
      h.unshift({ q, a, time: Date.now() })
      h = h.slice(0, 50)
      wx.setStorageSync('kb_qa_history', h)
      this.setData({ history: h.slice(0, 20) })
    } catch (e) {}
  },
  onClearHistory: function () {
    try { wx.setStorageSync('kb_qa_history', []) } catch (e) {}
    this.setData({ history: [] })
  },
  _updateExamples: function () {
    const pool = storage.getAllItems()
    if (!pool.length) { this.setData({ examples: ['帮我总结主要结论', '有哪些关键信息', '有没有提到风险', '下一步建议是什么'] }); return }
    // 从最近文档的关键词动态生成示例问题
    const recent = pool.slice(0, 3)
    const kws = []
    for (let i = 0; i < recent.length; i++) {
      const item = recent[i]
      if (item.keywords && item.keywords.length) kws.push(item.keywords[0])
    }
    const examples = ['帮我总结主要结论', '有哪些关键信息']
    if (kws.length) examples.push('和 ' + kws[0] + ' 相关的内容有哪些')
    if (kws.length > 1) examples.push(kws[1] + ' 的要点是什么')
    this.setData({ examples: examples.slice(0, 4) })
  },
  onLoad: function (options) {
    if (options && options.docId) {
      this.setData({ docId: options.docId, onlyDoc: true })
      this.syncDocTitle()
    }
  },
  syncDocTitle: function () {
    if (!this.data.docId) { this.setData({ docTitle: '' }); return }
    const target = storage.findById(this.data.docId)
    this.setData({ docTitle: (target && target.title) || '当前文档' })
  },
  onInput: function (e) { this.setData({ question: e.detail.value }) },
  onClear: function () { this.setData({ question: '', answer: '', sources: [] }) },
  onReask: function () { this.setData({ answer: '', sources: [] }); this.onAsk() },
  onCopyAnswer: function () {
    const text = this.data.answer || ''
    if (!text) return
    wx.setClipboardData({ data: text })
  },
  onToggleScope: function () {
    if (!this.data.docId) return
    this.setData({ onlyDoc: true })
  },
  onToggleAllScope: function () { this.setData({ onlyDoc: false }) },
  onTapExample: function (e) {
    const q = e.currentTarget.dataset.q || ''
    this.setData({ question: q })
    this.onAsk()
  },
  onAsk: function () {
    const q = (this.data.question || '').trim()
    if (!q) { wx.showToast({ title: '请先输入问题', icon: 'none' }); return }
    const pool = storage.getAllItems()
    if (!pool.length) { wx.showToast({ title: '还没有知识库内容', icon: 'none' }); return }
    this.setData({ loading: true, answer: '', sources: [] })
    const self = this
    wx.nextTick(function () {
      let targets = pool
      if (self.data.onlyDoc && self.data.docId) {
        targets = pool.filter(function (item) { return item.id === self.data.docId })
        if (!targets.length) targets = pool
      }
      // 检查分块缓存是否有效（基于数据最新更新时间）
      const latestTime = Math.max.apply(null, targets.map(function (t) { return t.updatedAt || t.createdAt || 0 }).concat([0]))
      const cacheKey = targets.map(function (t) { return t.id }).join(',')
      if (!self._chunkCache || self._chunkCacheTime < latestTime || self._chunkCacheKey !== cacheKey) {
        const allChunks = []
        for (let j = 0; j < targets.length; j++) {
          const item = targets[j]
          const chunks = (item.chunks && item.chunks.length) ? item.chunks : ai.buildChunks(item.content || '', 420)
          for (let k = 0; k < chunks.length; k++) {
            allChunks.push({ content: chunks[k].content, index: chunks[k].index, sourceId: item.id, sourceTitle: item.title || '未命名记录' })
          }
        }
        self._chunkCache = allChunks
        self._chunkCacheTime = latestTime
        self._chunkCacheKey = cacheKey
      }
      const topChunks = ai.searchChunks(self._chunkCache, q, 5)
      const answer = ai.extractAnswer(topChunks, q)
      self.setData({ answer: answer, sources: topChunks, loading: false })
      self.saveHistory(q, answer)
    })
  }
})

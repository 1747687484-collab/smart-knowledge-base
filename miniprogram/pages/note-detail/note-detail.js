const storage = require('../../utils/storage')
const ai = require('../../utils/ai')
const { formatDate } = require('../../utils/date')

const IC = '/assets/icons/svg'
Page({
  data: {
    isEdit: false, id: '', title: '', content: '', focus: false, contentLength: 0,
    related: [],
    icons: {
      save: IC + '/save.svg', back: IC + '/arrow-left.svg', trash: IC + '/trash-2.svg',
      brain: IC + '/brain.svg', key: IC + '/key.svg', tag: IC + '/tag.svg',
      link: IC + '/link.svg', note: IC + '/edit-3.svg'
    },
    summary: '', keywords: [], tags: [], entities: [], knowledgePointsText: ''
  },
  _draftTimer: null,
  onLoad: function (options) {
    if (options && options.id) {
      this.setData({ focus: false })
      const item = storage.findNoteById(options.id)
      if (item) {
        const kpt = (item.chunks || []).slice(0, 3).map(function (c) { return c.content.slice(0, 80) }).join('\n\n')
        const content = item.content || ''
        this.setData({
          isEdit: true, id: item.id, title: item.title || '', content: content,
          contentLength: content.length,
          summary: item.summary || '', keywords: item.keywords || [], tags: item.tags || [],
          entities: item.entities || [], knowledgePointsText: kpt
        })
        this.setData({ related: ai.findRelated(item, storage.getAllItems(), 5) })
      }
    } else {
      this.setData({ focus: true })
    }
    this._loadDraft()
  },
  onInputTitle: function (e) { this.setData({ title: e.detail.value }); this._saveDraft() },
  onInputContent: function (e) { this.setData({ content: e.detail.value, contentLength: (e.detail.value || '').length }); this._saveDraft() },
  _saveDraft: function () {
    const self = this
    if (this._draftTimer) clearTimeout(this._draftTimer)
    this._draftTimer = setTimeout(function () {
      try {
        wx.setStorageSync('kb_draft_note', { title: self.data.title, content: self.data.content, id: self.data.id || '' })
      } catch (e) {}
    }, 2000)
  },
  _loadDraft: function () {
    try {
      const draft = wx.getStorageSync('kb_draft_note')
      if (draft && (draft.title || draft.content) && !this.data.isEdit) {
        const draftContent = draft.content || ''
        this.setData({ title: draft.title || '', content: draftContent, contentLength: draftContent.length })
        wx.showToast({ title: '已恢复草稿', icon: 'none', duration: 1500 })
      }
    } catch (e) {}
  },
  _clearDraft: function () {
    try { wx.removeStorageSync('kb_draft_note') } catch (e) {}
  },
  onBack: function () { wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/notes/notes' }) } }) },
  onSave: function () {
    const title = this.data.title
    const content = this.data.content
    if (!content.trim()) { wx.showToast({ title: '请先写点内容', icon: 'none' }); return }
    if (content.length > 50000) {
      wx.showToast({ title: '笔记内容过长，请精简到 5 万字以内', icon: 'none' })
      return
    }
    this._clearDraft()
    const aiResult = ai.processContent(content)
    const now = Date.now()
    if (this.data.isEdit) {
      const existing = storage.findNoteById(this.data.id)
      storage.updateNote(Object.assign({ id: this.data.id, title: title, content: content, updatedAt: now, createdAt: existing ? existing.createdAt : now }, aiResult))
      wx.showToast({ title: '已更新', icon: 'success' })
    } else {
      storage.addNote(Object.assign({ id: storage.generateId(), title: title, content: content, createdAt: now, updatedAt: now }, aiResult))
      wx.showToast({ title: '已保存', icon: 'success' })
    }
    setTimeout(function () { wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/index/index' }) } }) }, 1500)
  },
  onDelete: function () {
    const self = this
    if (!this.data.isEdit) return
    wx.showModal({
      title: '删除笔记', content: '确认删除这条笔记吗？',
      success: function (res) {
        if (res.confirm) {
          storage.removeNote(self.data.id)
          wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/index/index' }) } })
        }
      }
    })
  }
})

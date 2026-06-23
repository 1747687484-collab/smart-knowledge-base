const storage = require('../../utils/storage')
const ai = require('../../utils/ai')
const { formatDate } = require('../../utils/date')

const IC = '/assets/icons/svg'
Page({
  data: {
    id: '',
    type: '',
    notFound: false,
    expandedChunks: {},
    related: [],
    icons: {
      brain: IC + '/brain.svg', key: IC + '/key.svg', tag: IC + '/tag.svg',
      entity: IC + '/git-branch.svg', chunk: IC + '/layers.svg', graph: IC + '/network.svg',
      qa: IC + '/message-circle.svg', copy: IC + '/copy.svg', link: IC + '/link.svg',
      trash: IC + '/trash-2.svg', doc: IC + '/file-text.svg'
    },
    item: { title: '', fileType: '', createdText: '', summary: '', keywords: [], tags: [], entities: [], chunks: [] }
  },
  onLoad: function (options) {
    const id = options && options.id
    const type = (options && options.type) || 'doc'
    const target = storage.findById(id)
    if (!target) {
      wx.showToast({ title: '记录不存在', icon: 'none' })
      this.setData({ notFound: true })
      return
    }
    const chunks = (target.chunks || []).map(function (c) {
      return { index: c.index, content: c.content, preview: (c.content || '').slice(0, 140) }
    })
    this.setData({
      id: id,
      type: type,
      item: Object.assign({}, target, {
        createdText: formatDate(target.createdAt || Date.now()),
        keywords: target.keywords || [],
        tags: target.tags || [],
        entities: target.entities || [],
        chunks: chunks
      })
    })
    this.setData({ related: ai.findRelated(target, storage.getAllItems(), 5) })
  },
  onDelete: function () {
    const self = this
    if (!this.data.id) return
    wx.showModal({
      title: '删除文档',
      content: '确认删除这份文档吗？',
      success: function (res) {
        if (res.confirm) {
          if (self.data.type === 'note') {
            storage.removeNote(self.data.id)
          } else {
            storage.removeDoc(self.data.id)
          }
          wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/index/index' }) } })
        }
      }
    })
  },
  onToggleChunk: function (e) {
    const idx = e.currentTarget.dataset.idx
    const expandedChunks = Object.assign({}, this.data.expandedChunks)
    expandedChunks[idx] = !expandedChunks[idx]
    this.setData({ expandedChunks })
  },
  onCopySummary: function () {
    const text = this.data.item.summary || ''
    if (!text) { wx.showToast({ title: '暂无摘要', icon: 'none' }); return }
    wx.setClipboardData({ data: text })
  },
  onCopyContent: function () {
    const text = this.data.item.content || ''
    if (!text) { wx.showToast({ title: '暂无内容', icon: 'none' }); return }
    wx.setClipboardData({ data: text })
  }
})

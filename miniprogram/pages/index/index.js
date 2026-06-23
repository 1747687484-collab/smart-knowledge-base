const { getDocs, getNotes } = require('../../utils/storage')
const { formatDate } = require('../../utils/date')
const { getThemeClass } = require('../../utils/theme')
const IC = '/assets/icons/svg'

Page({
  data: {
    docs: [],
    notes: [],
    qaCount: 0,
    themeClass: '',
    icons: {
      doc: IC + '/file-text.svg',
      note: IC + '/edit-3.svg',
      qa: IC + '/message-circle.svg',
      graph: IC + '/network.svg',
      brain: IC + '/brain.svg',
      zap: IC + '/zap.svg',
      settings: IC + '/settings.svg'
    }
  },
  onShow() {
    let qaCount = 0
    try { qaCount = (wx.getStorageSync('kb_qa_history') || []).length } catch (e) {}
    const allDocs = getDocs() || []
    const allNotes = getNotes() || []
    // 统计所有标签
    const tagSet = {}
    allDocs.concat(allNotes).forEach(function (item) {
      (item.tags || []).forEach(function (t) { tagSet[t] = true })
    })
    const tagCount = Object.keys(tagSet).length
    const docs = allDocs.slice(0, 6).map(function(d) {
      return {
        id: d.id,
        title: d.title || '未命名文档',
        updatedText: formatDate(d.updatedAt || d.createdAt || Date.now()),
        preview: (d.summary || d.content || '').slice(0, 60),
        tags: d.tags || []
      }
    })
    const notes = allNotes.slice(0, 6).map(function(d) {
      return {
        id: d.id,
        title: d.title || '未命名笔记',
        updatedText: formatDate(d.updatedAt || d.createdAt || Date.now()),
        preview: (d.summary || d.content || '').slice(0, 60)
      }
    })
    this.setData({ docs: docs, notes: notes, qaCount: qaCount, docCount: allDocs.length, noteCount: allNotes.length, tagCount: tagCount, themeClass: getThemeClass() })
  }
})

const { getDocs, addDoc, removeDoc, toggleDocStar, sortItems, generateId, checkStorageQuota } = require('../../utils/storage')
const ai = require('../../utils/ai')
const { filterByKeyword, prepareListItem } = require('../../utils/search')
const { getThemeClass } = require('../../utils/theme')

const guessType = function (name) {
  if (!name) return '文本'
  const ext = name.split('.').pop().toLowerCase()
  if (ext === 'pdf') return 'PDF'
  if (ext === 'doc' || ext === 'docx') return 'Word'
  if (ext === 'txt' || ext === 'md' || ext === 'markdown') return '文本'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return '图片'
  return '文件'
}

const IC = '/assets/icons/svg'

Page({
  data: { list: [], tab: 'all', searchKey: '', themeClass: '', icons: { upload: IC + '/upload.svg', paste: IC + '/clipboard-paste.svg', search: IC + '/search.svg', doc: IC + '/file-text.svg', brain: IC + '/brain.svg', star: IC + '/star.svg' } },
  _searchTimer: null,
  onShow: function () { this.setData({ themeClass: getThemeClass() }); this.refresh() },
  onSearchInput: function (e) {
    var self = this
    this.setData({ searchKey: (e.detail.value || '').trim() })
    if (this._searchTimer) clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(function () { self.refresh() }, 300)
  },
  onSearch: function () { this.refresh() },
  onSearchClear: function () {
    this.setData({ searchKey: '' })
    this.refresh()
  },
  onTab: function (e) {
    var t = (e.currentTarget.dataset && e.currentTarget.dataset.t) || 'all'
    this.setData({ tab: t })
    this.refresh()
  },
  refresh: function () {
    var key = this.data.searchKey
    var all = sortItems(getDocs() || [])
    var filtered = filterByKeyword(all, key)
    var list = filtered.map(function (d) {
      var item = prepareListItem(d, key)
      item.typeText = d.fileType || '文本'
      return item
    })
    this.setData({ list: this.data.tab === 'recent' ? list.slice(0, 10) : list })
  },
  onStar: function (e) {
    var id = e.currentTarget.dataset && e.currentTarget.dataset.id
    if (!id) return
    toggleDocStar(id)
    this.refresh()
  },
  onLongPress: function (e) {
    var self = this
    var id = e.currentTarget.dataset && e.currentTarget.dataset.id
    if (!id) return
    wx.showActionSheet({
      itemList: ['星标', '删除'],
      success: function (res) {
        if (res.tapIndex === 0) {
          toggleDocStar(id)
          self.refresh()
        } else if (res.tapIndex === 1) {
          wx.showModal({
            title: '删除文档',
            content: '确认删除这份文档吗？',
            success: function (res2) {
              if (res2.confirm) {
                removeDoc(id)
                self.refresh()
              }
            }
          })
        }
      }
    })
  },
  onChooseFile: function () {
    var self = this
    wx.chooseMessageFile({
      count: 5,
      type: 'file',
      success: function (res) {
        var files = res.tempFiles
        var total = files.length
        var done = 0
        wx.showLoading({ title: '处理中 0/' + total })
        var fs = wx.getFileSystemManager()
        // 逐个异步读取文件，确保 loading 提示可见
        var processNext = function (idx) {
          if (idx >= files.length) {
            wx.hideLoading()
            wx.showToast({ title: '已收录 ' + total + ' 份', icon: 'success' })
            return
          }
          var f = files[idx]
          fs.readFile({
            filePath: f.path,
            encoding: 'utf8',
            success: function (r) {
              var text = r.data || ''
              if (text) {
                self.importText(f.name, text, { filePath: f.path, size: f.size })
              } else {
                self.importText(f.name, '已收录文件：' + f.name + '。当前版本先支持文本提取，后续可接入 OCR 与文档解析。', { filePath: f.path, size: f.size })
              }
            },
            fail: function () {
              self.importText(f.name, '已收录文件：' + f.name + '。当前版本先支持文本提取，后续可接入 OCR 与文档解析。', { filePath: f.path, size: f.size })
            },
            complete: function () {
              done++
              wx.showLoading({ title: '处理中 ' + done + '/' + total })
              processNext(idx + 1)
            }
          })
        }
        processNext(0)
      }
    })
  },
  onPasteText: function () {
    var self = this
    wx.showModal({
      title: '粘贴文本',
      editable: true,
      placeholderText: '把报告、资料或备忘内容粘贴到这里',
      success: function (res) {
        if (res.confirm && res.content && res.content.trim()) {
          self.importText('粘贴文本', res.content.trim())
          wx.showToast({ title: '已收录', icon: 'success' })
        }
      }
    })
  },
  importFile: function (name, path2, size) {
    var self = this
    var fs = wx.getFileSystemManager()
    var text = ''
    try { text = fs.readFileSync(path2, 'utf8') || '' } catch (e) {
      try { text = fs.readFileSync(path2, 'utf-8') || '' } catch (e2) { text = '' }
    }
    if (!text) {
      var tip = '已收录文件：' + name + '。当前版本先支持文本提取，后续可接入 OCR 与文档解析。'
      self.importText(name, tip, { filePath: path2, size: size })
      return
    }
    if (text.length > 80000) {
      wx.showToast({ title: '文件内容过长，已截取前 8 万字', icon: 'none', duration: 2000 })
    }
    self.importText(name, text, { filePath: path2, size: size })
  },
  importText: function (title, rawText, fileMeta) {
    fileMeta = fileMeta || {}
    if (!checkStorageQuota()) return
    if (rawText.length > 80000) {
      rawText = rawText.slice(0, 80000)
    }
    var aiResult = ai.processContent(rawText)
    var now = Date.now()
    var doc = Object.assign({
      id: generateId(),
      title: title,
      content: rawText,
      fileType: guessType(title),
      filePath: fileMeta.filePath || '',
      fileSize: fileMeta.size || 0,
      createdAt: now,
      updatedAt: now
    }, aiResult)
    addDoc(doc)
    this.refresh()
  },
  onDelete: function (e) {
    var self = this
    var id = e.currentTarget.dataset && e.currentTarget.dataset.id
    if (!id) return
    wx.showModal({
      title: '删除文档',
      content: '确认删除这份文档吗？',
      success: function (res) {
        if (res.confirm) {
          removeDoc(id)
          self.refresh()
        }
      }
    })
  }
})

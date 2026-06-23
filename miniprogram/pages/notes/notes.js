const { getNotes, removeNote, toggleNoteStar, pinNote, sortItems } = require('../../utils/storage')
const { filterByKeyword, prepareListItem } = require('../../utils/search')
const { getThemeClass, applyPageTheme } = require('../../utils/theme')

const IC = '/assets/icons/svg'
Page({
  data: {
    list: [],
    searchKey: '',
    themeClass: '',
    icons: { note: IC + '/edit-3.svg', search: IC + '/search.svg', star: IC + '/star.svg', pin: IC + '/pin.svg' }
  },
  _searchTimer: null,
  onSearchInput(e) {
    this.setData({ searchKey: (e.detail.value || '').trim() })
    if (this._searchTimer) clearTimeout(this._searchTimer)
    const self = this
    this._searchTimer = setTimeout(function () { self.onShow() }, 300)
  },
  onSearch() { this.onShow() },
  onSearchClear() {
    this.setData({ searchKey: '' })
    this.onShow()
  },
  onStar(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    toggleNoteStar(id)
    this.onShow()
  },
  onPin(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    pinNote(id)
    this.onShow()
  },
  onShow() {
    const key = this.data.searchKey
    const all = sortItems(getNotes() || [], { pinned: true })
    const filtered = filterByKeyword(all, key)
    const list = filtered.map(d => prepareListItem(d, key))
    this.setData({ list, themeClass: getThemeClass() })
    applyPageTheme()
  },
  onDelete(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.showModal({
      title: '删除备忘',
      content: '确认删除这条备忘吗？',
      success: res => {
        if (res.confirm) {
          removeNote(id)
          this.onShow()
        }
      }
    })
  }
})

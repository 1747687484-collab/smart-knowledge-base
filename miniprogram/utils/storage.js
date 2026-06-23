// 安全读写封装，防止存储异常导致崩溃
const STORAGE_LIMIT = 10 * 1024 * 1024 // 微信本地存储上限 10MB
const WARNING_THRESHOLD = 8 * 1024 * 1024 // 8MB 警告线

const safeGet = (key) => {
  try {
    const val = wx.getStorageSync(key)
    if (val == null) return []
    if (!Array.isArray(val)) { console.warn('存储数据类型异常，已重置:', key); return [] }
    return val
  } catch (e) { return [] }
}
const safeSet = (key, val) => {
  try { wx.setStorageSync(key, val); return true } catch (e) {
    if (e && e.message && e.message.indexOf('storage') !== -1) {
      wx.showModal({ title: '存储空间不足', content: '本地存储已满，请清理部分文档或笔记后重试。', showCancel: false })
    }
    console.error('存储写入失败', key, e)
    return false
  }
}

let _docsCache = null
let _notesCache = null

const getDocs = () => { if (!_docsCache) _docsCache = safeGet('kb_docs'); return _docsCache }
const setDocs = list => {
  const prev = _docsCache
  _docsCache = list
  if (!safeSet('kb_docs', list)) { _docsCache = prev } // 写入失败时回滚缓存
}
const getNotes = () => { if (!_notesCache) _notesCache = safeGet('kb_notes'); return _notesCache }
const setNotes = list => {
  const prev = _notesCache
  _notesCache = list
  if (!safeSet('kb_notes', list)) { _notesCache = prev } // 写入失败时回滚缓存
}

const generateId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const getAllItems = () => getDocs().concat(getNotes())

const findById = (id) => {
  const docs = getDocs()
  for (let i = 0; i < docs.length; i++) { if (docs[i].id === id) return docs[i] }
  const notes = getNotes()
  for (let i = 0; i < notes.length; i++) { if (notes[i].id === id) return notes[i] }
  return null
}

const findDocById = (id) => {
  const docs = getDocs()
  for (let i = 0; i < docs.length; i++) { if (docs[i].id === id) return docs[i] }
  return null
}

const findNoteById = (id) => {
  const notes = getNotes()
  for (let i = 0; i < notes.length; i++) { if (notes[i].id === id) return notes[i] }
  return null
}

const sortItems = (items, opts) => {
  opts = opts || {}
  return items.slice().sort((a, b) => {
    if (opts.pinned) {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
    }
    if (a.starred && !b.starred) return -1
    if (!a.starred && b.starred) return 1
    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
  })
}

const addDoc = item => {
  const list = getDocs()
  list.unshift(item)
  setDocs(list)
  return item
}

const updateDoc = item => {
  const list = getDocs().map(d => d.id === item.id ? item : d)
  setDocs(list)
  return item
}

const removeDoc = id => {
  setDocs(getDocs().filter(d => d.id !== id))
}

const addNote = item => {
  const list = getNotes()
  list.unshift(item)
  setNotes(list)
  return item
}

const updateNote = item => {
  const list = getNotes().map(d => d.id === item.id ? item : d)
  setNotes(list)
  return item
}

const removeNote = id => {
  setNotes(getNotes().filter(d => d.id !== id))
}

const toggleDocStar = id => {
  const list = getDocs()
  const idx = list.findIndex(d => d.id === id)
  if (idx === -1) return
  list[idx].starred = !list[idx].starred
  list[idx].updatedAt = Date.now()
  setDocs(list)
}

const toggleNoteStar = id => {
  const list = getNotes()
  const idx = list.findIndex(d => d.id === id)
  if (idx === -1) return
  list[idx].starred = !list[idx].starred
  list[idx].updatedAt = Date.now()
  setNotes(list)
}

const pinNote = id => {
  const list = getNotes()
  const idx = list.findIndex(d => d.id === id)
  if (idx === -1) return
  list[idx].pinned = !list[idx].pinned
  list[idx].updatedAt = Date.now()
  setNotes(list)
}

const _resetCache = () => { _docsCache = null; _notesCache = null }

const checkStorageQuota = () => {
  try {
    const info = wx.getStorageInfoSync()
    const used = info.currentSize * 1024 // KB → bytes
    if (used >= STORAGE_LIMIT) {
      wx.showModal({ title: '存储已满', content: '本地存储已达上限（10MB），部分功能可能无法正常使用。请清理无用文档后重试。', showCancel: false })
      return false
    }
    if (used >= WARNING_THRESHOLD) {
      wx.showToast({ title: '存储空间即将用尽', icon: 'none', duration: 2500 })
    }
    return true
  } catch (e) {
    return true // 无法检查时不阻止操作
  }
}

module.exports = {
  getDocs, setDocs, addDoc, updateDoc, removeDoc,
  getNotes, setNotes, addNote, updateNote, removeNote,
  toggleDocStar, toggleNoteStar, pinNote,
  generateId, getAllItems, findById, findDocById, findNoteById, sortItems,
  checkStorageQuota, _resetCache
}

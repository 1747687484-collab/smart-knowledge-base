const { formatDate } = require('./date')
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const filterByKeyword = (items, key) => {
  if (!key) return items
  const lower = key.toLowerCase()
  return items.filter(d => {
    const t = ((d.title || '') + ' ' + (d.content || '') + ' ' + (d.summary || '')).toLowerCase()
    return t.indexOf(lower) !== -1
  })
}

const highlightMatch = (text, q) => {
  if (!q || !text) return text || ''
  const re = new RegExp('(' + escapeRegex(q) + ')', 'gi')
  return text.replace(re, '[$1]')
}

const prepareListItem = (item, key) => {
  const preview = (item.summary || item.content || '').slice(0, 60)
  const result = {
    id: item.id,
    title: item.title || '未命名',
    preview: preview,
    updatedText: formatDate(item.updatedAt || item.createdAt || Date.now()),
    starred: item.starred,
    pinned: item.pinned,
    tags: item.tags || [],
    fileType: item.fileType
  }
  if (key) {
    result.titleHL = highlightMatch(item.title || '', key)
    result.previewHL = highlightMatch(preview, key)
  }
  return result
}

module.exports = { filterByKeyword, highlightMatch, prepareListItem }

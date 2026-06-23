/* eslint-disable no-undef */
global.wx = {
  _store: {},
  getStorageSync(key) { return this._store[key] },
  setStorageSync(key, value) { this._store[key] = value }
}

const assert = require('node:assert/strict')
const ai = require('../miniprogram/utils/ai')
const graph = require('../miniprogram/utils/graph')
const storage = require('../miniprogram/utils/storage')
const search = require('../miniprogram/utils/search')
const { formatDate } = require('../miniprogram/utils/date')
storage._resetCache()

const results = []
function test(name, fn) {
  try { fn(); results.push({ name, pass: true }) }
  catch (e) { results.push({ name, pass: false, error: e.message }) }
}

// === AI ===
test('ai: summarize returns string', () => {
  const s = ai.summarize('你好。今天天气很好。我们需要优化产品方案。总结和建议如下。')
  assert.equal(typeof s, 'string')
})
test('ai: topKeywords returns <= limit', () => {
  const k = ai.topKeywords('产品方案和产品设计很重要，设计要落地', 5)
  assert.ok(k.length <= 5)
})
test('ai: guessTags returns array', () => {
  const t = ai.guessTags('我们需要一个产品方案并进行原型设计以便落地需求功能')
  assert.ok(Array.isArray(t))
})
test('ai: guessEntities returns array', () => {
  const e = ai.guessEntities('张经理负责星海科技项目，2026-01-15 开始')
  assert.ok(Array.isArray(e))
})
test('ai: guessEntities detects emails', () => {
  const e = ai.guessEntities('联系 admin@example.com 获取详情')
  assert.ok(e.some(ent => ent.type === '邮箱'))
})
test('ai: guessEntities detects amounts', () => {
  const e = ai.guessEntities('项目预算为 50万元')
  assert.ok(e.some(ent => ent.type === '金额'))
})
test('ai: guessEntities detects institutions', () => {
  const e = ai.guessEntities('南昌大学计算机学院完成了研究')
  assert.ok(e.some(ent => ent.type === '机构'))
})
test('ai: buildChunks returns indexed chunks', () => {
  const chunks = ai.buildChunks('段一。\n\n段二较长文本。')
  assert.ok(chunks.length >= 1)
  chunks.forEach(c => { assert.equal(typeof c.index, 'number'); assert.ok(c.content.length > 0) })
})
test('ai: searchChunks returns scored results', () => {
  const chunks = ai.buildChunks('产品方案很重要。设计与原型要落地。总结：继续迭代。')
  const top = ai.searchChunks(chunks, '产品方案', 2)
  assert.ok(top.length >= 1)
  assert.ok(top[0].score >= 0)
})
test('ai: extractAnswer returns string', () => {
  const chunks = ai.buildChunks('产品方案很重要。设计与原型要落地。总结：继续迭代。')
  const ans = ai.extractAnswer(chunks, '产品方案是什么')
  assert.equal(typeof ans, 'string')
})
test('ai: processContent returns all fields', () => {
  const r = ai.processContent('这是一份关于产品方案的文档。我们需要优化设计方案。总结：继续迭代。')
  assert.equal(typeof r.summary, 'string')
  assert.ok(Array.isArray(r.keywords))
  assert.ok(Array.isArray(r.tags))
  assert.ok(Array.isArray(r.entities))
  assert.ok(Array.isArray(r.chunks))
})

// === Graph ===
test('graph: buildDocGraph with full doc', () => {
  const g = graph.buildDocGraph({ id: 'd1', title: '测试', tags: ['产品'], entities: [{ type: '项目', name: 'X' }], keywords: ['k1'] })
  assert.ok(g.nodes.length > 0)
  assert.ok(g.edges.length > 0)
  assert.ok(g.nodes.some(n => n.group === 'doc'))
  assert.ok(g.nodes.some(n => n.group === 'tag'))
})
test('graph: buildDocGraph with minimal doc', () => {
  const g = graph.buildDocGraph({ id: 'd2' })
  assert.equal(g.nodes.length, 1)
  assert.equal(g.edges.length, 0)
})
test('graph: deduplicates node ids', () => {
  const g = graph.buildDocGraph({ id: 'd3', title: 't', tags: ['dup', 'dup'] })
  const tagNodes = g.nodes.filter(n => n.id === 'tag:dup')
  assert.equal(tagNodes.length, 1)
})

// === Storage ===
test('storage: addDoc & getDocs', () => {
  storage.setDocs([])
  storage.addDoc({ id: '1', title: 'doc1' })
  assert.equal(storage.getDocs().length, 1)
  assert.equal(storage.getDocs()[0].id, '1')
})
test('storage: updateDoc', () => {
  storage.setDocs([{ id: '1', title: 'old' }])
  storage.updateDoc({ id: '1', title: 'new' })
  assert.equal(storage.getDocs()[0].title, 'new')
})
test('storage: removeDoc', () => {
  storage.setDocs([{ id: '1', title: 'a' }, { id: '2', title: 'b' }])
  storage.removeDoc('1')
  assert.equal(storage.getDocs().length, 1)
  assert.equal(storage.getDocs()[0].id, '2')
})
test('storage: addNote & getNotes', () => {
  storage.setNotes([])
  storage.addNote({ id: 'n1', title: 'note1' })
  assert.equal(storage.getNotes().length, 1)
  assert.equal(storage.getNotes()[0].id, 'n1')
})
test('storage: updateNote', () => {
  storage.setNotes([{ id: 'n1', title: 'old' }])
  storage.updateNote({ id: 'n1', title: 'new' })
  assert.equal(storage.getNotes()[0].title, 'new')
})
test('storage: removeNote', () => {
  storage.setNotes([{ id: 'n1', title: 'a' }, { id: 'n2', title: 'b' }])
  storage.removeNote('n1')
  assert.equal(storage.getNotes().length, 1)
  assert.equal(storage.getNotes()[0].id, 'n2')
})
test('storage: addDoc prepends', () => {
  storage.setDocs([])
  storage.addDoc({ id: '1', title: 'first' })
  storage.addDoc({ id: '2', title: 'second' })
  assert.equal(storage.getDocs()[0].id, '2')
  assert.equal(storage.getDocs()[1].id, '1')
})
test('storage: generateId returns unique string', () => {
  const id1 = storage.generateId()
  const id2 = storage.generateId()
  assert.equal(typeof id1, 'string')
  assert.ok(id1.length > 5)
  assert.notEqual(id1, id2)
})
test('storage: getAllItems combines docs and notes', () => {
  storage.setDocs([{ id: 'd1' }])
  storage.setNotes([{ id: 'n1' }])
  const all = storage.getAllItems()
  assert.equal(all.length, 2)
  assert.ok(all.some(x => x.id === 'd1'))
  assert.ok(all.some(x => x.id === 'n1'))
})
test('storage: findById finds doc and note', () => {
  storage.setDocs([{ id: 'd1', title: 'doc' }])
  storage.setNotes([{ id: 'n1', title: 'note' }])
  assert.equal(storage.findById('d1').title, 'doc')
  assert.equal(storage.findById('n1').title, 'note')
  assert.equal(storage.findById('missing'), null)
})
test('storage: sortItems respects pinned and starred', () => {
  const items = [
    { id: '1', updatedAt: 3 },
    { id: '2', updatedAt: 1, starred: true },
    { id: '3', updatedAt: 2, pinned: true }
  ]
  const sorted = storage.sortItems(items, { pinned: true })
  assert.equal(sorted[0].id, '3')
  assert.equal(sorted[1].id, '2')
  assert.equal(sorted[2].id, '1')
})

// === Search ===
test('search: filterByKeyword matches title', () => {
  const items = [{ title: '产品方案', content: '' }, { title: '技术文档', content: '' }]
  const result = search.filterByKeyword(items, '产品')
  assert.equal(result.length, 1)
  assert.equal(result[0].title, '产品方案')
})
test('search: filterByKeyword matches content', () => {
  const items = [{ title: '标题A', content: '这是一份关于人工智能的报告' }, { title: '标题B', content: '普通内容' }]
  const result = search.filterByKeyword(items, '人工智能')
  assert.equal(result.length, 1)
})
test('search: filterByKeyword returns all when empty', () => {
  const items = [{ title: 'a' }, { title: 'b' }]
  assert.equal(search.filterByKeyword(items, '').length, 2)
  assert.equal(search.filterByKeyword(items, null).length, 2)
})
test('search: highlightMatch marks keywords', () => {
  const result = search.highlightMatch('这是一份产品方案', '产品')
  assert.ok(result.includes('[产品]'))
})
test('search: highlightMatch returns original when no query', () => {
  assert.equal(search.highlightMatch('测试文本', ''), '测试文本')
  assert.equal(search.highlightMatch('测试文本', null), '测试文本')
})
test('search: prepareListItem returns formatted item', () => {
  const item = { id: '1', title: '测试', content: '内容摘要', updatedAt: Date.now(), tags: ['标签A'] }
  const result = search.prepareListItem(item, '')
  assert.equal(result.id, '1')
  assert.equal(result.title, '测试')
  assert.ok(Array.isArray(result.tags))
  assert.equal(result.tags[0], '标签A')
})
test('search: prepareListItem highlights when key given', () => {
  const item = { id: '1', title: '产品设计', content: '设计方案', updatedAt: Date.now() }
  const result = search.prepareListItem(item, '产品')
  assert.ok(result.titleHL.includes('[产品]'))
})

// === Date ===
test('date: formatDate returns valid string', () => {
  const result = formatDate(Date.now())
  assert.equal(typeof result, 'string')
  assert.ok(result.includes('-'))
  assert.ok(result.includes(':'))
})
test('date: formatDate handles specific timestamp', () => {
  // 2026-01-15 08:30
  const ts = new Date(2026, 0, 15, 8, 30).getTime()
  const result = formatDate(ts)
  assert.ok(result.startsWith('2026-01-15'))
  assert.ok(result.includes('08:30'))
})

// === Report ===
const passed = results.filter(r => r.pass).length
const failed = results.filter(r => !r.pass)
console.log('\n===== TEST RESULTS =====')
console.log(`Total: ${results.length} | Pass: ${passed} | Fail: ${failed.length}`)
if (failed.length) {
  console.log('\n--- FAILURES ---')
  failed.forEach(f => console.log(`  X ${f.name}: ${f.error}`))
  process.exit(1)
} else {
  console.log('All tests passed!')
  process.exit(0)
}

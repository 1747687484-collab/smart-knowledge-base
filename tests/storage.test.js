const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

// 先设置 wx mock，再 require storage，避免 TDZ 问题
global.wx = {
  _store: {},
  getStorageSync(key) { return this._store[key] },
  setStorageSync(key, value) { this._store[key] = value },
  showModal() {},
  showToast() {}
}
const storage = require('../miniprogram/utils/storage')

describe('storage utils', () => {
  beforeEach(() => {
    global.wx._store = {}
    storage._resetCache()
  })

  it('addDoc and getDocs', () => {
    storage.addDoc({ id: '1', title: 'doc1' })
    const docs = storage.getDocs()
    assert.equal(docs.length, 1)
    assert.equal(docs[0].id, '1')
  })

  it('updateDoc modifies existing doc', () => {
    storage.addDoc({ id: '1', title: 'old' })
    storage.updateDoc({ id: '1', title: 'new' })
    const docs = storage.getDocs()
    assert.equal(docs[0].title, 'new')
  })

  it('removeDoc removes doc by id', () => {
    storage.addDoc({ id: '1', title: 'doc1' })
    storage.addDoc({ id: '2', title: 'doc2' })
    storage.removeDoc('1')
    const docs = storage.getDocs()
    assert.equal(docs.length, 1)
    assert.equal(docs[0].id, '2')
  })

  it('addNote and getNotes', () => {
    storage.addNote({ id: 'n1', title: 'note1' })
    const notes = storage.getNotes()
    assert.equal(notes.length, 1)
    assert.equal(notes[0].id, 'n1')
  })

  it('updateNote modifies existing note', () => {
    storage.addNote({ id: 'n1', title: 'old' })
    storage.updateNote({ id: 'n1', title: 'new' })
    const notes = storage.getNotes()
    assert.equal(notes[0].title, 'new')
  })

  it('removeNote removes note by id', () => {
    storage.addNote({ id: 'n1', title: 'note1' })
    storage.addNote({ id: 'n2', title: 'note2' })
    storage.removeNote('n1')
    const notes = storage.getNotes()
    assert.equal(notes.length, 1)
    assert.equal(notes[0].id, 'n2')
  })

  it('addDoc prepends new items', () => {
    storage.addDoc({ id: '1', title: 'first' })
    storage.addDoc({ id: '2', title: 'second' })
    const docs = storage.getDocs()
    assert.equal(docs[0].id, '2')
    assert.equal(docs[1].id, '1')
  })

  it('findDocById returns correct doc', () => {
    storage.addDoc({ id: 'd1', title: 'found' })
    const found = storage.findDocById('d1')
    assert.ok(found)
    assert.equal(found.title, 'found')
    assert.equal(storage.findDocById('nonexistent'), null)
  })

  it('findNoteById returns correct note', () => {
    storage.addNote({ id: 'n1', title: 'found' })
    const found = storage.findNoteById('n1')
    assert.ok(found)
    assert.equal(found.title, 'found')
    assert.equal(storage.findNoteById('nonexistent'), null)
  })

  it('toggleDocStar toggles starred flag', () => {
    storage.addDoc({ id: 'd1', title: 'test', starred: false })
    storage.toggleDocStar('d1')
    assert.equal(storage.findDocById('d1').starred, true)
    storage.toggleDocStar('d1')
    assert.equal(storage.findDocById('d1').starred, false)
  })

  it('toggleNoteStar toggles starred flag', () => {
    storage.addNote({ id: 'n1', title: 'test', starred: false })
    storage.toggleNoteStar('n1')
    assert.equal(storage.findNoteById('n1').starred, true)
    storage.toggleNoteStar('n1')
    assert.equal(storage.findNoteById('n1').starred, false)
  })

  it('pinNote toggles pinned flag', () => {
    storage.addNote({ id: 'n1', title: 'test', pinned: false })
    storage.pinNote('n1')
    assert.equal(storage.findNoteById('n1').pinned, true)
    storage.pinNote('n1')
    assert.equal(storage.findNoteById('n1').pinned, false)
  })

  it('getAllItems returns docs and notes combined', () => {
    storage.addDoc({ id: 'd1', title: 'doc' })
    storage.addNote({ id: 'n1', title: 'note' })
    const all = storage.getAllItems()
    assert.equal(all.length, 2)
    assert.ok(all.some(i => i.id === 'd1'))
    assert.ok(all.some(i => i.id === 'n1'))
  })

  it('generateId returns unique strings', () => {
    const a = storage.generateId()
    const b = storage.generateId()
    assert.ok(a && typeof a === 'string')
    assert.notEqual(a, b)
  })

  it('sortItems puts starred items first', () => {
    const items = [
      { id: '1', updatedAt: 100 },
      { id: '2', starred: true, updatedAt: 50 }
    ]
    const sorted = storage.sortItems(items)
    assert.equal(sorted[0].id, '2')
  })

  it('sortItems with pinned option puts pinned first', () => {
    const items = [
      { id: '1', updatedAt: 100 },
      { id: '2', pinned: true, updatedAt: 50 }
    ]
    const sorted = storage.sortItems(items, { pinned: true })
    assert.equal(sorted[0].id, '2')
  })

  it('safeGet handles corrupted non-array data', () => {
    global.wx._store['kb_docs'] = 'not an array'
    storage._resetCache()
    const docs = storage.getDocs()
    assert.ok(Array.isArray(docs))
    assert.equal(docs.length, 0)
  })
})

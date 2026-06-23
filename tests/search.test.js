const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

// mock wx for date.js dependency
global.wx = { _store: {}, getStorageSync(k) { return this._store[k] }, setStorageSync(k, v) { this._store[k] = v } }

const { filterByKeyword, highlightMatch, prepareListItem } = require('../miniprogram/utils/search')

describe('search - filterByKeyword', () => {
  const items = [
    { id: '1', title: '产品方案', content: '这是一份产品设计文档', summary: '方案概述' },
    { id: '2', title: '技术架构', content: '系统架构设计', summary: '技术方案' },
    { id: '3', title: '会议纪要', content: '讨论了产品方向', summary: '' }
  ]

  it('returns all items when key is empty', () => {
    assert.equal(filterByKeyword(items, '').length, 3)
    assert.equal(filterByKeyword(items, null).length, 3)
  })

  it('filters by title match', () => {
    const result = filterByKeyword(items, '产品方案')
    assert.equal(result.length, 1)
    assert.equal(result[0].id, '1')
  })

  it('filters by content match', () => {
    const result = filterByKeyword(items, '架构设计')
    assert.ok(result.length >= 1)
  })

  it('filters by summary match', () => {
    const result = filterByKeyword(items, '技术方案')
    assert.ok(result.length >= 1)
  })

  it('is case insensitive', () => {
    const items2 = [{ id: '1', title: 'Hello World', content: '', summary: '' }]
    assert.equal(filterByKeyword(items2, 'hello').length, 1)
  })

  it('returns empty for no match', () => {
    assert.equal(filterByKeyword(items, '不存在的关键词').length, 0)
  })
})

describe('search - highlightMatch', () => {
  it('wraps match in brackets', () => {
    assert.equal(highlightMatch('产品方案很重要', '方案'), '产品[方案]很重要')
  })

  it('is case insensitive', () => {
    assert.equal(highlightMatch('Hello World', 'hello'), '[Hello] World')
  })

  it('returns original text when q is empty', () => {
    assert.equal(highlightMatch('测试文本', ''), '测试文本')
    assert.equal(highlightMatch('', '关键词'), '')
  })

  it('escapes regex special chars in query', () => {
    assert.equal(highlightMatch('price is $100 (USD)', '$100'), 'price is [$100] (USD)')
  })
})

describe('search - prepareListItem', () => {
  it('returns normalized item structure', () => {
    const item = { id: '1', title: '测试标题', summary: '摘要内容', updatedAt: Date.now(), starred: false, tags: ['产品'] }
    const result = prepareListItem(item)
    assert.equal(result.id, '1')
    assert.equal(result.title, '测试标题')
    assert.equal(typeof result.updatedText, 'string')
    assert.ok(result.updatedText.length > 0)
    assert.equal(result.starred, false)
  })

  it('adds highlight fields when key provided', () => {
    const item = { id: '1', title: '产品方案', content: '', summary: '方案概述' }
    const result = prepareListItem(item, '方案')
    assert.ok(result.titleHL.includes('[方案]'))
  })

  it('uses default title when missing', () => {
    const item = { id: '1' }
    const result = prepareListItem(item)
    assert.equal(result.title, '未命名')
  })
})

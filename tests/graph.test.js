const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { buildDocGraph } = require('../miniprogram/utils/graph')

describe('graph utils', () => {
  it('buildDocGraph returns nodes and edges for doc with tags/entities/keywords', () => {
    const doc = {
      id: 'doc1',
      title: '测试文档',
      tags: ['产品', '方案'],
      entities: [{ type: '项目', name: '知识库项目' }],
      keywords: ['关键词1', '关键词2']
    }
    const g = buildDocGraph(doc)
    assert.ok(g.nodes.length > 0)
    assert.ok(g.edges.length > 0)
    assert.ok(g.nodes.some(n => n.group === 'doc'))
    assert.ok(g.nodes.some(n => n.group === 'tag'))
    assert.ok(g.nodes.some(n => n.group === '项目'))
    assert.ok(g.nodes.some(n => n.group === '关键词'))
  })

  it('buildDocGraph handles missing optional fields', () => {
    const doc = { id: 'doc2' }
    const g = buildDocGraph(doc)
    assert.ok(g.nodes.length === 1)
    assert.ok(g.edges.length === 0)
  })

  it('buildDocGraph deduplicates node ids', () => {
    const doc = {
      id: 'doc3',
      title: 'test',
      tags: ['tag1', 'tag1'],
      entities: [],
      keywords: []
    }
    const g = buildDocGraph(doc)
    const tagNodes = g.nodes.filter(n => n.id === 'tag:tag1')
    assert.equal(tagNodes.length, 1)
  })
})

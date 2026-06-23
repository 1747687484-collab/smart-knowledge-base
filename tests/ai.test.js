const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  summarize, topKeywords, guessTags, guessEntities,
  buildChunks, searchChunks, extractAnswer, findRelated, processContent
} = require('../miniprogram/utils/ai')

const SAMPLE = '本项目希望构建一个面向个人和小团队的智能知识库小程序。用户可以上传报告、资料、合同和备忘内容，系统会自动生成摘要、关键词、标签与知识实体。通过文档切片与检索，用户能够基于已有知识进行问答。第一阶段优先支持文本类资料与可读取文件。总结：产品方案的核心是文档上传、自动摘要、智能问答和知识图谱展示。'

describe('ai - summarize', () => {
  it('returns a string without throwing', () => {
    const s = summarize('你好。今天天气很好。我们需要优化产品方案，提高质量。总结和建议如下。')
    assert.equal(typeof s, 'string')
    assert.ok(s.length > 0)
  })

  it('respects max parameter', () => {
    const s = summarize(SAMPLE, 2)
    const sentences = s.split(/(?<=[。！？\.!?])/).filter(Boolean)
    assert.ok(sentences.length <= 2)
  })

  it('returns full text when sentences <= max', () => {
    const short = '只有一句话。'
    assert.equal(summarize(short, 5), short)
  })
})

describe('ai - topKeywords', () => {
  it('returns at most limit items', () => {
    const k = topKeywords('产品方案和产品设计很重要，设计要落地', 5)
    assert.ok(k.length <= 5)
  })

  it('returns keywords that appear in the text', () => {
    const k = topKeywords(SAMPLE, 5)
    assert.ok(k.length > 0)
    assert.ok(k.every(w => typeof w === 'string' && w.length > 0))
  })

  it('handles empty input', () => {
    const k = topKeywords('', 5)
    assert.ok(Array.isArray(k))
    assert.equal(k.length, 0)
  })
})

describe('ai - guessTags', () => {
  it('returns an array of tag strings', () => {
    const tags = guessTags(SAMPLE)
    assert.ok(Array.isArray(tags))
    assert.ok(tags.length > 0)
    assert.ok(tags.every(t => typeof t === 'string'))
  })

  it('detects product-related tags', () => {
    const tags = guessTags('这个产品方案需要设计原型和功能需求分析')
    assert.ok(tags.includes('产品'))
  })

  it('detects tech-related tags', () => {
    const tags = guessTags('技术架构和开发代码需要部署到系统接口')
    assert.ok(tags.includes('技术'))
  })
})

describe('ai - guessEntities', () => {
  it('returns an array of entity objects', () => {
    const ents = guessEntities(SAMPLE)
    assert.ok(Array.isArray(ents))
    assert.ok(ents.every(e => e.name && e.type))
  })

  it('detects date entities', () => {
    const ents = guessEntities('项目从2026-01-01开始，到2026/12/31结束')
    const dates = ents.filter(e => e.type === '时间')
    assert.ok(dates.length >= 1)
  })

  it('detects role entities', () => {
    const ents = guessEntities('张经理和赵总监负责项目管理')
    const roles = ents.filter(e => e.type === '角色')
    assert.ok(roles.length >= 1)
  })

  it('detects email entities', () => {
    const ents = guessEntities('联系邮箱 test@example.com 获取详情')
    const emails = ents.filter(e => e.type === '邮箱')
    assert.ok(emails.length >= 1)
  })

  it('handles empty input gracefully', () => {
    const ents = guessEntities('')
    assert.ok(Array.isArray(ents))
    assert.equal(ents.length, 0)
  })
})

describe('ai - buildChunks', () => {
  it('returns chunks with content', () => {
    const chunks = buildChunks('一段文本。\n\n另一段较长的文本内容，用于切片。')
    assert.ok(chunks.length >= 1)
    for (const c of chunks) {
      assert.equal(typeof c.index, 'number')
      assert.equal(typeof c.content, 'string')
      assert.ok(c.content.length > 0)
    }
  })

  it('respects size parameter', () => {
    const longText = '这是一段很长的文本。'.repeat(100)
    const chunks = buildChunks(longText, 50)
    for (const c of chunks) {
      assert.ok(c.content.length <= 60) // 允许少量溢出
    }
  })

  it('handles empty text', () => {
    const chunks = buildChunks('')
    assert.ok(Array.isArray(chunks))
    assert.equal(chunks.length, 0)
  })
})

describe('ai - searchChunks and extractAnswer', () => {
  it('searchChunks returns scored results', () => {
    const chunks = buildChunks('产品方案很重要。设计与原型要落地。总结：继续迭代。')
    const top = searchChunks(chunks, '产品方案', 2)
    assert.ok(top.length >= 1)
    assert.ok(top[0].score > 0)
  })

  it('extractAnswer returns a string', () => {
    const chunks = buildChunks('产品方案很重要。设计与原型要落地。总结：继续迭代。')
    const ans = extractAnswer(chunks, '产品方案是什么')
    assert.equal(typeof ans, 'string')
    assert.ok(ans.length > 0)
  })

  it('searchChunks handles regex special chars in question', () => {
    const chunks = buildChunks('测试内容包含特殊字符')
    assert.doesNotThrow(() => searchChunks(chunks, 'test[0]+', 2))
  })
})

describe('ai - findRelated', () => {
  it('returns related items sorted by score', () => {
    const current = { id: '1', tags: ['产品'], keywords: ['方案'], entities: [], content: '产品方案很重要' }
    const all = [
      current,
      { id: '2', tags: ['产品'], keywords: [], entities: [], content: '另一个产品文档' },
      { id: '3', tags: ['技术'], keywords: ['架构'], entities: [], content: '技术架构设计' }
    ]
    const related = findRelated(current, all, 5)
    assert.ok(related.length > 0)
    assert.ok(related[0].score > 0)
  })

  it('excludes current item from results', () => {
    const current = { id: '1', tags: ['产品'], keywords: [], entities: [], content: '测试' }
    const related = findRelated(current, [current], 5)
    assert.equal(related.length, 0)
  })

  it('handles null/empty inputs', () => {
    assert.deepEqual(findRelated(null, [], 5), [])
    assert.deepEqual(findRelated({ id: '1' }, null, 5), [])
    assert.deepEqual(findRelated({ id: '1' }, [], 5), [])
  })
})

describe('ai - processContent', () => {
  it('returns all fields', () => {
    const result = processContent(SAMPLE)
    assert.equal(typeof result.summary, 'string')
    assert.ok(Array.isArray(result.keywords))
    assert.ok(Array.isArray(result.tags))
    assert.ok(Array.isArray(result.entities))
    assert.ok(Array.isArray(result.chunks))
  })

  it('handles null/undefined input gracefully', () => {
    const result = processContent(null)
    assert.equal(result.summary, '')
    assert.deepEqual(result.keywords, [])
    assert.deepEqual(result.tags, [])
    assert.deepEqual(result.entities, [])
    assert.deepEqual(result.chunks, [])
  })

  it('handles empty string input', () => {
    const result = processContent('')
    assert.equal(result.summary, '')
  })
})

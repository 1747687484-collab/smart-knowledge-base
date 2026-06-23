// ── 评分权重常量 ──
const SCORE = {
  // summarize 句子评分
  SENT_LEN_WEIGHT: 0.015,
  EARLY_SENTENCE_BONUS: 1.8,
  MID_SENTENCE_BONUS: 1.0,
  COLON_BONUS: 0.8,
  KEYWORD_BONUS: 1.2,
  PROBLEM_BONUS: 0.6,
  ACHIEVEMENT_BONUS: 0.6,
  NUMBER_BONUS: 0.3,
  IDF_WEIGHT: 0.3,
  SHORT_SENTENCE_PENALTY: 0.8,
  EXAMPLE_PENALTY: 0.4,
  // searchChunks 评分
  TOKEN_MATCH_WEIGHT: 1.5,
  TOKEN_HIT_BONUS: 4,
  PHRASE_HIT_BONUS: 8,
  // extractAnswer 评分
  EARLY_BONUS: 1.0,
  OVERLAP_WEIGHT: 2.5,
  PHRASE_BONUS: 5,
  ANS_COLON_BONUS: 0.6,
  ANS_NUMBER_BONUS: 0.2,
  ANS_SHORT_PENALTY: 0.5,
  // findRelated 权重
  TAG_WEIGHT: 3,
  KEYWORD_WEIGHT: 2,
  ENTITY_WEIGHT: 2,
  WORD_OVERLAP_WEIGHT: 0.5,
  // findRelated 内容截取长度
  RELATED_CONTENT_LIMIT: 2000,
  RELATED_TOKEN_LIMIT: 100
}

const stopwords = new Set([
  '的','了','和','是','在','有','与','为','也','及','对','等','都','把','被','让','向','到','而','就','或','一个','我','我们','你','你们','他','她','它','中','不','上','下','可以','进行','通过','使用','以及','问题','建议','相关','工作','内容','文件','文档','资料','时间','情况','项目','这个','那个','一些','什么','怎么','如何','如果','因为','但是','虽然','那么','这样','那样','已经','还是','只是','可能','需要','应该','能够','没有','不是','非常','比较','其实','另外','此外','同时','其中','关于','按照','根据','基于','目前','当前','之前','以后','下来','起来','出来','进去','回来','过去','认为','觉得','希望','知道','了解','发现','看到','听到','想到','做到','得到','失去','开始','结束','完成','继续','保持','改变','增加','减少','提高','降低','扩大','缩小','推动','促进','支持','提供','实现','形成','建立','完善','优化','改进','加强','提升','确保','保证','避免','防止','控制','管理','组织','安排','准备','计划','规划','设计','开发','测试','部署','运行','维护','更新','升级','扩展','迁移','整合','集成','对接','处理','解决','分析','研究','探索','尝试','实践','验证','评估','检查','审核','确认','批准','同意','拒绝','接受','放弃','选择','决定','判断','考虑','思考','讨论','沟通','交流','分享','汇报','反馈','响应','配合','协助','帮助','指导','培训','教育','学习','掌握','熟悉','理解','明白','清楚','明确','确定','制定','执行','落实','推进','开展','实施','从事','参与','负责','承担','担当','扮演','担任','充当','作为','成为','变成','变为','导致','引起','产生','带来','造成','构成','组成','包含','包括','涉及','覆盖','涵盖','围绕','针对','面向','侧重','注重','强调','突出','体现','反映','展示','呈现','显示','表明','说明','证明','证实','指出','提到','谈及','论及','关系到','取决于','依赖于','借助于','有利于','有助于','意味着','代表着','标志着','象征着','暗示着','预示着','反映出','体现出','表现出','展示出','呈现出','显示出','表明了','说明了','证明了','证实了','确认了','验证了'
])

function unique(arr) {
  const seen = new Set()
  return arr.filter(x => {
    if (!x) return false
    const key = x.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractSentences(text) {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[。！？\.!?])|(?<=；)|(?<=;)/)
    .map(s => s.trim())
    .filter(Boolean)
}

function summarize(text, max) {
  max = max || 6
  const sentences = extractSentences(text)
  if (sentences.length <= max) return sentences.join('')
  // 计算文档级 TF-IDF：出现频率低但在特定句子中出现的词权重更高
  const allTokens = tokenize(text)
  const docFreq = {}
  for (const t of allTokens) docFreq[t] = (docFreq[t] || 0) + 1
  const totalTokens = allTokens.length || 1
  const scored = sentences.map((s, i) => {
    const sTokens = tokenize(s)
    const idf = sTokens.reduce(function (acc, t) {
      const tf = (docFreq[t] || 0) / totalTokens
      return acc + (tf > 0.01 ? 0.5 : 1.5) // 罕见词权重更高
    }, 0)
    return {
      s, i,
      score: s.length * SCORE.SENT_LEN_WEIGHT
        + (i < 3 ? SCORE.EARLY_SENTENCE_BONUS : i < 6 ? SCORE.MID_SENTENCE_BONUS : 0)
        + (/[：:]/.test(s) ? SCORE.COLON_BONUS : 0)
        + (/(总结|目标|结论|建议|风险|关键|重点|因此|所以|核心|主要|重要|优先|首先|其次|最后|整体|全局|策略|方案|方向|路径|步骤|阶段)/.test(s) ? SCORE.KEYWORD_BONUS : 0)
        + (/(问题|挑战|困难|瓶颈|不足|缺陷|短板|隐患|漏洞)/.test(s) ? SCORE.PROBLEM_BONUS : 0)
        + (/(成果|成效|进展|突破|改善|提升|增长|优化|完成|达成)/.test(s) ? SCORE.ACHIEVEMENT_BONUS : 0)
        + (/\d+/.test(s) ? SCORE.NUMBER_BONUS : 0)
        + idf * SCORE.IDF_WEIGHT
        - (s.length < 10 ? SCORE.SHORT_SENTENCE_PENALTY : 0)
        - (/(比如|例如|具体来说|也就是说|换言之)/.test(s) ? SCORE.EXAMPLE_PENALTY : 0)
    }
  })
  scored.sort((a, b) => b.score - a.score || a.i - b.i)
  return scored.slice(0, max).sort((a, b) => a.i - b.i).map(x => x.s).join('')
}

function tokenize(text) {
  if (!text || typeof text !== 'string') return []
  const words = text
    .toLowerCase()
    .replace(/[^一-龥a-zA-Z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(w => w && w.length > 1 && !stopwords.has(w))
  // 添加 bigram 支持，提高中文关键词提取质量
  const bigrams = []
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].length >= 2 && words[i + 1].length >= 2) {
      bigrams.push(words[i] + words[i + 1])
    }
  }
  return words.concat(bigrams)
}

function topKeywords(text, limit) {
  limit = limit || 12
  const freq = new Map()
  const tokens = tokenize(text)
  const total = tokens.length || 1
  for (const w of tokens) freq.set(w, (freq.get(w) || 0) + 1)
  return [...freq.entries()]
    .map(([w, c]) => [w, c * (1 + Math.log(1 + c / total))])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(x => x[0])
}

function guessTags(text) {
  const kws = topKeywords(text, 8)
  const tags = []
  if (/需求|功能|产品|方案|设计|原型|落地/.test(text)) tags.push('产品')
  if (/报告|分析|增长|运营|转化|留存|投放/.test(text)) tags.push('运营')
  if (/风险|合规|安全|隐私|法务|合同/.test(text)) tags.push('风控')
  if (/周报|日报|计划|目标|进展|里程碑/.test(text)) tags.push('管理')
  if (/学习|课程|知识|研究|论文|教程/.test(text)) tags.push('知识')
  if (/备忘|提醒|待办|记录|会议|沟通/.test(text)) tags.push('备忘')
  if (/技术|架构|开发|代码|系统|接口|部署/.test(text)) tags.push('技术')
  if (/市场|客户|用户|需求|反馈|满意度/.test(text)) tags.push('市场')
  if (/财务|预算|成本|收入|利润|投资/.test(text)) tags.push('财务')
  if (/人事|招聘|培训|团队|组织|考核/.test(text)) tags.push('人事')
  return unique([...tags, ...kws.slice(0, 4)]).slice(0, 6)
}

function guessEntities(text) {
  const entities = []
  const seen = new Set()
  const add = (name, type) => {
    if (!name) return
    const key = type + ':' + name
    if (seen.has(key)) return
    seen.add(key)
    entities.push({ name, type })
  }
  for (const m of text.match(/[一-龥]{2,4}(?:项目|计划|系统|平台|方案|产品|部门|小组|委员会)/g) || []) add(m, '项目')
  for (const m of text.match(/[一-龥]{2,4}(?:公司|集团|研究院|协会|平台)/g) || []) add(m, '组织')
  for (const m of text.match(/[一-龥]{2,3}(?:经理|总监|负责人|主管|同事|老师|同学)/g) || []) add(m, '角色')
  for (const m of text.match(/\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}/g) || []) add(m, '时间')
  for (const m of text.match(/[A-Za-z][A-Za-z0-9_]{2,}/g) || []) add(m, '术语')
  for (const m of text.match(/[一-龥]{2,4}(?:市|省|区|县|镇|路|街|大厦|中心|园区)/g) || []) add(m, '地点')
  for (const m of text.match(/第[一二三四五六七八九十\d]+(?:阶段|期|版|次|轮|批)/g) || []) add(m, '阶段')
  // 新增：邮箱、电话、金额
  for (const m of text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []) add(m, '邮箱')
  for (const m of text.match(/1[3-9]\d{9}/g) || []) add(m, '电话')
  for (const m of text.match(/\d+(?:\.\d+)?(?:万|亿|元|美元|欧元|日元)/g) || []) add(m, '金额')
  for (const m of text.match(/[一-龥]{2,4}(?:大学|学院|研究所|实验室)/g) || []) add(m, '机构')
  return entities.slice(0, 18)
}

function buildChunks(text, size) {
  size = size || 420
  const parts = text
    .replace(/\r/g, '')
    .split(/\n{2,}|(?<=。)|(?<=！)|(?<=？)|(?<=\.)/)
    .map(s => s.trim())
    .filter(Boolean)
  const chunks = []
  let cur = ''
  for (const p of parts) {
    if ((cur + '\n' + p).trim().length > size && cur) {
      chunks.push(cur.trim())
      cur = p
    } else {
      cur = cur ? cur + '\n' + p : p
    }
  }
  if (cur.trim()) chunks.push(cur.trim())
  return chunks.map((content, index) => ({ index, content }))
}

function searchChunks(chunks, question, topN) {
  topN = topN || 4
  const tokens = tokenize(question)
  const compiled = new Map()
  for (const q of tokens) {
    try { compiled.set(q, new RegExp(q, 'gi')) } catch (e) { /* 跳过非法正则 token */ }
  }
  const phrase = question.toLowerCase()
  const scored = chunks.map(c => {
    const txt = c.content.toLowerCase()
    let score = 0
    for (const [q, reg] of compiled) {
      const m = txt.match(reg)
      if (m) score += m.length * SCORE.TOKEN_MATCH_WEIGHT + SCORE.TOKEN_HIT_BONUS
    }
    if (txt.includes(phrase)) score += SCORE.PHRASE_HIT_BONUS
    return { content: c.content, index: c.index, sourceId: c.sourceId, sourceTitle: c.sourceTitle, score }
  })
  return scored.sort((a, b) => b.score - a.score).slice(0, topN)
}

function extractAnswer(chunks, question) {
  const joined = chunks.map(c => c.content).join('\n')
  const sentences = extractSentences(joined)
  const qtokens = new Set(tokenize(question))
  const phrase = question.toLowerCase()
  const scored = sentences.map((s, i) => {
    const sl = s.toLowerCase()
    const overlap = [...qtokens].filter(t => sl.includes(t)).length
    return {
      s, i,
      score: (i < 3 ? SCORE.EARLY_BONUS : 0)
        + overlap * SCORE.OVERLAP_WEIGHT
        + (sl.includes(phrase) ? SCORE.PHRASE_BONUS : 0)
        + (/[：:]/.test(s) ? SCORE.ANS_COLON_BONUS : 0)
        + (/\d+/.test(s) ? SCORE.ANS_NUMBER_BONUS : 0)
        - (s.length < 8 ? SCORE.ANS_SHORT_PENALTY : 0)
    }
  })
  const best = scored.sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 4).sort((a, b) => a.i - b.i).map(x => x.s)
  return best.join('') || summarize(joined, 4)
}

function findRelated(currentItem, allItems, limit) {
  limit = limit || 5
  if (!currentItem || !allItems || !allItems.length) return []
  const currentTags = new Set((currentItem.tags || []).map(t => t.toLowerCase()))
  const currentKws = new Set((currentItem.keywords || []).map(k => k.toLowerCase()))
  const currentEnts = new Set((currentItem.entities || []).map(e => (e.name || '').toLowerCase()))
  // 截取前 2000 字符再 tokenize，避免大文档性能问题
  const currentWords = new Set(tokenize((currentItem.content || '').slice(0, SCORE.RELATED_CONTENT_LIMIT)).slice(0, SCORE.RELATED_TOKEN_LIMIT))

  const scored = allItems
    .filter(item => item.id !== currentItem.id)
    .map(item => {
      let score = 0
      for (const t of (item.tags || [])) {
        if (currentTags.has(t.toLowerCase())) score += SCORE.TAG_WEIGHT
      }
      for (const k of (item.keywords || [])) {
        if (currentKws.has(k.toLowerCase())) score += SCORE.KEYWORD_WEIGHT
      }
      for (const e of (item.entities || [])) {
        if (currentEnts.has((e.name || '').toLowerCase())) score += SCORE.ENTITY_WEIGHT
      }
      const itemWords = tokenize((item.content || '').slice(0, SCORE.RELATED_CONTENT_LIMIT)).slice(0, SCORE.RELATED_TOKEN_LIMIT)
      let overlap = 0
      for (const w of itemWords) {
        if (currentWords.has(w)) overlap++
      }
      score += overlap * SCORE.WORD_OVERLAP_WEIGHT
      return { id: item.id, title: item.title || '未命名', score, type: item.fileType ? 'doc' : 'note' }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored
}

function processContent(text) {
  if (!text || typeof text !== 'string') {
    return { summary: '', keywords: [], tags: [], entities: [], chunks: [] }
  }
  return {
    summary: summarize(text, 5),
    keywords: topKeywords(text, 10),
    tags: guessTags(text),
    entities: guessEntities(text),
    chunks: buildChunks(text, 420)
  }
}

module.exports = {
  summarize, topKeywords, guessTags, guessEntities,
  buildChunks, searchChunks, extractAnswer, findRelated,
  processContent
}

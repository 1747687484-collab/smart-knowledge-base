function buildDocGraph(doc) {
  const nodes = []
  const edges = []
  const seen = new Set()

  const addNode = (id, name, group) => {
    if (seen.has(id)) return
    seen.add(id)
    nodes.push({ id, name, group })
  }

  addNode(`doc:${doc.id}`, doc.title || '未命名文档', 'doc')

  for (const tag of (doc.tags || [])) {
    const nid = `tag:${tag}`
    addNode(nid, tag, 'tag')
    edges.push({ from: `doc:${doc.id}`, to: nid, label: '标签' })
  }

  for (const e of (doc.entities || [])) {
    const nid = `ent:${e.type}:${e.name}`
    addNode(nid, e.name, e.type || '实体')
    edges.push({ from: `doc:${doc.id}`, to: nid, label: e.type || '实体' })
  }

  for (const kw of (doc.keywords || []).slice(0, 6)) {
    const nid = `kw:${kw}`
    addNode(nid, kw, '关键词')
    edges.push({ from: `doc:${doc.id}`, to: nid, label: '关键词' })
  }

  return { nodes, edges }
}

module.exports = {
  buildDocGraph
}

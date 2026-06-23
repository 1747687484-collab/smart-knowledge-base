const storage = require('../../utils/storage')
const graphLib = require('../../utils/graph')

const ENTITY_GROUPS = new Set(['项目', '组织', '角色', '时间', '术语', '地点', '阶段'])

const bg = function (group) {
  if (group === 'doc') return '#dbeafe'
  if (group === 'tag') return '#dcfce7'
  if (group === '关键词') return '#ede9fe'
  return '#ffe4e6'
}

const groupLabel = function (group) {
  if (group === 'doc') return '文档'
  if (group === 'tag') return '标签'
  if (group === '关键词') return '关键词'
  if (ENTITY_GROUPS.has(group)) return group
  return '实体'
}

const layoutCircle = function (nodes) {
  const radius = 220, cx = 300, cy = 320
  return nodes.map(function (n, i) {
    const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1)
    return Object.assign({}, n, {
      shortName: (n.name || '').slice(0, 8),
      x: Math.round(cx + radius * Math.cos(angle)),
      y: Math.round(cy + radius * Math.sin(angle)),
      bg: bg(n.group),
      group: groupLabel(n.group)
    })
  })
}

const layoutForce = function (nodes, edges) {
  const cx = 300, cy = 320, w = 560, h = 600
  const pos = nodes.map(function (n, i) {
    const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1)
    return { x: cx + 180 * Math.cos(angle), y: cy + 180 * Math.sin(angle) }
  })
  const adj = {}
  for (let e = 0; e < edges.length; e++) {
    const from = edges[e].from, to = edges[e].to
    if (!adj[from]) adj[from] = []
    if (!adj[to]) adj[to] = []
    adj[from].push(to)
    adj[to].push(from)
  }
  // 20 次迭代对 18 节点已足够收敛
  for (let iter = 0; iter < 20; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      let fx = 0, fy = 0
      const ni = nodes[i].id
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue
        const dx = pos[i].x - pos[j].x
        const dy = pos[i].y - pos[j].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        if (dist < 100) {
          fx += (dx / dist) * 8
          fy += (dy / dist) * 8
        }
      }
      const neighbors = adj[ni] || []
      const neighborSet = new Set(neighbors)
      for (let j = 0; j < nodes.length; j++) {
        if (i === j || !neighborSet.has(nodes[j].id)) continue
        const dx = pos[j].x - pos[i].x
        const dy = pos[j].y - pos[i].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        fx += (dx / dist) * 2
        fy += (dy / dist) * 2
      }
      fx += (cx - pos[i].x) * 0.02
      fy += (cy - pos[i].y) * 0.02
      pos[i].x += fx * 0.4
      pos[i].y += fy * 0.4
      pos[i].x = Math.max(40, Math.min(w - 40, pos[i].x))
      pos[i].y = Math.max(40, Math.min(h - 40, pos[i].y))
    }
  }
  return nodes.map(function (n, i) {
    return Object.assign({}, n, {
      shortName: (n.name || '').slice(0, 8),
      x: Math.round(pos[i].x),
      y: Math.round(pos[i].y),
      bg: bg(n.group),
      group: groupLabel(n.group)
    })
  })
}

const IC = '/assets/icons/svg'
Page({
  data: { mode: 'all', docId: '', graphType: 'all', layout: 'force', nodeList: [], edgeList: [], selectedNode: null, selectedEdge: null, icons: { graph: IC + '/network.svg', export: IC + '/copy.svg', tag: IC + '/tag.svg', entity: IC + '/git-branch.svg', layers: IC + '/layers.svg' } },
  _rawNodes: null,
  _rawEdges: null,
  onLoad: function (options) {
    if (options && options.docId) {
      this.setData({ docId: options.docId, mode: 'doc' })
    }
    this._rawNodes = null
    this._rawEdges = null
    this.build(true)
  },
  onModeAll: function () { this.setData({ mode: 'all' }); this._rawNodes = null; this.build(true) },
  onModeDoc: function () { this.setData({ mode: 'doc' }); this._rawNodes = null; this.build(true) },
  onFilterType: function (e) {
    const t = e.currentTarget.dataset.t || 'all'
    this.setData({ graphType: t })
    this.build(false)
  },
  onLayout: function (e) {
    const l = e.currentTarget.dataset.l || 'force'
    this.setData({ layout: l })
    this.build(false)
  },
  onNodeTap: function (e) {
    const id = e.currentTarget.dataset.id
    const node = this.data.nodeList.find(function (n) { return n.id === id })
    if (node) {
      const related = this.data.edgeList.filter(function (ed) { return ed.from === id || ed.to === id })
      this.setData({ selectedNode: { name: node.name, group: node.group, relations: related.map(function (ed) { return ed.from === id ? (ed.label + ' → ' + ed.toName) : (ed.fromName + ' → ' + ed.label) }) }, selectedEdge: null })
    }
  },
  onNodeLongPress: function (e) {
    const name = e.currentTarget.dataset.name || ''
    if (name) wx.showToast({ title: name, icon: 'none', duration: 2000 })
  },
  onEdgeTap: function (e) {
    const idx = e.currentTarget.dataset.idx
    const edge = this.data.edgeList[idx]
    if (edge) {
      this.setData({ selectedEdge: { from: edge.fromName, to: edge.toName, label: edge.label }, selectedNode: null })
    }
  },
  onCloseEdge: function () { this.setData({ selectedEdge: null }) },
  onCloseNode: function () { this.setData({ selectedNode: null }) },
  onExportText: function () {
    const lines = ['# 知识图谱导出\n']
    lines.push('## 节点 (' + this.data.nodeList.length + ')')
    this.data.nodeList.forEach(function (n) { lines.push('- ' + n.name + ' [' + n.group + ']') })
    lines.push('\n## 关系 (' + this.data.edgeList.length + ')')
    this.data.edgeList.forEach(function (e) { lines.push('- ' + e.fromName + ' ' + e.label + ' ' + e.toName) })
    wx.setClipboardData({ data: lines.join('\n') })
  },
  build: function (rebuildRaw) {
    if (rebuildRaw || !this._rawNodes) {
      const items = (storage.getDocs() || []).concat(storage.getNotes() || [])
      if (!items.length) { this.setData({ nodeList: [], edgeList: [] }); return }
      let nodes = [], edges = []
      if (this.data.mode === 'doc' && this.data.docId) {
        const target = items.find((it) => it.id === this.data.docId)
        if (target) {
          const g = graphLib.buildDocGraph(target)
          nodes = g.nodes; edges = g.edges
        }
      }
      if (!nodes.length) {
        for (let j = 0; j < items.length; j++) {
          const g2 = graphLib.buildDocGraph(items[j])
          nodes = nodes.concat(g2.nodes); edges = edges.concat(g2.edges)
        }
      }
      const seenNodes = {}; const dedupedNodes = []
      for (let k = 0; k < nodes.length; k++) {
        if (seenNodes[nodes[k].id]) continue
        seenNodes[nodes[k].id] = true; dedupedNodes.push(nodes[k])
      }
      const nameMap = {}
      for (let n = 0; n < dedupedNodes.length; n++) {
        nameMap[dedupedNodes[n].id] = dedupedNodes[n].name
      }
      const seenEdges = {}; const dedupedEdges = []
      for (let m = 0; m < edges.length; m++) {
        const key = edges[m].from + '->' + edges[m].to
        if (seenEdges[key]) continue
        seenEdges[key] = true
        const fromName = nameMap[edges[m].from] || '未知'
        const toName = nameMap[edges[m].to] || '未知'
        dedupedEdges.push(Object.assign({}, edges[m], { fromName, toName }))
      }
      this._rawNodes = dedupedNodes
      this._rawEdges = dedupedEdges
    }
    let filtered = this._rawNodes
    const gt = this.data.graphType
    if (gt === 'tag') {
      filtered = this._rawNodes.filter(function (n) { return n.group === 'tag' || n.group === 'doc' })
    } else if (gt === 'entity') {
      filtered = this._rawNodes.filter(function (n) { return n.group !== 'tag' && n.group !== '关键词' && n.group !== 'doc' })
    } else if (gt === 'time') {
      filtered = this._rawNodes.filter(function (n) { return n.group === '时间' || n.group === 'doc' })
    }
    const filteredIds = new Set(filtered.map(function (n) { return n.id }))
    const filteredEdges = this._rawEdges.filter(function (e) { return filteredIds.has(e.from) && filteredIds.has(e.to) })
    const sliced = filtered.slice(0, 18)
    const layoutFn = this.data.layout === 'force' ? layoutForce : layoutCircle
    const laid = layoutFn(sliced, filteredEdges.slice(0, 40))
    this.setData({ nodeList: laid, edgeList: filteredEdges.slice(0, 40), selectedNode: null, selectedEdge: null })
    setTimeout(() => { this.drawEdges() }, 100)
  },
  onCanvasReady: function () {
    this.drawEdges()
  },
  drawEdges: function () {
    if (!this.data.nodeList.length) return
    const query = this.createSelectorQuery()
    query.select('#graphCanvas').fields({ node: true, size: true }).exec(function (res) {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || 2
      canvas.width = res[0].width * dpr
      canvas.height = res[0].height * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, res[0].width, res[0].height)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      const nodeList = this.data.nodeList
      const edgeList = this.data.edgeList
      const nodeMap = {}
      for (let i = 0; i < nodeList.length; i++) {
        nodeMap[nodeList[i].id] = nodeList[i]
      }
      const scaleX = res[0].width / 600
      const scaleY = res[0].height / 660
      for (let i = 0; i < edgeList.length; i++) {
        const from = nodeMap[edgeList[i].from]
        const to = nodeMap[edgeList[i].to]
        if (!from || !to) continue
        ctx.beginPath()
        ctx.moveTo(from.x * scaleX, from.y * scaleY)
        ctx.lineTo(to.x * scaleX, to.y * scaleY)
        ctx.stroke()
      }
    }.bind(this))
  }
})

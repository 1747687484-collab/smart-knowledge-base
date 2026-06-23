const { getDocs, setDocs, getNotes, setNotes, generateId } = require('../../utils/storage')
const ai = require('../../utils/ai')
const { THEMES, THEME_KEYS, setTheme, getTheme, getThemeClass } = require('../../utils/theme')

const buildItem = (title, content, type) => {
  const aiResult = ai.processContent(content)
  const now = Date.now()
  return Object.assign({ id: generateId(), title, content, createdAt: now, updatedAt: now, fileType: type || '文本' }, aiResult)
}

const IC = '/assets/icons/svg'
Page({
  data: {
    docCount: 0,
    noteCount: 0,
    qaCount: 0,
    currentTheme: 'default',
    themeClass: '',
    themeKeys: THEME_KEYS,
    themes: THEMES,
    icons: {
      doc: IC + '/file-text.svg', note: IC + '/edit-3.svg', qa: IC + '/message-circle.svg',
      graph: IC + '/network.svg', database: IC + '/database.svg', trash: IC + '/trash-2.svg',
      info: IC + '/info.svg', settings: IC + '/settings.svg'
    }
  },
  onShow() {
    let qaCount = 0
    try { qaCount = (wx.getStorageSync('kb_qa_history') || []).length } catch (e) {}
    this.setData({
      docCount: (getDocs() || []).length,
      noteCount: (getNotes() || []).length,
      qaCount: qaCount,
      currentTheme: getTheme(),
      themeClass: getThemeClass()
    })
  },
  onThemeChange(e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.currentTheme) return
    setTheme(key)
    this.setData({ currentTheme: key, themeClass: getThemeClass() })
    wx.showToast({ title: '已切换为' + THEMES[key].name, icon: 'none' })
  },
  onLoadDemo() {
    // 检查是否已导入过演示数据，避免重复
    const existingDocs = getDocs() || []
    const existingNotes = getNotes() || []
    const hasDemo = existingDocs.some(d => d.title === '智能知识库产品方案')
    if (hasDemo) {
      wx.showToast({ title: '演示数据已存在', icon: 'none' })
      return
    }

    const docs = [
      buildItem(
        '智能知识库产品方案',
        '本项目希望构建一个面向个人和小团队的智能知识库小程序，用户可以上传报告、资料、合同和备忘内容，系统会自动生成摘要、关键词、标签与知识实体。通过文档切片与检索，用户能够基于已有知识进行问答，并逐步形成结构化的知识图谱。第一阶段优先支持文本类资料与可读取文件，后续再接入 OCR、向量检索与更复杂的图谱推理能力。',
        '文档'
      ),
      buildItem(
        '周报：运营进展总结',
        '本周完成了三部分内容：第一，完成了首页改版上线，提升了文档入口的可见性；第二，针对新用户设计了引导流程，提高了首次上传率；第三，整理了下阶段的运营重点，包括文档模板、知识问答优化、图谱可视化增强。当前主要风险是文档解析能力仍有限，扫描件和复杂 PDF 的识别效果仍需提升。下周建议优先推进智能问答体验优化和知识切片质量提升。',
        '文档'
      ),
      buildItem(
        '合同资料记录',
        '本合同涉及甲方星海科技与乙方客户平台合作。合作期限为 2026 年 1 月 1 日至 2026 年 12 月 31 日。付款分为两期，第一期在签约后 10 个工作日内支付，第二期在项目验收后 15 个工作日内支付。项目负责人分别为张经理与赵总监，双方需在每月 25 日前完成进度确认。如果出现延迟交付，需提前五个工作日沟通并书面确认。',
        '文档'
      )
    ]

    const notes = [
      buildItem(
        '下周重点待办',
        '下周需要处理三件事：第一，整理智能知识库的产品路线图；第二，确认知识问答的演示样例；第三，准备一份面向合伙人的项目介绍文档。记得把首页、文档上传、问答和图谱四个模块再优化一遍。',
        '备忘'
      ),
      buildItem(
        '会议纪要：知识库功能讨论',
        '会议讨论了知识库的核心方向，大家一致认为第一阶段应该围绕"文档上传、自动摘要、智能问答、知识图谱展示"四个点展开。后续需要重点解决文档解析、知识抽取准确率、多文档关联和跨文档问答体验。',
        '备忘'
      )
    ]

    setDocs([...docs, ...existingDocs])
    setNotes([...notes, ...existingNotes])
    wx.showToast({ title: '已导入示例', icon: 'success' })
    this.onShow()
  },
  onClear() {
    wx.showModal({
      title: '清空数据',
      content: '确认清空所有本地文档、备忘和问答历史吗？',
      success: res => {
        if (res.confirm) {
          setDocs([])
          setNotes([])
          try { wx.setStorageSync('kb_qa_history', []) } catch (e) { console.warn('清除问答历史失败', e) }
          wx.showToast({ title: '已清空', icon: 'success' })
          this.onShow()
        }
      }
    })
  }
})

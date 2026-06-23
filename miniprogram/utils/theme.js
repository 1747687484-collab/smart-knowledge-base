// 主题工具函数
const THEMES = {
  default: { name: '默认蓝', desc: '蓝紫渐变，清新专业', bg: '#f5f7fb' },
  dark:    { name: '暗夜黑', desc: '深色背景，护眼舒适', bg: '#1a1a2e' },
  warm:    { name: '暖橙',   desc: '橙色暖调，温馨活力', bg: '#fff8f3' },
  minimal: { name: '极简灰', desc: '纯黑白灰，专注内容', bg: '#fafafa' }
}

const THEME_KEYS = ['default', 'dark', 'warm', 'minimal']

function getThemeClass() {
  const app = getApp()
  const theme = (app && app.globalData && app.globalData.theme) || 'default'
  return theme === 'default' ? '' : 'theme-' + theme
}

function applyPageTheme() {
  const app = getApp()
  const theme = (app && app.globalData && app.globalData.theme) || 'default'
  const bg = THEMES[theme] ? THEMES[theme].bg : THEMES.default.bg
  try {
    wx.setBackgroundColor({ backgroundColor: bg })
  } catch (e) {}
}

function setTheme(key) {
  if (!THEMES[key]) return
  const app = getApp()
  if (app) app.globalData.theme = key
  try { wx.setStorageSync('kb_theme', key) } catch (e) {}
}

function getTheme() {
  const app = getApp()
  return (app && app.globalData && app.globalData.theme) || 'default'
}

module.exports = { THEMES, THEME_KEYS, getThemeClass, setTheme, getTheme, applyPageTheme }

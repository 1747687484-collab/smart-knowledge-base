// 主题工具函数
const THEMES = {
  default: { name: '精致立体', desc: '紫蓝渐变 + 柔和阴影', bg: '#f2f4f8' },
  dark:    { name: '暗夜黑',   desc: '深色背景，护眼舒适',   bg: '#1a1a2e' },
  clean:   { name: '简约清爽', desc: '白底细线 + Apple 风',  bg: '#fafbfc' },
  warm:    { name: '活力暖色', desc: '珊瑚渐变 + 大圆角',     bg: '#fff8f3' }
}

const THEME_KEYS = ['default', 'dark', 'clean', 'warm']

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
  // 将主题 class 加到 page 元素上，使 CSS 变量能覆盖 page 级样式
  try {
    if (typeof document !== 'undefined' && document.querySelector) {
      var pageEl = document.querySelector('page')
      if (pageEl) {
        pageEl.className = theme === 'default' ? '' : 'theme-' + theme
      }
    }
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

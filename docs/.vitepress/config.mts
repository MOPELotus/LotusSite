import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function pageTitle(file: string): string {
  const source = fs.readFileSync(file, 'utf8')
  const title = source.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1]
  if (title) return title.trim()
  const heading = source.match(/^#\s+(.+?)\s*$/m)?.[1]
  if (heading) return heading.replace(/[`*_]/g, '').trim()
  return path.basename(file, '.md')
}

function markdownSidebar(directory: string, routeBase: string): DefaultTheme.SidebarItem[] {
  if (!fs.existsSync(directory)) return []
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
  const items: DefaultTheme.SidebarItem[] = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      const nested = markdownSidebar(absolutePath, `${routeBase}/${entry.name}`)
      if (nested.length) {
        const text = entry.name === 'features' ? '功能' : entry.name
        items.push({ text, collapsed: true, items: nested })
      }
      continue
    }
    if (!entry.name.toLowerCase().endsWith('.md')) continue
    const basename = entry.name.slice(0, -3)
    items.push({ text: pageTitle(absolutePath), link: `${routeBase}/${basename}` })
  }
  return items
}

function projectSidebar(slug: string, displayName: string): DefaultTheme.SidebarItem[] {
  const sourceRoot = `/synced/${slug}`
  const sourceDocs = markdownSidebar(
    path.join(docsRoot, 'synced', slug, 'docs'),
    `${sourceRoot}/docs`
  )
  return [
    {
      text: displayName,
      items: [
        { text: '项目介绍', link: `/projects/${slug}/` },
        { text: 'README', link: `${sourceRoot}/README` }
      ]
    },
    ...(sourceDocs.length ? [{ text: '同步的项目文档', collapsed: false, items: sourceDocs }] : [])
  ]
}

const projectItems = [
  { text: 'MusicHud-TuneWeave', link: '/projects/musichud-tuneweave/' },
  { text: 'TuneWeave', link: '/projects/tuneweave/' },
  { text: 'Lotus-ReFactor', link: '/projects/lotus-refactor/' }
]

const lotusRefactorDocs = markdownSidebar(
  path.join(docsRoot, 'synced', 'lotus-refactor', 'docs'),
  '/synced/lotus-refactor/docs'
)

const yunzaiSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: '机器人使用指南',
    items: [
      { text: '总览与快速上手', link: '/yunzai/' },
      { text: '指令写法与权限', link: '/yunzai/commands' },
      {
        text: '荷花插件（Refactor）',
        collapsed: true,
        items: [
          { text: '插件介绍', link: '/projects/lotus-refactor/' },
          ...lotusRefactorDocs
        ]
      },
      { text: '原神', link: '/yunzai/genshin' },
      { text: '绝区零', link: '/yunzai/zzz' },
      { text: '实用工具与娱乐', link: '/yunzai/tools' },
      { text: '已安装插件目录', link: '/yunzai/plugins' },
      { text: '群聊管理', link: '/yunzai/group' },
      { text: '常见问题', link: '/yunzai/faq' }
    ]
  }
]

export default defineConfig({
  lang: 'zh-CN',
  title: 'MOPELotus',
  titleTemplate: ':title · MOPELotus',
  description: 'MOPELotus 项目文档与机器人使用帮助',
  base: '/',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    lineNumbers: true
  },
  head: [
    ['meta', { name: 'theme-color', content: '#eaf5ff' }],
    ['meta', { name: 'color-scheme', content: 'light dark' }]
  ],
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '项目', items: projectItems },
      { text: '捐赠', link: '/donate' },
      { text: '机器人帮助', link: '/yunzai/' },
      { text: '同步状态', link: '/sync-status' },
      { text: 'GitHub', link: 'https://github.com/MOPELotus' }
    ],
    footer: {
      message: '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">晋ICP备2025054157号-1</a>',
      copyright: 'MOPELotus'
    },
    sidebar: {
      '/yunzai/': yunzaiSidebar,
      '/projects/musichud-tuneweave/': projectSidebar('musichud-tuneweave', 'MusicHud-TuneWeave'),
      '/synced/musichud-tuneweave/': projectSidebar('musichud-tuneweave', 'MusicHud-TuneWeave'),
      '/projects/tuneweave/': projectSidebar('tuneweave', 'TuneWeave'),
      '/synced/tuneweave/': projectSidebar('tuneweave', 'TuneWeave'),
      '/projects/lotus-refactor/': yunzaiSidebar,
      '/synced/lotus-refactor/': yunzaiSidebar
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到相关内容',
            resetButtonTitle: '清除查询',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },
    outline: { level: [2, 3], label: '本页目录' },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题'
  }
})

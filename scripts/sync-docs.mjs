import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = path.join(rootDir, 'docs')
const generatedRoot = path.join(docsDir, 'synced')

const sources = [
  {
    slug: 'musichud-tuneweave',
    title: 'MusicHud-TuneWeave',
    repository: 'MOPELotus/MusicHud-TuneWeave',
    branch: '26.3'
  },
  {
    slug: 'tuneweave',
    title: 'TuneWeave',
    repository: 'MOPELotus/TuneWeave',
    branch: 'main'
  },
  {
    slug: 'lotus-refactor',
    title: 'Lotus-ReFactor',
    repository: 'MOPELotus/Lotus-ReFactor',
    branch: 'main'
  },
  {
    slug: 'yunzai',
    title: 'MOPELotus/Miao-Yunzai',
    repository: 'MOPELotus/Miao-Yunzai',
    branch: 'TRSS',
    publishDocs: false
  }
]

function run(command, args, cwd = rootDir) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  }).trim()
}

function cloneSource(project, destination) {
  const args = [
    'clone', '--depth=1', '--single-branch', '--branch', project.branch,
    `https://github.com/${project.repository}.git`, destination
  ]

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      run('git', args)
      return
    } catch (error) {
      fs.rmSync(destination, { recursive: true, force: true })
      if (attempt === 3) throw error
      const delayMs = attempt * 1500
      console.warn(`克隆失败，${delayMs / 1000} 秒后重试（${attempt}/3）：${project.repository}`)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
    }
  }
}

function copyIfPresent(source, target) {
  if (!fs.existsSync(source)) return false
  fs.cpSync(source, target, { recursive: true, force: true })
  return true
}

function rewriteSourceMarkdown(content, repository, branch, sourceRelativePath) {
  const repoUrl = `https://github.com/${repository}`
  const repoPath = (target) => path.posix.normalize(
    path.posix.join(path.posix.dirname(sourceRelativePath), target)
  ).replace(/^\.\//, '')
  const toBlobUrl = (target, fragment = '') =>
    `${repoUrl}/blob/${branch}/${repoPath(target)}${fragment ? `#${fragment}` : ''}`

  return content
    .replace(/(?<!!)\]\((?!https?:|mailto:|#)([^)]+)\)/g, (match, target) => {
      const [file, fragment = ''] = target.split('#', 2)
      return `](${toBlobUrl(file, fragment)})`
  })
}

function adaptLotusRefactorPrefixes(content, sourceRelativePath) {
  let adapted = content
    .replace(/#星铁(?!绑定设备(?:信息)?)/g, '*')
    .replace(/#绝区零(?!绑定设备(?:信息)?)/g, '%')

  if (sourceRelativePath === 'docs/features/device.md') {
    adapted = adapted.replace(
      '## 功能特性',
      [
        '## 本机使用说明',
        '',
        '本页的设备绑定命令由荷花插件统一处理，使用 `#` 前缀；这项绑定会覆盖 ZZZ-Plugin 的同名入口。原神、星穹铁道和绝区零的常规指令前缀仍分别是 `#`、`*` 和 `%`。',
        '',
        '本机器人不提供私聊。绑定流程可能要求提交设备 JSON，请勿在群里发送，联系荷花处理。',
        '',
        '## 功能特性'
      ].join('\n')
    )
  }

  if (sourceRelativePath === 'docs/features/record-query-starrail.md') {
    adapted = adapted.replace(
      /- 星铁挑战查询由 Lotus 自己实现，不依赖 [^。]+。/,
      '- 星铁挑战查询由荷花插件独立实现。'
    )
  }

  const lines = []
  let lastCommand = ''
  for (const line of adapted.split('\n')) {
    const trimmed = line.trim()
    const command = trimmed.match(/^(?:-\s+)?`([#*%][^`]+)`$/)?.[1]
      ?? (/^[#*%]\S/.test(trimmed) ? trimmed : '')
    if (command && command === lastCommand) continue
    if (command) lastCommand = command
    else if (trimmed) lastCommand = ''
    lines.push(line)
  }
  return lines.join('\n')
}

function rewriteProjectMarkdown(content, repository, branch, sourceRelativePath) {
  const rewritten = rewriteSourceMarkdown(content, repository, branch, sourceRelativePath)
  if (repository !== 'MOPELotus/Lotus-ReFactor') return rewritten
  return adaptLotusRefactorPrefixes(rewritten, sourceRelativePath)
}

function rewriteMarkdownTree(directory, sourceDirectory, repository, branch) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      rewriteMarkdownTree(absolutePath, sourceDirectory, repository, branch)
      continue
    }
    if (!entry.name.toLowerCase().endsWith('.md')) continue
    const relativePath = path.relative(sourceDirectory, absolutePath).split(path.sep).join('/')
    const content = fs.readFileSync(absolutePath, 'utf8')
    fs.writeFileSync(absolutePath, rewriteProjectMarkdown(content, repository, branch, relativePath), 'utf8')
  }
}

function copyReferencedAssets(sourceRoot, publishRoot) {
  const markdownFiles = []
  const readmeName = ['README.md', 'readme.md'].find((name) => fs.existsSync(path.join(sourceRoot, name)))
  if (readmeName) markdownFiles.push(path.join(sourceRoot, readmeName))
  const visit = (directory) => {
    if (!fs.existsSync(directory)) return
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(absolutePath)
      else if (entry.name.toLowerCase().endsWith('.md')) markdownFiles.push(absolutePath)
    }
  }
  visit(path.join(sourceRoot, 'docs'))

  for (const markdownPath of markdownFiles) {
    const relativeMarkdown = path.relative(sourceRoot, markdownPath).split(path.sep).join('/')
    const content = fs.readFileSync(markdownPath, 'utf8')
    const targets = []
    for (const match of content.matchAll(/!\[[^\]]*\]\(<?([^\s)>]+)>?(?:\s+[^)]*)?\)/g)) {
      targets.push(match[1])
    }
    for (const match of content.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
      targets.push(match[1])
    }

    for (const target of targets) {
      if (/^(?:https?:|data:|mailto:|#)/i.test(target)) continue
      let decoded = target.split(/[?#]/, 1)[0]
      try {
        decoded = decodeURIComponent(decoded)
      } catch {
        // Keep a literal percent sign when it is not a URL escape.
      }
      decoded = decoded.replace(/^\//, '')
      const relativeAsset = path.posix.normalize(path.posix.join(path.posix.dirname(relativeMarkdown), decoded))
      if (relativeAsset === '..' || relativeAsset.startsWith('../')) continue
      const sourceAsset = path.join(sourceRoot, ...relativeAsset.split('/'))
      if (!fs.existsSync(sourceAsset) || !fs.statSync(sourceAsset).isFile()) continue
      const destinationAsset = path.join(publishRoot, ...relativeAsset.split('/'))
      fs.mkdirSync(path.dirname(destinationAsset), { recursive: true })
      fs.copyFileSync(sourceAsset, destinationAsset)
    }
  }
}

function writeSourceNote(project, commit, sourceDir, destination) {
  const readmeName = ['README.md', 'readme.md'].find((name) => fs.existsSync(path.join(sourceDir, name)))
  if (project.publishDocs !== false && readmeName) {
    const content = fs.readFileSync(path.join(sourceDir, readmeName), 'utf8')
    fs.writeFileSync(
      path.join(destination, 'README.md'),
      rewriteProjectMarkdown(content, project.repository, project.branch, readmeName),
      'utf8'
    )
  }

  const licenseName = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'license'].find((name) =>
    fs.existsSync(path.join(sourceDir, name))
  )
  if (project.publishDocs !== false && licenseName) {
    const target = path.join(destination, 'LICENSE.txt')
    fs.copyFileSync(path.join(sourceDir, licenseName), target)
  }

  if (project.publishDocs !== false) {
    const sourceDocs = path.join(sourceDir, 'docs')
    const destinationDocs = path.join(destination, 'docs')
    copyIfPresent(sourceDocs, destinationDocs)
    copyReferencedAssets(sourceDir, destination)
    rewriteMarkdownTree(destinationDocs, destination, project.repository, project.branch)
  }

  return {
    title: project.title,
    repository: project.repository,
    branch: project.branch,
    commit,
    published: project.publishDocs !== false
  }
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lotussite-sync-'))
const rows = []

try {
  fs.mkdirSync(generatedRoot, { recursive: true })

  for (const project of sources) {
    const sourceDir = path.join(tempRoot, project.slug)
    const destination = path.join(tempRoot, 'generated', project.slug)
    console.log(`同步 ${project.title} (${project.repository}@${project.branch})`)

    cloneSource(project, sourceDir)

    const commit = run('git', ['rev-parse', 'HEAD'], sourceDir)
    fs.rmSync(destination, { recursive: true, force: true })
    fs.mkdirSync(destination, { recursive: true })
    rows.push({
      ...writeSourceNote(project, commit, sourceDir, destination),
      slug: project.slug
    })
  }

  for (const row of rows) {
    const destination = path.join(generatedRoot, row.slug)
    fs.rmSync(destination, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.cpSync(path.join(tempRoot, 'generated', row.slug), destination, { recursive: true })
  }

  const rowsMarkdown = rows.map((row) => {
    const sourceLink = `[${row.title}](https://github.com/${row.repository}/tree/${row.branch})`
    const shortCommit = row.commit.slice(0, 7)
    const commitLink = '[' + '`' + shortCommit + '`' + `](https://github.com/${row.repository}/commit/${row.commit})`
    const output = row.published ? 'README、文档与资源' : '版本来源追踪'
    return `| ${sourceLink} | \`${row.branch}\` | ${commitLink} | ${output} |`
  }).join('\n')

  const statusPage = `---\ntitle: 文档来源与同步状态\noutline: false\n---\n\n# 文档来源与同步状态\n\n本页由 \`npm run docs:sync\` 生成。项目文档按以下分支同步；链接指向本次构建使用的源提交。\n\n| 项目 | 分支 | 源提交 | 同步内容 |\n| --- | --- | --- | --- |\n${rowsMarkdown}\n\n同步时间：\`${new Date().toISOString()}\`\n`
  fs.writeFileSync(path.join(docsDir, 'sync-status.md'), statusPage, 'utf8')
  console.log('文档同步完成。')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}

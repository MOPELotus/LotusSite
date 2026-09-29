# LotusSite

MOPELotus 项目文档与 Yunzai 机器人使用帮助站，使用 VitePress 构建。

## 本地预览

需要 Node.js 22 或更高版本，以及 Git。

```sh
npm ci
npm run docs:dev
```

首次启动会从公开项目仓库同步 README 和 `docs/`，之后访问终端显示的本地地址。

## 构建与 Apache 部署

```sh
npm run docs:sync
npm run docs:build
```

静态文件位于 `docs/.vitepress/dist/`。将该目录的内容复制到 Apache 虚拟主机的网站根目录即可。站点按域名根路径构建，不依赖 GitHub Pages。产物包含 `.htaccess`，用于将无扩展名页面地址重写到对应的 `.html`；Apache 需启用 `mod_rewrite` 并允许该目录的 `FileInfo` 覆盖。如果服务器不允许 `.htaccess`，请在 VirtualHost 中配置等效重写规则。

GitHub Actions 会每日同步文档并构建静态文件，构建产物可从对应工作流运行页面下载。站点源码 push 和手动触发也会执行同样流程。

## 内容维护

- 项目介绍与 Yunzai 用户帮助位于 `docs/`，由本站维护。
- 项目仓库中的 README、`docs/`、图片和许可证会同步到 `docs/synced/`，只在构建产物中提供，并显示来源分支和提交。
- Yunzai 帮助按当前机器人安装的插件整理。插件、命令或权限调整后，请同步更新相应页面。

## 内容源

- [MusicHud-TuneWeave](https://github.com/MOPELotus/MusicHud-TuneWeave)
- [TuneWeave](https://github.com/MOPELotus/TuneWeave)
- [Lotus-ReFactor](https://github.com/MOPELotus/Lotus-ReFactor)
- [MOPELotus/Miao-Yunzai](https://github.com/MOPELotus/Miao-Yunzai)

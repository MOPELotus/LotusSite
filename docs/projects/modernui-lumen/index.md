---
title: ModernUI Lumen
description: Modern UI for Minecraft 的维护分支，提供字体排版、界面美化和渲染兼容修复。
---

# ModernUI Lumen

ModernUI Lumen 是 [Modern UI for Minecraft](https://github.com/BloCamLimb/ModernUI-MC) 的维护分支，由 MOPELotus 维护，原作者是 BloCamLimb。它将 Modern UI 界面框架带入 Minecraft，并提供文字排版、字体替换、界面背景与物品提示等功能。

## 功能

- 自定义字体与回退字体，支持 Unicode 排版、抗锯齿和彩色表情符号。
- 调整背景模糊、淡入效果、物品提示样式与平滑滚动。
- 维护多个 Minecraft 版本，并修复滚动歌词文字抖动、输入与渲染后端的兼容问题。
- 支持 Fabric 和 NeoForge，提供普通版与 MiSans 字体版。

## 开始使用

1. 从发行版下载与你的 Minecraft 版本和加载器匹配的 JAR，放入 `mods` 文件夹；Fabric 还需安装对应版本的 Fabric API。
2. 如果已安装上游 Modern UI，先替换其 JAR。两者使用相同的 `modernui` 模组 ID，不能同时安装。
3. 进入游戏后按 **Ctrl+K** 打开操作中心，在「偏好设置」中调整字体、背景和物品提示。

支持版本、Java 与加载器要求、Vulkan 配置和已知兼容问题请查看[同步的中文 README](/synced/modernui-lumen/README)。普通版与 MiSans 版的区别见[字体版本说明](/synced/modernui-lumen/docs/font-editions)。

## 项目链接

- [GitHub 仓库](https://github.com/MOPELotus/ModernUI-MC-Lumen)
- [发行版下载](https://github.com/MOPELotus/ModernUI-MC-Lumen/releases)
- [更新记录](https://github.com/MOPELotus/ModernUI-MC-Lumen/blob/master/changelogs.md)
- [问题反馈](https://github.com/MOPELotus/ModernUI-MC-Lumen/issues)
- [文档来源与同步状态](/sync-status)

原模组和 ModernUI Framework 由 BloCamLimb 及贡献者开发，采用 LGPL-3.0-or-later 许可。同步内容保留项目许可证与相关字体的许可说明。

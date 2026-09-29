---
title: TuneWeave
description: 面向多个音乐平台的统一 HTTP API 服务。
---

# TuneWeave

TuneWeave 使用 Rust 构建，把音乐平台的搜索、歌单、媒体解析和账户能力整理成统一 HTTP API。它也为 MusicHud-TuneWeave 提供音乐服务。

## 能力概览

- 统一歌曲、歌单、专辑等资源引用与 JSON 响应。
- 接入网易云音乐、QQ 音乐、B 站、酷狗、咪咕、酷我和汽水音乐等平台；实际能力以实例的 `/v1/capabilities` 为准。
- 支持多账户、调用方凭证和 Uni Playlist 等能力。
- 媒体接口返回上游媒体地址，不代理媒体内容。

## 快速检查

默认服务地址为 `http://127.0.0.1:7832`：

```sh
curl http://127.0.0.1:7832/healthz
curl http://127.0.0.1:7832/v1/platforms
curl http://127.0.0.1:7832/v1/capabilities
```

完整的安装、环境变量、账户安全与 API 请求示例见[同步的 README](/synced/tuneweave/README)、[安装与配置](/synced/tuneweave/docs/getting-started)和[HTTP API v1](/synced/tuneweave/docs/api-v1)。

## 项目链接

- [GitHub 仓库](https://github.com/MOPELotus/TuneWeave)
- [发行版下载](https://github.com/MOPELotus/TuneWeave/releases)
- [问题反馈](https://github.com/MOPELotus/TuneWeave/issues)

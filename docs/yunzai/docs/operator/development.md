# 开发指南

[返回运维与开发概览](/yunzai/docs/operator/index)

本文说明项目目录结构、启动与初始化流程、模块关系、测试验证命令以及子模块维护方式。安装与部署步骤见[安装与部署](/yunzai/docs/operator/deployment)，日常运维见[运行与日常维护](/yunzai/docs/operator/operations)。

## 目录结构

项目基于 Bun 工作区组织（见 [package.json](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/package.json)），主要目录如下：

| 目录 / 文件 | 用途 |
| --- | --- |
| `app.ts` | 主程序入口，聚合宿主基础设施、业务指令模块与消息适配器 |
| `lib/` | 宿主核心逻辑、配置与权限、签到/兑换等业务模块及 `lib/adapters/`（Milky / OneBot） |
| `packages/` | 共享工作区包（`@lotus-yunzai/*`），供宿主与插件引用 |
| `plugins/` | 内置功能插件目录，各插件为独立 Git 子模块 |
| `panel/` | Vue 管理网页工作区（`@lotus-yunzai/panel`） |
| `resources/` | 内置静态资料与默认资源 |
| `scripts/` | 初始化、迁移、启动器、状态与校验脚本 |
| `i18n/` | 国际化文案目录，仅预置简体中文 `zh-CN.json` |

当前源码树中没有 `apps` 目录；`config` 等运行期配置目录在执行初始化或迁移前可以不存在。

## 启动流程与模块职责

### 启动器与初始化检查

`scripts/launcher.ts` 负责调用 [scripts/startup.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/scripts/startup.ts) 完成启动前检查：

- 普通启动：通过 `assertInitializationComplete` 校验初始化已完成，安装终端日志格式，并调用 `atlasReadiness` 与 `prepareAtlasTheme` 仅核对已有图鉴数据与主题资源是否就绪，不会在每次普通启动时重新下载全套资料。
- 初始化阶段（`--initialize`）：进入首次配置流程，在 TTY 终端下通过 `askStartupOptions` 提示选择图鉴频道（`latest` 或 `live`）与图像渲染预设（`standard` 或 `low`），并按需准备和下载模型、图鉴主题（`download: firstSetup`）等运行资源。
- 环境变量覆盖：图鉴数据与主题目录支持通过 `LOTUS_ATLAS_DATA_DIR`、`LOTUS_ATLAS_THEME_DIR` 和 `LOTUS_ATLAS_THEME_SOURCE_DIR` 覆盖默认路径。

### 宿主职责与调用链概述

[app.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/app.ts) 作为宿主主入口，集中串联以下几类能力（具体初始化与触发时机由各运行时模块及适配器事件驱动，不以静态导入顺序代表运行期调用顺序）：

- 国际化支持：预加载 `lib/i18n-preload.ts`，使用 `@lotus-yunzai/i18n` 与 `i18n/zh-CN.json` 创建核心翻译器，并结合 `lib/i18n.ts` 与 `lib/i18n-settings.ts` 处理本地化设置。
- 运行时基础设施：包含生成设备信息刷新（`lib/generated-device-runtime.ts`）、托管 Valkey（`lib/managed-valkey.ts`）、内置资源目录定位（`lib/builtin-resources.ts`）、网络访问控制（`lib/network-access.ts`）、终端日志格式化（`lib/terminal-log-format.ts`）以及持久化存储连接（`@lotus-yunzai/storage`）。
- 业务与指令模块：基于 `@lotus-yunzai/account`、`@lotus-yunzai/hoyo-client`、`@lotus-yunzai/gacha`、`@lotus-yunzai/skia` 等共享包，在 `lib/` 下组织账号管理、每日签到、兑换码、角色面板与档案归属校验、群管及各类实用工具。
- 消息协议适配器：通过 `lib/adapters/` 接入 Milky（WebSocket / Webhook / 会话与群事件）和 OneBot 协议。

## 工作区与模块关系

### 共享包（`packages/*`）

根工作区通过 `workspace:*` 依赖以下内部包：

- `@lotus-yunzai/account`：账号档案与游戏指令档案管理
- `@lotus-yunzai/captcha`：验证码处理能力
- `@lotus-yunzai/gacha`：抽卡期望计算与角色返场统计
- `@lotus-yunzai/hoyo-client`：米游社客户端、社区签到与兑换码服务
- `@lotus-yunzai/http`：HTTP 请求封装
- `@lotus-yunzai/i18n`：国际化翻译器实现
- `@lotus-yunzai/skia`：基于 `skia-canvas` 的图像与卡片渲染
- `@lotus-yunzai/storage`：存储连接与读写封装

### 内置插件（`plugins/*`）

[lib/builtin-modules.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/lib/builtin-modules.ts) 定义了内置模块名与 `plugins/` 子目录的映射关系：

- `@lotus-yunzai/system` -> `plugins/system`
- `@lotus-yunzai/atlas` -> `plugins/atlas`
- `@lotus-yunzai/meme` -> `plugins/meme`
- `@lotus-yunzai/notice` -> `plugins/notice`
- `@lotus-yunzai/genshin` -> `plugins/genshin`
- `@lotus-yunzai/starrail` -> `plugins/starrail`
- `@lotus-yunzai/zzz` -> `plugins/zzz`
- `@lotus-yunzai/group` -> `plugins/group`
- `@lotus-yunzai/execute` -> `plugins/execute`
- `@lotus-yunzai/guides` -> `plugins/guides`
- `@lotus-yunzai/media` -> `plugins/media`

插件接口与扩展方式见[插件开发](/yunzai/docs/operator/plugins)，多语言文案维护见[国际化与多语言](/yunzai/docs/operator/i18n)。

## 测试与验证

在仓库根目录可执行以下验证脚本：

1. 类型检查（同时覆盖主仓库与管理面板）：
   ```bash
   bun run typecheck
   ```
   实际执行 `tsc --noEmit && bun run --filter @lotus-yunzai/panel typecheck`。

2. 国际化校验（仅校验文案完整性，不修改文件）：
   ```bash
   bun run i18n:check
   ```
   实际执行 [scripts/i18n/check.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/scripts/i18n/check.ts)。

3. 测试套件：
   ```bash
   bun run test
   ```
   实际执行 `bun test --isolate --timeout 15000 ./test ./plugins ./packages ./scripts ./panel`。部分用例会依据运行环境条件自动跳过，无法保证所有机器都会执行图形渲染相关测试。若在特定环境中验证 GPU 或图形渲染能力，需按实际环境核对显卡驱动与渲染器状态；部署本身不强制要求机器配备独立显卡。

4. 构建管理面板：
   ```bash
   bun run build:panel
   ```

## 贡献与上游子模块维护

- 子模块更新顺序：`plugins/*` 为独立 Git 子模块。修改插件代码时，应先在对应子模块仓库内完成测试验证并提交，再回到主仓库更新子模块指针并提交。
- 本地数据隔离：运行期产生的用户数据、账号档案及本地配置保留在本地工作目录，不要提交到 Git 仓库。

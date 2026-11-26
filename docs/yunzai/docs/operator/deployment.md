# 安装与部署

本文档说明从零克隆仓库到完成初始化并启动运行的完整流程。如需从旧版本迁移，请参见 [迁移指南](/yunzai/docs/operator/migration)。

## 环境与依赖

在开始部署前，请确认服务器满足以下条件：

1. Git：系统已安装 `git` 命令。项目包含多个 Git 子模块，需通过 Git 克隆仓库，不能使用无 `.git` 元数据的源码压缩包。
2. Bun 1.4.4：运行时版本锁定为 `bun@1.4.4`。初始化脚本会校验当前 Bun 版本，版本不符将中止退出。
3. 存储后端（Valkey / Redis）：
   - 若未设置环境变量 `LOTUS_VALKEY_URL` 且 `config/redis.yaml` 与兼容路径 `config/config/redis.yaml` 均不存在，系统默认启用项目托管 Valkey（已有任一路径配置均会被尊重）。
   - Linux（x64 / arm64）：自动下载官方 Valkey 8.1.12，系统需具备 `tar` 命令。
   - 其他类 Unix 平台：尝试从源码编译 Valkey，系统需具备 `make`、`cc` 和 `tar`。
   - Windows：若系统中没有现成的 `valkey-server`，内置托管安装不受支持。请自行部署外部 Redis 或 Valkey 服务，并通过 `LOTUS_VALKEY_URL` 或 `config/redis.yaml` 接入（配置方法见 [配置说明](/yunzai/docs/operator/configuration)）。

## 部署步骤

### 第一步：克隆仓库

使用 Git 克隆主仓库并进入项目根目录：

```bash
git clone https://github.com/MOPELotus/Lotus-Yunzai.git
cd Lotus-Yunzai
```

### 第二步：执行初始化

在项目根目录运行初始化命令：

```bash
bun run init
```

`bun run init` 与 `bun run bootstrap` 等价。如需在命令中直接指定图鉴版本来源，可附加参数 `latest` 或 `live`，例如 `bun run init latest`。

初始化脚本会按以下顺序执行：

1. 版本与子模块同步：校验 Bun 版本为 `1.4.4`，拉取并核对 `.gitmodules` 中定义的全部子模块（包括 `plugins/*` 与 `vendor/gt-manual`）。
2. 依赖安装与原生库检查：执行 `bun install --frozen-lockfile` 安装锁定依赖，并探测 Skia 图片原生库；若加载失败，脚本会自动尝试重新下载并校验恢复。
3. 管理面板构建：执行 `bun run build:panel` 构建前端管理面板。
4. 内置资源核对：校验内置程序资源完整性。
5. 交互式配置与运行资料准备：
   - 选择图鉴版本来源：
     - `1` 或 `latest`（直接回车默认）：最新版。
     - `2` 或 `live`：正式版。
   - 选择图片渲染档位（写入 `bot.yaml` 的 `imageRenderPreset` 字段）：
     - `1` 或 `standard`（直接回车默认）：标准配置。
     - `2` 或 `low`：低配配置。
   - 授予终端主人权限：若配置中尚未设置 `master`，自动授予本机 `stdin:stdin` 主人权限。
   - 下载业务资源与模型：依次准备图鉴数据、各游戏主题素材（图鉴卡片、体力便笺、绝区零调频、原神祈愿日历、星铁挑战与转生等）、本地验证码模型（存放于 `data/captcha/models`）、托管 Valkey，以及三游面板角色图库、攻略配队参考表和媒体工具依赖（FFmpeg 与 TuneWeave）。

当终端输出全部准备完成的提示后，表示初始化完成。

### 第三步：启动服务

确认 `bun run init` 完成后，即可启动机器人：

- 前台启动（适合首次验证或调试）：
  ```bash
  bun run start
  ```
- 后台启动（适合生产环境常驻运行，当前 launcher 在 Windows 不支持 PM2 后台入口，Windows 请使用前台 `bun run start`，其他已存在服务按配置管理）：
  ```bash
  bun run start:bg
  ```

日常状态查看、日志查阅、重启与停止操作（`status`、`logs`、`restart`、`stop`）请参见 [运维管理](/yunzai/docs/operator/operations)。

## 补充说明

- 初始化中断处理：若因网络波动或手动中止导致 `bun run init` 未能完成，直接重新执行 `bun run init` 即可。已下载的模型与图鉴记录会保留并继续完成，无需清理重来。
- 直接启动的前提：`bun run start` 不会代替 `init` 下载验证码模型、图鉴数据或媒体依赖，未完成初始化直接启动会报错退出。
- `--build-only` 参数用途：`bun run bootstrap --build-only` 仅用于依赖安装与管理面板构建（例如构建预备或迁移场景），会跳过内置资源核对以及模型、图鉴、Valkey 等运行资料的初始化，不能用于完成新建部署。
- 已有存储配置优先：若环境中已存在 `LOTUS_VALKEY_URL`，或存在 `config/redis.yaml` / 兼容路径 `config/config/redis.yaml`，系统会优先使用已有配置，不会启用托管 Valkey，已有配置不会被覆盖。
- 后续配置与网络：如需调整 Bot 账号、OneBot 接入令牌（`config/server.yaml` 中的 `onebot_token`）或代理设置，请继续阅读 [配置说明](/yunzai/docs/operator/configuration) 与 [网络配置](/yunzai/docs/operator/network)。

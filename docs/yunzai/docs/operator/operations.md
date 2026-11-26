# 运行与日常维护

初次安装与环境变量配置请参考 [部署指南](/yunzai/docs/operator/deployment) 与 [配置说明](/yunzai/docs/operator/configuration)。

## 启停与日志管理

### 前台运行

在项目根目录执行以下命令启动前台实例：

```bash
bun run start
```

按下 `Ctrl+C` 即可停止前台进程。若当前由本程序托管本地 Valkey 实例，正常停止前台后会自动向托管 Valkey 发送 `SHUTDOWN SAVE`，确保内存数据落盘后再退出。

### 后台运行（PM2）

项目内置了 `pm2` 本地依赖，通过 `bun run` 自动注入的 `PATH` 即可调用，无需全局安装。常用管理命令如下：

1. 启动后台服务：
   ```bash
   bun run start:bg
   ```
2. 查看运行状态：
   ```bash
   bun run status
   ```
3. 查看运行日志：
   ```bash
   bun run logs
   # 仅输出最近 100 行并立即退出
   bun run logs --lines 100 --nostream
   ```
   执行 `bun run logs` 持续跟踪日志时，按 `Ctrl+C` 仅退出日志查看客户端，不会停止后台服务。
4. 重启或停止后台服务：
   ```bash
   bun run restart
   bun run stop
   ```

### 系统服务接管模式

已有经迁移接管的 systemd 服务映射时，启动器在校验映射后，会将上述 `bun run start`、`bun run status`、`bun run logs`、`bun run restart`、`bun run stop` 等命令自动委派给 `systemd` 与 `journalctl` 执行，避免与后台进程管理器冲突。

## 版本更新

版本更新由受管启动器协调完成，仅主人（owner）权限账号可在聊天会话中触发。

### 更新前提条件

1. 受管运行模式：必须在宿主目录通过 `bun run start` 或受管后台模式启动后触发，未启用受管更新时会拒绝执行。
2. Git 工作区与上游状态：
   - 宿主目录必须是规范路径的真实 Git 检出目录，工作区已跟踪文件不得存在未提交修改（`dirty` 状态会拦截常规更新）。
   - 当前必须位于普通本地分支（非游离 `HEAD`），且已正确配置并跟踪远端上游（`branch.<name>.remote` 与 `branch.<name>.merge` 有效，远端协议限于 `file`、`git`、`http`、`https`、`ssh`）。
   - 当前提交不能领先于上游（`ahead`）或与上游分叉（`diverged`），否则常规更新不会执行。

> 请先排查并提交或妥善备份本地改动，不要使用 `git reset --hard` 强行重置工作区，以免丢失未保存的自定义修改或配置。

### 聊天更新命令

- `#更新`：更新主仓库。
- `#更新 system`：更新指定受管插件或包名（如 `#更新 @lotus-yunzai/system`，目标名称不得包含控制字符）。`#更新日志`、`#更新图鉴`、`#更新抽卡记录`、`#更新面板` 等业务指令不会触发仓库更新。
- `#全部更新`：全量更新主仓库与受管包，命令后不得附带任何目标名称。
- 静默模式：在 `#更新` 或 `#全部更新` 中加入 `静` 或 `安静` 前缀（如 `#静更新`），仅在异常或最终结果时反馈。
- 强制更新（`#强制更新`）：会绕过工作区未提交修改（`dirty`）及分支领先/分叉检查，只要候选提交与当前不一致或工作区存在改动即会强制构建并切换目录。该通道仅作为应急手段保留，不建议在日常运维中使用。

### 版本切换与配置变更

更新会准备同文件系统的独立候选目录，经校验后再执行原子目录切换；`config`、`data`、`logs`、`internal`、`backup` 目录以及根目录 `.env`、`.env.*` 会被自动保留并迁移至新版本，切换或校验失败时自动回滚。

若更新过程中检测到 Valkey 配置发生变更或无法读取，当前宿主会继续保持运行并提示配置变更。此时需先停机，再重新启动服务以加载新配置。

### 自动更新调度

未显式配置定时规则时，系统默认每天 00:30 与 12:30 自动检查并执行更新（内部默认 Cron 为 `0 30 0,12 * * *`）。只要配置中显式存在 `update_time` 或 `update_cron` 字段（包括设为 `0`、`false` 或空值），即会覆盖默认调度并按显式配置生效或关闭。具体字段语法详见 [日程与定时任务](/yunzai/docs/operator/schedules) 与 [配置说明](/yunzai/docs/operator/configuration)。

## 备份与恢复

### 备份步骤与范围

为保证数据库与持久化缓存处于同一时间点的一致性状态，严禁热拷贝运行中的数据文件。请按以下顺序备份：

1. 先停机：执行 `bun run stop`（或前台按 `Ctrl+C`），确认进程已完全退出且托管 Valkey 已完成 `SHUTDOWN SAVE` 落盘。
2. 复制同一时间点的完整状态：
   - 必选目录：`config`、`data`、`backup`（如需保留运行记录与内部状态，可一并包含 `logs`、`internal`）。
   - 必选环境文件：根目录 `.env` 及所有 `.env.*` 文件。
   - 自定义内容：自行添加或修改的插件目录、静态资源等。
3. 数据库与缓存文件完整性：
   - SQLite：必须将主数据库文件与同目录下的旁文件（如 `-wal`、`-shm` 等事务日志与共享内存文件）完整打包，切勿单独复制主库文件。
   - Valkey：若使用内置托管 Valkey，必须完整保存整个 `data/valkey` 目录（包含 RDB 与 AOF 等全部持久化文件），切勿仅备份 `dump.rdb` 而丢弃 AOF 文件。
4. 私有保存：停机后可直接复制整份安装目录作为私有快照备份。由于 `.env`、`config` 与 `data` 内含账号凭证、密钥及 OTP 数据，请私有保存，切勿上传至公开仓库或转交他人。

### 恢复流程与运行禁忌

1. 停止当前服务：确保目标主机上没有任何旧进程或后台任务仍在运行。
2. 保留故障现场：将当前受损或异常的安装目录、`data` 与 `config` 重命名归档，避免在排查完成前直接覆盖原始现场。
3. 恢复同版本代码与完整数据：将备份时的同版本代码与同一时间点的 `config`、`data`、`backup`、`.env*` 及必要自定义插件/资源还原至运行目录。
4. 核对外部 Valkey 一致性：若部署中使用了外部独立 Valkey 服务，启动前需先确认外部 Valkey 的数据状态与恢复的本地数据时间点匹配。
5. 严防多实例并发冲突：确认目录权限与环境配置无误后再启动服务。不要在恢复后让新旧实例使用相同机器人与业务数据同时运行，否则会导致数据损坏或状态竞争。

## 远程运维配置与操作

远程运维允许主人通过私聊使用一次性动态验证码（TOTP）在宿主执行受控 Shell 命令及文件传输。该功能默认关闭。

### 本机配对与平台前提

- 平台限制：仅支持运行在 Linux 或 Windows（x64 / arm64） 上的宿主。
- 终端配对（必须在本机交互式终端运行）：
  1. 首次配对在宿主目录执行：
     ```bash
     bun scripts/remote-otp.ts setup
     ```
     终端将输出二维码（或 `otpauth://` URI），使用手机或桌面端身份验证器扫描绑定。
  2. 如需更换验证器或重新生成密钥，执行：
     ```bash
     bun scripts/remote-otp.ts reset
     ```
- `setup` 与 `reset` 均要求在私人本机终端（TTY）直接执行，不得重定向标准输出；在聊天窗口发送 `#远程OTP初始化` 或 `#远程2FA重置` 仅会返回本机操作提示，无法直接生成密钥。

### 面板与 `config/remote.yaml` 参数设置

完成本机配对后，可在管理面板的远程设置页或 `config/remote.yaml` 中调整以下字段：

| `config/remote.yaml` 字段 | 面板对应项 | 类型与可填写值 | 默认值与前置校验说明 |
| :--- | :--- | :--- | :--- |
| `enable` | 允许远程运维（`enabled`） | 布尔值：`true` / `false` | 默认 `false`。仅当平台受支持且本机已完成 TOTP 配对时才可设为 `true`；关闭后立即拒绝新操作并阻止未写入的文件发布。 |
| `timeout_ms` | 命令超时（毫秒）（`timeout`） | 整数：`100` ~ `120000` | 默认 `30000`（30 秒）。控制单次远程 Shell 命令执行超时时间。 |
| `shells` | 允许的 Shell（`shells`） | 字符串列表，可选：`sh`、`bash`、`zsh`、`pwsh`、`powershell`、`cmd`（不可重复） | Linux 默认 `["bash", "sh", "zsh"]`；Windows 默认 `["pwsh", "powershell", "cmd"]`。仅能执行宿主已安装且在列表内的 Shell。 |
| `allow_admin` | 允许管理员入口（`allowAdmin`） | 布尔值：`true` / `false` | 默认 `false`。仅当 Linux 宿主以 `root` 身份运行，或 Windows 宿主进程已拥有管理员令牌时才允许开启；开启该项不会自动提权。 |
| `allow_overwrite_upload` | 允许普通上传覆盖同名文件（`overwrite`） | 布尔值：`true` / `false` | 默认 `false`。为 `false` 时，普通上传遇到同名文件会拒绝写入。 |

### 聊天端权限、指令格式与文件限制

- 权限与一次性校验：仅具备对应远程权限（`remote.spawn` / `remote.download` / `remote.upload`）的主人账号可发起操作；每次命令或文件传输均须携带当前有效的 6 位数字 OTP 验证码，同一验证码单次使用后即失效。
- 防爆破与审计：30 秒内连续验证失败达到 5 次将触发临时拒绝。每次成功授权均会追加记录至 `data/remote-auth/operations.jsonl`（须为普通文件）。
- 并发与长度限制：同一时间仅允许执行一个远程运维操作；单条远程指令消息总长度不得超过 `4096` 字符。
- 远程文件目录限制：远程下载与上传仅限 `data/remote/files` 目录内部的普通文件，指令中的路径为基于该目录的相对路径，禁止路径越界与符号链接。首次使用前请先在本机创建该目录：
  ```bash
  mkdir -p data/remote/files
  ```
- 常用聊天指令：
  1. 查询配对与开启状态：`#远程OTP状态` 或 `#远程2FA状态`
  2. 远程执行 Shell 命令：
     - 普通权限：`#远程spawn <6位OTP> bash printf hello`（或 `#spawn <6位OTP> bash printf hello`）
     - 管理员权限：`#远程管理员spawn <6位OTP> bash printf hello`（或 `#admin spawn <6位OTP> bash printf hello`，要求 `allow_admin: true` 且宿主进程已具备管理员权限）
  3. 远程文件传输：
     - 下载宿主文件：`#远程下载 <6位OTP> hello.txt`（需当前私聊会话支持发送文件）
     - 上传文件到宿主：`#远程上传 <6位OTP> hello.txt` 或 `#上传 <6位OTP> hello.txt`（须在同一条消息中附带可读附件，且文件大小不得超过聊天文件上限）
     - 强制覆盖上传：`#远程上传覆盖 <6位OTP> hello.txt`（即使 `allow_overwrite_upload` 为 `false` 也可覆盖同名文件）

# 定时任务管理

所有 Cron 表达式与时间窗口均以北京时间（`Asia/Shanghai`，UTC+8）为准。

如需了解配置文件的整体结构与基础字段，可参阅 [配置指南](/yunzai/docs/operator/configuration)；日常启停与托管命令请参阅 [运维指南](/yunzai/docs/operator/operations)。

## 一、宿主进程与消息派发日程（`config/bot.yaml`）

宿主级日程配置位于 `config/bot.yaml`，也可通过管理面板的“停启与更新调度”修改。除“推送宿主更新通知”相关字段保存后立即生效外，其余字段修改后均需重启宿主进程方可生效。

### 1. Cron 表达式格式要求
- 支持 5 段（分 时 日 月 周）或 6 段（秒 分 时 日 月 周）标准 Cron 表达式。
- 可填写单个字符串或字符串列表；在面板中每行填写一条，留空保存时会写入 `false`。
- 列表最多允许 64 条表达式，单条长度不得超过 160 个字符且不能包含换行符。

### 2. 自动更新（`update_time` / `update_cron`）
自动更新仅在托管启动模式（`bun run start` 或 `start:bg`）下生效。

- `update_time`：数字（单位：分钟），填 `0` 停用间隔更新。采用完成后再计时机制，即上一次更新执行完毕后，才开始下一轮倒计时。
- `update_cron`：5 段或 6 段 Cron 字符串、列表或 `false`。可与 `update_time` 同时启用。
- 默认注入与关闭规则：
  - 仅当 `config/bot.yaml` 中同时缺少 `update_time` 和 `update_cron` 两个字段时，系统才会自动注入默认规则 `update_cron: "0 30 0,12 * * *"`（每日 00:30 与 12:30 检查更新）。
  - 若单独配置了 `update_time: 0` 且未配置 `update_cron`，系统不会注入默认 Cron。
  - 若需彻底关闭自动更新，可同时显式配置：

```yaml
update_time: 0
update_cron: false
```

### 3. 更新通知（`update_notice` / `update_notice_cron`）
- `update_notice`：布尔值（`true` / `false`），控制是否定时检查宿主上游仓库并在有新提交时向主人发送通知。
- `update_notice_cron`：5 段或 6 段 Cron 字符串，定义检查并通知的时间点。上述两个字段在面板保存后立即生效，无需重启。

### 4. 定时重启（`restart_time` / `restart_cron`）
须确保宿主运行环境支持进程自重启。

- `restart_time`：数字（单位：分钟），宿主启动后延时指定分钟执行一次重启；填 `0` 停用。
- `restart_cron`：5 段或 6 段 Cron 字符串或列表，可与 `restart_time` 同时启用。若延时定时器与 6 段 Cron 在同一秒内同时触发，系统会自动合并为一次重启，避免重复执行。

### 5. 消息派发暂停与恢复（`stop_cron` / `start_cron`）
- `stop_cron`：5 段或 6 段 Cron 字符串或列表，到点后暂停消息派发。
- `start_cron`：5 段或 6 段 Cron 字符串或列表，到点后恢复消息派发。
- 注意事项：`stop_cron` 与 `start_cron` 仅控制消息派发开关，不会停止宿主进程，后台任务与管理面板仍保持运行。

## 二、自动签到日程（`config/global.yaml`）

自动签到调度配置位于 `config/global.yaml` 的顶层 `scheduler` 字段，也可在管理面板的“签到调度”中调整。

### 1. 开关与核心驱动任务
- `enable`：布尔值。设为 `false` 可停用自动签到调度。
- `plan_generate_cron`：生成明日签到计划的 Cron，默认在午夜执行（`"0 0 0 * * *"`）。
- `run_due_cron`：执行到期签到条目及运行逻辑的 Cron，默认每分钟执行一次（`"0 * * * * *"`）。
- `catch_up_cron`：补齐缺少的明日签到计划的 Cron，默认每 10 分钟检查一次（`"0 */10 * * * *"`）。

### 2. 调度模式与时间窗口
- `mode`：全局默认调度模式，可选 `"random"`（默认）或 `"fixed"`。
- `fixed_time`：`HH:mm` 格式字符串，默认 `"04:30"`。当模式为 `fixed` 时使用。
- `random`：随机窗口配置对象：
  - `window_start`：窗口开始时间（`HH:mm`），默认 `"00:00"`。
  - `window_end`：窗口结束时间（`HH:mm`），默认 `"23:30"`，不得早于 `window_start`。
  - `notify_before`：布尔值，是否在生成明日计划后发送计划通知，默认 `true`。
- `late_registration`：晚间补登记窗口配置对象：
  - `enable`：布尔值，是否允许晚间补登记，默认 `true`。
  - `window_start`：补登记开始时间（`HH:mm`），默认 `"23:30"`。
  - `window_end`：补登记结束时间（`HH:mm`），默认 `"23:59"`。
  - `notify`：布尔值，补登记后是否通知。

### 3. 配置示例
以下为 `config/global.yaml` 中 `scheduler` 的有效配置示例：

```yaml
scheduler:
  enable: true
  plan_generate_cron: "0 0 0 * * *"
  run_due_cron: "0 * * * * *"
  catch_up_cron: "0 */10 * * * *"
  mode: "random"
  fixed_time: "04:30"
  random:
    window_start: "00:00"
    window_end: "23:30"
    notify_before: true
  late_registration:
    enable: true
    window_start: "23:30"
    window_end: "23:59"
    notify: true
```

### 4. 全局模式与档案个人覆盖语义
用户档案文件中的 `schedule`（磁盘配置字段）可覆盖全局默认模式，优先级如下：
1. 若档案 `schedule.mode` 为 `"fixed"`，则强制按固定时间执行：优先使用档案自身的 `schedule.fixed_time`（`HH:mm`），未设置时回退至全局 `fixed_time`。
2. 若档案 `schedule.mode` 为 `"random"` 且 `schedule.allow_random` 不为 `false`，则按全局 `random` 窗口随机分配时间。
3. 其余情况（例如 `schedule.mode` 为 `"inherit"` 或未配置）均继承全局 `mode`。

## 三、图库同步与迁移后的运维时间表

### 1. 角色图库同步
角色图库默认按 `"0 0 1,13 * * *"`（每日 01:00 与 13:00）同步，并在宿主启动 60 秒后执行首次同步检查。若在 `config/global.yaml` 中将 `atlas.sync_character_gallery` 设为 `false`，则会跳过同步。

### 2. 迁移后的运维时间表
关于旧版本迁移的完整流程，请参阅 [迁移指南](/yunzai/docs/operator/migration)。在迁移阶段应用默认日程策略时，系统会明确写入宿主自动更新、图鉴更新校验以及网易云音乐合伙人日程配置，其余资源沿用系统基准默认日程（`Asia/Shanghai`）：

- 宿主更新（`config/bot.yaml`，迁移明确写入）：`update_time: 0`，`update_cron: "0 30 0,12 * * *"`（每日 00:30 与 12:30）
- 图鉴更新与校验（`atlas.auto_update.check_cron` / `challenge_cron`，迁移明确写入）：`0 30 1,13 * * *`（每日 01:30 与 13:30）
- 网易云音乐合伙人日程（`netease_partner.schedule`，迁移明确写入）：每日 01:30
- 角色图库（系统基准默认）：`0 0 1,13 * * *`（每日 01:00 与 13:00）
- 配队攻略（系统基准默认）：`0 0 2,14 * * *`（每日 02:00 与 14:00）
- 其他攻略（系统基准默认）：`0 0 5,17 * * *`（每日 05:00 与 17:00）

迁移过程中会保留原有的签到配置与计划记录，不会清空每日计划。对于已存在显式配置的实例，正常启动或更新宿主时不会覆盖管理员已设定的日程。

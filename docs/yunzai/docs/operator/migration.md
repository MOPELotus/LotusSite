# 迁移指南

本文面向部署管理员，说明如何将既有的旧版 Yunzai 实例迁移至独立部署的荷花云崽（Lotus-Yunzai）目录。迁移过程以只读方式读取旧目录，在目标同级父目录的私有暂存区完成转换后原子发布到新目录，不会修改或删除旧版安装目录。

## 目录与环境要求

### 旧安装源目录

- 源目录经 `realpath` 规范化后必须为存在的真实目录，且包含真实子目录 `plugins/`。
- 迁移前先停止旧端运行并制作完整备份，或直接使用完整快照副本作为源目录，避免读取期间配置文件或数据发生写入变化。

迁移旧插件时将排除 node_modules 依赖目录及 .git 历史与 worktree 元数据，保留依赖清单、代码、配置、业务数据和素材。

### 新安装目标目录

- 目标目录必须是全新的、独立于源目录的荷花云崽 Git 仓库根目录，主机需已安装 `git`（迁移命令会校验 `git rev-parse --show-toplevel` 与内置 `plugins/` 目录树）。
- 源目录与目标目录不能相同，也不能互相嵌套或包含。
- 目标目录与其同级父目录必须位于同一文件系统，不能跨分区或跨挂载点发布。
- 目标目录当前不能运行荷花云崽宿主或启动流程，且其下尚未存在 `config/`、`data/`、`backup/` 目录。因此迁移前不要提前运行完整的 `bun run init`。

## 迁移操作步骤

以下命令均在目标主机执行，第 3 步起在新的荷花云崽 Git 根目录下运行。

### 1. 停止旧端并完成备份

停止旧版 Yunzai 及相关后台进程，确认不再有脚本写入配置或数据文件。对旧安装根目录做完整目录备份或文件系统快照，记录旧根目录（或快照副本）的绝对路径。

### 2. 克隆新仓库并构建依赖

在独立路径克隆荷花云崽仓库并进入目录（环境要求参见[部署指南](/yunzai/docs/operator/deployment)）：

```bash
git clone https://github.com/MOPELotus/Lotus-Yunzai.git
cd Lotus-Yunzai
```

执行带 `--build-only` 参数的初始化命令，仅安装依赖并完成构建准备，不在目标目录写入 `config/` 或 `data/` 运行数据：

```bash
bun run init --build-only
```

### 3. 执行迁移预检

使用旧安装根目录的绝对路径运行预检命令（只读分析，不写入目标目录）：

```bash
bun run migrate:plan /绝对路径/旧Yunzai根目录
```

命令会在标准输出打印 JSON 格式的预检结果，重点核对：

- 源目录、目标目录与内置插件目录核对均无报错。
- `plugins` 数组中各旧插件的预检分类状态（内置替代、自动归档、保留、待审核或协议候选），提前评估需要人工接管或替换的插件。

### 4. 执行正式迁移

预检无误后，执行正式迁移：

```bash
bun run migrate /绝对路径/旧Yunzai根目录
```

命令会在目标目录同级父目录下创建私有事务暂存区，完成插件整理、配置转换与数据快照后，原子发布到目标目录的 `config/`、`data/`、`backup/` 及兼容的 `plugins/`，并在终端输出完整的 JSON 迁移报告（`report`）。

若需单独排查转换产物而不发布，可运行 `bun run migrate:stage /绝对路径/旧Yunzai根目录` 在目标同级父目录生成 `.{目标目录名}.lotus-migration-*` 临时目录。`bun run migrate` 不会接收该临时目录作为输入，日常迁移无需执行 `migrate:stage`。

### 5. 执行完整初始化

`bun run migrate` 成功返回后，运行完整初始化补齐新运行环境所需的其余配置：

```bash
bun run init
```

### 6. 核对迁移报告、备份与核心配置

结合第 4 步输出的 JSON 迁移报告以及目标目录 `backup/` 下的产物逐项核查：

1. 查看 `backup/plugins/`、`backup/held-plugins/` 以及报告中的 `heldPlugins`、`deferredPlugins`，确认归档、暂留及延后处理的插件。
2. 核对网络接入与鉴权配置，参见[网络配置](/yunzai/docs/operator/network)。
3. 核对主人权限以及被剥离备份的 `backup/core-config/other-provider-owners.yaml`，参见[配置指南](/yunzai/docs/operator/configuration)。
4. 核对定时日程与签到策略，参见[定时任务](/yunzai/docs/operator/schedules)。

### 7. 启动运行与旧目录留存

完成核查与补充设置后，按常规运维方式执行 `start` 启动荷花云崽（参见[运维指南](/yunzai/docs/operator/operations)）。迁移全程不修改旧安装目录，建议在新实例稳定运行一段时间后再自行归档或清理旧目录备份。

## 预检分类、报告与数据转换规则

### 1. 旧插件分类与备份位置

`migrate:plan` 与 `migrate` 会扫描旧目录 `plugins/` 下的子目录与 `.js` 脚本（符号链接及名称不合规路径不会自动迁入），按以下类别处理：

- `built-in`：与荷花云崽目标仓库内置目录同名且声明一致的插件，直接使用新系统内置模块，不从旧目录迁入。
- `archive`：已退役的旧宿主脚本、策略拒绝或已有内置替代模块的插件，迁移后归档至 `backup/plugins/`，不再加载。
- `retain`：判定结构兼容的独立插件或单文件脚本，迁入新目录的 `plugins/`。历史第三方插件在新宿主下的实际运行情况需在启动后自行验证。
- `heldPlugins` 与 `deferredPlugins`：涵盖状态为 `review`（需人工审核，如占用内置目录但身份不符、声明身份重复）、`scan-error`（读取失败或无法读取 Git 来源）以及 `protocol-candidate`（识别为旧协议适配器候选的插件）。暂留插件置于 `backup/held-plugins/`，其余延后项记录在报告的 `deferredPlugins` 中，需管理员人工排查或改用新网络接入架构。

### 2. 主人权限与核心配置筛选

迁移会合并读取旧安装 `config/default_config/` 与 `config/config/` 下的 `other.yaml` 和 `bot.yaml`（普通文件且无硬链接），写入新目录 `config/config/`。

主人权限字段按以下白名单规则过滤：

- `master`：仅保留终端身份 `"stdin:stdin"` 以及精确的 `"botID:userID"` 格式（双方均为正整数）。
- `masterQQ`：仅保留 `"stdin"` 以及正整数 QQ 号。

不符合上述格式的旧适配器主人条目会被剥离并保存至 `backup/core-config/other-provider-owners.yaml`，剥离数量记录在报告的 `coreConfig.deferredOwners` 中。迁移后参照[网络配置](/yunzai/docs/operator/network)与[配置指南](/yunzai/docs/operator/configuration)为对应接入端重新绑定主人。

### 3. 网络接入与群路由冷却

- 旧网络相关配置按 `headers-only` 规则完成转换，启动前请在[网络配置](/yunzai/docs/operator/network)中核对具体接入参数与鉴权方式。
- 对于迁移后的 `config/group.yaml`、`config/config/group.yaml` 及继承的旧群默认配置，所有适用群路由作用域（含 `default`）的 `groupCD` 与 `singleCD` 均会置为 `0`。如需限制触发频率，可在[配置指南](/yunzai/docs/operator/configuration)中按需重新配置。

### 4. 定时日程与签到保留

迁移将默认定时任务时区统一设置为 `Asia/Shanghai`，改写前的原配置文件会先备份到 `backup/migration-schedule/`：

- 更新任务：调整 `config/bot.yaml` 与 `config/config/bot.yaml`（若均不存在则在 `config/config/bot.yaml` 创建），重置 `update_time: 0` 并应用默认 `update_cron`。
- 图鉴与网易云音乐合伙人任务：调整 `config/global.yaml` 与 `config/config/global.yaml`（若均不存在则新建 `config/global.yaml`），更新 `netease_partner.schedule`；当源配置包含 `atlas` 字段或已完成图鉴初始化时，同时将 `atlas.auto_update.check_cron` 与 `challenge_cron` 设为 `0 30 1,13 * * *`。
- 报告基准时钟：迁移报告中的 `schedulePolicy.clocks` 列出 `update`、`characterGallery`（角色图库）、`atlas`（图鉴）、`teamGuides`（`0 0 2,14 * * *`）、`otherGuides`（`0 0 5,17 * * *`）与 `partner` 的默认基准时钟作为参考，这些时钟并非全部写入 `global.yaml`。
- 签到状态保留：迁移报告标记 `checkinPolicy: "preserved"`，完整保留原有的签到配置、计划与执行状态（包括防重复执行的 `done` 等标记），防止切换新实例当天重复签到。日程调整详见[定时任务](/yunzai/docs/operator/schedules)。

## 中断恢复与故障处理

### 1. 事务暂存与中断复用

执行 `bun run migrate` 时，系统会在目标目录同级父目录下生成私有事务目录 `.{目标目录名}.lotus-migration-prepared`（内含 `plan.json` 与 `payload/`）及锁文件 `.{目标目录名}.lotus-migration-prepared.sqlite`。

若因信号中断（`SIGINT`/`SIGTERM`）或环境异常导致迁移未完成，保留现场，不要手动删除事务目录、锁文件或内部文件。排除故障后，使用完全相同的源目录路径与目标目录路径重新运行 `bun run migrate /绝对路径/旧Yunzai根目录`，系统在校验规则版本、数据快照版本及路径一致后，会复用已准备的事务产物继续完成发布。

若发布已提交完成，再次以相同参数运行会校验完整性并安全返回 `already-published`。

### 2. 常见拒绝场景与处理

- 目标目录已存在运行数据或已发布过迁移：若提前运行过完整 `bun run init`，或目标目录已存在 `config/`、`data/`、`backup/`，迁移会拒绝覆盖。保留旧目录备份，重新克隆干净的目标目录后从第 2 步重新开始。
- 源目录变更或暂存规则版本过期：若暂存已生成但更换了源目录，或升级目标仓库后提示旧暂存的转换规则、数据快照或日程策略版本过期，系统会拒绝复用旧暂存且不会自动重建。此时请保留原暂存目录与旧安装目录备份，新建一个干净的目标目录重新准备迁移。
- 迁入的旧独立 UID 引用与签名归档保留原文件但已停用，不再作为默认账号选择或面板导出授权。迁移后可先通过 `#档案列表`、`#角色列表 档案2`（只读查看已迁入的历史角色目录）核对登录档案；如需切换，需在登录有效的前提下分别按游戏执行 `#切换档案2`（原神 `#`、星铁 `*`、绝区零 `%`）或 `#切换角色2 档案2`（校验登录与归属）。

# 配置说明

## 配置文件加载规则与优先级

系统配置文件默认存放在 `config/<name>.yaml`（现代路径），同时兼容旧版路径 `config/config/<name>.yaml`。

1. 整文件优先：当 `config/<name>.yaml` 存在时，系统直接读取该文件，不会与 `config/config/<name>.yaml` 进行自动深合并。
2. 避免空文件遮蔽：切勿在 `config/` 下创建或复制空的 `.yaml` 文件（例如空的 `config/bot.yaml` 或 `config/redis.yaml`）。空文件会被解析为空对象 `{}` 并直接遮蔽旧版配置，导致旧配置失效。
3. 全局配置继承（`global.yaml`）：`global.yaml` 支持从历史插件目录（`plugins/Lotus-Plugin/` 与 `plugins/Lotus-ReFactor/`）下的 `global.yaml` 继承配置段（包括 `atlas`、`scheduler`、`coin_shop`、`permissions`、`groups`、`music`、`bilibili`、`douyin`、`netease_partner`、`captcha`）。其中 `scheduler`、`permissions` 与 `groups.cleanup` 会与本地配置叠加合并；同时自动兼容旧版 `schedule`（cron 表达式转 `scheduler`）及 `permissionControl` / `permission_control`（转 `permissions`）。

## 主人（Master）配置与设置流程

主人权限配置保存在 `config/other.yaml`（或旧路径 `config/config/other.yaml`）的 `master` 字段中，无专用面板入口，需通过配置文件或命令维护。

### 初始化与格式要求

- 首次初始化：仅当有效 `other` 配置中不存在 `master` 字段时，系统才会自动写入 `master: ["stdin:stdin"]` 以授予本机终端权限。若文件中已存在 `master` 字段（包括空列表 `master: []`），系统将保留原配置，不会自动添加 `stdin:stdin`。
- 字段格式：`master` 必须为字符串或字符串列表，每项格式为 `"<机器人QQ>:<主人QQ>"`（双方均为正整数）或终端专用 `"stdin:stdin"`。禁止将 `stdin` 与数字账号混写。
- 兼容字段说明：`masterQQ` 仅作为历史兼容列表读取，不能代替 `master` 中的 `bot:user` 映射关系。

### 设置主人的三种方式

#### 1. 前台终端命令（推荐首次配置使用）

确保 `other.yaml` 中已包含 `stdin:stdin` 后，在前台终端执行：

```text
#设置主人 <机器人QQ> <申请人QQ>
```

`<机器人QQ>` 与 `<申请人QQ>` 必须为正整数，且两者不能相同。

#### 2. 私聊申请与验证码签发（新增其他主人）

当目标机器人已存在至少一位主人时，可通过私聊流程授权新主人（申请有效期为 5 分钟）：

1. 发起申请：申请人私聊已绑定的机器人发送 `#设置主人`，机器人将返回 8 位十六进制申请编号。
2. 签发验证码：该机器人现有的主人私聊同一机器人发送 `#设置主人验证码 <申请编号>`，机器人将返回 16 位十六进制验证码。
3. 完成验证：申请人私聊同一机器人发送 `#设置主人 <验证码>` 即可完成提权。

> 注意：若当前机器人尚未设置任何主人，私聊申请会被拒绝，无法自助提权，必须先通过本机终端或手动修改配置文件设置首位主人。

#### 3. 手动编辑 `config/other.yaml`

```yaml
master:
  - "stdin:stdin"
  - "123456789:987654321"
```

## Bot 运行设置

建议优先通过管理面板的「宿主运行」入口修改运行设置，面板会自动校验数据类型与取值范围，并防止并发修改冲突。如需手动编辑 `config/bot.yaml`，各字段说明如下：

| 字段 | 文件 | 面板入口 | 类型 | 可填值与单位 | 默认值与生效方式 |
| --- | --- | --- | --- | --- | --- |
| `imageRenderPreset` | `config/bot.yaml` | 宿主运行 | 字符串 | `"standard"`（标准）或 `"low"`（低配） | 默认 `"standard"`，重启宿主生效 |
| `log_level` | `config/bot.yaml` | 宿主运行 | 字符串 | `trace`、`debug`、`info`、`warn`、`fatal`、`mark`、`error`、`off` | 默认 `"info"`，开启 `file_watch` 时自动生效，否则重启宿主生效 |
| `log_length` | `config/bot.yaml` | 宿主运行 | 整数 | `1` ~ `32000`（字符） | 默认 `10000`，重启宿主生效 |
| `log_object` | `config/bot.yaml` | 宿主运行 | 布尔值 / 对象 / `null` | `false`、`true`、`null` 或对象（如 `{depth: 2, maxArrayLength: 20}`） | 默认 `null`，重启宿主生效 |
| `log_align` | `config/bot.yaml` | 宿主运行 | 字符串 | 最多 64 个字符，留空取消对齐 | 默认 `"Lotus-Yunzai"`，重启宿主生效 |
| `plugin_load_timeout` | `config/bot.yaml` | 宿主运行 | 数字 | 非负数（单位：秒） | 默认 `60`，重启宿主生效 |
| `/→#` | `config/bot.yaml` | 宿主运行 | 布尔值 | `true` / `false`（未定义时回退检查旧版 `config/config/bot.yaml`） | 开启 `file_watch` 时自动生效，否则重启宿主生效 |
| `cache_group_member` | `config/bot.yaml` | 宿主运行 | 布尔值 | `true` / `false` | 默认 `true`，重启宿主生效 |
| `msg_type_count` | `config/bot.yaml` | 宿主运行 | 布尔值 | `true` / `false` | 默认 `false`，重启宿主生效 |
| `file_watch` | `config/bot.yaml` | 宿主运行 | 布尔值 | `true` / `false` | 默认 `true`，重启宿主生效 |
| `online_msg_exp` | `config/bot.yaml` | 宿主运行 | 数字 | 非负数（单位：分钟，`0` 关闭上线通知） | 默认 `1440`，重启宿主生效 |
| `file_to_url_time` | `config/bot.yaml` | 宿主运行 | 数字 | 非负数，支持小数（单位：分钟，`0` 表示不随时间失效） | 默认 `1`，重启宿主生效 |
| `file_to_url_times` | `config/bot.yaml` | 宿主运行 | 整数或 `null` | 非负整数或 `null`（单位：次，`null` 不限次数，`0` 时默认策略生成的链接不可下载，HEAD 探测不计入） | 默认 `null`，重启宿主生效 |

### `config/bot.yaml` 有效示例

```yaml
imageRenderPreset: "standard"
log_level: "info"
log_length: 10000
log_object: null
log_align: "Lotus-Yunzai"
plugin_load_timeout: 60
"/→#": true
cache_group_member: true
msg_type_count: false
file_watch: true
online_msg_exp: 1440
file_to_url_time: 1
file_to_url_times: null
```

## Redis / Valkey 存储连接

`config/redis.yaml` 无专用面板入口，需通过配置文件修改。当未设置环境变量 `LOTUS_VALKEY_URL` 时，系统按以下规则读取存储连接：

1. 未创建 `redis.yaml`（现代路径 `config/redis.yaml` 与兼容路径 `config/config/redis.yaml` 均不存在）：系统自动启用内置托管的 Valkey 连接；若已有任一路径的 `redis.yaml`，系统均会读取并尊重已有配置。
2. 存在空的 `redis.yaml`：系统会按默认参数连接 `127.0.0.1:6379`（`db: 0`），不会回退到托管 Valkey。
3. 禁用 Redis 连接：必须在 `config/redis.yaml` 中显式设置 `enable: false`。

### 可配置字段

```yaml
enable: true
host: "127.0.0.1"   # 主机名或 IP 地址，默认 127.0.0.1
port: 6379          # 端口（1~65535；使用 socket 时可为 0），默认 6379
db: 0               # 数据库索引（非负整数），默认 0
username: ""        # 用户名（可选）
password: ""        # 密码（可选）
# socket: "/var/run/redis/redis.sock"  # Unix 套接字绝对路径（可选）
```

## 远程运维配置

远程运维配置（`config/remote.yaml`，面板入口：远程运维）涉及本机 TOTP 配对、允许执行的 Shell 列表及管理员入口权限，相关配置与操作说明请见 [运维说明](/yunzai/docs/operator/operations)。

## 验证码处理

`config/global.yaml` 顶层的 `captcha` 字段用于配置验证码识别与人工兜底策略。默认按 `local`、`ttocr`、`manual` 顺序尝试。

内置 `local` 识别器默认启用，所需模型文件存放在 `data/captcha/models`，在执行 `bun run init` 时自动下载并校验，无需额外部署独立的 Captcha HTTP 服务。

### 顶层配置

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enable` | boolean | `true` | 是否启用验证码处理 |
| `providers` | string[] | `["local", "ttocr", "manual"]` | 识别通道顺序，可选 `local`、`ttocr`、`manual` |
| `local` | object | `{}` | 内置本地识别配置 |
| `ttocr` | object | `{}` | 第三方 TTOCR 识别配置 |
| `manual` | object | `{}` | 人工辅助验证配置 |

### local 配置

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enable` | boolean | `true` | 是否启用内置本地识别 |
| `timeout_ms` | integer | `120000` | 单次识别超时时间（毫秒，范围 `1`~`600000`） |

### ttocr 配置

TTOCR 为可选第三方识别通道，仅当 `enable` 不为 `false` 且 `key` 填写有效值时生效。

| 字段 | 类型 | 默认值 / 示例 | 说明 |
| --- | --- | --- | --- |
| `enable` | boolean | 未显式禁用且 `key` 有效时启用 | 是否启用 TTOCR；未显式设为 `false` 且填写有效 `key` 时才启用 |
| `key` | string | `""` | TTOCR 平台密钥，需用户自行申请填写 |
| `api` | string | `http://api.ttocr.com/api/recognize` | 提交识别任务接口地址 |
| `resapi` | string | `http://api.ttocr.com/api/results` | 查询识别结果接口地址 |
| `itemid` | string | `"388"` | GeeTest v3 对应的项目 ID |
| `itemid_v4` | string | `"488"` | GeeTest v4 对应的项目 ID |
| `referer` | string | `https://webstatic.mihoyo.com/` | 提交给 TTOCR 请求表单的 `referer` 字段 |
| `timeout_ms` | integer | `60000` | 单次识别总超时时间（毫秒，范围 `1`~`600000`） |
| `poll_interval_ms` | integer | `2000` | 轮询结果间隔（毫秒，最小 `2000`，最大 `600000`） |

### manual 配置

| 字段 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enable` | boolean | `true` | 是否启用人工验证兜底 |

人工验证页面的对外访问地址与独立 GT 域名配置，见 [网络与代理配置](/yunzai/docs/operator/network)。

### 配置示例

以下示例仅启用内置 `local` 识别与 `manual` 人工兜底，并禁用 `ttocr`：

```yaml
captcha:
  enable: true
  providers:
    - local
    - manual
  local:
    enable: true
    timeout_ms: 120000
  ttocr:
    enable: false
    key: ""
    api: http://api.ttocr.com/api/recognize
    resapi: http://api.ttocr.com/api/results
    itemid: "388"
    itemid_v4: "488"
    referer: https://webstatic.mihoyo.com/
    timeout_ms: 60000
    poll_interval_ms: 2000
  manual:
    enable: true
```

如需启用 TTOCR，将 `ttocr.enable` 设为 `true`，在 `ttocr.key` 中填入自己的密钥，并在 `providers` 列表中加入 `ttocr`（例如 `["local", "ttocr", "manual"]`）。

## 禁用普通用户私聊

在 `config/other.yaml`（或旧路径 `config/config/other.yaml`）中设置 `disablePrivate: true` 后，普通用户在私聊中发送消息会被拦截，主人与 Milky 所有者会话不受限制。被拦截用户将收到 `disableMsg` 指定的固定提示（设为空字符串 `""` 时静默拦截；未配置时使用内置默认提示），同一用户重复触发提示有 10 秒冷却。

`disableAdopt` 用于配置按正则表达式放行的文本规则数组：未设置 `disableAdopt` 时默认放行包含 `stoken` 的消息；显式配置后则按该列表中的正则表达式匹配消息原文放行。

```yaml
disablePrivate: true
disableMsg: "请在群内使用机器人。"
disableAdopt:
  - "^#自定义放行$"
```

开启 `disablePrivate: true` 后，以下内置私聊入口与文件仍会按原规则放行：

- 帮助入口：系统帮助别名及 `#自动签到帮助`。
- 账号与历史入口：`#登录列表`、`#账号列表`、`#清除/删除登录/扫码登录/Cookie`、账号与体力/CK 帮助及历史兼容入口规则。
- 抽卡导入与链接入口：抽卡记录导入（`导入记录`、`导入记录json` 等）、星铁 `抽卡链接`、绝区零 `获取抽卡链接` / `抽卡链接` / `逐抽记录`，以及 `.txt`、`.xlsx`、`.json` 文件收发。
- 米游币商城网页入口：`#米游币商城`、`#米游币兑换`、`#米游社功能`（支持追加档案编号；未填档号时账号管理类命令默认使用档案 `1`，游戏命令按对应游戏默认档案处理）。
- 群管理协同：具备 Milky 入群审核权限时的 `#入群申请`、`#同意入群`、`#拒绝入群`。

### 群聊与私聊安全边界

- **米游币商城网页登录链接**：入口指令可在 `disablePrivate: true` 下放行，但生成的网页登录链接仅通过好友私聊发送，不会发送至群聊。
- **支持群聊的个人操作**：非匿名群聊中支持 `#扫码登录` / `#取消扫码登录`、设备绑定/解绑/取消、本人角色目录查看与切换（`roleCatalog` 可读历史已迁入目录，切换角色需校验当前登录与归属）、全服排名、游戏注册时间、档案列表/切换（按游戏分别保存默认档案）、星铁模拟宇宙/差分宇宙、原神生日画片与幽境群榜授权、绝区零国际服卡片与月报。上述群内个人回复默认在 `120` 秒后自动撤回（若原有回复设置了更短的正数撤回时间则保留更短值）。
- **群内设备原文保护与会话隔离**：成员在群内直接发送含设备字段的原文时，机器人会尝试立即撤回该成员消息；若缺少群管理撤回权限，则会回复提醒用户自行撤回。群内扫码与设备绑定会话绑定到当前机器人、当前群与发起人，不能跨群消费绑定窗口或取消原群扫码；幽境群榜授权也仅限在当前群内完成。
- **仅限好友私聊的敏感入口**：明文录入 Cookie 与云游戏 Token、绝区零 `#绝区零获取抽卡链接`（直接返回带完整 `authkey` 授权参数的链接）、移除游戏登录，以及所有面板文件导入导出和跨机器人数据交换仍仅限好友私聊，不可在群聊中使用。

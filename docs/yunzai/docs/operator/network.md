# 网络与代理配置

服务端的网络监听、协议接入路径、鉴权规则、管理面板安全配置、人工验证码域名、Milky 主动连接参数以及 HoYoLAB 出站代理均通过配置文件与环境变量协同控制。配置文件整体结构与环境变量加载方式请参阅[配置说明](/yunzai/docs/operator/configuration)，日常启停与运行维护请参阅[运维操作](/yunzai/docs/operator/operations)。

## 一、监听端口与协议入口

默认情况下，HTTP 服务与 OneBot v11 反向 WebSocket 服务共享同一监听地址 `0.0.0.0:2536`。配置来源于 `config/server.yaml` 与环境变量，工作进程初始化时会主动读取 `.env` 文件——即使父进程通过 `--no-env-file` 跳过了 dotenv 加载，`.env` 中的配置依然会在子工作进程中生效。

### 1.1 监听与地址配置项

- `LOTUS_LISTEN_HOST`（环境变量）：监听绑定地址，默认 `0.0.0.0`。
- `LOTUS_HTTP_PORT` / `server.port`：HTTP 服务端口，环境变量优先，合法范围为 `0`–`65535` 的整数。
- `LOTUS_ONEBOT_PORT` / `server.onebot_port`：OneBot v11 服务端口，环境变量优先。未单独指定时复用 HTTP 端口（默认 `2536`）。
- `server.onebot_enable`：布尔值。设为 `false` 可关闭 OneBot 监听；未关闭时默认端口继承顺序为 `LOTUS_ONEBOT_PORT` → `server.onebot_port` → HTTP 端口 → `2536`。
- `server.url`：通用对外访问的 HTTP(S) 绝对地址（不得包含认证信息、查询参数或 `#` 片段），仅用于生成对外地址，不是本地监听地址。需要调整本地绑定网卡时请使用 `LOTUS_LISTEN_HOST`。

### 1.2 OneBot v11 反向 WebSocket 接入

外部协议端以反向 WebSocket（Reverse Universal）方式接入时，需满足以下请求约定：

1. 连接路径：`/OneBotv11` 或 `/OneBotv11/`（同时兼容以 `/OneBotv11/` 开头的旧版多段路径 WebSocket 升级请求）。
2. 必需请求头：`X-Client-Role: universal`（不区分大小写，缺少或值不符将返回 `400`）。
3. 可选请求头：`X-Self-ID`（正整数机器人账号）。

非上述路径的 HTTP 请求将转由 HTTP 路由处理（包括状态检查接口 `GET/HEAD /status`）。

### 1.3 HTTPS 监听配置

在 `config/server.yaml` 的 `https` 节点下可启用原生 TLS 监听：

```yaml
https:
  key: /path/to/privkey.pem
  cert: /path/to/fullchain.pem
  port: 8443
  url: https://bot.example.com:8443
```

- `key` 与 `cert` 必须同时提供；仅填写其中一项会导致 HTTPS 配置报错并失效。
- 省略 `https.port` 时默认使用 `0`（由操作系统分配临时随机端口），并非 `443`；生产环境请显式指定固定端口。
- `https` 监听器会复用 HTTP（及已开启的 OneBot）鉴权请求头规则。

## 二、访问控制与令牌鉴权

服务端对 HTTP 路由与 OneBot 协议握手实施不同的访问控制策略。

### 2.1 内网免令牌边界与反代失效规则

对于 OneBot 协议握手，仅当同时满足以下条件时，请求才被视为可信直连内网请求，可在未传递鉴权请求头的情况下放行：

1. 对端真实 TCP 来源 IP 属于回环地址（`127.0.0.0/8`、`::1`）、RFC1918 私有网段（`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`）、链路本地地址（`169.254.0.0/16`、`fe80::/10`）或 IPv6 ULA（`fc00::/7`），含对应的 IPv4 映射 IPv6 地址。
2. 请求头中完全不包含 `Forwarded`、`X-Forwarded-For` 和 `X-Real-IP` 中的任意一个。
3. 客户端未携带任何服务端已配置的鉴权请求头。

只要请求经过 Nginx、Caddy 等反向代理并附带了 `Forwarded`、`X-Forwarded-For` 或 `X-Real-IP` 任一请求头，该连接即刻失去内网信任，无论代理本身是否位于本机或内网。当客户端显式发送了服务端已配置的某个鉴权请求头（例如 `Authorization`）时，即使来自直连内网也必须校验通过。

HTTP 路由不适用上述内网免令牌放行规则：

- 当服务端未配置任何对外能力（有效配置中均未设置 HTTP 鉴权头、`server.url`、`server.panel_url`、`server.captcha.url` 及 `https.url`，含对应环境变量覆盖）时，非直连内网的 HTTP 请求在最外层直接返回 `403`。
- `/status` 接口要求请求头与已配置的 HTTP 鉴权规则完全匹配，即使来自本机或内网，校验不通过也会返回 `401`。
- 公开文件、管理面板及人工验证码等路由各自使用独立的授权机制。

### 2.2 协议令牌配置与优先级

配置令牌时不得包含空白字符或空字符（`\0`）：

- `config/server.yaml` 的 `auth`：自定义请求头映射（键值对），同时作用于 HTTP 与 OneBot。
- `LOTUS_HTTP_TOKEN`（环境变量）：仅作用于 HTTP，自动生成 `Authorization: Bearer <token>` 要求，会覆盖 `server.auth` 中同名的 `Authorization` 项。
- `LOTUS_ONEBOT_TOKEN` 与 `server.onebot_token`：仅作用于 OneBot，自动生成 `Authorization: Bearer <token>` 要求。环境变量 `LOTUS_ONEBOT_TOKEN` 优先级高于 `server.onebot_token`。

## 三、管理面板与安全访问

管理面板提供运行状态与插件查看及管理接口（静态页面位于 `/panel/`，接口位于 `/panel/api/*`），其鉴权体系完全独立于协议端口。

### 3.1 独立令牌与会话校验

- 环境变量 `LOTUS_PANEL_TOKEN`：设置面板专用访问令牌。无论来源是公网、内网还是本机回环地址，所有 `/panel/api/status`、`/panel/api/plugins` 等面板 API 均不存在内网免密放行，必须通过以下两种方式之一完成认证：
  1. 携带请求头 `Authorization: Bearer <LOTUS_PANEL_TOKEN>`（不得将令牌放在 URL Query 参数中，服务端仅校验 `Authorization` 请求头）。
  2. 通过 Owner 会话 Cookie 认证。
- Owner 登录入口：拥有者可在聊天窗口向机器人发送指令 `#管理面板`（亦支持 `#配置面板`、`#面板管理`，`#` 前缀可省略），获取一次性 Owner 登录入口并建立浏览器会话。

### 3.2 面板公网地址与 HTTPS 要求

- `LOTUS_PANEL_PUBLIC_URL` / `server.panel_url`：独立配置面板对外访问基地址（与 `server.url` 互不影响），环境变量优先。系统会自动在其末尾拼接 `panel/` 路径。
- 协议限制：公网域名或公网 IP 必须使用 `https://`；仅当主机名为 `localhost` 或内网地址时才允许使用 `http://`。地址中不得包含用户名、密码、查询参数或 `#` 片段。
- 面板构建：访问 `/panel` 会自动 `308` 重定向至 `/panel/`。若提示面板尚未构建（HTTP `503`），请在项目根目录执行 `bun run build:panel` 后重试。

## 四、人工验证码与独立 GT 域名

人工验证码模块内置 `vendor/gt-manual`，直接挂载在宿主 HTTP 服务上，不运行独立的 Captcha API 进程。

### 4.1 外部基址与协议要求

- `LOTUS_CAPTCHA_PUBLIC_URL` / `server.captcha.url`：人工验证码节点的外部访问基址（例如 `https://gt.example.com`），环境变量优先。
- 该地址与 `server.panel_url` 相互独立，普通的 `server.url` 也不会自动替代人工验证码地址。
- 必须使用 `https://` 协议；仅当主机名为 `localhost`、`127.0.0.1` 或 `[::1]` 时允许使用 `http://`（其他内网 IP 不适用此例外）。
- 公开路由前缀固定为 `/captcha/manual`，配置 `LOTUS_CAPTCHA_PUBLIC_URL` 或 `server.captcha.url` 时仅支持填写域名根（如 `https://gt.example.com`），不要在末尾添加 `/captcha/manual` 或自定义路径前缀。

`config/server.yaml` 示例：

```yaml
port: 2536
onebot_token: "<请替换为你的令牌>"
panel_url: https://bot.example.com
captcha:
  url: https://gt.example.com
```

### 4.2 反向代理与路由边界

- 独立域名反向代理到宿主 HTTP 监听端口时，支持在反代层终结 TLS 并以纯 HTTP 转发至本地监听，但反代必须保留原始 `Host` 请求头与请求路径。服务端会校验请求的 `Host` 与配置基址的 host 是否一致，不一致将返回 `404`。
- 人工验证码仅对公网开放前端验证页面（`/captcha/manual/GTest/<id>`）、任务领取（`/captcha/manual/GTest/register/<id>`）、结果提交（`/captcha/manual/GTest/validate/<id>` 与 `/captcha/manual/GTest/fail/<id>`）及静态资源（`/captcha/manual/verify.js`、`/captcha/manual/verify.css`）。
- 内部任务注册与结果读取接口不对公网开放，每个验证链接均为短时一次性任务。

## 五、Milky 主动连接配置

与被动等待接入的 OneBot 反向 WebSocket 不同，Milky 适配器由机器人端主动连接外部 Milky 协议端，配置位于 `config/milky.yaml`。

### 5.1 基础连接与地址拼接

```yaml
enable: true
host: 127.0.0.1
port: 3000
prefix: ""
connection: ws
access_token: ""
http_timeout: 15
ws:
  reconnect_interval: 10
  heartbeat: 30
webhook:
  path: /milky
```

- `enable`：设为 `true`（或 `1`）启用；未设置、`false` 或 `0` 则禁用。
- `host` 与 `port`：目标协议端地址，默认为 `127.0.0.1` 和 `3000`。`host` 不可填写通配地址 `0.0.0.0` 或 `[::]`；支持直接在 `host` 中包含协议头与端口（如 `https://milky.example.com:8443`）。协议判定以显式指定的 scheme 优先（例如显式填写 `http://` 时即使端口为 `443` 也不会自动转为 `https`），其次再根据 `ssl: true` / `use_ssl: true` 或端口 `443` 切换为 HTTPS 与 WSS。
- `prefix`：可选路径前缀（默认空字符串，`/` 会标准化为空）。拼接后的 HTTP API 基地址为 `<http/https>://<host>:<port><prefix>/api/`，事件 WebSocket 地址为 `<ws/wss>://<host>:<port><prefix>/event`。
- `access_token`：可选鉴权令牌，仅允许可打印 ASCII 非空白字符。
- `http_timeout`：HTTP API 请求超时时间（单位：秒，默认 `15`）。

### 5.2 事件接收模式（`connection`）

- `ws`（默认）：主动连接 `<prefix>/event` WebSocket 接收事件。可通过 `ws.reconnect_interval`（重连间隔，单位秒，默认 `10`）与 `ws.heartbeat`（心跳间隔，单位秒，默认 `30`）调整连接保活参数。
- `webhook`：通过 HTTP POST 回调接收事件。`webhook.path` 默认为 `/milky`，需为合法的非保留路径，服务端会自动移除末尾斜杠并转为小写。

## 六、HoYoLAB 出站代理配置

在 `config/bot.yaml` 中可通过 `proxyAddress` 为 HoYoLAB 国际区接口配置出站 HTTP(S) 代理：

```yaml
proxyAddress: http://127.0.0.1:7890
```

- 格式要求：必须为 `http://` 或 `https://` 开头的根 URL，不能包含路径、查询参数或 `#` 片段。
- 作用范围：`proxyAddress` 不是全局代理，仅对代码内置的 HoYoLAB 国际区 API 域名（如 `passport-api-sg.hoyolab.com`、`bbs-api-os.hoyolab.com`、`sg-cg-api.hoyoverse.com` 等）生效。本地 Milky 连接、本地验证码及其他普通 HTTP 请求不受此配置影响。

## 七、反向代理部署核对顺序

如需将面板、人工验证码或协议端口通过反向代理暴露至公网，建议按以下顺序检查：

1. 在 `.env` 或系统环境中配置 `LOTUS_HTTP_TOKEN`、`LOTUS_ONEBOT_TOKEN`（如开启 OneBot）及 `LOTUS_PANEL_TOKEN`。
2. 保持服务监听在 `127.0.0.1:2536`（通过 `LOTUS_LISTEN_HOST=127.0.0.1` 收窄监听面），或在内网边界防火墙放行特定主机。
3. 反向代理层终结公网 TLS 证书，在 `LOTUS_PANEL_PUBLIC_URL` 与 `LOTUS_CAPTCHA_PUBLIC_URL` 中分别填写反代后的 `https://` 对外地址，保留 `Host` 请求头，并为 OneBot 与 Milky 对应的传输路径开启 WebSocket 升级透传。
4. 部署与系统迁移相关注意事项可继续参考[部署指南](/yunzai/docs/operator/deployment)与[迁移指南](/yunzai/docs/operator/migration)。

# 设备信息-profile 绑定

返回：[上一级](https://github.com/MOPELotus/Lotus-ReFactor/blob/main/docs/profile-login.md) / [文档目录](https://github.com/MOPELotus/Lotus-ReFactor/blob/main/docs/README.md) / [小功能索引](https://github.com/MOPELotus/Lotus-ReFactor/blob/main/docs/features/README.md)

## 本机使用说明

本页的设备绑定命令由荷花插件统一处理，使用 `#` 前缀；这项绑定会覆盖 ZZZ-Plugin 的同名入口。原神、星穹铁道和绝区零的常规指令前缀仍分别是 `#`、`*` 和 `%`。

本机器人不提供私聊。绑定流程可能要求提交设备 JSON，请勿在群里发送，联系荷花处理。

## 功能特性

- 每个 profile 独立保存设备信息，不会和其他 profile 共用或覆盖。
- 米游社社区签到、游戏签到 UA、绝区零更新面板等请求会自动使用对应 profile 的设备字段。
- 支持完整设备 JSON，也支持已有的 `device_id/device_fp`。
- 资料卡和设备信息页只展示脱敏内容。

## 指令用法

```text
#绑定设备[profile]
#绑定设备信息[profile] <设备信息>
#原神绑定设备[profile]
#星铁绑定设备[profile]
#绝区零绑定设备[profile]
#设备信息[profile]
```

## 变量说明

- `profile`：可选，Lotus 内部 profile 序号，范围 `1..255`；省略时使用 profile 1。
- `设备信息`：可选，完整设备 JSON 或包含 `device_id/device_fp` 的文本。省略时按交互提示继续绑定。

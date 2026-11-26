# 运维与开发概览

本部分面向机器人主人、部署运维人员与二次开发者，提供从安装部署、配置调整、日常维护到插件开发与多语言扩展的入口。如果您是普通群聊或私聊使用者，请前往 [用户指南](/yunzai/docs/user/index) 或从 [基础功能](/yunzai/docs/user/basics) 开始了解；项目整体介绍请查看 [项目 README](/yunzai/)。

## 部署与基础配置

- [安装与部署](/yunzai/docs/operator/deployment)：说明运行环境要求、依赖安装、初始化步骤以及首次启动流程。
- [配置说明](/yunzai/docs/operator/configuration)：介绍配置文件的生成方式、主人权限设置、基础运行参数及各项配置字段含义。
- [网络与代理配置](/yunzai/docs/operator/network)：说明网络请求超时、代理服务器设置以及外部服务连通性的配置方法。

## 日常运维与数据管理

- [运行与日常维护](/yunzai/docs/operator/operations)：涵盖服务启停、日志排查、运行状态检查及日常维护操作。
- [迁移指南](/yunzai/docs/operator/migration)：说明从旧版本升级时的数据备份、配置转换与目录迁移步骤。
- [定时任务管理](/yunzai/docs/operator/schedules)：介绍内置定时任务的查看、开关控制与执行周期管理方式。

## 开发与扩展

- [开发指南](/yunzai/docs/operator/development)：说明当前项目的源码结构、核心模块约定与本地开发调试方式。
- [插件开发](/yunzai/docs/operator/plugins)：介绍插件的目录规范、指令注册、事件处理及数据读写接口。
- [国际化与多语言](/yunzai/docs/operator/i18n)：项目默认仅预置简体中文语言资源；本文说明语言文件的组织格式，以及如何自行放入额外语言包。

## 推荐阅读顺序

- **首次部署**：依次阅读 [安装与部署](/yunzai/docs/operator/deployment)、[配置说明](/yunzai/docs/operator/configuration)，如有网络访问需求再参考 [网络与代理配置](/yunzai/docs/operator/network)。
- **版本升级**：先查看 [迁移指南](/yunzai/docs/operator/migration) 完成配置与数据适配，再结合 [运行与日常维护](/yunzai/docs/operator/operations) 恢复运行。
- **二次开发**：先通过 [开发指南](/yunzai/docs/operator/development) 了解整体结构，再根据需要查阅 [插件开发](/yunzai/docs/operator/plugins) 或 [国际化与多语言](/yunzai/docs/operator/i18n)。

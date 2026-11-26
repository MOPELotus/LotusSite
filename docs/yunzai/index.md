# Lotus-Yunzai

部署入口与环境要求见 [安装与部署](/yunzai/docs/operator/deployment)。

## 依赖

- Bun：需要 `1.4.4` 版本
- Git：用于拉取源码与子模块
- tar：Linux 默认托管下载 Valkey 时需要 `tar`，其他平台准备说明见 [安装与部署](/yunzai/docs/operator/deployment)
- 新装无需预先安装 Redis、PM2 或 Node.js；若环境中已有 Redis / Valkey 配置，会优先保留并使用

## 快速开始

```bash
git clone https://github.com/MOPELotus/Lotus-Yunzai.git
cd Lotus-Yunzai
bun run init
bun run start
```

`bun run init` 会处理子模块初始化与依赖安装；后台运行、日志查看与状态管理见 [运行与日常维护](/yunzai/docs/operator/operations)。

## 文档

- 用户指南：[用户指南概览](/yunzai/docs/user/index)
- 主人与开发者文档：[运维与开发概览](/yunzai/docs/operator/index)
- 迁移入口：[迁移指南](/yunzai/docs/operator/migration)

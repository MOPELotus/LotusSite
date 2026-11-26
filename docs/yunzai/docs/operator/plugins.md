# 插件开发

[返回运维与开发概览](/yunzai/docs/operator/index)

本文说明如何基于原生 TypeScript / Bun 规范开发插件，包括目录与清单配置、模块入口、命令注册、上下文权限、生命周期管理以及旧插件兼容边界。关于整体代码结构与本地调试，请参考 [开发指南](/yunzai/docs/operator/development) 与 [国际化与多语言](/yunzai/docs/operator/i18n)。

## 插件清单与入口配置

原生插件以独立目录形式存放，目录下需包含 `package.json`。插件加载器（见 [lib/plugins/metadata.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/lib/plugins/metadata.ts) 与 [lib/plugins/loader.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/lib/plugins/loader.ts)）通过 `package.json` 识别插件名称与入口文件。

以内置插件 [plugins/system/package.json](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/plugins/system/package.json) 为例：

```json
{
  "name": "@lotus-yunzai/system",
  "private": true,
  "type": "module",
  "lotusYunzai": {
    "entry": "./index.ts"
  }
}
```

关键字段说明：

- `name`：模块名称（小写规范化）。当指定了 `lotusYunzai.entry` 时，`name` 必须为非空字符串，否则元数据校验会抛出异常。
- `type`：建议设为 `"module"`。
- `lotusYunzai.entry`：原生插件入口文件路径，例如 `"./index.ts"`。

### 唯一性与目录约束

加载器在扫描插件时会对 `name` 与 Git 仓库标识进行去重校验：

- 若模块名已在命令系统中注册，或与已扫描插件的标识冲突，后续插件会被拒绝加载。
- 内置模块名与特定内置目录绑定；若外部目录使用了内置模块名但路径不匹配，也会被拒绝加载。

## 模块导出规范

入口文件优先导出 `createModule(services)` 工厂函数（支持 `async`）；若未导出 `createModule`，加载器会读取 `export default` 导出的模块对象。

```ts
export function createModule(services: { readonly signal: AbortSignal }) {
  return {
    commands: {},
    dispose() {},
  };
}
```

### 模块对象字段

依据 [lib/plugins/loader.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/lib/plugins/loader.ts) 与 [lib/commands.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/lib/commands.ts)，模块对象支持以下字段：

| 字段 | 必填 | 类型/签名 | 说明 |
| --- | --- | --- | --- |
| `commands` | 是 | `Record<string, CommandHandler>` | 命令名到处理器的映射，不能为数组或 `null` |
| `aliases` | 否 | `Record<string, string>` | 命令别名到规范命令名的映射 |
| `fallback` | 否 | `(message: string, context: MessageFallbackContext) => CommandReply \| undefined \| Promise<CommandReply \| undefined>` | 未命中显式命令时的消息兜底处理函数 |
| `fallbackFeatures` | 否 | `(context: MessageFallbackContext) => readonly string[] \| Promise<readonly string[]>` | 返回兜底匹配支持的功能名称列表 |
| `dispose` | 否 | `() => void \| Promise<void>` | 模块卸载或运行中止时的清理函数 |

### 命令处理器签名与回复格式

命令处理器签名为：

```ts
type CommandHandler = (
  argument: string,
  context: CommandContext,
) => CommandReply | Promise<CommandReply>;
```

其中 `argument` 是命令名称之后剩余的参数字符串，而不是完整的消息事件对象（event）。

命令处理器或 `fallback` 可以直接返回字符串或消息内容，也可以返回以下结构化对象（见 [lib/commands.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/lib/commands.ts)）：

- 引用回复：`{ type: "quoted", message, options? }`
- 带投递回调：`{ type: "delivery", message, onDelivered }`
- 定时撤回：`{ type: "recallable", message, seconds }`（`seconds` 为撤回延迟秒数）

若 `fallback` 返回 `undefined`，表示当前消息不归该模块处理，交由后续流程继续匹配。

## 服务注入与上下文权限

### `services` 注入边界

`createModule(services)` 接收的 `services` 为只读冻结对象，包含通用运行时服务（如 `signal`、`groups`、`fileToUrl`、`lockFile` 等）。

外部插件不能假定拥有内置模块专属服务。诸如 `groupServices`、`atlasUpdate`、`guidesSchedule`、`memeRuntime`、`mediaRuntime`、`noticeServices`、`roleQFace`、`hoyoTransport`、`zzzPanelRankRoles`、`zzzReminderRuntime` 等服务，仅在内置模块名与内置目录同时匹配时才会注入。

### 上下文权限校验

处理敏感操作或代理执行时，应使用当前可信上下文提供的能力字段，不信任消息 JSON 中自带的 `isMaster` 字段。

例如在 [plugins/execute/index.ts](https://github.com/MOPELotus/Lotus-Yunzai/blob/main/plugins/execute/index.ts) 中，执行批量代理前会校验可信上下文提供的 `canDelegate`、`delegationSignal`、`isDelegated` 以及 `message_type` 等状态：

```ts
if (isDelegated) return "已处于代理执行中，拒绝嵌套";
if (canDelegate !== true || !delegationSignal || message_type === "terminal") return;
```

## 生命周期与信号中止

1. 加载与注册：加载器导入入口文件并调用 `createModule(services)`，校验 `commands`、`aliases`、`fallbackFeatures`、`dispose` 的类型后，将模块注册到命令系统。
2. 运行中止感知：`services.signal` 为 `AbortSignal`。插件内部若有长耗时任务、轮询或定时器，建议创建独立的 `AbortController`（如 `lifetime`），通过 `AbortSignal.any([signal, lifetime.signal])` 合并信号。
3. 清理释放：在 `dispose()` 中调用 `lifetime.abort()` 并释放资源。若加载过程中 `signal` 已触发中止，加载器也会自动调用已注册的清理函数。

## 最小可运行示例

在插件目录下创建 `package.json` 与 `index.ts`，注册规范命令 `#示例` 并支持可选参数：

`package.json`：

```json
{
  "name": "@example/hello-plugin",
  "private": true,
  "type": "module",
  "lotusYunzai": {
    "entry": "./index.ts"
  }
}
```

`index.ts`：

```ts
export function createModule({ signal }: { readonly signal: AbortSignal }) {
  const lifetime = new AbortController();
  const taskSignal = AbortSignal.any([signal, lifetime.signal]);

  return {
    commands: {
      "#示例"(argument: string) {
        if (taskSignal.aborted) return "";
        const text = argument.trim();
        return text ? `收到参数：${text}` : "这是来自原生插件的示例回复。";
      },
    },
    dispose() {
      lifetime.abort();
    },
  };
}
```

## 旧插件兼容边界

- 运行环境：原生插件使用 TypeScript / Bun 编写并由加载器直接导入执行。
- 传统脚本扫描：若插件目录的 `package.json` 未声明 `lotusYunzai.entry`，加载器会尝试扫描传统脚本入口。
- 策略与退役拦截：加载器会对目录、仓库标识及脚本内容哈希进行校验。命中已退役脚本清单或策略限制的插件会被拒绝加载。
- 兼容限制：项目不保证任意旧版 Node.js 插件可直接兼容运行；新开发的插件应采用 `lotusYunzai.entry` 与 `createModule` 原生规范。

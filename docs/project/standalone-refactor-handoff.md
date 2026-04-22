# Standalone Refactor Handoff

这份文档是给后续继续接力开发的 AI / 工程师看的。目标不是介绍产品，而是帮助下一位维护者快速理解：

- 这个项目原来是什么
- 为什么要改
- 这次已经改了什么
- 当前代码的真实状态是什么
- 后面继续改的时候，哪些地方值得优先看，哪些地方要谨慎

---

## 1. 原项目背景

`clawd-on-desk` 原本是一个给 AI coding agent 配套使用的 Electron 桌面宠物。

原始定位：

- 桌面上显示一个像素风角色 Clawd
- 通过外部 agent 的 hook、plugin 或日志轮询感知工作状态
- 根据状态切换动画，例如 thinking、working、notification、sleeping 等

原本支持过的外部来源包括：

- Claude Code
- Codex CLI
- Cursor Agent
- Gemini CLI
- Copilot CLI
- CodeBuddy
- Kiro CLI
- opencode

原始核心架构可以概括为：

```text
外部 agent 事件
  -> hooks / plugin / log monitor
  -> HTTP /state 或 /permission
  -> src/server.js
  -> src/state.js
  -> IPC
  -> src/renderer.js
```

也就是说，原项目的动画驱动是“外部工具驱动”，不是“角色自主行为驱动”。

---

## 2. 本次改造目标

本次改造的方向是把项目从“AI coding agent 配套工具”改成“独立桌宠”。

核心目标：

- 去掉对外部 agent 的依赖
- 保留成熟的显示层、主题系统、睡眠/唤醒、Mini 模式、拖拽和互动机制
- 用内置的自主行为逻辑替代 hook / session / permission 驱动

简单理解：

```text
原来：外部 agent 决定 Clawd 做什么
现在：Clawd 自己决定什么时候做点什么
```

---

## 3. 本次已经完成的改造

### 3.1 运行时主链路改造

已新增：

- `src/autonomous-behavior.js`

它现在负责：

- 昼夜节律下的随机行为调度
- transient 行为播放
- 手动 tease
- 单击 happy
- DND 下的自动行为暂停

当前主链路：

```text
AutonomousBehavior / 用户点击 / 菜单交互
  -> src/main.js
  -> src/state.js
  -> IPC
  -> src/renderer.js
```

### 3.2 保留的核心能力

这些是刻意保留的：

- `src/renderer.js` 的眼睛跟随与资源切换逻辑
- `src/tick.js` 的鼠标轮询、idle 判定、Mini hover peek
- `src/state.js` 的状态机、sleep/wake、oneshot auto-return
- `src/mini.js` 的 Mini 模式与动画过渡
- 主题系统
- 拖拽和位置记忆

### 3.3 互动逻辑调整

已完成：

- 单击不再聚焦终端，而是触发 happy
- 双击 / 4 连击 reaction 保留
- 新增 `pet-single-click` IPC

涉及文件：

- `src/hit-renderer.js`
- `src/preload-hit.js`
- `src/main.js`

### 3.4 菜单改造

托盘菜单已改为独立桌宠版：

- 显示 / 隐藏
- 逗我玩
- Mini 模式
- 尺寸
- 勿扰模式
- 开机自启
- 退出

桌宠右键菜单已改为：

- 逗我玩
- Mini 模式
- Settings
- Quit

涉及文件：

- `src/menu.js`
- `src/i18n.js`

### 3.5 DND 语义改造

现在的 DND 是：

- 只暂停自主随机行为
- 不强制进入睡眠
- 不禁用点击、拖拽、Mini、手动 tease

为此改了：

- `src/state.js`
- `src/main.js`

### 3.6 设置面板清理

已经移除：

- Agents tab
- hook / bubble / session 相关入口

保留：

- 语言
- 尺寸
- 声音
- 开机自启
- 主题
- 动画覆盖
- 快捷键
- About

涉及文件：

- `src/settings-renderer.js`
- `src/settings-tab-general.js`
- `src/settings.html`
- `src/preload-settings.js`
- `src/settings-i18n.js`

### 3.7 偏好与打包清理

已经从持久化语义中移除：

- `manageClaudeHooksAutomatically`
- `autoStartWithClaude`
- `agents`
- `bubbleFollowPet`
- `hideBubbles`
- `showSessionId`

已经从打包配置中移除：

- `hooks/**/*`
- `agents/**/*`
- `extensions/**/*`

涉及文件：

- `src/prefs.js`
- `package.json`

### 3.8 已删除的旧模块 / 目录

这些已经不在仓库里：

- `hooks/`
- `agents/`
- `extensions/`
- `src/server.js`
- `src/permission.js`
- `src/focus.js`
- `src/agent-gate.js`
- `src/preload-bubble.js`
- `src/bubble.html`
- `src/settings-tab-agents.js`

---

## 4. 当前行为定义

### 4.1 默认行为

- 默认状态：`idle`
- idle 时眼睛跟随鼠标
- 60 秒无鼠标移动后进入原睡眠流程
- 鼠标移动后唤醒

### 4.2 自主行为

随机行为池复用现有状态：

- `attention`
- `thinking`
- `working`
- `sweeping`
- `carrying`

时段策略：

- 白天 / 工作时段：每 2 到 5 分钟随机一次
- 深夜 `23:00 - 06:00`：每 10 到 20 分钟随机一次

睡眠策略：

- sleeping / yawning / dozing / collapsing / waking 期间不触发随机行为

Mini 模式：

- tease 和自动行为只从 mini-safe 池选
- 当前 mini-safe 池：`attention`、`thinking`、`working`

### 4.3 点击行为

- 单击：happy，对应逻辑状态 `attention`
- 双击：沿用原 poke reaction
- 4 连击：沿用原 flail reaction

### 4.4 DND

- 只暂停随机行为
- 不屏蔽手动互动

---

## 5. 当前测试状态

当前测试已经改成“独立桌宠版”最小闭环：

- `test/autonomous-behavior.test.js`
- `test/menu-standalone.test.js`
- `test/package-build-config.test.js`
- `test/prefs-standalone.test.js`
- `test/shortcut-actions.test.js`
- `test/state-standalone.test.js`

当前 `npm test` 已通过。

注意：

- 这是偏“逻辑层”的测试
- GUI 行为仍需人工验证：
  - `npm start`
  - 睡眠 / 唤醒
  - Mini 模式
  - 拖拽
  - 托盘交互
  - 透明窗口表现

---

## 6. 当前代码结构建议阅读顺序

如果后续 AI 要继续接力，建议先按下面顺序读：

1. `AGENTS.md`
2. `README.md`
3. `src/autonomous-behavior.js`
4. `src/main.js`
5. `src/state.js`
6. `src/tick.js`
7. `src/menu.js`
8. `src/hit-renderer.js`
9. `src/renderer.js`
10. `src/prefs.js`

这样可以先理解“现在谁在驱动状态”，再看“状态如何渲染出来”。

---

## 7. 后续建议优先项

下面这些是比较适合后续继续做的方向。

### 7.1 文档继续收口

当前 README 和 handoff 文档已更新，但仓库里仍可能残留一些旧时代文档，例如：

- `docs/guides/state-mapping*.md`
- `docs/guides/known-limitations*.md`
- `docs/releases/*`

其中部分内容仍带有旧 agent/hook 语义，后续可继续同步。

### 7.2 main.js 继续瘦身

这次重点是先把功能链路切到独立版，并删掉旧入口。

`src/main.js` 现在虽然已经能工作，但仍有一些“从旧架构演进过来的残留变量、注释和空壳兼容层”。后续可以继续做一次更彻底的整理：

- 删掉完全无意义的旧 mirror cache
- 删掉旧注释
- 进一步拆分 autonomous behavior wiring

### 7.3 自主行为可继续增强

现在的自主行为是一个稳定可用的 v1：

- 有昼夜频率
- 有随机行为
- 有 DND 暂停
- 有手动 tease

后续可以继续加：

- 更丰富的时间感知策略
- 更细的状态概率控制
- 周末 / 工作日行为差异
- 天气 / 本地时间彩蛋

### 7.4 Settings 文案继续统一

当前设置页结构已是独立桌宠版，但部分细节文案仍可能保留旧思路的措辞痕迹。后续可以再做一轮文案 polish。

---

## 8. 开发时的高风险点

后续继续改时，建议特别注意这些点：

- `hitWin.focusable = true` 对 Windows 拖拽稳定性仍然关键
- `miniTransitioning` 期间不要引入新的并发位置更新
- `renderer.js` 里 SVG 的 `?_t=` cache-bust 不要删
- 继续通过状态机切换动画，不要在主进程直接操作 DOM
- 不要轻易动已经稳定的眼睛跟随和拖拽链路，除非任务明确要求

---

## 9. 当前版本一句话总结

当前仓库已经不是“AI coding agent 桌宠伴侣”，而是“保留原显示能力与主题系统的独立像素桌宠”。  
后续开发应围绕：

- 自主行为丰富化
- 代码结构继续瘦身
- 文档继续收口
- GUI 细节 polish

来推进，而不是再把 agent/hook 体系接回来。

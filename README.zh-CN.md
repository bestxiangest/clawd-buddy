# Clawd on Desk

Clawd on Desk 现在是一个**完全独立运行的 Electron 桌宠**。它不再依赖 Claude Code、Codex、Cursor、Gemini 等外部 agent 的 hook 或日志输入，而是用内置的自主行为逻辑驱动动画。

## 功能

- 像素风桌宠常驻桌面
- idle 状态眼睛跟随鼠标
- 60 秒无鼠标移动后进入睡眠，移动鼠标后唤醒
- 白天 2-5 分钟、深夜 10-20 分钟一次的随机自发行为
- 单击 happy，双击戳一戳，4 连击挣扎
- Mini 模式、拖拽、位置记忆、托盘菜单
- 内置 `Clawd` / `Calico` 两套主题，支持自定义主题

## 快速开始

```bash
npm install
npm start
```

现在不需要任何 hook、plugin 或外部 agent 配置。

## 交互

- 单击：开心动画
- 双击：戳一戳
- 快速 4 连击：挣扎反应
- 右键：逗我玩 / Mini 模式 / Settings / Quit
- 托盘：显示或隐藏 / 逗我玩 / Mini 模式 / 尺寸 / 勿扰模式 / 开机自启 / 退出

## 文档

- 安装与运行：[docs/guides/setup-guide.md](docs/guides/setup-guide.md)
- 运行时架构：[docs/project/agent-runtime-architecture.md](docs/project/agent-runtime-architecture.md)
- 状态映射：[docs/guides/state-mapping.md](docs/guides/state-mapping.md)
- 主题创建：[docs/guides/guide-theme-creation.md](docs/guides/guide-theme-creation.md)

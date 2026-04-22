# 安装与运行

[返回 README](../../README.zh-CN.md)

## 本地启动

```bash
npm install
npm start
```

Clawd 现在是独立桌宠版本，不再需要安装任何 hook，也不需要连接外部 agent。

## 构建

```bash
npm run build
npm run build:mac
npm run build:linux
```

## 行为概览

- idle：眼睛跟随鼠标
- sleep：60 秒无鼠标移动后进入睡眠序列
- wake：鼠标移动后惊醒
- 自主行为：白天 2-5 分钟一次，深夜 10-20 分钟一次
- 勿扰模式：只暂停自主随机行为，不影响点击、拖拽、Mini 和睡眠唤醒

## 交互

- 单击：开心
- 双击：戳一戳
- 4 连击：挣扎
- 右键：逗我玩 / Mini 模式 / Settings / Quit
- 托盘：显示或隐藏 / 逗我玩 / Mini 模式 / 尺寸 / 勿扰模式 / 开机自启 / 退出

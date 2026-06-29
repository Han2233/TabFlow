# TabFlow - 智能标签页管理工具

Chrome 扩展 + FastAPI 后端，帮助开发者高效管理浏览器标签页。

## 快速开始

```bash
cd extension
npm install
npm run dev    # 开发模式（热更新）
npm run build  # 生产构建
```

加载到 Chrome：
1. 打开 `chrome://extensions`，开启开发者模式
2. 点击"加载已解压的扩展程序" → 选择 `extension/dist` 目录

## 项目结构

```
tabflow/
├── extension/              # Chrome 扩展（React + TypeScript）
│   ├── src/
│   │   ├── background/     # Service Worker
│   │   ├── sidepanel/      # 侧边栏面板
│   │   ├── components/     # 共享组件
│   │   ├── store/          # Zustand 状态管理
│   │   ├── utils/          # 工具函数
│   │   ├── types/          # TypeScript 类型
│   │   └── manifest.json   # Manifest V3
│   └── public/icons/       # 扩展图标
├── backend/                # FastAPI 后端（Step 8 引入）
└── docs/
    ├── PRD.md              # 需求文档
    └── IMPLEMENTATION-PLAN.md  # 9 步增量实现计划
```

## 技术栈

- **扩展前端**: React 18 + TypeScript + Vite + CRXJS + Zustand + Tailwind CSS
- **后端**: Python FastAPI + SQLite（Step 8 引入）

## 文档

- [需求文档 (PRD)](docs/PRD.md) - 完整功能规格
- [增量实现计划](docs/IMPLEMENTATION-PLAN.md) - 9 步迭代计划，每步都可体验

## 当前进度

- [x] Step 1: 脚手架 + 侧边栏标签页列表
- [ ] Step 2: 域名自动分组 + 手动分组
- [ ] Step 3: 搜索 + 快捷键 + Popup
- [ ] Step 4: 工作区快照保存与恢复
- [ ] Step 5: 一键分窗口 + 时间视图
- [ ] Step 6: 重复检测 + 标签页休眠
- [ ] Step 7: 关闭历史 / 标签页回收站
- [ ] Step 8: 后端服务 + AI 智能分类
- [ ] Step 9: 体验打磨 + 完善

## 本地开发提示

如果你使用 Claude Code 本地版继续开发，可以直接在项目根目录下运行，
Claude Code 会读取 docs/ 中的 PRD 和实现计划来理解上下文。
推荐用法：
```bash
# 在项目根目录下启动 Claude Code
claude

# 然后告诉它继续下一步
> 继续实现 Step 2
```

# TabFlow - 智能标签页管理工具

面向开发者的 Chrome 扩展，通过 **AI 语义分析**、域名自动分组、一键分窗口、工作区快照等能力，帮你高效管理大量浏览器标签页。

## 核心功能

| 功能 | 说明 |
|------|------|
| 🤖 **AI 智能分组** | 调用 DeepSeek 按项目/需求语义自动分类，创建分组 + 生成匹配规则 |
| 🏷️ **域名分组** | 按域名自动归组（20 种颜色），支持手动创建/编辑/拖拽 |
| 🪟 **一键分窗口** | 每分组独立浏览器窗口（支持单组分窗 + 全量分窗） |
| 📸 **工作区快照** | 一键保存/恢复整套标签页布局 |
| 🔍 **标签页搜索** | 实时过滤标题/URL，关键词高亮，键盘导航 |
| ⏱️ **时间视图** | 按今天/昨天/本周/更早分组，一键清理 |
| 📋 **关闭历史** | 自动记录所有关闭的标签页，支持恢复（Service Worker 全局拦截） |
| 🔍 **重复检测** | 精确/忽略参数/忽略 hash 三种检测，一键合并 |
| 💤 **标签页休眠** | 超时自动挂起释放内存，白名单保护 |
| 🎨 **20 种分组颜色** | 蓝绿紫青橙青绿柠绿靛蓝琥珀玫红天蓝翠绿紫罗桃红岩灰锌灰 |

## 快速开始

```bash
cd extension
npm install
npm run build
```

加载到 Chrome：
1. 打开 `chrome://extensions`，开启开发者模式
2. 点击「加载已解压的扩展程序」→ 选择 `extension/dist` 目录
3. 点击工具栏 TabFlow 图标 → 侧边栏打开

### AI 整理配置

扩展直连 DeepSeek API，无需后端。打开侧边栏 → 点击底部 **🤖 AI整理** → 填写你的 [DeepSeek API Key](https://platform.deepseek.com/api_keys) 即可使用。

默认配置：
- API Base: `https://api.deepseek.com`
- Model: `deepseek-v4-flash`

AI 分类 Prompt 可在设置页自定义。

## 项目结构

```
tabflow/
├── extension/              # Chrome 扩展（React + TypeScript）
│   ├── src/
│   │   ├── background/     # Service Worker（休眠、历史、badge）
│   │   ├── sidepanel/      # 侧边栏主面板
│   │   ├── popup/          # Popup 快捷面板
│   │   ├── components/     # 共享组件（20+）
│   │   ├── store/          # Zustand 状态管理
│   │   ├── utils/          # 工具函数
│   │   ├── types/          # TypeScript 类型定义
│   │   └── manifest.json   # Manifest V3
│   └── public/icons/       # 扩展图标
└── docs/
    ├── PRD.md              # 需求文档
    └── IMPLEMENTATION-PLAN.md  # 增量实现计划
```

## 技术栈

- **扩展前端**: React 19 + TypeScript + Vite + CRXJS + Zustand + Tailwind CSS 4
- **AI**: 直连 DeepSeek API（OpenAI 兼容协议）
- **存储**: `chrome.storage.local`（持久化，关闭浏览器不丢失）

## 开发进度

| Step | 功能 | 状态 |
|------|------|------|
| Step 1 | 脚手架 + 标签页列表 | ✅ |
| Step 2 | 域名分组 + 手动分组 | ✅ |
| Step 3 | 搜索 + Popup | ✅ |
| Step 4 | 工作区快照 | ✅ |
| Step 5 | 分窗口 + 时间视图 | ✅ |
| Step 6 | 重复检测 + 休眠 | ✅ |
| Step 7 | 关闭历史 | ✅ |
| Step 8 | AI 智能分类 | ✅ |
| Step 9 | 体验打磨 | 🔜 |

## 文档

- [需求文档 (PRD)](docs/PRD.md)
- [增量实现计划](docs/IMPLEMENTATION-PLAN.md)
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

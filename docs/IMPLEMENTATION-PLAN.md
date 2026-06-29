# TabFlow 增量实现计划

## Context

根据已完成的 TabFlow PRD（`/home/admin/workspace/TabFlow-PRD.md`），需要将 V1 的 12 个功能模块拆分为多个可独立体验的增量版本。每个版本产出一个可安装、可使用的 Chrome 扩展，用户可以在每一步实际体验后再进入下一步迭代。

**技术栈**：Chrome Extension (Manifest V3) + React 18 + TypeScript + Vite (CRXJS) + Zustand + Tailwind CSS；后端 Python FastAPI + SQLite。

**项目结构**：
```
tabflow/
├── extension/                # Chrome 扩展前端
│   ├── src/
│   │   ├── background/       # Service Worker
│   │   ├── sidepanel/        # 侧边栏面板 (React)
│   │   ├── popup/            # Popup (React)
│   │   ├── components/       # 共享组件
│   │   ├── hooks/            # 自定义 hooks
│   │   ├── store/            # Zustand store
│   │   ├── utils/            # 工具函数
│   │   └── types/            # TypeScript 类型定义
│   ├── public/
│   │   └── manifest.json     # Manifest V3 配置
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/                  # FastAPI 后端（Step 7 引入）
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   └── schemas/
│   ├── requirements.txt
│   └── Dockerfile
└── README.md
```

---

## Step 1：脚手架 + 侧边栏展示所有标签页（可体验版本）

**目标**：搭建项目基础框架，实现一个能打开侧边栏、展示当前所有窗口和标签页列表的 Chrome 扩展。

**交付物**：安装后点击扩展图标可打开侧边栏，看到所有窗口的标签页树形列表，点击可跳转。

**具体任务**：
1. 初始化项目：`npm create vite`，配置 CRXJS 插件、TypeScript、Tailwind CSS
2. 编写 `manifest.json`（Manifest V3），声明 `side_panel`、`tabs`、`tabGroups`、`windows` 权限
3. 实现 Background Service Worker：
   - 监听扩展图标点击，打开 Side Panel
   - 监听 `chrome.tabs.onCreated/onRemoved/onUpdated/onMoved` 事件
4. 实现 Side Panel React 页面：
   - Zustand store：管理标签页列表状态
   - 树形列表组件：按窗口分组展示标签页（favicon + 标题 + URL）
   - 点击标签页 → `chrome.tabs.update(tabId, { active: true })` + `chrome.windows.update(windowId, { focused: true })`
   - 右键菜单：关闭标签页、复制 URL
   - 标签页数量统计显示
5. 加载到 Chrome 验证基本功能

**预计耗时**：3-4 天

---

## Step 2：域名自动分组 + 手动分组

**目标**：在 Step 1 的标签页列表基础上，增加按域名自动分组和用户手动创建分组的能力。

**交付物**：侧边栏中标签页按域名自动归组显示（带颜色标识），用户可以创建自定义分组、拖拽标签页到分组中。

**具体任务**：
1. 分组规则引擎（`utils/grouping.ts`）：
   - 内置默认规则：`*.aone.alibaba-inc.com` → Aone、`github.com` → 代码仓库、`localhost:*` → 本地开发 等
   - 规则匹配逻辑：URL 正则/通配符匹配 → 返回分组名 + 颜色
   - 用户自定义规则 CRUD，存储到 `chrome.storage.local`
2. 手动分组管理：
   - 创建/编辑/删除分组（名称 + 颜色选择）
   - 分组备注功能（可添加需求 ID、链接等）
3. 拖拽交互（使用 `@dnd-kit/core`）：
   - 标签页拖拽到分组
   - 标签页跨分组移动
   - 分组排序
4. 与 Chrome 原生 Tab Groups 同步：
   - 创建分组时调用 `chrome.tabs.group()` + `chrome.tabGroups.update()` 设置颜色和标题
   - 监听 `chrome.tabGroups.onUpdated` 保持双向同步
5. 分组视图切换：分组视图 / 全部视图
6. 分组折叠/展开状态持久化

**预计耗时**：5-6 天

---

## Step 3：标签页搜索 + 快捷键

**目标**：增加全局搜索能力和快捷键支持，提升日常操作效率。

**交付物**：`Ctrl+Shift+F` 唤起搜索，输入关键词实时过滤标签页并跳转；其他常用快捷键可用。

**具体任务**：
1. 搜索组件（`components/SearchBar.tsx`）：
   - 侧边栏顶部搜索框，输入即过滤
   - 匹配范围：标题 + URL，关键词高亮
   - 搜索结果显示分组归属
   - 点击搜索结果跳转到对应标签页
2. 快捷键注册（`manifest.json` commands）：
   - `Ctrl+Shift+F`：聚焦搜索框（如果侧边栏已打开）或打开侧边栏并聚焦搜索
   - `Ctrl+Shift+G`：打开/关闭侧边栏
3. Popup 快捷操作页面：
   - 快速搜索栏
   - 标签页/分组数量概览
   - 打开侧边栏按钮

**预计耗时**：2-3 天

---

## Step 4：工作区快照保存与恢复

**目标**：支持将当前标签页布局保存为快照，后续一键恢复。

**交付物**：侧边栏底部"保存快照"按钮，保存后可在快照列表中查看和恢复。

**具体任务**：
1. 快照数据模型（`types/snapshot.ts`）：
   - 快照名称、创建时间、窗口列表、每个窗口的标签页 URL + 分组信息
2. 快照 Store（`store/snapshotStore.ts`）：
   - 保存当前所有窗口+标签页+分组为快照
   - 持久化到 `chrome.storage.local`
   - CRUD 操作
3. 快照管理 UI：
   - 保存快照弹窗（输入名称）
   - 快照列表页面（搜索、排序、编辑、删除）
   - `Ctrl+Shift+S` 快速保存
4. 快照恢复：
   - "在新窗口恢复" / "替换当前窗口" 两种模式
   - 恢复时跳过已打开的相同 URL
   - 支持部分恢复（选择恢复部分分组）

**预计耗时**：3-4 天

---

## Step 5：一键分窗口 + 时间视图

**目标**：按分组自动创建多个浏览器窗口；增加按时间维度查看标签页的视图。

**交付物**：点击"分窗口"按钮，每个分组自动分配到独立窗口；侧边栏可切换到时间视图查看标签页。

**具体任务**：
1. 分窗口功能（`utils/windowSplit.ts`）：
   - 遍历所有分组，每个分组调用 `chrome.windows.create()` 创建窗口
   - 将分组内标签页 `chrome.tabs.move()` 到对应窗口
   - 支持选择性分窗（勾选要分出去的分组）
   - 原窗口处理选项：保留 / 关闭
   - 自动为新窗口中的标签页创建 Chrome Tab Group 并设置颜色
2. 时间维度视图：
   - 记录标签页打开时间（`chrome.tabs.onCreated` 监听并存储）
   - 按"今天"、"昨天"、"本周"、"更早"分组展示
   - 一键关闭某个时间段的所有标签页
3. 侧边栏视图切换 Tab：分组 / 时间 / 全部

**预计耗时**：3-4 天

---

## Step 6：重复检测 + 标签页休眠

**目标**：自动发现重复标签页并提示合并；长时间未访问的标签页自动休眠释放内存。

**交付物**：扩展图标角标提示重复标签页数量；休眠标签页灰色展示，点击自动唤醒；设置页可配置休眠时间和白名单。

**具体任务**：
1. 重复检测（`utils/duplicateDetector.ts`）：
   - 检测维度：完全相同 URL / 忽略参数后相同 / 同页面不同锚点
   - 后台定期扫描（可配置间隔，默认 5 分钟）+ 新标签页打开时即时检测
   - 扩展图标 badge 显示重复数量
   - 重复列表 UI：展示重复组，用户选择保留哪个
   - 一键合并（保留最近访问的）
2. 标签页休眠（`background/hibernation.ts`）：
   - 追踪标签页最后访问时间（`chrome.tabs.onActivated`）
   - 超时自动休眠：`chrome.tabs.discard(tabId)`
   - 默认 30 分钟，用户可配置
   - 白名单：特定域名不自动休眠
   - 侧边栏中休眠标签页灰色图标 + 💤 标识
   - 点击休眠标签页 → `chrome.tabs.update` 自动 reload
   - 内存节省统计显示
3. 设置页面（`sidepanel/Settings.tsx`）：
   - 休眠超时时间配置
   - 休眠白名单管理
   - 重复检测开关和检测维度选择
   - 域名分组规则管理（从 Step 2 迁移到此处统一管理）

**预计耗时**：4-5 天

---

## Step 7：关闭历史 / 标签页回收站

**目标**：自动记录所有关闭的标签页，保留可配置时长，支持多种方式恢复。

**交付物**：侧边栏新增"历史"视图，展示关闭历史，支持单个/按组/按时间段恢复。

**具体任务**：
1. 关闭历史记录（`background/closeHistory.ts`）：
   - 监听 `chrome.tabs.onRemoved`，记录关闭的标签页信息（URL、标题、favicon、关闭时间、来源分组）
   - 监听 `chrome.windows.onRemoved`，记录整个窗口关闭的标签页批次
   - 批量关闭（如关闭分组）聚合为一条记录，包含所有标签页明细
   - 持久化到 `chrome.storage.local`
2. 自动清理与存储管理：
   - 可配置保留时长：7 / 14 / 30 / 90 天 / 永久，默认 30 天
   - 最大记录条数限制（默认 5000），超出自动清理最早记录
   - 后台定时清理过期记录
3. 恢复功能：
   - 单个恢复：点击历史记录中的标签页重新打开
   - 按组恢复：如果是整个分组/窗口被关闭的，一键恢复整组
   - 按时间段恢复：选择时间点，恢复该时间之后关闭的所有标签页
   - 恢复时自动跳过当前已打开的相同 URL
4. 历史视图 UI：
   - 侧边栏新增"历史" Tab
   - 按时间倒序排列，聚合显示批量关闭记录
   - 搜索和筛选（关键词、分组、时间范围）
   - 手动清空历史按钮
5. 设置页面扩展：关闭历史保留时长、最大条数配置

**预计耗时**：4-5 天

---

## Step 8：后端服务 + AI 智能分类

**目标**：搭建 FastAPI 后端服务，实现 AI 驱动的标签页智能分类。

**交付物**：侧边栏"AI 整理"按钮可用，点击后 AI 分析所有未分组标签页并推荐分组方案，用户预览确认后应用。

**具体任务**：
1. 后端项目初始化：
   - FastAPI 项目结构、SQLite 数据库、SQLAlchemy 模型
   - Docker 部署配置
   - CORS 配置（允许 Chrome 扩展请求）
2. AI 分类接口（`POST /api/v1/classify`）：
   - 接收标签页列表（标题 + URL + 域名）和用户已有分组信息
   - Prompt Engineering：设计分类提示词，指导大模型输出结构化分组建议
   - 调用通义千问 / Claude API
   - 返回分组建议（分组名 + 标签页归属 + 置信度）
3. 分类反馈接口（`POST /api/v1/classify/feedback`）：
   - 接收用户对分类结果的反馈（正确/错误/修改后的分组）
   - 存储反馈数据，用于后续优化提示词
4. 规则管理接口：用户自定义分组规则的 CRUD API
5. 扩展前端 AI 分类交互：
   - "AI 整理"按钮 + `Ctrl+Shift+A` 快捷键
   - 分类中 loading 状态
   - 分类结果预览页面：展示 AI 建议的分组方案，标签页可拖拽调整
   - 确认应用 / 取消 / 部分应用
6. 后端连接配置：扩展设置中可配置后端服务地址（默认 `http://localhost:8000`）

**预计耗时**：5-6 天

---

## Step 9：体验打磨 + 完善

**目标**：优化整体体验，补齐细节，达到 V1 正式发布质量。

**交付物**：完整可用的 TabFlow V1，所有功能流畅可用，新手引导完备。

**具体任务**：
1. 新手引导：首次安装后的功能引导教程（使用步骤提示）
2. 全局撤销（Ctrl+Z）：关闭标签页、移动分组等操作支持撤销
3. 性能优化：
   - 大量标签页时的虚拟滚动（`react-virtuoso`）
   - Service Worker 事件去抖防抖
   - `chrome.storage.local` 读写优化（批量操作合并）
4. 快捷键自定义：设置页面支持修改快捷键绑定
5. UI 打磨：
   - 深色/浅色主题跟随系统
   - 动画过渡效果
   - 空状态提示
   - 响应式布局适配不同侧边栏宽度
6. 错误处理和边界情况：
   - 网络断开时 AI 分类的降级提示
   - storage 容量接近上限时的提醒
   - 扩展更新后的数据迁移兼容
7. 最终测试和 Bug 修复

**预计耗时**：4-5 天

---

## 版本总览

| 版本 | 核心能力 | 可体验点 | 状态 | 累计耗时 |
|------|---------|---------|------|---------|
| Step 1 | 脚手架 + 标签页列表 | 侧边栏看到所有标签页，点击跳转 | ✅ 完成 | ~4 天 |
| Step 2 | 域名分组 + 手动分组 | 标签页自动按网站归组，可自建分组拖拽管理 | ✅ 完成 | ~10 天 |
| Step 3 | 搜索 + Popup | 侧边栏/Popup 搜索定位标签页 | ✅ 完成 | ~13 天 |
| Step 4 | 工作区快照 | 一键保存/恢复整套标签页布局 | ✅ 完成 | ~17 天 |
| Step 5 | 分窗口 + 时间视图 | 按分组自动拆分到多个窗口 | ✅ 完成 | ~21 天 |
| Step 6 | 重复检测 + 休眠 | 自动发现重复标签页，释放内存 | ✅ 完成 | ~26 天 |
| Step 7 | 关闭历史回收站 + 软关闭 | 关闭后灰色暂留可撤销，历史记录可恢复 | ✅ 完成 | ~31 天 |
| Step 8 | 后端 + AI 分类 | AI 按需求/任务智能分组，可创建新分组 | ✅ 完成 | ~37 天 |
| Step 9 | 体验打磨 | 引导、撤销、主题、性能优化 | 🔜 进行中 | ~42 天 |

**总计约 8-9 周**，每个 Step 完成后都是一个可安装体验的完整版本。

## 验证方式

每个 Step 完成后：
1. `npm run build` 构建扩展
2. Chrome → `chrome://extensions` → 开启开发者模式 → 加载已解压的扩展（`extension/dist` 目录）
3. 按该 Step 的"可体验点"进行功能验证
4. Step 8 额外需要：`cd backend && docker compose up` 启动后端服务后验证 AI 分类

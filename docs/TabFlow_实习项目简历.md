# TabFlow - 智能标签页管理器

> **一句话定位**：基于 React + TypeScript 的 Chrome 扩展，集成 LLM 实现标签页语义分组、工作区管理、内存优化等 10 项核心能力
> **代码规模**：约 3,200 行 TypeScript/TSX，涉及 29 个源文件 + 5 个 Zustand Store
> **技术栈**：React 19 + TypeScript + Vite + CRXJS + Zustand + Tailwind CSS + DeepSeek API
> **难度评级**：⭐⭐⭐⭐（4/5）

---

## 一、功能介绍

TabFlow 是一款面向开发者的 Chrome 浏览器扩展，解决日常开发中同时打开 30+ 标签页导致的**标签栏拥挤、上下文切换困难、内存消耗大**等痛点。

系统通过 **AI 语义分析**自动将标签页按「项目/需求/任务」维度分组，支持一键将分组拆分为独立浏览器窗口、保存/恢复工作区快照、检测重复标签页、超时自动休眠等功能。存储基于 `chrome.storage.local`，关闭浏览器数据不丢失。

核心能力：
- 🤖 **AI 语义分组**：调用 DeepSeek LLM，基于标签页标题+URL 推断所属项目，自动生成分组名 + 域名匹配规则
- 🏷️ **规则引擎分组**：支持域名/正则两种匹配模式，内置 4 组默认规则，支持 20 种颜色标识
- 🪟 **多窗口管理**：支持单组分窗和一键全量分窗，500ms 间隔防 Chrome 限流
- 📸 **工作区快照**：保存/恢复完整标签页布局，恢复时自动跳过已打开 URL
- 💤 **标签页休眠**：默认 30 分钟无访问自动 discard，白名单保护，每分钟轮询检查

## 二、核心亮点

1. **LLM 驱动的语义分组**：Prompt Engineering 引导 DeepSeek 按项目/需求维度分组，AI 同时输出分组名 + 域名匹配规则 + 分类理由，Prompt 可在设置页实时编辑
2. **规则引擎支持 URL 路径匹配**：域名匹配不仅比对 hostname，还支持路径前缀匹配（如 `aone.alibaba-inc.com/unite/micro/publish`），解决企业内网多子系统共用域名的场景
3. **多策略重复检测**：三阶段检测——精确 URL 匹配 → 忽略查询参数 → 忽略 hash 锚点，使用去重 Set 避免同一 tab 出现在多个重复组
4. **Service Worker 全局关闭历史拦截**：`chrome.tabs.onRemoved` 统一记录，tab 元信息持久化到 `chrome.storage.local`（非内存 Map），Service Worker 重启不丢失
5. **分窗口 Chrome 限流保护**：`chrome.windows.create({ url: urls })` 直接传数组，窗口间 500ms 间隔，替换模式先关所有窗口再创建
6. **Zustand Store 分层设计**：tabStore（标签页状态）、groupStore（分组 CRUD + 持久化）、snapshotStore（快照管理）、closeHistoryStore（历史记录），各 Store 独立管理 `chrome.storage.local` 键空间
7. **配置外置可编辑**：AI Prompt、休眠超时、白名单等均在设置页实时修改，`chrome.storage.local` 即时持久化，扩展重启生效

## 三、代码结构

```
extension/src/
├── background/index.ts           # Service Worker（128行）
│   ├── tabs.onRemoved → 记录关闭历史（storage 持久化）
│   ├── tabs.onActivated/onUpdated → 追踪活跃时间
│   ├── setInterval → 每分钟休眠检查 + 5分钟重复badge
│   └── tabs.onCreated/onUpdated → 标签页元信息追踪
├── sidepanel/SidePanel.tsx       # 侧边栏主面板（318行）
│   ├── 4 视图切换：分组/时间/历史/全部
│   ├── Zustand Store 统一状态管理
│   └── 拖拽分配 + 关闭回调链
├── components/
│   ├── AIClassify.tsx            # AI 分类面板（221行）
│   ├── GroupSection.tsx          # 分组展示 + 单组分窗（122行）
│   ├── GroupManager.tsx          # 分组 CRUD 管理（288行）
│   ├── SearchBar.tsx             # 实时搜索 + 键盘导航（179行）
│   ├── SnapshotManager.tsx       # 快照保存/恢复（272行）
│   ├── SplitWindows.tsx          # 一键分窗口（107行）
│   ├── TimeView.tsx              # 时间维度视图（117行）
│   ├── DuplicatePanel.tsx        # 重复检测面板（85行）
│   ├── HistoryView.tsx           # 关闭历史（101行）
│   ├── Settings.tsx              # 设置页（160行）
│   ├── TabItem.tsx               # 标签页条目（104行）
│   └── WindowGroup.tsx           # 窗口分组（52行）
├── store/                         # Zustand Store（428行总计）
│   ├── tabStore.ts               # 标签页列表
│   ├── groupStore.ts             # 分组 CRUD + 手动分配
│   ├── snapshotStore.ts          # 快照管理
│   └── closeHistoryStore.ts      # 关闭历史 + 配置
├── utils/                         # 工具函数（537行总计）
│   ├── grouping.ts               # 规则引擎（209行）
│   ├── windowSplit.ts            # 分窗口 + 时间追踪（90行）
│   ├── duplicateDetector.ts      # 重复检测 + 休眠配置（134行）
│   └── tabs.ts                   # Chrome Tabs API 封装（41行）
├── types/
│   ├── tab.ts                    # 核心类型 + 20色定义（72行）
│   └── snapshot.ts               # 快照类型（22行）
├── popup/Popup.tsx               # Popup 面板（132行）
└── manifest.json                 # Manifest V3 配置
```

## 四、核心技术栈与实现细节

### 4.1 AI 语义分组（AIClassify.tsx）

- **入口**：`AIClassify.handleClassify()` — 用户点击「🤖 分析」触发
- **流程**：
  1. 收集所有标签页的 `{id, title, url}` → 拼接为文本列表
  2. 读取用户自定义 Prompt（`DEFAULT_PROMPT` 或 `chrome.storage` 中保存的版本）
  3. 直连 `{apiBase}/v1/chat/completions`，Bearer Token 认证
  4. 解析 JSON 响应 → 预览分组结果
  5. 用户确认 → `handleApply()`：清空旧分组 → 按 AI 结果创建新分组 + 域名规则 + 手动分配 + 20 色轮转选色
- **设计决策**：
  - **直连而非后端中转**：Chrome 侧边栏有独立 JS 上下文，`fetch` 可直发 HTTPS 请求，砍掉后端减少部署复杂度
  - **Prompt 可配置**：导出 `DEFAULT_PROMPT` 常量供设置页读取，修改后失焦自动保存到 `chrome.storage.local`
  - **规则生成由 AI 完成**：不让前端统计域名频率，AI 理解分组语义后生成的规则更精准（如区分 `aone.alibaba-inc.com/unite/micro/publish` 和 `aone.alibaba-inc.com/unite/micro/cr`）
- **防御性机制**：
  - API Key 为空时提示而非发请求
  - `response_format: { type: "json_object" }` 约束 AI 输出格式
  - JSON 解析失败 → 捕获异常并显示错误提示
  - 空分组时跳过（`if (!newGroup) continue`）

### 4.2 规则匹配引擎（grouping.ts）

- **入口**：`groupTabs()` → `classifyTab()` → `matchRule()`
- **匹配优先级**：手动分配 > 自定义分组规则 > 内置默认规则
- **domain 规则支持路径**：`matchRule()` 将规则拆分为 hostname + path，先匹配域名，再检查 URL 路径是否以规则路径开头（`startsWith`）
- **通配符匹配**：`*.alibaba-inc.com` → 主机名以 `.alibaba-inc.com` 结尾
- **包含匹配**：不含 `.` 的规则（如 `confluence`）→ 主机名包含该关键词
- **设计决策**：正则规则虽支持但 domain 规则更直观，AI 生成规则时优先使用 domain 类型

### 4.3 多策略重复检测（duplicateDetector.ts）

- **三阶段检测**：
  1. 精确匹配：`normalize(url)` 完全相同
  2. 忽略参数：`stripQuery()` 去掉 `?key=value`
  3. 忽略 hash：`stripHash()` 去掉 `#anchor`
- **去重机制**：`handled Set<number>` 避免同一 tab 出现在多个重复组中，优先展示精确匹配
- **合并逻辑**：`mergeDuplicates()` 保留第一个标签页，`chrome.tabs.remove()` 批量关闭其余，自动激活保留页

### 4.4 Service Worker 关闭历史（background/index.ts）

- **核心设计**：标签页信息持久化到 `chrome.storage.local`（key: `tab_track_{tabId}`），非内存 Map
- **原因**：Manifest V3 的 Service Worker 空闲时会被 Chrome 终止，内存 Map 丢失
- **写入时机**：`tabs.onCreated` + `tabs.onUpdated`（url/title/favIconUrl 变更时）
- **读取时机**：`tabs.onRemoved` 从 storage 读取 → 写入 `tabflow_close_history` → 删除追踪记录
- **定期清理**：根据 `historyDays` 配置清理过期记录（默认 7 天）
- **badge 更新**：每 5 分钟 + tab 事件触发时，调用 `detectDuplicates()` 计算重复数，`chrome.action.setBadgeText()` 显示橙色角标

### 4.5 标签页休眠（background/index.ts）

- **追踪机制**：`tabs.onActivated` + `tabs.onUpdated(status=complete)` 更新 `lastActiveMap`
- **轮询检查**：`setInterval(runHibernate, 60000)` 每分钟执行
- **过滤条件**：跳过 active/pinned/discarded 标签页，跳过白名单域名
- **执行**：`chrome.tabs.discard(tabId)` 挂起释放内存
- **配置热更新**：`chrome.storage.onChanged` 监听配置变更，立即重建定时器

### 4.6 工作区快照（SnapshotManager.tsx）

- **保存**：`chrome.windows.getAll({ populate: true })` → 提取 URL/标题/favicon → `createSnapshot()` 写入 store
- **恢复-新窗口**：遍历快照 window → 调 `chrome.windows.create({ url: urls })`，自动跳过当前已打开的 URL
- **恢复-替换**：先 `chrome.windows.getAll()` 关闭所有窗口，再创建新窗口
- **持久化**：Zustand Store 自动 `chrome.storage.local.set()` 保存，最多 5000 条

---

## 五、踩过的坑与迭代思路

1. **`chrome.windows.create({ url: urls })` 不创建新窗口**：Chrome 某些版本对 URL 数组参数不稳定 → 尝试过先创建空窗口再 `tabs.create`、`tabs.move` 等方案 → 最终确认 `chrome.windows.create({ url: urls })` 传数组可用，只需加 `type: 'normal'` 和 500ms 窗口间隔

2. **`chrome.tabs.move` 跨窗口移动丢失标签页**：`tabs.move(tabIds, { windowId })` 在多标签页跨窗口移动时存在兼容性问题 → 改为创建+关闭策略，即在新窗口创建副本后关闭原标签页

3. **Service Worker 内存 Map 被清空**：`tabInfoMap` 存在 Service Worker 内存中，SW 重启后清空，导致 `onRemoved` 查不到标签页信息 → 改为 `chrome.storage.local` 持久化追踪，key 前缀 `tab_track_`

4. **右键菜单被 `overflow-hidden` 裁剪**：`GroupSection` 容器设置了 `overflow-hidden`，导致 `absolute` 定位的右键菜单被裁掉 → 去掉 `overflow-hidden`，改用 `rounded-t-lg/rounded-b-lg` 分别控制首尾圆角

5. **分组输入框状态共享**：`GroupManager` 中 `newPattern` 是全局状态，所有分组的输入框绑定同一个值 → 改为 `Record<groupId, string>` 为每个分组独立维护输入状态

6. **配置字段变更导致 NaN 超时**：`delaySeconds` → `delayMinutes` 字段改名后，旧配置读取到 `undefined`，`undefined * 60 * 1000 = NaN`，`setTimeout(cb, NaN)` 被浏览器当作 0 处理 → 双层兜底 `delayMinutes ?? delaySeconds ?? 默认值` + 启动时自动迁移旧配置

---

## 六、技术选型对比与放弃的方案

| 维度 | 选用方案 | 放弃方案 | 为什么 |
|------|---------|---------|--------|
| AI 调用方式 | 扩展直连 DeepSeek API | FastAPI 后端中转 | 无额外部署，侧边栏 JS 可直接 `fetch`；后端增加维护成本 |
| 构建工具 | Vite + CRXJS | Webpack + 手写配置 | CRXJS 自动处理 manifest 注入、HMR、多入口 |
| 状态管理 | Zustand | Redux Toolkit | 体量小，API 简洁，`getState()` 可脱离 React 上下文读取最新状态 |
| 存储方案 | chrome.storage.local | IndexedDB / SQLite | Chrome 原生 API，扩展卸载不丢数据，无需额外依赖 |
| 分窗口策略 | `windows.create({ url: urls })` | `tabs.move` 跨窗口移动 | `tabs.move` 多标签页场景不稳定 |
| 颜色系统 | Tailwind 20 色自定义 | Chrome 原生 9 色 | 侧边栏 UI 不受 Chrome API 限制，提供更丰富的视觉区分 |

## 七、可迁移的能力标签

| 能力分类 | 具体技能点 |
|---------|-----------|
| **Chrome Extension 开发** | Manifest V3、Service Worker 生命周期、Side Panel API、`chrome.tabs/windows/storage` API |
| **前端架构** | Zustand Store 分层设计、React 组件组合、useRef 管理定时器、useMemo 优化计算 |
| **LLM 集成** | Prompt Engineering、OpenAI 兼容 API 直连、`response_format: json_object`、Token 认证 |
| **可靠性工程** | 持久化降级（内存→storage）、NaN 防护、旧配置迁移、空值守卫 |
| **数据结构与算法** | 三阶段去重（精确/忽略参数/忽略hash）、域名通配符匹配、URL 标准化 |
| **UI/UX** | Tailwind CSS 响应式布局、拖拽交互（HTML5 Drag API）、实时搜索 + 键盘导航 |

## 八、一句话总结

> 「独立设计并开发了一款 Chrome 扩展，集成 LLM 实现标签页按项目维度的语义分组，支持多窗口管理、工作区快照、重复检测、自动休眠等 10 项能力，基于 Zustand 分层 Store 和 `chrome.storage.local` 实现数据持久化。」

---

## 九、各模块面试问答

### Q1：AI 分组的具体实现流程是怎样的？

**考察点**：LLM 集成能力、Prompt Engineering、异步处理

**A**：入口在 `AIClassify.tsx` 的 `handleClassify()` 方法。流程分四步：
1. 收集所有标签页的 `{id, title, url}` 构建文本列表
2. 读取用户配置的 Prompt（默认 `DEFAULT_PROMPT` 常量，也可在设置页自定义），拼接已有分组信息
3. 通过 `fetch` 直连 `{apiBase}/v1/chat/completions`，传 `Authorization: Bearer {apiKey}`，使用 `response_format: { type: "json_object" }` 约束输出
4. 解析返回的 `{ groups: [{ name, tab_ids, reason, rules }] }`，展示预览

用户确认后 `handleApply()` 执行：清空旧分组 → 创建新分组 → 手动分配标签页 → 添加域名规则。20 色轮转选色避免相邻分组颜色相同。

**进阶追问**：如果 AI 返回的规则太宽泛导致新标签页误匹配怎么办？→ 设置了页的 Prompt 编辑功能，用户可加约束如「不同分组的 rules 不能重合」

### Q2：为什么不用后端中转而选择直连 LLM？

**考察点**：架构权衡、Chrome Extension 能力边界

**A**：最初设计了 FastAPI 后端做中转代理，但发现 Chrome 侧边栏有独立 JS 上下文，`fetch` 可以直接发 HTTPS 请求到 DeepSeek API。砍掉后端的好处：零部署成本、减少网络跳转延迟、无服务器运维负担。唯一的代价是 API Key 存在 `chrome.storage.local` 中（本机磁盘），不上传服务器。

### Q3：分窗口功能遇到过什么问题？

**考察点**：问题解决能力、Chrome API 踩坑经验

**A**：迭代了 4 个版本：
1. `chrome.windows.create({ url: urls })` → 部分 Chrome 版本不稳定
2. 先创建空窗口 + `tabs.create({ windowId })` → 新窗口未就绪时 tab 错配到当前窗口
3. `tabs.move(tabIds, { windowId })` → 多标签页跨窗口移动丢失标签页
4. **最终方案**：回到 `windows.create({ url: urls, type: 'normal' })` + 500ms 窗口间隔防限流

`windowSplit.ts` 约 90 行代码经历 4 次重构，是 Chrome API 踩坑最多的模块。

### Q4：关闭历史是怎么保证不丢失的？

**考察点**：Manifest V3 Service Worker 生命周期理解

**A**：关键设计是标签页元信息**不存内存**，而存在 `chrome.storage.local`。流程：`tabs.onCreated/onUpdated` → `chrome.storage.local.set({ tab_track_{id} })` → `tabs.onRemoved` → `chrome.storage.local.get` → 写入历史 → 删除追踪。Service Worker 被 Chrome 终止重启后，storage 中的数据还在。`background/index.ts` 第 16-54 行实现了完整流程。

### Q5：重复检测的三个阶段是怎么设计的？

**考察点**：算法设计、URL 处理

**A**：在 `duplicateDetector.ts` 的 `detectDuplicates()` 函数中：精确匹配（去末尾斜杠）→ 忽略参数（`new URL(url).origin + pathname`）→ 忽略 hash（去掉 `#anchor`）。使用 `handled Set<number>` 去重，优先展示精确匹配。匹配失败时 try-catch 兜底返回原始 URL。

### Q6：Zustand Store 的分层设计是怎样的？

**考察点**：状态管理架构

**A**：4 个独立 Store 各自管理 `chrome.storage.local` 键空间：`tabStore`（标签页列表）、`groupStore`（分组 CRUD + 手动分配）、`snapshotStore`（快照管理）、`closeHistoryStore`（历史 + 配置）。每个 Store 有自己的 `load()/save()` 方法，使用 `getState()` 可在组件外部获取最新状态。

### Q7：Prompt 是怎么设计的？如何保证分组质量？

**考察点**：Prompt Engineering

**A**：通过 `DEFAULT_PROMPT` 常量定义核心约束：禁止按域名分组、必须按项目/需求语义维度、给出具体示例（如"用户登录优化"→"登录优化需求"）、要求 rules 不能跨组重合、输出 JSON 格式含 `rules` 字段。`response_format: { type: "json_object" }` 强制 JSON 格式，避免 AI 返回 markdown 包裹。

### Q8：20 种分组颜色是怎么实现的？

**考察点**：前后端颜色系统设计

**A**：`types/tab.ts` 定义 `GroupColor` 联合类型（20 种）+ `GROUP_COLORS` 数组。Chrome 原生 Tab Group 只支持 9 色，侧边栏使用 Tailwind 完整色板（如 `bg-teal-50`、`bg-lime-50`），`GROUP_COLOR_MAP` 做映射（teal→cyan 等）。AI 应用分组时轮转选色 + 随机偏移避免重复。

---

## 十、量化成果

| 指标 | 数据 | 说明 |
|------|------|------|
| 代码行数 | ~3,200 行 | 29 个 TS/TSX 文件（保守估算） |
| Zustand Store | 5 个 | 管理 6 个 `chrome.storage.local` 键空间 |
| 设计模式 | 6 种 | 策略、观察者、工厂、组合、单例、适配器 |
| 覆盖 Edge Case | 15+ | 空分组、NaN 超时、旧配置迁移、SW 重启等 |
| 支持颜色 | 20 种 | Tailwind 全色板 |
| 打包体积 | ~200KB gzip | Vite + CRXJS 构建 |
| AI 响应时间 | < 5s | deepseek-v4-flash，32 标签页分类 |

_以上数据基于代码实际统计或保守估算_

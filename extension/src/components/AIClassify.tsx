import { useState, useMemo } from 'react'
import { useTabStore } from '../store/tabStore'
import { useGroupStore } from '../store/groupStore'
import { GROUP_COLORS } from '../types'

const STORAGE_KEY = 'tabflow_ai_config'

export const DEFAULT_PROMPT = `你是一个浏览器标签页整理助手。用户会给你一组标签页（标题+URL），请根据标签页的**实际工作内容/项目/需求**来精细分组。

核心要求：
1. 必须按「项目/需求/任务」的语义维度分组，绝对不能按域名、网站名或 URL 结构分组
2. 仔细阅读每个标签页标题中的业务关键词，推断它属于哪个具体项目或需求
3. 例如标题含"用户登录优化""PRD评审"→ 归入"登录优化需求"；含"接口文档""API网关"→ 归入"API开发"
4. 分组名必须反映具体业务含义，不能叫"Aone"、"GitHub"、"文档"这类网站名
5. 分组名用中文，4-10个字，要具体不要泛化
6. 尽力把每个标签页都分到有意义的分组，尽量避免"其他"

返回纯 JSON（不含 markdown）：
{
  "groups": [
    {
      "name": "分组名",
      "tab_ids": [1, 2],
      "reason": "分类依据",
      "rules": ["域名或关键词1", "域名或关键词2"]
    }
  ]
}
其中 rules 是根据该分组标签页的 URL 提取的域名匹配规则，注意：
- 规则要具体，不能太宽泛（如用 "aone.alibaba-inc.com" 而非 "alibaba-inc.com"）
- 不同分组的 rules 不能重合，确保每个域名只匹配一个分组
- 如果无法给出不重合的规则，可以留空 rules
- 每个分组给 1-3 条规则`

interface AIClassifyProps { onClose: () => void }

interface AIConfig {
  apiKey: string
  apiBase: string
  model: string
  prompt: string
}

interface AIGroup {
  name: string
  tab_ids: number[]
  reason: string
  rules?: string[]
}

export function AIClassify({ onClose }: AIClassifyProps) {
  const { windows } = useTabStore()
  const { groups, addGroup, assignTab } = useGroupStore()

  const [config, setConfig] = useState<AIConfig>({
    apiKey: '',
    apiBase: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    prompt: DEFAULT_PROMPT,
  })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AIGroup[] | null>(null)
  const [applying, setApplying] = useState(false)
  const [msg, setMsg] = useState('')

  useMemo(() => {
    chrome.storage.local.get(STORAGE_KEY).then((r) => {
      if (r[STORAGE_KEY]) setConfig((prev) => ({ ...prev, ...(r[STORAGE_KEY] as AIConfig) }))
    })
  }, [])

  const save = async (c: AIConfig) => { setConfig(c); chrome.storage.local.set({ [STORAGE_KEY]: c }) }

  const allTabs = useMemo(() => windows.flatMap((w) => w.tabs), [windows])

  const handleClassify = async () => {
    if (!config.apiKey) { setMsg('请填写 API Key'); return }
    setLoading(true); setMsg(''); setResults(null)

    try {
      const tabsDesc = allTabs.map((t) => `ID=${t.id} | ${t.title} | ${t.url}`).join('\n')
      const existingDesc = groups.length > 0 ? `已有分组: ${groups.map((g) => g.name).join(', ')}` : ''

      const resp = await fetch(`${config.apiBase.replace(/\/+$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: config.prompt || DEFAULT_PROMPT },
            { role: 'user', content: `${existingDesc}\n\n待分类标签页:\n${tabsDesc}` },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      })

      if (!resp.ok) {
        const err = await resp.text()
        setMsg(`请求失败: ${resp.status} ${err}`)
        return
      }

      const data = await resp.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) { setMsg('AI 返回为空'); return }
      const parsed = JSON.parse(content)
      setResults(parsed.groups || [])
    } catch (e) {
      setMsg(`错误: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!results) return
    setApplying(true)

    // 1. 清空所有旧分组和手动分配
    const store = useGroupStore.getState()
    for (const g of [...store.groups]) {
      store.deleteGroup(g.id)
    }

    // 2. 按 AI 结果创建新分组
    for (const g of results) {
      // 轮转选色避免重复
      let colorIndex = (useGroupStore.getState().groups.length + Math.floor(Math.random() * GROUP_COLORS.length)) % GROUP_COLORS.length
      const color = GROUP_COLORS[colorIndex]
      store.addGroup(g.name, color)
      await new Promise((r) => setTimeout(r, 100))

      // 获取刚创建的分组 ID
      const freshState = useGroupStore.getState()
      const newGroup = freshState.groups[freshState.groups.length - 1]
      if (!newGroup) continue

      // 分配标签页
      for (const tid of g.tab_ids) {
        store.assignTab(tid, newGroup.id)
      }

      // 使用 AI 生成的匹配规则
      if (g.rules && g.rules.length > 0) {
        for (const rule of g.rules) {
          if (rule && rule.length > 1) {
            store.addRule(newGroup.id, rule, 'domain')
          }
        }
      }
    }

    setApplying(false); setMsg('✅ 分组已应用（含自动规则）')
    setTimeout(() => onClose(), 1200)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">AI 整理</h2>
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onClose}>返回 ✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="border border-gray-200 rounded-lg p-3 space-y-2">
          <span className="text-xs font-medium text-gray-600">DeepSeek API</span>
          <input className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded" placeholder="API Key" type="password"
            value={config.apiKey} onChange={(e) => save({ ...config, apiKey: e.target.value })} />
          <input className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded" placeholder="API Base"
            value={config.apiBase} onChange={(e) => save({ ...config, apiBase: e.target.value })} />
          <input className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded" placeholder="Model"
            value={config.model} onChange={(e) => save({ ...config, model: e.target.value })} />
        </div>

        <button className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          onClick={handleClassify} disabled={loading}>
          {loading ? 'AI 分析中...' : `🤖 分析 ${allTabs.length} 个标签页`}
        </button>

        {msg && (
          <div className={`px-3 py-2 rounded-lg text-sm text-center ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg}
          </div>
        )}

        {results && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">AI 建议了 {results.length} 个分组</span>
              <button className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                onClick={handleApply} disabled={applying}>
                {applying ? '应用...' : '✅ 应用分组'}
              </button>
            </div>
            {results.map((g, i) => (
              <div key={i} className="border border-blue-200 rounded-lg bg-blue-50/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-blue-800">{g.name}</span>
                  <span className="text-xs text-blue-400">{g.tab_ids.length} 个</span>
                </div>
                {g.reason && <p className="text-xs text-gray-500 mb-1">理由: {g.reason}</p>}
                <div className="text-xs text-gray-400">
                  {g.tab_ids.slice(0, 5).map((id) => {
                    const tab = allTabs.find((t) => t.id === id)
                    return tab ? <div key={id} className="truncate">{tab.title}</div> : null
                  })}
                  {g.tab_ids.length > 5 && <div>...还有 {g.tab_ids.length - 5} 个</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

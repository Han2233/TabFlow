import { useState, useMemo, useCallback } from 'react'
import { useTabStore } from '../store/tabStore'
import { useGroupStore } from '../store/groupStore'

const STORAGE_KEY = 'tabflow_ai_config'

interface AIClassifyProps {
  onClose: () => void
}

interface AIConfig {
  apiKey: string
  apiBase: string
  model: string
}

interface AIGroup {
  name: string
  tab_ids: number[]
  reason: string
}

export function AIClassify({ onClose }: AIClassifyProps) {
  const { windows, refresh } = useTabStore()
  const { groups, addGroup, assignTab } = useGroupStore()

  const [config, setConfig] = useState<AIConfig>({ apiKey: '', apiBase: 'https://api.openai.com/v1', model: 'gpt-4o-mini' })
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AIGroup[] | null>(null)
  const [applying, setApplying] = useState(false)
  const [msg, setMsg] = useState('')

  // 加载配置
  useMemo(() => {
    chrome.storage.local.get(STORAGE_KEY).then((r) => {
      if (r[STORAGE_KEY]) setConfig(r[STORAGE_KEY] as AIConfig)
    })
  }, [])

  const saveConfig = async (c: AIConfig) => {
    setConfig(c)
    await chrome.storage.local.set({ [STORAGE_KEY]: c })
  }

  const allTabs = useMemo(() => windows.flatMap((w) => w.tabs), [windows])

  const handleClassify = async () => {
    if (!config.apiKey) { setMsg('请先填写 API Key'); return }
    setLoading(true)
    setMsg('')
    setResults(null)

    try {
      const tabs = allTabs.map((t) => ({ id: t.id, title: t.title, url: t.url, domain: '' }))
      const resp = await fetch(`${config.apiBase.replace(/\/+$/, '')}/api/v1/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          'X-API-Base': config.apiBase,
          'X-Model': config.model,
        },
        body: JSON.stringify({
          tabs,
          existing_groups: groups.map((g) => g.name),
        }),
      })

      if (!resp.ok) {
        const err = await resp.text()
        setMsg(`请求失败: ${resp.status} ${err}`)
        return
      }

      const data = await resp.json()
      setResults(data.groups || [])
    } catch (e) {
      setMsg(`网络错误: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!results) return
    setApplying(true)
    for (const g of results) {
      // 创建新分组
      addGroup(g.name, 'blue')
      // 延迟确保 groupStore 更新
      await new Promise((r) => setTimeout(r, 100))
      // 分配标签页
      for (const tid of g.tab_ids) {
        assignTab(tid, groups[groups.length - 1]?.id || '')
      }
    }
    setApplying(false)
    setMsg('✅ 分组已应用')
    setTimeout(() => onClose(), 1200)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">AI 整理</h2>
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onClose}>
          返回 ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* API 配置 */}
        <div className="border border-gray-200 rounded-lg p-3 space-y-2">
          <span className="text-xs font-medium text-gray-600">LLM API 配置</span>
          <input
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded"
            placeholder="API Key (sk-...)"
            type="password"
            value={config.apiKey}
            onChange={(e) => saveConfig({ ...config, apiKey: e.target.value })}
          />
          <input
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded"
            placeholder="API Base URL"
            value={config.apiBase}
            onChange={(e) => saveConfig({ ...config, apiBase: e.target.value })}
          />
          <input
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded"
            placeholder="Model"
            value={config.model}
            onChange={(e) => saveConfig({ ...config, model: e.target.value })}
          />
        </div>

        {/* 操作按钮 */}
        <button
          className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          onClick={handleClassify}
          disabled={loading}
        >
          {loading ? 'AI 分析中...' : `🤖 分析 ${allTabs.length} 个标签页`}
        </button>

        {msg && (
          <div className={`px-3 py-2 rounded-lg text-sm text-center ${
            msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {msg}
          </div>
        )}

        {/* AI 结果 */}
        {results && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                AI 建议了 {results.length} 个分组
              </span>
              <button
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? '应用...' : '✅ 应用分组'}
              </button>
            </div>
            {results.map((g, i) => (
              <div key={i} className="border border-blue-200 rounded-lg bg-blue-50/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-blue-800">{g.name}</span>
                  <span className="text-xs text-blue-400">{g.tab_ids.length} 个标签页</span>
                </div>
                {g.reason && (
                  <p className="text-xs text-gray-500 mb-1">理由: {g.reason}</p>
                )}
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

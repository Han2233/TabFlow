import { useState, useEffect } from 'react'
import { getHibernateConfig, saveHibernateConfig, type HibernateConfig, DEFAULT_HIBERNATE_CONFIG } from '../utils/duplicateDetector'
import { DEFAULT_PROMPT } from './AIClassify'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<HibernateConfig>(DEFAULT_HIBERNATE_CONFIG)
  const [newDomain, setNewDomain] = useState('')
  const [aiPrompt, setAiPrompt] = useState(DEFAULT_PROMPT)

  useEffect(() => {
    getHibernateConfig().then(setConfig)
    chrome.storage.local.get('tabflow_ai_config').then((r: any) => {
      const cfg = r.tabflow_ai_config
      if (cfg?.prompt) setAiPrompt(cfg.prompt)
    })
  }, [])

  const saveAIPrompt = async (prompt: string) => {
    setAiPrompt(prompt)
    const stored = (await chrome.storage.local.get('tabflow_ai_config')).tabflow_ai_config || {}
    await chrome.storage.local.set({ tabflow_ai_config: { ...stored, prompt } })
  }

  const save = async (updates: Partial<HibernateConfig>) => {
    const next = { ...config, ...updates }
    setConfig(next)
    await saveHibernateConfig(next)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">设置</h2>
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={onClose}>
          返回 ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 休眠开关 */}
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">自动休眠</span>
            <button
              className={`w-10 h-5 rounded-full transition-colors ${
                config.enabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              onClick={() => save({ enabled: !config.enabled })}
            >
              <span
                className={`block w-4 h-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
                  config.enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            长时间未访问的标签页自动挂起释放内存
          </p>

          {config.enabled && (
            <div>
              <label className="text-xs text-gray-500">休眠超时（分钟）</label>
              <input
                type="number"
                className="w-full mt-1 px-2 py-1 text-sm border border-gray-200 rounded"
                value={config.timeoutMinutes}
                min={5}
                max={120}
                onChange={(e) => save({ timeoutMinutes: parseInt(e.target.value) || 30 })}
              />
            </div>
          )}
        </div>

        {/* 白名单 */}
        {config.enabled && (
          <div className="border border-gray-200 rounded-lg p-3">
            <span className="text-sm font-medium text-gray-700">休眠白名单</span>
            <p className="text-xs text-gray-400 mb-2">这些域名的标签页不会被自动休眠</p>

            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                placeholder="添加域名，如 localhost"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newDomain.trim()) {
                    save({ whitelist: [...config.whitelist, newDomain.trim()] })
                    setNewDomain('')
                  }
                }}
              />
              <button
                className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                onClick={() => {
                  if (newDomain.trim()) {
                    save({ whitelist: [...config.whitelist, newDomain.trim()] })
                    setNewDomain('')
                  }
                }}
              >
                +
              </button>
            </div>

            {config.whitelist.length === 0 ? (
              <p className="text-xs text-gray-300">暂无白名单</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {config.whitelist.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 rounded"
                  >
                    {d}
                    <button
                      className="text-gray-400 hover:text-red-500"
                      onClick={() =>
                        save({ whitelist: config.whitelist.filter((w) => w !== d) })
                      }
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI 分类 Prompt */}
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">AI 分类 Prompt</span>
            <button
              className="text-xs text-blue-500 hover:text-blue-600"
              onClick={() => { setAiPrompt(DEFAULT_PROMPT); saveAIPrompt(DEFAULT_PROMPT) }}
            >
              恢复默认
            </button>
          </div>
          <textarea
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded resize-y font-mono"
            rows={12}
            value={aiPrompt}
            onChange={(e) => { setAiPrompt(e.target.value) }}
            onBlur={() => saveAIPrompt(aiPrompt)}
          />
          <p className="text-xs text-gray-400 mt-1">修改后 AI 整理将使用新的 Prompt。失去焦点时自动保存。</p>
        </div>
      </div>
    </div>
  )
}

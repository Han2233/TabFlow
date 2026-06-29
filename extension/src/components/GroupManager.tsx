import { useState } from 'react'
import { useGroupStore } from '../store/groupStore'
import type { GroupColor, GroupConfig } from '../types'

const COLORS: { value: GroupColor; label: string }[] = [
  { value: 'grey', label: '灰' },
  { value: 'blue', label: '蓝' },
  { value: 'red', label: '红' },
  { value: 'yellow', label: '黄' },
  { value: 'green', label: '绿' },
  { value: 'pink', label: '粉' },
  { value: 'purple', label: '紫' },
  { value: 'cyan', label: '青' },
  { value: 'orange', label: '橙' },
]

interface GroupManagerProps {
  onClose: () => void
}

export function GroupManager({ onClose }: GroupManagerProps) {
  const { groups, addGroup, updateGroup, deleteGroup, addRule, removeRule } = useGroupStore()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<GroupColor>('blue')
  const [newNote, setNewNote] = useState('')

  // 编辑分组
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')

  // 每个分组独立的规则输入
  const [patternInputs, setPatternInputs] = useState<Record<string, string>>({})

  const handleAdd = () => {
    if (!newName.trim()) return
    addGroup(newName.trim(), newColor, newNote.trim() || undefined)
    setNewName('')
    setNewNote('')
    setShowAdd(false)
  }

  const startEdit = (g: GroupConfig) => {
    setEditingGroupId(g.id)
    setEditName(g.name)
    setEditNote(g.note || '')
  }

  const saveEdit = () => {
    if (!editingGroupId || !editName.trim()) return
    updateGroup(editingGroupId, {
      name: editName.trim(),
      note: editNote.trim() || undefined,
    })
    setEditingGroupId(null)
  }

  const handleAddRule = (groupId: string) => {
    const text = patternInputs[groupId] || ''
    if (!text.trim()) return
    addRule(groupId, text.trim(), 'domain')
    setPatternInputs((prev) => {
      const next = { ...prev }
      delete next[groupId]
      return next
    })
  }

  const setPatternForGroup = (groupId: string, value: string) => {
    setPatternInputs((prev) => ({ ...prev, [groupId]: value }))
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">分组管理</h2>
        <button
          className="text-xs text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          返回 ✕
        </button>
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="border border-gray-200 rounded-lg p-3">
            {editingGroupId === g.id ? (
              /* 编辑模式 */
              <div className="space-y-2">
                <input
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="分组名称"
                />
                <input
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="备注（需求ID、链接等）"
                />
                <div className="flex gap-1">
                  <button
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={saveEdit}
                  >
                    保存
                  </button>
                  <button
                    className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    onClick={() => setEditingGroupId(null)}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              /* 展示模式 */
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: {
                          grey: '#9ca3af', blue: '#3b82f6', red: '#ef4444',
                          yellow: '#eab308', green: '#22c55e', pink: '#ec4899',
                          purple: '#a855f7', cyan: '#06b6d4', orange: '#f97316',
                        }[g.color],
                      }}
                    />
                    <span className="text-sm font-medium text-gray-800">{g.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="text-xs text-gray-400 hover:text-blue-500"
                      onClick={() => startEdit(g)}
                    >
                      编辑
                    </button>
                    <button
                      className="text-xs text-gray-400 hover:text-red-500"
                      onClick={() => {
                        if (confirm(`确定要删除分组「${g.name}」吗？`)) {
                          deleteGroup(g.id)
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>

                {g.note && (
                  <p className="text-xs text-gray-500 mb-2">备注：{g.note}</p>
                )}

                {/* 规则列表 */}
                <div className="ml-2 space-y-1">
                  <p className="text-xs text-gray-400 mb-1">匹配规则：</p>
                  {g.rules.length === 0 && (
                    <p className="text-xs text-gray-300">暂无规则</p>
                  )}
                  {g.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"
                    >
                      <span>
                        {rule.type === 'domain' ? '🌐' : '📝'} {rule.pattern}
                      </span>
                      <button
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => removeRule(rule.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* 添加规则 */}
                  <div className="flex gap-1 mt-2">
                    <input
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                      placeholder="添加域名匹配规则，如 github.com"
                      value={patternInputs[g.id] || ''}
                      onChange={(e) => setPatternForGroup(g.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddRule(g.id)
                      }}
                    />
                    <button
                      className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                      onClick={() => handleAddRule(g.id)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add Group */}
      <div className="border-t border-gray-200 p-3">
        {showAdd ? (
          <div className="space-y-2">
            <input
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="分组名称"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
            <div className="flex gap-1 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`w-7 h-7 rounded-full border-2 text-[10px] ${
                    newColor === c.value
                      ? 'border-gray-800 scale-110'
                      : 'border-transparent hover:scale-105'
                  } transition-transform`}
                  style={{
                    backgroundColor: {
                      grey: '#9ca3af', blue: '#3b82f6', red: '#ef4444',
                      yellow: '#eab308', green: '#22c55e', pink: '#ec4899',
                      purple: '#a855f7', cyan: '#06b6d4', orange: '#f97316',
                    }[c.value],
                  }}
                  onClick={() => setNewColor(c.value)}
                  title={c.label}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <input
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="备注（可选）"
            />
            <div className="flex gap-1">
              <button
                className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleAdd}
              >
                创建分组
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setShowAdd(false)}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            onClick={() => setShowAdd(true)}
          >
            + 新建分组
          </button>
        )}
      </div>
    </div>
  )
}

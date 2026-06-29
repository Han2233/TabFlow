import { useEffect, useState } from 'react'
import { useSnapshotStore } from '../store/snapshotStore'
import { useGroupStore } from '../store/groupStore'
import type { Snapshot } from '../types/snapshot'

interface SnapshotManagerProps {
  onClose: () => void
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN')
}

export function SnapshotManager({ onClose }: SnapshotManagerProps) {
  const { snapshots, loaded, load, createSnapshot, deleteSnapshot, renameSnapshot, restoreInNewWindow, restoreReplaceCurrent } = useSnapshotStore()
  const { groups } = useGroupStore()

  const [saveName, setSaveName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    if (!saveName.trim()) return
    setSaving(true)
    await createSnapshot(saveName.trim(), groups)
    setSaveName('')
    setSaving(false)
    setSuccessMsg('✅ 快照已保存')
    setTimeout(() => setSuccessMsg(''), 1500)
  }

  const handleRestoreNew = async (id: string) => {
    setRestoringId(id)
    await restoreInNewWindow(id)
    setRestoringId(null)
    setSuccessMsg('✅ 已在浏览器新窗口中恢复')
    setTimeout(() => onClose(), 1200)
  }

  const handleRestoreReplace = async (id: string) => {
    if (!confirm('替换当前窗口将关闭当前所有标签页并恢复快照内容，确定吗？')) return
    setRestoringId(id)
    await restoreReplaceCurrent(id)
    setRestoringId(null)
    setSuccessMsg('✅ 快照已恢复到当前窗口')
    setTimeout(() => onClose(), 1200)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">工作区快照</h2>
        <button
          className="text-xs text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          返回 ✕
        </button>
      </div>

      {/* 成功提示 */}
      {successMsg && (
        <div className="mx-4 mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center">
          {successMsg}
        </div>
      )}

      {/* Save Section */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none
              focus:border-blue-400"
            placeholder="输入快照名称..."
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
            }}
          />
          <button
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600
              disabled:opacity-50 transition-colors whitespace-nowrap"
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
          >
            {saving ? '保存中...' : '💾 保存快照'}
          </button>
        </div>
      </div>

      {/* Snapshot List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!loaded ? (
          <div className="text-center text-gray-400 text-sm py-4">加载中...</div>
        ) : snapshots.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            <div className="text-3xl mb-2">📸</div>
            <div>暂无快照</div>
            <div className="text-xs mt-1">保存当前标签页布局，随时恢复</div>
          </div>
        ) : (
          snapshots.map((snap) => (
            <SnapshotCard
              key={snap.id}
              snapshot={snap}
              editingId={editingId}
              editName={editName}
              restoringId={restoringId}
              onEditStart={(id, name) => {
                setEditingId(id)
                setEditName(name)
              }}
              onEditSave={() => {
                if (editingId && editName.trim()) {
                  renameSnapshot(editingId, editName.trim())
                  setEditingId(null)
                }
              }}
              onEditCancel={() => setEditingId(null)}
              onEditNameChange={setEditName}
              onDelete={deleteSnapshot}
              onRestoreNew={handleRestoreNew}
              onRestoreReplace={handleRestoreReplace}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface SnapshotCardProps {
  snapshot: Snapshot
  editingId: string | null
  editName: string
  restoringId: string | null
  onEditStart: (id: string, name: string) => void
  onEditSave: () => void
  onEditCancel: () => void
  onEditNameChange: (val: string) => void
  onDelete: (id: string) => void
  onRestoreNew: (id: string) => void
  onRestoreReplace: (id: string) => void
}

function SnapshotCard({
  snapshot, editingId, editName, restoringId,
  onEditStart, onEditSave, onEditCancel, onEditNameChange,
  onDelete, onRestoreNew, onRestoreReplace,
}: SnapshotCardProps) {
  const isEditing = editingId === snapshot.id
  const isRestoring = restoringId === snapshot.id

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      {isEditing ? (
        <div className="flex gap-2">
          <input
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditSave()
              if (e.key === 'Escape') onEditCancel()
            }}
            autoFocus
          />
          <button
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
            onClick={onEditSave}
          >
            保存
          </button>
          <button
            className="px-2 py-1 text-xs bg-gray-200 rounded"
            onClick={onEditCancel}
          >
            取消
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-800 truncate">
              {snapshot.name}
            </span>
            <div className="flex gap-1 flex-shrink-0">
              <button
                className="text-xs text-gray-400 hover:text-blue-500"
                onClick={() => onEditStart(snapshot.id, snapshot.name)}
              >
                重命名
              </button>
              <button
                className="text-xs text-gray-400 hover:text-red-500"
                onClick={() => {
                  if (confirm(`确定删除快照「${snapshot.name}」吗？`)) {
                    onDelete(snapshot.id)
                  }
                }}
              >
                删除
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <span>{formatTime(snapshot.createdAt)}</span>
            <span>·</span>
            <span>{snapshot.windows.length} 个窗口</span>
            <span>·</span>
            <span>{snapshot.tabCount} 个标签页</span>
          </div>

          {/* 窗口预览 */}
          <div className="space-y-1 mb-2">
            {snapshot.windows.slice(0, 3).map((win, i) => (
              <div key={i} className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded truncate">
                窗口 {i + 1}：{win.tabs.map((t) => t.title).join('、') || '无标签页'}
              </div>
            ))}
            {snapshot.windows.length > 3 && (
              <div className="text-xs text-gray-400 px-2">
                ...还有 {snapshot.windows.length - 3} 个窗口
              </div>
            )}
          </div>

          {/* 恢复按钮 */}
          <div className="flex gap-2">
            <button
              className="flex-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded
                hover:bg-blue-100 disabled:opacity-50 transition-colors"
              onClick={() => onRestoreNew(snapshot.id)}
              disabled={isRestoring}
            >
              {isRestoring ? '恢复中...' : '在新窗口恢复'}
            </button>
            <button
              className="flex-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded
                hover:bg-gray-100 disabled:opacity-50 transition-colors"
              onClick={() => onRestoreReplace(snapshot.id)}
              disabled={isRestoring}
            >
              {isRestoring ? '恢复中...' : '替换当前窗口'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

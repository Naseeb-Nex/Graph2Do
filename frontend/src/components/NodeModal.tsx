import React, { useState, useEffect } from 'react'
import { GraphNode, NodeType, NodeStatus } from '../types/graph'
import { X, Trash2, Save } from 'lucide-react'

interface NodeModalProps {
  isOpen: boolean
  nodeToEdit: GraphNode | null
  allNodes: GraphNode[]
  onClose: () => void
  onSave: (nodeData: Partial<GraphNode>) => Promise<void>
  onDelete?: (nodeId: string) => Promise<void>
}

export const NodeModal: React.FC<NodeModalProps> = ({
  isOpen,
  nodeToEdit,
  allNodes,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [nodeType, setNodeType] = useState<NodeType>('task')
  const [status, setStatus] = useState<NodeStatus>('pending')
  const [estimatedHours, setEstimatedHours] = useState(4)
  const [deadline, setDeadline] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [blockers] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (nodeToEdit) {
      setTitle(nodeToEdit.title || '')
      setDescription(nodeToEdit.description || '')
      setNodeType(nodeToEdit.nodeType || 'task')
      setStatus(nodeToEdit.completed ? 'completed' : nodeToEdit.status || 'pending')
      setEstimatedHours(nodeToEdit.estimatedHours || 4)
      setDeadline(nodeToEdit.deadline || '')
      setParentId(nodeToEdit.parentId || '')
    } else {
      setTitle('')
      setDescription('')
      setNodeType('task')
      setStatus('pending')
      setEstimatedHours(4)
      setDeadline('')
      setParentId('')
    }
  }, [nodeToEdit, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSaving(true)
    try {
      await onSave({
        id: nodeToEdit?.id,
        title: title.trim(),
        description: description.trim(),
        nodeType,
        status,
        completed: status === 'completed',
        estimatedHours: Number(estimatedHours) || 1,
        deadline: deadline || undefined,
        parentId: parentId ? parentId : null,
        blockers,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (nodeToEdit && onDelete) {
      setIsSaving(true)
      try {
        await onDelete(nodeToEdit.id)
        onClose()
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Filter available parents so a node cannot be its own parent
  const potentialParents = allNodes.filter(
    (n) => n.id !== nodeToEdit?.id && (n.nodeType === 'project' || n.nodeType === 'goal')
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      data-testid="node-modal"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h3 className="text-base font-bold text-slate-100">
            {nodeToEdit ? 'Edit Node Details' : 'Create New Knowledge Node'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Node Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build Payment Webhooks"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              data-testid="node-title-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description / Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, specifications, and objectives for this step..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              data-testid="node-desc-input"
            />
          </div>

          {/* Node Type & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Node Type</label>
              <select
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value as NodeType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                data-testid="node-type-select"
              >
                <option value="project">Project (High-level)</option>
                <option value="goal">Goal (Milestone)</option>
                <option value="task">Task</option>
                <option value="subtask">Sequential Subtask</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NodeStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                data-testid="node-status-select"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Hours & Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                data-testid="node-hours-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                data-testid="node-deadline-input"
              />
            </div>
          </div>

          {/* Parent Node */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Parent Hierarchy Group (Optional)
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              data-testid="node-parent-select"
            >
              <option value="">None (Top-Level Node)</option>
              {potentialParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.nodeType})
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {nodeToEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-xs font-semibold rounded-xl transition-colors"
                data-testid="delete-node-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Node</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/30 transition-colors"
                data-testid="save-node-btn"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{nodeToEdit ? 'Save Changes' : 'Create Node'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

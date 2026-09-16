import React from 'react'
import { GraphNode } from '../types/graph'
import { Clock, Calendar, ShieldAlert } from 'lucide-react'

interface NodeHoverCardProps {
  node: GraphNode
  progress: number
  blockers: string[]
  position: { x: number; y: number }
}

export const NodeHoverCard: React.FC<NodeHoverCardProps> = ({
  node,
  progress,
  blockers,
  position,
}) => {
  return (
    <div
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y - 40}px`,
      }}
      className="fixed z-50 pointer-events-none w-72 rounded-xl border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95"
      data-testid="hover-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {node.nodeType}
          </span>
        </div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            node.completed
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : node.status === 'blocked'
              ? 'bg-rose-950 text-rose-300 border border-rose-800'
              : 'bg-sky-950 text-sky-300 border border-sky-800'
          }`}
        >
          {node.completed ? 'Completed' : node.status.replace('_', ' ')}
        </span>
      </div>

      {/* Title & Description */}
      <h4 className="text-sm font-bold text-slate-100 mb-1 leading-snug">{node.title}</h4>
      {node.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {node.description}
        </p>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs py-1.5 px-2 bg-slate-950/70 rounded-lg border border-slate-800/80 mb-2">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{node.estimatedHours}h expected</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>{node.deadline || 'No deadline'}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1 mb-2">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Completion</span>
          <span className="font-semibold text-slate-200">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline Blockers Warning */}
      {blockers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-rose-950/80 bg-rose-950/30 p-2 rounded border border-rose-900/40">
          <div className="flex items-center gap-1 text-rose-400 text-xs font-semibold mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Timeline Blockers ({blockers.length}):</span>
          </div>
          <ul className="space-y-0.5 text-[11px] text-rose-300/90 pl-4 list-disc">
            {blockers.map((b, idx) => (
              <li key={idx} className="line-clamp-1">
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

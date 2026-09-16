import React from 'react'
import { GraphNode } from '../types/graph'
import { Check, AlertCircle, Layers, Target, ListTodo } from 'lucide-react'

interface CircularNodeProps {
  node: GraphNode
  progress: number
  isSelected: boolean
  isHovered: boolean
  hasChildren: boolean
  isExpanded: boolean
  onSelect: (node: GraphNode) => void
  onToggleExpand: (nodeId: string, e: React.MouseEvent) => void
  onMouseEnter: (node: GraphNode, event: React.MouseEvent) => void
  onMouseLeave: () => void
}

export const CircularNode: React.FC<CircularNodeProps> = ({
  node,
  progress,
  isSelected,
  isHovered,
  hasChildren,
  isExpanded,
  onSelect,
  onToggleExpand,
  onMouseEnter,
  onMouseLeave,
}) => {
  // Dimensions based on node type
  let radius = 40
  let ringRadius = 46
  if (node.nodeType === 'project') {
    radius = 52
    ringRadius = 58
  } else if (node.nodeType === 'goal') {
    radius = 44
    ringRadius = 50
  } else if (node.nodeType === 'subtask') {
    radius = 36
    ringRadius = 40
  }

  const circumference = 2 * Math.PI * ringRadius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Color schemes based on type & status
  let ringColor = 'stroke-emerald-500'

  if (node.status === 'blocked') {
    ringColor = 'stroke-rose-500'
  } else if (node.completed) {
    ringColor = 'stroke-emerald-400'
  } else if (node.nodeType === 'project') {
    ringColor = 'stroke-emerald-500'
  } else if (node.nodeType === 'goal') {
    ringColor = 'stroke-amber-500'
  } else {
    ringColor = 'stroke-blue-500'
  }

  const getNodeIcon = () => {
    if (node.completed) return <Check className="w-4 h-4 text-emerald-400" />
    if (node.status === 'blocked') return <AlertCircle className="w-4 h-4 text-rose-400" />
    if (node.nodeType === 'project') return <Layers className="w-4 h-4 text-emerald-400" />
    if (node.nodeType === 'goal') return <Target className="w-4 h-4 text-amber-400" />
    return <ListTodo className="w-3.5 h-3.5 text-blue-400" />
  }

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      className="cursor-pointer transition-transform duration-200"
      onClick={() => onSelect(node)}
      onMouseEnter={(e) => onMouseEnter(node, e)}
      onMouseLeave={onMouseLeave}
      data-testid={`node-${node.id}`}
    >
      {/* Selection outer glow aura */}
      {isSelected && (
        <circle
          r={ringRadius + 8}
          className="fill-none stroke-emerald-400/40 animate-pulse"
          strokeWidth="6"
        />
      )}

      {/* Hover glow ring */}
      {isHovered && !isSelected && (
        <circle
          r={ringRadius + 4}
          className="fill-none stroke-sky-400/30"
          strokeWidth="4"
        />
      )}

      {/* Background track circle for progress ring */}
      <circle
        r={ringRadius}
        className="fill-none stroke-slate-800"
        strokeWidth={node.nodeType === 'project' ? '4' : '3'}
      />

      {/* Dynamic Progress Ring perimeter stroke */}
      <circle
        r={ringRadius}
        className={`fill-none ${ringColor} transition-all duration-500 ease-out`}
        strokeWidth={node.nodeType === 'project' ? '4' : '3'}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90)"
      />

      {/* Circular Node Body */}
      <circle
        r={radius}
        className={`transition-all duration-200 fill-slate-900 stroke-2 ${
          isSelected
            ? 'stroke-emerald-400 shadow-lg shadow-emerald-500/20'
            : isHovered
            ? 'stroke-sky-400'
            : 'stroke-slate-700'
        }`}
      />

      {/* Progress % Badge on top-right for project/goal */}
      {(node.nodeType === 'project' || node.nodeType === 'goal') && (
        <g transform={`translate(${radius * 0.7}, ${-radius * 0.7})`}>
          <circle r="11" className="fill-slate-950 stroke stroke-slate-700" />
          <text
            textAnchor="middle"
            dy="3.5"
            className="text-[9px] font-bold fill-slate-200 select-none"
          >
            {`${progress}%`}
          </text>
        </g>
      )}

      {/* Center Icon & Title */}
      <foreignObject
        x={-radius + 4}
        y={-radius + 4}
        width={(radius - 4) * 2}
        height={(radius - 4) * 2}
        className="pointer-events-none"
      >
        <div className="w-full h-full rounded-full flex flex-col items-center justify-center p-1.5 text-center overflow-hidden">
          <div className="mb-0.5">{getNodeIcon()}</div>
          <p
            className={`font-medium line-clamp-2 leading-tight select-none text-slate-100 ${
              node.nodeType === 'project' ? 'text-[11px] font-semibold' : 'text-[10px]'
            }`}
          >
            {node.title}
          </p>
        </div>
      </foreignObject>

      {/* Expand / Collapse Subtask Toggle Button */}
      {hasChildren && (
        <g
          transform={`translate(0, ${radius + 6})`}
          className="cursor-pointer"
          onClick={(e) => onToggleExpand(node.id, e)}
          data-testid={`toggle-expand-${node.id}`}
        >
          <circle
            r="10"
            className="fill-slate-900 stroke-slate-600 hover:stroke-emerald-400 transition-colors"
          />
          {isExpanded ? (
            <text textAnchor="middle" dy="3.5" className="fill-slate-300 text-xs font-bold">
              −
            </text>
          ) : (
            <text textAnchor="middle" dy="3.5" className="fill-emerald-400 text-xs font-bold">
              +
            </text>
          )}
        </g>
      )}
    </g>
  )
}

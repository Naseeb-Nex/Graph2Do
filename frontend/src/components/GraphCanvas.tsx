import React, { useState, useRef } from 'react'
import { GraphNode, GraphEdge } from '../types/graph'
import { CircularNode } from './CircularNode'
import { NodeHoverCard } from './NodeHoverCard'
import { calculateNodeProgress, getVisibleElements, getBlockerTitles } from '../utils/graphHelpers'
import { ZoomIn, ZoomOut, Maximize2, Plus, ChevronsDownUp, ChevronsUpDown, Edit3 } from 'lucide-react'

interface GraphCanvasProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  globalExpandMode: 'auto' | 'always-expand' | 'always-collapse'
  filterStatus: 'all' | 'active' | 'completed' | 'blocked'
  onSelectNode: (node: GraphNode | null) => void
  onToggleExpandNode: (nodeId: string) => void
  onOpenCreateModal: () => void
  onOpenEditModal: (node: GraphNode) => void
  onToggleGlobalExpand: (mode: 'auto' | 'always-expand' | 'always-collapse') => void
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  globalExpandMode,
  filterStatus,
  onSelectNode,
  onToggleExpandNode,
  onOpenCreateModal,
  onOpenEditModal,
  onToggleGlobalExpand,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const { visibleNodes, visibleEdges } = getVisibleElements(
    nodes,
    edges,
    globalExpandMode,
    filterStatus
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'canvas-bg') {
      setIsPanning(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleNodeMouseEnter = (node: GraphNode, event: React.MouseEvent) => {
    setHoveredNode(node)
    setHoverPos({ x: event.clientX, y: event.clientY })
  }

  const handleNodeMouseLeave = () => {
    setHoveredNode(null)
  }

  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.4), 2.5))
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 60, y: 60 })
  }

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full bg-slate-950 overflow-hidden select-none border-r border-slate-800"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          const delta = e.deltaY > 0 ? 0.9 : 1.1
          handleZoom(delta)
        }
      }}
      data-testid="graph-canvas"
    >
      {/* Background Dot Grid */}
      <svg
        id="canvas-bg"
        className="absolute inset-0 w-full h-full pointer-events-auto"
        onClick={() => onSelectNode(null)}
      >
        <defs>
          <pattern id="grid-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" className="fill-slate-800/60" />
          </pattern>
          {/* Arrow markers */}
          <marker
            id="arrowhead-seq"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" className="fill-sky-400" />
          </marker>
          <marker
            id="arrowhead-dep"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" className="fill-rose-400" />
          </marker>
          <marker
            id="arrowhead-hier"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" className="fill-slate-600" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dots)" />

        {/* Viewport Transform Group */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges / Sequential Arrows */}
          {visibleEdges.map((edge) => {
            const source = visibleNodes.find((n) => n.id === edge.sourceId)
            const target = visibleNodes.find((n) => n.id === edge.targetId)
            if (!source || !target) return null

            // Bezier curve between nodes
            const dx = target.position.x - source.position.x
            const cx1 = source.position.x + dx * 0.5
            const cy1 = source.position.y
            const cx2 = source.position.x + dx * 0.5
            const cy2 = target.position.y
            const pathD = `M ${source.position.x} ${source.position.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${target.position.x} ${target.position.y}`

            const isSequence = edge.edgeType === 'sequence'
            const isDependency = edge.edgeType === 'dependency'

            return (
              <g key={edge.id} className="pointer-events-none">
                <path
                  d={pathD}
                  fill="none"
                  className={`transition-all duration-300 ${
                    isSequence
                      ? 'stroke-sky-500/70 stroke-[2] stroke-dasharray-none'
                      : isDependency
                      ? 'stroke-rose-500/80 stroke-[2.5] stroke-dasharray-[4,4]'
                      : 'stroke-slate-700/60 stroke-[1.5]'
                  }`}
                  markerEnd={
                    isSequence
                      ? 'url(#arrowhead-seq)'
                      : isDependency
                      ? 'url(#arrowhead-dep)'
                      : 'url(#arrowhead-hier)'
                  }
                />
                {edge.label && (
                  <text
                    x={(source.position.x + target.position.x) / 2}
                    y={(source.position.y + target.position.y) / 2 - 6}
                    textAnchor="middle"
                    className="text-[9px] fill-slate-500 font-medium select-none bg-slate-950 px-1"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {visibleNodes.map((node) => {
            const progress = calculateNodeProgress(node, nodes)
            const isSelected = selectedNodeId === node.id
            const isHovered = hoveredNode?.id === node.id
            const directChildren = nodes.filter((n) => n.parentId === node.id)
            const hasChildren = directChildren.length > 0
            const isExpanded = node.isExpanded !== false

            return (
              <CircularNode
                key={node.id}
                node={node}
                progress={progress}
                isSelected={isSelected}
                isHovered={isHovered}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                onSelect={(n) => onSelectNode(n)}
                onToggleExpand={(nodeId, e) => {
                  e.stopPropagation()
                  onToggleExpandNode(nodeId)
                }}
                onMouseEnter={handleNodeMouseEnter}
                onMouseLeave={handleNodeMouseLeave}
              />
            )
          })}
        </g>
      </svg>

      {/* Floating Canvas Controls Overlay */}
      <div className="absolute bottom-5 left-5 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-xl">
        <button
          onClick={() => handleZoom(1.2)}
          className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* Global Expand/Collapse Toggle */}
        <button
          onClick={() => {
            const nextMode =
              globalExpandMode === 'always-expand'
                ? 'always-collapse'
                : globalExpandMode === 'always-collapse'
                ? 'auto'
                : 'always-expand'
            onToggleGlobalExpand(nextMode)
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            globalExpandMode === 'always-expand'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : globalExpandMode === 'always-collapse'
              ? 'bg-amber-950 text-amber-300 border border-amber-800'
              : 'bg-slate-800 text-slate-300'
          }`}
          data-testid="toggle-global-expand"
        >
          {globalExpandMode === 'always-expand' ? (
            <>
              <ChevronsDownUp className="w-3.5 h-3.5" />
              <span>Expanded</span>
            </>
          ) : globalExpandMode === 'always-collapse' ? (
            <>
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span>Collapsed</span>
            </>
          ) : (
            <span>Tree: Auto</span>
          )}
        </button>
      </div>

      {/* Manual Controls Toolbar */}
      <div className="absolute top-5 left-5 flex items-center gap-2">
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          data-testid="add-node-btn"
        >
          <Plus className="w-4 h-4" />
          <span>New Node</span>
        </button>

        {selectedNode && (
          <button
            onClick={() => onOpenEditModal(selectedNode)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl shadow-lg transition-all"
            data-testid="edit-selected-node-btn"
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
            <span>Edit "{selectedNode.title.slice(0, 14)}..."</span>
          </button>
        )}
      </div>

      {/* Hover Card Popover */}
      {hoveredNode && (
        <NodeHoverCard
          node={hoveredNode}
          progress={calculateNodeProgress(hoveredNode, nodes)}
          blockers={getBlockerTitles(hoveredNode, nodes)}
          position={hoverPos}
        />
      )}
    </div>
  )
}

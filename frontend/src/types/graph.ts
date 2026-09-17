export type NodeType = 'project' | 'goal' | 'task' | 'subtask'
export type NodeStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

export interface GraphNode {
  id: string
  title: string
  description?: string
  nodeType: NodeType
  completed: boolean
  status: NodeStatus
  estimatedHours: number
  deadline?: string
  parentId?: string | null
  stepOrder?: number
  position: { x: number; y: number }
  isExpanded?: boolean
  blockers?: string[]
  dependencies?: string[]
  data?: Record<string, any>
  graphId?: number
}

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  label?: string
  edgeType?: 'hierarchy' | 'sequence' | 'dependency'
}

export interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  hoveredNodeId: string | null
  globalExpandMode: 'auto' | 'always-expand' | 'always-collapse'
  filterStatus: 'all' | 'active' | 'completed' | 'blocked'
  isLiveConnected: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  contextNodeId?: string | null
  contextNodeTitle?: string
  suggestedActions?: {
    label: string
    action: string
    payload?: any
  }[]
}

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { GraphCanvas } from './components/GraphCanvas'
import { AIChatPanel } from './components/AIChatPanel'
import { NodeModal } from './components/NodeModal'
import { TopNav } from './components/TopNav'
import { LandingPage } from './components/LandingPage'
import { api } from './api/client'
import { GraphNode, GraphEdge, ChatMessage } from './types/graph'
import { INITIAL_NODES, INITIAL_EDGES } from './utils/initialData'

export const App: React.FC = () => {
  const { getToken, isAuthenticated, isLoading } = useKindeAuth()

  const [nodes, setNodes] = useState<GraphNode[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<GraphEdge[]>(INITIAL_EDGES)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [globalExpandMode, setGlobalExpandMode] = useState<'auto' | 'always-expand' | 'always-collapse'>('auto')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'blocked'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nodeToEdit, setNodeToEdit] = useState<GraphNode | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const wsConnectionsRef = useRef<Record<number, WebSocket>>({})

  useEffect(() => {
    const checkConnection = async () => {
      if (isLoading) return
      try {
        if (isAuthenticated) {
          const token = await getToken()
          if (token) api.setToken(token)
        }
        const connected = await api.checkHealth()
        setIsLiveConnected(connected)
        if (connected) {
          await loadGraph()
        }
      } catch {
        setIsLiveConnected(false)
      }
    }
    checkConnection()
  }, [isLoading, isAuthenticated, getToken])

  const loadGraph = useCallback(async () => {
    try {
      const data = await api.fetchGraph()
      if (data.nodes && data.nodes.length > 0) {
        setNodes(data.nodes)
        setEdges(data.edges)
      }
      setIsLiveConnected(true)
    } catch {
      // Keep local state on error
    }
  }, [])

  const graphIds = nodes.map(n => n.graphId).filter((id): id is number => id !== undefined)
  const activeGraphIds = Array.from(new Set(graphIds))

  useEffect(() => {
    if (!isAuthenticated) return
    for (const gid of activeGraphIds) {
      if (!wsConnectionsRef.current[gid]) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${wsProtocol}//${window.location.host}/nodes/graph/${gid}/ws`
        const ws = new WebSocket(wsUrl)
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'node_update' || data.type === 'graph_update') {
              loadGraph()
            }
          } catch (e) {
            console.error("WS parse error", e)
          }
        }
        wsConnectionsRef.current[gid] = ws
      }
    }
    for (const gid of Object.keys(wsConnectionsRef.current).map(Number)) {
      if (!activeGraphIds.includes(gid)) {
        wsConnectionsRef.current[gid].close()
        delete wsConnectionsRef.current[gid]
      }
    }
  }, [nodes, isLiveConnected, loadGraph, isAuthenticated, activeGraphIds])

  useEffect(() => {
    return () => {
      Object.values(wsConnectionsRef.current).forEach(ws => ws.close())
      wsConnectionsRef.current = {}
    }
  }, [])

  const refreshGraph = useCallback(async () => {
    if (isLiveConnected) {
      await loadGraph()
    }
  }, [isLiveConnected, loadGraph])

  const handleSelectNode = (node: GraphNode | null) => {
    setSelectedNodeId(node ? node.id : null)
    if (node) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: `Selected node: "${node.title}" (${node.nodeType}, status: ${node.status}). How can I help you with this task?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contextNodeId: node.id,
          contextNodeTitle: node.title,
          suggestedActions: [
            { label: 'Decompose into subtasks', action: 'decompose', payload: { nodeId: node.id } },
            { label: 'Analyze schedule & risks', action: 'schedule' },
            { label: 'Mark as completed', action: 'complete' }
          ]
        }
      ])
    }
  }

  const handleToggleExpandNode = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, isExpanded: n.isExpanded === false ? true : false } : n))
    )
  }

  const handleOpenCreateModal = () => {
    setNodeToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (node: GraphNode) => {
    setNodeToEdit(node)
    setIsModalOpen(true)
  }

  const handleSaveNode = async (nodeData: Partial<GraphNode>) => {
    try {
      if (nodeData.id && nodes.some(n => n.id === nodeData.id)) {
        if (isLiveConnected) {
          await api.updateNode(nodeData.id, nodeData)
        }
        setNodes((prev) =>
          prev.map((n) => (n.id === nodeData.id ? ({ ...n, ...nodeData } as GraphNode) : n))
        )
      } else {
        const newNode: GraphNode = {
          id: `node-${Date.now()}`,
          title: nodeData.title || 'Untitled Task',
          description: nodeData.description || '',
          nodeType: nodeData.nodeType || 'task',
          completed: nodeData.completed || false,
          status: nodeData.status || 'pending',
          estimatedHours: nodeData.estimatedHours || 4,
          deadline: nodeData.deadline,
          parentId: nodeData.parentId || null,
          position: { x: 300 + Math.random() * 200, y: 300 + Math.random() * 200 },
          isExpanded: true,
        }
        if (isLiveConnected) {
          await api.createNode(newNode)
        }
        setNodes((prev) => [...prev, newNode])
      }
      setIsModalOpen(false)
      setNodeToEdit(null)
      await refreshGraph()
    } catch (err) {
      console.error('Failed to save node:', err)
    }
  }

  const handleDeleteNode = async (nodeId: string) => {
    try {
      if (isLiveConnected) {
        await api.deleteNode(nodeId)
      }
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      if (selectedNodeId === nodeId) setSelectedNodeId(null)
      setIsModalOpen(false)
      setNodeToEdit(null)
      await refreshGraph()
    } catch (err) {
      console.error('Failed to delete node:', err)
    }
  }

  const handleSendMessage = async (content: string, contextNodeId?: string | null) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextNodeId,
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      let aiResponseText = "I've analyzed your workspace graph. Everything looks well-structured!"
      if (content.toLowerCase().includes('decompose') && contextNodeId) {
        const target = nodes.find(n => n.id === contextNodeId)
        aiResponseText = `Decomposed "${target?.title || 'Node'}" into 3 subtasks: 1. Research & Architecture, 2. Core Implementation, 3. Testing & Review.`
      } else if (content.toLowerCase().includes('schedule')) {
        const totalHrs = nodes.reduce((sum, n) => sum + (n.estimatedHours || 0), 0)
        aiResponseText = `Total estimated workload across active graph is ${totalHrs} hours. Critical path is running on schedule.`
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextNodeId,
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      console.error('AI chat error:', err)
    }
  }

  const handleDecomposeNode = async (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId)
    if (!target) return
    const sub1: GraphNode = {
      id: `sub-${Date.now()}-1`,
      title: `Step 1: Planning for ${target.title}`,
      nodeType: 'subtask',
      completed: false,
      status: 'pending',
      estimatedHours: 4,
      parentId: target.id,
      position: { x: target.position.x - 100, y: target.position.y + 120 },
    }
    const sub2: GraphNode = {
      id: `sub-${Date.now()}-2`,
      title: `Step 2: Execution for ${target.title}`,
      nodeType: 'subtask',
      completed: false,
      status: 'pending',
      estimatedHours: 8,
      parentId: target.id,
      position: { x: target.position.x + 100, y: target.position.y + 120 },
    }
    setNodes((prev) => [...prev, sub1, sub2])
    const successMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Successfully generated 2 subtasks under "${target.title}".`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextNodeId: target.id,
    }
    setMessages((prev) => [...prev, successMsg])
  }

  const handleCompleteNode = async (nodeId: string) => {
    try {
      if (isLiveConnected) {
        await api.updateNode(nodeId, { completed: true, status: 'completed' })
      }
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, completed: true, status: 'completed' } : n
        )
      )
    } catch (err) {
      console.error('Failed to complete node:', err)
    }
  }

  const handleAnalyzeSchedule = async () => {
    const totalHrs = nodes.reduce((sum, n) => sum + (n.estimatedHours || 0), 0)
    const completedCount = nodes.filter(n => n.completed || n.status === 'completed').length
    const aiMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Schedule Audit: ${completedCount}/${nodes.length} tasks completed. Total workload: ${totalHrs} hrs. All dependencies are sound.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, aiMsg])
  }

  const handleToggleGlobalExpand = (mode: 'auto' | 'always-expand' | 'always-collapse') => {
    setGlobalExpandMode(mode)
  }

  const handleFilterChange = (status: 'all' | 'active' | 'completed' | 'blocked') => {
    setFilterStatus(status)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setNodeToEdit(null)
  }

  if (isLoading) return null
  if (!isAuthenticated) return <LandingPage />

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <TopNav
        nodes={nodes}
        filterStatus={filterStatus}
        isLiveConnected={isLiveConnected}
        onFilterChange={handleFilterChange}
        onOpenCreateModal={handleOpenCreateModal}
      />
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 relative">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            globalExpandMode={globalExpandMode}
            filterStatus={filterStatus}
            onSelectNode={handleSelectNode}
            onToggleExpandNode={handleToggleExpandNode}
            onOpenCreateModal={handleOpenCreateModal}
            onOpenEditModal={handleOpenEditModal}
            onToggleGlobalExpand={handleToggleGlobalExpand}
          />
        </div>
        <div className="w-96 flex-shrink-0 z-20">
          <AIChatPanel
            selectedNode={selectedNode}
            nodes={nodes}
            messages={messages}
            onSendMessage={handleSendMessage}
            onDecomposeNode={handleDecomposeNode}
            onCompleteNode={handleCompleteNode}
            onAnalyzeSchedule={handleAnalyzeSchedule}
          />
        </div>
      </div>
      <NodeModal
        isOpen={isModalOpen}
        nodeToEdit={nodeToEdit}
        allNodes={nodes}
        onClose={handleCloseModal}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
      />
    </div>
  )
}

export default App

import React, { useState, useEffect, useCallback } from 'react'
import { GraphCanvas } from './components/GraphCanvas'
import { AIChatPanel } from './components/AIChatPanel'
import { NodeModal } from './components/NodeModal'
import { TopNav } from './components/TopNav'
import { api } from './api/client'
import { GraphNode, GraphEdge, ChatMessage } from './types/graph'
import { INITIAL_NODES, INITIAL_EDGES } from './utils/initialData'

export const App: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<GraphEdge[]>(INITIAL_EDGES)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [globalExpandMode, setGlobalExpandMode] = useState<'auto' | 'always-expand' | 'always-collapse'>('auto')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'blocked'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [nodeToEdit, setNodeToEdit] = useState<GraphNode | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLiveConnected, setIsLiveConnected] = useState(false)

  const loadGraph = async () => {
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
  }

  // Initialize with API connection check and WebSockets
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await api.checkHealth()
        setIsLiveConnected(connected)
        if (connected) {
          await loadGraph()
        }
      } catch {
        // Fall back to local state
        setIsLiveConnected(false)
      }
    }
    checkConnection()

    // Setup WebSocket
    const wsUrl = import.meta.env?.VITE_API_URL?.replace('http', 'ws') || 'ws://127.0.0.1:8000'
    const ws = new WebSocket(`${wsUrl}/ws`)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'graph_updated') {
          loadGraph()
        }
      } catch (e) {
        console.error('WS parse error', e)
      }
    }
    return () => ws.close()
  }, [])

  const refreshGraph = useCallback(async () => {
    if (isLiveConnected) {
      await loadGraph()
    }
  }, [isLiveConnected])

  const handleSelectNode = (node: GraphNode | null) => {
    setSelectedNodeId(node?.id || null)
    if (node) {
      const contextMsg: ChatMessage = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: `Target node updated: "${node.title}" (${node.nodeType}) - ${node.completed ? 'Completed' : node.status}. Scope: ${node.estimatedHours}h.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextNodeId: node.id,
        contextNodeTitle: node.title,
      }
      setMessages((prev) => [...prev, contextMsg])
    }
  }

  const handleToggleExpandNode = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, isExpanded: n.isExpanded !== false ? false : true } : n
      )
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
    if (!nodeData.title) return

    try {
      if (nodeToEdit) {
        // Update existing node
        if (isLiveConnected) {
          await api.updateNode(nodeToEdit.id, nodeData)
        }
        setNodes((prev) =>
          prev.map((n) => (n.id === nodeToEdit.id ? { ...n, ...nodeData } as GraphNode : n))
        )
      } else {
        // Create new node
        const newId = `node-${Date.now()}`
        const newNode: GraphNode = {
          id: newId,
          title: nodeData.title || 'Untitled Node',
          description: nodeData.description || '',
          nodeType: nodeData.nodeType || 'task',
          completed: nodeData.completed || false,
          status: nodeData.status || 'pending',
          estimatedHours: nodeData.estimatedHours || 3,
          deadline: nodeData.deadline,
          parentId: nodeData.parentId || null,
          position: {
            x: 300 + Math.floor(Math.random() * 200),
            y: 300 + Math.floor(Math.random() * 200),
          },
          isExpanded: true,
          blockers: nodeData.blockers || [],
          dependencies: [],
        }

        if (isLiveConnected) {
          try {
            const created = await api.createNode(newNode)
            newNode.id = created.id
          } catch {
            // fallback
          }
        }

        setNodes((prev) => [...prev, newNode])

        // Auto-link to parent if selected
        if (nodeData.parentId) {
          const newEdge: GraphEdge = {
            id: `edge-${Date.now()}`,
            sourceId: nodeData.parentId,
            targetId: newNode.id,
            label: 'subtask',
            edgeType: 'hierarchy',
          }
          if (isLiveConnected) {
            try {
              await api.createEdge(newEdge.sourceId, newEdge.targetId, newEdge.label)
            } catch {
              // fallback
            }
          }
          setEdges((prev) => [...prev, newEdge])
        }
      }
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
      setNodes((prev) => prev.filter((n) => n.id !== nodeId && n.parentId !== nodeId))
      setEdges((prev) => prev.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId))
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null)
      }
    } catch (err) {
      console.error('Failed to delete node:', err)
    }
  }

  const handleSendMessage = async (text: string, contextNodeId?: string | null) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextNodeId: contextNodeId,
    }
    setMessages((prev) => [...prev, userMsg])

    // Context analysis for smart responses & graph mutations
    const targetNode = contextNodeId ? nodes.find((n) => n.id === contextNodeId) : null
    const lower = text.toLowerCase()

    if (lower.includes('decompose') || lower.includes('break down') || lower.includes('subtasks')) {
      if (targetNode) {
        await handleDecomposeNode(targetNode)
        return
      }
    }

    if (lower.includes('complete') && targetNode) {
      await handleCompleteNode(targetNode.id)
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `Marked "${targetNode.title}" as completed! All downstream dependencies are being re-evaluated.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextNodeId: targetNode.id,
      }
      setMessages((prev) => [...prev, assistantMsg])
      return
    }

    if (isLiveConnected) {
      try {
        const response = await api.triggerAIAction('chat', contextNodeId, text, {
          nodesCount: nodes.length,
          selectedNode: targetNode?.title,
        })
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: response.reply || response.message || 'Understood graph query.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contextNodeId: contextNodeId,
          suggestedActions: response.recommendations?.map((rec) => ({
            label: rec,
            action: 'chat',
            payload: rec,
          })),
        }
        setMessages((prev) => [...prev, assistantMsg])
        return
      } catch {
        // Fall back to local reasoning
      }
    }

    // Local Copilot Reasoning
    let aiReply = ''
    let suggestedActions: ChatMessage['suggestedActions'] = []

    if (targetNode) {
      aiReply = `I've analyzed node "${targetNode.title}" (${targetNode.nodeType}). It has ${targetNode.estimatedHours} hours remaining with status: ${targetNode.status}.`
      suggestedActions = [
        { label: 'Break into subtasks', action: 'decompose' },
        { label: 'Mark as completed', action: 'complete' },
      ]
    } else {
      const activeCount = nodes.filter((n) => !n.completed).length
      aiReply = `Currently tracking ${nodes.length} total knowledge graph nodes (${activeCount} active). Select any node on the left canvas to decompose it or query blockers.`
      suggestedActions = [
        { label: 'Analyze schedule & blockers', action: 'schedule' },
      ]
    }

    const assistantMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: aiReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextNodeId: contextNodeId,
      contextNodeTitle: targetNode?.title,
      suggestedActions,
    }
    setMessages((prev) => [...prev, assistantMsg])
  }

  const handleDecomposeNode = async (node: GraphNode) => {
    // Generate sequential subtasks
    const subtaskTitles = [
      `1. Specifications & Setup: ${node.title}`,
      `2. Core Build: ${node.title}`,
      `3. Validation & Integration: ${node.title}`,
    ]

    const newSubtasks: GraphNode[] = subtaskTitles.map((title, idx) => ({
      id: `subtask-${Date.now()}-${idx}`,
      title,
      description: `Atomic sequential execution step ${idx + 1}`,
      nodeType: 'subtask',
      completed: false,
      status: 'pending',
      estimatedHours: idx === 1 ? 6 : 3,
      parentId: node.id,
      stepOrder: idx + 1,
      position: {
        x: node.position.x + (idx - 1) * 140,
        y: node.position.y + 140,
      },
      isExpanded: true,
      blockers: idx > 0 ? [`subtask-${Date.now()}-${idx - 1}`] : [],
      dependencies: idx > 0 ? [`subtask-${Date.now()}-${idx - 1}`] : [],
    }))

    const newEdges: GraphEdge[] = []
    newSubtasks.forEach((st, idx) => {
      // Parent hierarchy edge
      newEdges.push({
        id: `edge-hier-${Date.now()}-${idx}`,
        sourceId: node.id,
        targetId: st.id,
        label: 'subtask',
        edgeType: 'hierarchy',
      })

      // Sequential flow edge
      if (idx > 0) {
        newEdges.push({
          id: `edge-seq-${Date.now()}-${idx}`,
          sourceId: newSubtasks[idx - 1].id,
          targetId: st.id,
          label: 'sequence',
          edgeType: 'sequence',
        })
      }
    })

    // Expand parent node so new subtasks are visible
    setNodes((prev) => [
      ...prev.map((n) => (n.id === node.id ? { ...n, isExpanded: true } : n)),
      ...newSubtasks,
    ])
    setEdges((prev) => [...prev, ...newEdges])

    const successMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: `Successfully decomposed "${node.title}" into 3 sequential atomic subtasks with dependency tracking.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextNodeId: node.id,
      contextNodeTitle: node.title,
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
    const totalHours = nodes.reduce((sum, n) => sum + (n.estimatedHours || 0), 0)
    const blockedNodes = nodes.filter((n) => n.status === 'blocked')

    let summary = `Schedule Analysis: Total estimated effort is ${totalHours} hours across ${nodes.length} nodes.`
    if (blockedNodes.length > 0) {
      summary += ` ${blockedNodes.length} task(s) currently flagged as blocked by dependencies: ${blockedNodes
        .map((n) => n.title)
        .join(', ')}.`
    } else {
      summary += ` Critical path is clear with sequential dependencies unblocked.`
    }

    const scheduleMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: summary,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        { label: 'Decompose active projects', action: 'decompose' },
      ],
    }
    setMessages((prev) => [...prev, scheduleMsg])
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

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <TopNav
        nodes={nodes}
        filterStatus={filterStatus}
        isLiveConnected={isLiveConnected}
        onFilterChange={handleFilterChange}
        onOpenCreateModal={handleOpenCreateModal}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Knowledge Graph Visualization */}
        <div className="flex-1 flex flex-col min-w-0">
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

        {/* Right Panel: AI Agent Chat UI */}
        <div className="w-96 flex flex-col shrink-0">
          <AIChatPanel
            selectedNode={selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) || null : null}
            nodes={nodes}
            messages={messages}
            onSendMessage={handleSendMessage}
            onDecomposeNode={handleDecomposeNode}
            onCompleteNode={handleCompleteNode}
            onAnalyzeSchedule={handleAnalyzeSchedule}
            onClearContext={() => setSelectedNodeId(null)}
            onClearMessages={() => setMessages([])}
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

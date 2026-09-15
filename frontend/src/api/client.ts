import { GraphNode, GraphEdge } from '../types/graph'

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''
const AUTH_TOKEN =
  typeof window !== 'undefined' && window.localStorage
    ? window.localStorage.getItem('graph2do_token') || 'mock-token'
    : 'mock-token'

export interface FullGraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface AIActionResponse {
  action: string
  message?: string
  reply?: string
  recommendations?: string[]
  created_nodes?: Array<{ id: number | string; title: string; hours?: number }>
}

class ApiClient {
  private token: string = AUTH_TOKEN
  private isConnected: boolean = false

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('graph2do_token', token)
    }
  }

  getIsConnected(): boolean {
    return this.isConnected
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...(options.headers || {}),
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      this.isConnected = true
      return await response.json()
    } catch (err) {
      this.isConnected = false
      throw err
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.request<{ message: string }>('/')
      this.isConnected = true
      return true
    } catch {
      this.isConnected = false
      return false
    }
  }

  async fetchGraph(): Promise<FullGraphResponse> {
    const raw = await this.request<{ nodes: any[]; edges: any[] }>('/nodes/graph/full')
    const nodes: GraphNode[] = raw.nodes.map((n) => ({
      id: String(n.id),
      title: n.title,
      description: n.description || '',
      completed: !!n.completed,
      nodeType: (n.data?.node_type as any) || (n.data?.parent_id ? 'subtask' : 'project'),
      status: n.completed ? 'completed' : (n.data?.status || 'in_progress'),
      estimatedHours: n.data?.estimated_hours || 4,
      deadline: n.data?.deadline,
      parentId: n.data?.parent_id ? String(n.data.parent_id) : null,
      stepOrder: n.data?.step_order,
      position: n.data?.position || { x: 300, y: 300 },
      isExpanded: n.data?.is_expanded ?? true,
      blockers: n.data?.blockers || [],
      dependencies: n.data?.dependencies || [],
      data: n.data,
    }))

    const edges: GraphEdge[] = raw.edges.map((e) => ({
      id: String(e.id),
      sourceId: String(e.source_id),
      targetId: String(e.target_id),
      label: e.label,
      edgeType: (e.label === 'subtask' || e.label === 'contains') ? 'hierarchy' : 'sequence',
    }))

    return { nodes, edges }
  }

  async createNode(node: Partial<GraphNode>): Promise<GraphNode> {
    const payload = {
      title: node.title,
      description: node.description,
      completed: node.completed || false,
      data: {
        node_type: node.nodeType,
        status: node.status,
        estimated_hours: node.estimatedHours,
        deadline: node.deadline,
        parent_id: node.parentId,
        position: node.position,
        is_expanded: node.isExpanded,
        blockers: node.blockers,
        dependencies: node.dependencies,
        ...(node.data || {}),
      },
    }

    const res = await this.request<any>('/nodes/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return {
      id: String(res.id),
      title: res.title,
      description: res.description,
      completed: res.completed,
      nodeType: res.data?.node_type || 'task',
      status: res.data?.status || 'pending',
      estimatedHours: res.data?.estimated_hours || 2,
      deadline: res.data?.deadline,
      parentId: res.data?.parent_id ? String(res.data.parent_id) : null,
      position: res.data?.position || { x: 400, y: 400 },
      isExpanded: res.data?.is_expanded ?? true,
      blockers: res.data?.blockers || [],
      dependencies: res.data?.dependencies || [],
    }
  }

  async updateNode(id: string | number, updates: Partial<GraphNode>): Promise<void> {
    const payload: any = {}
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.completed !== undefined) payload.completed = updates.completed

    const dataUpdates: Record<string, any> = {}
    if (updates.nodeType !== undefined) dataUpdates.node_type = updates.nodeType
    if (updates.status !== undefined) dataUpdates.status = updates.status
    if (updates.estimatedHours !== undefined) dataUpdates.estimated_hours = updates.estimatedHours
    if (updates.deadline !== undefined) dataUpdates.deadline = updates.deadline
    if (updates.parentId !== undefined) dataUpdates.parent_id = updates.parentId
    if (updates.position !== undefined) dataUpdates.position = updates.position
    if (updates.isExpanded !== undefined) dataUpdates.is_expanded = updates.isExpanded
    if (updates.blockers !== undefined) dataUpdates.blockers = updates.blockers
    if (updates.dependencies !== undefined) dataUpdates.dependencies = updates.dependencies

    if (Object.keys(dataUpdates).length > 0) {
      payload.data = dataUpdates
    }

    await this.request(`/nodes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  async deleteNode(id: string | number): Promise<void> {
    await this.request(`/nodes/${id}`, {
      method: 'DELETE',
    })
  }

  async createEdge(sourceId: string | number, targetId: string | number, label?: string): Promise<void> {
    await this.request('/nodes/edges', {
      method: 'POST',
      body: JSON.stringify({
        source_id: Number(sourceId),
        target_id: Number(targetId),
        label: label || 'dependency',
      }),
    })
  }

  async triggerAIAction(action: string, nodeId?: string | null, message?: string, context?: any): Promise<AIActionResponse> {
    return await this.request<AIActionResponse>('/nodes/ai/action', {
      method: 'POST',
      body: JSON.stringify({
        action,
        node_id: nodeId ? (isNaN(Number(nodeId)) ? undefined : Number(nodeId)) : undefined,
        message,
        graph_context: context,
      }),
    })
  }
}

export const api = new ApiClient()

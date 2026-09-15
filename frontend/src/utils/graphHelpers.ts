import { GraphNode, GraphEdge } from '../types/graph'

/**
 * Calculates completion percentage for a project/goal based on its descendants
 */
export function calculateNodeProgress(node: GraphNode, allNodes: GraphNode[]): number {
  if (node.completed) return 100

  const directChildren = allNodes.filter((n) => n.parentId === node.id)
  if (directChildren.length === 0) {
    return node.completed ? 100 : node.status === 'in_progress' ? 50 : 0
  }

  // Recursive calculation of children
  let totalTasks = 0
  let completedTasks = 0

  function countDescendants(parentId: string) {
    const children = allNodes.filter((n) => n.parentId === parentId)
    for (const child of children) {
      totalTasks++
      if (child.completed || child.status === 'completed') {
        completedTasks++
      }
      countDescendants(child.id)
    }
  }

  countDescendants(node.id)

  if (totalTasks === 0) return node.completed ? 100 : 0
  return Math.round((completedTasks / totalTasks) * 100)
}

/**
 * Computes visible nodes and edges based on expand/collapse mode
 */
export function getVisibleElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
  expandMode: 'auto' | 'always-expand' | 'always-collapse',
  filterStatus: 'all' | 'active' | 'completed' | 'blocked'
) {
  let visibleNodes: GraphNode[] = []

  if (expandMode === 'always-expand') {
    visibleNodes = [...nodes]
  } else if (expandMode === 'always-collapse') {
    // Show only root projects and top-level goals
    visibleNodes = nodes.filter((n) => !n.parentId)
  } else {
    // Auto mode: Walk hierarchy and only show children if parent is expanded
    const collapsedParentIds = new Set<string>()

    nodes.forEach((n) => {
      if (n.isExpanded === false) {
        collapsedParentIds.add(n.id)
      }
    })

    function isDescendantOfCollapsed(node: GraphNode): boolean {
      if (!node.parentId) return false
      if (collapsedParentIds.has(node.parentId)) return true
      const parent = nodes.find((n) => n.id === node.parentId)
      if (!parent) return false
      return isDescendantOfCollapsed(parent)
    }

    visibleNodes = nodes.filter((n) => !isDescendantOfCollapsed(n))
  }

  // Apply status filter
  if (filterStatus !== 'all') {
    const matchingNodeIds = new Set(
      visibleNodes
        .filter((n) => {
          if (filterStatus === 'completed') return n.completed || n.status === 'completed'
          if (filterStatus === 'blocked') return n.status === 'blocked'
          if (filterStatus === 'active') return !n.completed && n.status !== 'blocked'
          return true
        })
        .map((n) => n.id)
    )

    // Keep parents of matching nodes so graph connectivity remains logical
    const finalNodeIds = new Set<string>(matchingNodeIds)
    visibleNodes.forEach((n) => {
      if (matchingNodeIds.has(n.id) && n.parentId) {
        finalNodeIds.add(n.parentId)
      }
    })

    visibleNodes = visibleNodes.filter((n) => finalNodeIds.has(n.id))
  }

  const visibleNodeIdSet = new Set(visibleNodes.map((n) => n.id))

  const visibleEdges = edges.filter(
    (e) => visibleNodeIdSet.has(e.sourceId) && visibleNodeIdSet.has(e.targetId)
  )

  return { visibleNodes, visibleEdges }
}

/**
 * Returns names of tasks blocking a given node
 */
export function getBlockerTitles(node: GraphNode, allNodes: GraphNode[]): string[] {
  const blockerIds = node.blockers || []
  const dependencyIds = node.dependencies || []
  const combined = Array.from(new Set([...blockerIds, ...dependencyIds]))

  return combined
    .map((id) => allNodes.find((n) => n.id === id))
    .filter((n): n is GraphNode => !!n && !n.completed)
    .map((n) => `${n.title} (${n.status})`)
}

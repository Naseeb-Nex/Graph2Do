import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CircularNode } from '../components/CircularNode'
import { GraphNode } from '../types/graph'

describe('CircularNode Component', () => {
  const mockNode: GraphNode = {
    id: 'node-1',
    title: 'Core Engine Build',
    description: 'Build knowledge graph canvas engine',
    nodeType: 'project',
    completed: false,
    status: 'in_progress',
    estimatedHours: 10,
    position: { x: 200, y: 200 },
    isExpanded: true,
  }

  it('renders node title and project progress ring', () => {
    const onSelect = vi.fn()
    const onToggleExpand = vi.fn()
    const onMouseEnter = vi.fn()
    const onMouseLeave = vi.fn()

    render(
      <svg>
        <CircularNode
          node={mockNode}
          progress={75}
          isSelected={false}
          isHovered={false}
          hasChildren={true}
          isExpanded={true}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      </svg>
    )

    expect(screen.getByText('Core Engine Build')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('handles click selection and expand/collapse toggling', () => {
    const onSelect = vi.fn()
    const onToggleExpand = vi.fn()
    const onMouseEnter = vi.fn()
    const onMouseLeave = vi.fn()

    render(
      <svg>
        <CircularNode
          node={mockNode}
          progress={50}
          isSelected={false}
          isHovered={false}
          hasChildren={true}
          isExpanded={true}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      </svg>
    )

    const nodeElement = screen.getByTestId('node-node-1')
    fireEvent.click(nodeElement)
    expect(onSelect).toHaveBeenCalledWith(mockNode)

    const toggleBtn = screen.getByTestId('toggle-expand-node-1')
    fireEvent.click(toggleBtn)
    expect(onToggleExpand).toHaveBeenCalledWith('node-1', expect.anything())
  })
})

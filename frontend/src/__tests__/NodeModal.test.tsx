import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { NodeModal } from '../components/NodeModal'
import { GraphNode } from '../types/graph'

describe('NodeModal Component (Manual Editing)', () => {
  const mockNodes: GraphNode[] = [
    {
      id: 'proj-1',
      title: 'Main Project',
      nodeType: 'project',
      completed: false,
      status: 'in_progress',
      estimatedHours: 8,
      position: { x: 100, y: 100 },
    },
  ]

  it('renders creation form and submits new node', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <NodeModal
        isOpen={true}
        nodeToEdit={null}
        allNodes={mockNodes}
        onClose={onClose}
        onSave={onSave}
      />
    )

    expect(screen.getByText('Create New Knowledge Node')).toBeInTheDocument()

    const titleInput = screen.getByTestId('node-title-input')
    const hoursInput = screen.getByTestId('node-hours-input')
    const saveBtn = screen.getByTestId('save-node-btn')

    fireEvent.change(titleInput, { target: { value: 'Implement Authentication' } })
    fireEvent.change(hoursInput, { target: { value: '6' } })

    await act(async () => {
      fireEvent.click(saveBtn)
    })

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Implement Authentication',
        estimatedHours: 6,
      })
    )
  })

  it('populates fields when editing an existing node and allows deletion', async () => {
    const onSave = vi.fn()
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <NodeModal
        isOpen={true}
        nodeToEdit={mockNodes[0]}
        allNodes={mockNodes}
        onClose={onClose}
        onSave={onSave}
        onDelete={onDelete}
      />
    )

    expect(screen.getByText('Edit Node Details')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Main Project')).toBeInTheDocument()

    const deleteBtn = screen.getByTestId('delete-node-btn')
    await act(async () => {
      fireEvent.click(deleteBtn)
    })
    expect(onDelete).toHaveBeenCalledWith('proj-1')
  })
})

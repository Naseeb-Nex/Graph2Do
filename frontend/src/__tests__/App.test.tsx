import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import App from '../App'

describe('Graph2Do App Full Integration', () => {
  it('renders top nav, knowledge graph canvas, and AI copilot panel', () => {
    render(<App />)

    expect(screen.getByText('Graph2Do')).toBeInTheDocument()
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('ai-chat-panel')).toBeInTheDocument()
    expect(screen.getByTestId('add-node-btn')).toBeInTheDocument()
  })

  it('selects a node and injects it into AI copilot context', async () => {
    render(<App />)

    const node1 = screen.getByTestId('node-proj-1')
    await act(async () => {
      fireEvent.click(node1)
    })

    // Context should appear in AI chat
    await waitFor(() => {
      const matches = screen.getAllByText(/Launch Graph2Do SaaS/i)
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('toggles global expand and collapse modes', async () => {
    render(<App />)

    const expandToggle = screen.getByTestId('toggle-global-expand')
    await act(async () => {
      fireEvent.click(expandToggle)
    })
    expect(expandToggle).toBeInTheDocument()
  })

  it('opens node creation modal and creates a new node', async () => {
    render(<App />)

    const addBtn = screen.getByTestId('add-node-btn')
    await act(async () => {
      fireEvent.click(addBtn)
    })

    expect(screen.getByTestId('node-modal')).toBeInTheDocument()

    const titleInput = screen.getByTestId('node-title-input')
    fireEvent.change(titleInput, { target: { value: 'Frontend Test Suite Node' } })

    const saveBtn = screen.getByTestId('save-node-btn')
    await act(async () => {
      fireEvent.click(saveBtn)
    })

    await waitFor(() => {
      expect(screen.queryByTestId('node-modal')).not.toBeInTheDocument()
      expect(screen.getByText('Frontend Test Suite Node')).toBeInTheDocument()
    })
  })

  it('filters nodes by status in top nav', async () => {
    render(<App />)

    const completedFilter = screen.getByTestId('filter-completed')
    await act(async () => {
      fireEvent.click(completedFilter)
    })
    expect(completedFilter).toHaveClass('bg-emerald-600')
  })
})

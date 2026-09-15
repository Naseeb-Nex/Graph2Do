import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { AIChatPanel } from '../components/AIChatPanel'
import { GraphNode, ChatMessage } from '../types/graph'

describe('AIChatPanel Component', () => {
  const mockNode: GraphNode = {
    id: 'proj-1',
    title: 'Launch SaaS Platform',
    nodeType: 'project',
    completed: false,
    status: 'in_progress',
    estimatedHours: 20,
    position: { x: 100, y: 100 },
  }

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello! I am your Graph Copilot.',
      timestamp: '10:00 AM',
    },
  ]

  it('displays selected node context and action chips', () => {
    const onSend = vi.fn()
    const onDecompose = vi.fn()
    const onComplete = vi.fn()
    const onSchedule = vi.fn()
    const onClearContext = vi.fn()
    const onClearMessages = vi.fn()

    render(
      <AIChatPanel
        selectedNode={mockNode}
        nodes={[mockNode]}
        messages={mockMessages}
        onSendMessage={onSend}
        onDecomposeNode={onDecompose}
        onCompleteNode={onComplete}
        onAnalyzeSchedule={onSchedule}
        onClearContext={onClearContext}
        onClearMessages={onClearMessages}
      />
    )

    expect(screen.getByText('Launch SaaS Platform')).toBeInTheDocument()
    expect(screen.getByTestId('chip-decompose')).toBeInTheDocument()
    expect(screen.getByTestId('chip-complete')).toBeInTheDocument()
    expect(screen.getByTestId('chip-schedule')).toBeInTheDocument()
  })

  it('triggers task decomposition when chip is clicked', async () => {
    const onDecompose = vi.fn().mockResolvedValue(undefined)
    const onSend = vi.fn()

    render(
      <AIChatPanel
        selectedNode={mockNode}
        nodes={[mockNode]}
        messages={mockMessages}
        onSendMessage={onSend}
        onDecomposeNode={onDecompose}
        onCompleteNode={vi.fn()}
        onAnalyzeSchedule={vi.fn()}
        onClearContext={vi.fn()}
        onClearMessages={vi.fn()}
      />
    )

    const chip = screen.getByTestId('chip-decompose')
    await act(async () => {
      fireEvent.click(chip)
    })
    expect(onDecompose).toHaveBeenCalledWith(mockNode)
  })

  it('sends user input message', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined)

    render(
      <AIChatPanel
        selectedNode={null}
        nodes={[mockNode]}
        messages={mockMessages}
        onSendMessage={onSend}
        onDecomposeNode={vi.fn()}
        onCompleteNode={vi.fn()}
        onAnalyzeSchedule={vi.fn()}
        onClearContext={vi.fn()}
        onClearMessages={vi.fn()}
      />
    )

    const input = screen.getByTestId('ai-chat-input')
    const sendBtn = screen.getByTestId('ai-chat-send-btn')

    fireEvent.change(input, { target: { value: 'Add sequential tasks for database' } })
    await act(async () => {
      fireEvent.click(sendBtn)
    })

    expect(onSend).toHaveBeenCalledWith('Add sequential tasks for database', undefined)
  })
})

import React, { useState, useRef, useEffect } from 'react'
import { GraphNode, ChatMessage } from '../types/graph'
import {
  Bot,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  Trash2,
  Zap,
} from 'lucide-react'

interface AIChatPanelProps {
  selectedNode: GraphNode | null
  nodes: GraphNode[]
  messages: ChatMessage[]
  onSendMessage: (text: string, contextNodeId?: string | null) => Promise<void>
  onDecomposeNode: (node: GraphNode) => Promise<void>
  onCompleteNode: (nodeId: string) => Promise<void>
  onAnalyzeSchedule: () => Promise<void>
  onClearContext: () => void
  onClearMessages: () => void
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  selectedNode,
  messages,
  onSendMessage,
  onDecomposeNode,
  onCompleteNode,
  onAnalyzeSchedule,
  onClearContext,
  onClearMessages,
}) => {
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    setInput('')
    setIsTyping(true)
    try {
      await onSendMessage(trimmed, selectedNode?.id)
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickAction = async (action: string) => {
    if (isTyping) return
    setIsTyping(true)
    try {
      if (action === 'decompose' && selectedNode) {
        await onDecomposeNode(selectedNode)
      } else if (action === 'schedule') {
        await onAnalyzeSchedule()
      } else if (action === 'complete' && selectedNode) {
        await onCompleteNode(selectedNode.id)
      } else {
        await onSendMessage(action, selectedNode?.id)
      }
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div
      className="w-full h-full flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100"
      data-testid="ai-chat-panel"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Graph Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-400">Context-aware graph assistant</p>
          </div>
        </div>

        <button
          onClick={onClearMessages}
          className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
          title="Clear Conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Context Selector Header */}
      <div className="px-4 py-2.5 bg-slate-950/30 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-400 shrink-0">Context:</span>
          {selectedNode ? (
            <span className="font-semibold text-emerald-300 truncate" title={selectedNode.title}>
              {selectedNode.title}
            </span>
          ) : (
            <span className="text-slate-500 italic">Entire Graph (No selection)</span>
          )}
        </div>
        {selectedNode && (
          <button
            onClick={onClearContext}
            className="text-[10px] text-slate-500 hover:text-slate-300 underline ml-2 shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-2 border-b border-slate-800/60 bg-slate-900/40 flex flex-wrap gap-1.5">
        {selectedNode ? (
          <>
            <button
              onClick={() => handleQuickAction('decompose')}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 rounded-lg text-[11px] text-emerald-300 transition-colors active:scale-95"
              data-testid="chip-decompose"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Decompose into subtasks</span>
            </button>
            <button
              onClick={() => handleQuickAction('complete')}
              className="flex items-center gap-1 px-2.5 py-1 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/80 rounded-lg text-[11px] text-sky-300 transition-colors active:scale-95"
              data-testid="chip-complete"
            >
              <CheckCircle2 className="w-3 h-3 text-sky-400" />
              <span>Mark completed</span>
            </button>
          </>
        ) : null}
        <button
          onClick={() => handleQuickAction('schedule')}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-[11px] text-slate-300 transition-colors active:scale-95"
          data-testid="chip-schedule"
        >
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>Analyze schedule</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div
        className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800"
        data-testid="chat-messages-container"
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              data-testid={`chat-message-${msg.role}`}
            >
              {msg.contextNodeTitle && (
                <span className="text-[10px] text-slate-500 px-1">
                  Re: {msg.contextNodeTitle}
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-xs'
                }`}
              >
                {msg.content}

                {/* Suggested Action Chips embedded in message */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(act.action)}
                        className="px-2 py-0.5 bg-slate-900/80 hover:bg-slate-950 text-emerald-400 border border-emerald-500/40 rounded text-[10px] font-medium transition-colors"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-600 px-1">{msg.timestamp}</span>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs bg-slate-800/60 p-2.5 rounded-xl w-fit">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] ml-1 text-slate-400">AI is reasoning over graph...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            selectedNode
              ? `Ask about '${selectedNode.title.slice(0, 20)}...'`
              : 'Command AI (e.g. "Add task Setup CI/CD")'
          }
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          data-testid="ai-chat-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-md"
          data-testid="ai-chat-send-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

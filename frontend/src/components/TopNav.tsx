import React from 'react'
import { GraphNode } from '../types/graph'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import {
  Network,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Plus,
  Wifi,
  WifiOff,
  User,
  Filter,
  LogOut,
  LogIn
} from 'lucide-react'

interface TopNavProps {
  nodes: GraphNode[]
  filterStatus: 'all' | 'active' | 'completed' | 'blocked'
  isLiveConnected: boolean
  onFilterChange: (status: 'all' | 'active' | 'completed' | 'blocked') => void
  onOpenCreateModal: () => void
}

export const TopNav: React.FC<TopNavProps> = ({
  nodes,
  filterStatus,
  isLiveConnected,
  onFilterChange,
  onOpenCreateModal,
}) => {
  const { login, register, logout, isAuthenticated, user } = useKindeAuth()
  const totalNodes = nodes.length
  const completedNodes = nodes.filter((n) => n.completed || n.status === 'completed').length
  const completionRate = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0
  const totalHours = nodes.reduce((sum, n) => sum + (n.estimatedHours || 0), 0)
  const blockedCount = nodes.filter((n) => n.status === 'blocked').length

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-slate-100 z-10 select-none">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <Network className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Graph2Do
          </h1>
          <p className="text-[10px] text-slate-400 leading-none">Knowledge Graph Planner</p>
        </div>
      </div>

      {/* Metrics Center Bar */}
      <div className="hidden md:flex items-center gap-4 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>
            <strong className="text-slate-100">{totalNodes}</strong> nodes
          </span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <div className="flex items-center gap-1.5 text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            <strong className="text-emerald-400">{completionRate}%</strong> completed
          </span>
        </div>

        <div className="h-3 w-px bg-slate-800" />

        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>
            <strong className="text-slate-100">{totalHours}h</strong> total scope
          </span>
        </div>

        {blockedCount > 0 && (
          <>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5 text-rose-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                <strong>{blockedCount}</strong> blocked
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
          <Filter className="w-3 h-3 text-slate-500 ml-1" />
          {(['all', 'active', 'completed', 'blocked'] as const).map((st) => (
            <button
              key={st}
              onClick={() => onFilterChange(st)}
              className={`px-2 py-0.5 rounded-lg font-medium capitalize text-[11px] transition-colors ${
                filterStatus === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid={`filter-${st}`}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-colors"
          data-testid="top-nav-add-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Node</span>
        </button>

        {/* Live Backend Connection Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            isLiveConnected
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-400'
          }`}
          title={isLiveConnected ? 'Connected to FastAPI' : 'Running in Local State Mode'}
        >
          {isLiveConnected ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Backend Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-slate-500" />
              <span className="hidden sm:inline">Local Sync</span>
            </>
          )}
        </div>

        {/* User profile avatar */}
        
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-300 mr-2">{(user as any)?.given_name || (user as any)?.givenName || user?.email}</div>
              {user?.picture ? (
                <img src={user.picture} alt="avatar" className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <User className="w-4 h-4" />
                </div>
              )}
              <button onClick={() => logout()} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-rose-400" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => login()} className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-200 transition-colors flex items-center gap-1.5">
                <LogIn className="w-3 h-3" />
                Login
              </button>
              <button onClick={() => register()} className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-md text-white transition-colors">
                Sign Up
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}

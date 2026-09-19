import React from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Network, ArrowRight, Shield, Zap, Sparkles } from 'lucide-react'

export const LandingPage: React.FC = () => {
  const { login } = useKindeAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 px-6 lg:px-12 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Network className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Graph2Do
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => login()}
            data-testid="login-btn"
            className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => login()}
            data-testid="get-started-btn"
            className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-900/40 transition-all transform hover:-translate-y-0.5"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-3xl -top-32 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-3xl bottom-0 pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-emerald-400 mb-8 shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Knowledge Graph Task Planner</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mb-6">
          Visualize your projects as{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            interconnected graphs
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Break down goals, map complex dependencies, and plan tasks with an intelligent AI copilot that understands your entire workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mb-20">
          <button
            onClick={() => login()}
            className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
          >
            <span>Start Planning Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => login()}
            className="w-full sm:w-auto px-8 py-3.5 text-base font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition-all"
          >
            Sign In with Kinde
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full text-left mt-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Interactive Graph Canvas</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pan, zoom, expand nodes, and trace project hierarchies and blockers visually in real time.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">AI Pair Copilot</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Decompose large tasks, analyze schedules, and chat directly with an assistant aware of your node context.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Secure Kinde Auth</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enterprise-grade authentication and user session management powered seamlessly by Kinde.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Graph2Do. All rights reserved.
      </footer>
    </div>
  )
}

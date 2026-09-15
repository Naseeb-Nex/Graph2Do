import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock scrollIntoView in jsdom
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.SVGElement.prototype.scrollIntoView = vi.fn()
}

// Mock fetch
globalThis.fetch = vi.fn(() =>
  Promise.reject(new Error('Network error for unit tests'))
) as any

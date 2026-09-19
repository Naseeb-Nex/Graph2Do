import { describe, it, expect, vi } from 'vitest'
const mockLogin = vi.fn()

vi.mock('@kinde-oss/kinde-auth-react', () => ({
  useKindeAuth: () => ({
    getToken: async () => 'test-token',
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: mockLogin,
    register: vi.fn(),
    logout: vi.fn(),
  }),
  KindeProvider: ({ children }: any) => <div>{children}</div>,
}))

import { render, screen, fireEvent } from '@testing-library/react'
import { App } from '../App'

describe('LandingPage & Unauthenticated Flow', () => {
  it('renders landing page with hero, features, and login/get started buttons when unauthenticated', () => {
    render(<App />)

    expect(screen.getByText('Graph2Do')).toBeInTheDocument()
    expect(screen.getByText(/Visualize your projects as/i)).toBeInTheDocument()
    expect(screen.getByText('Interactive Graph Canvas')).toBeInTheDocument()
    expect(screen.getByText('AI Pair Copilot')).toBeInTheDocument()
    expect(screen.getByText('Secure Kinde Auth')).toBeInTheDocument()

    const loginBtn = screen.getByTestId('login-btn')
    expect(loginBtn).toBeInTheDocument()

    const getStartedBtn = screen.getByTestId('get-started-btn')
    expect(getStartedBtn).toBeInTheDocument()

    fireEvent.click(loginBtn)
    expect(mockLogin).toHaveBeenCalled()
  })
})

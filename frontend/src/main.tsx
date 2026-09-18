import React from 'react'
import ReactDOM from 'react-dom/client'
import { KindeProvider } from '@kinde-oss/kinde-auth-react'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <KindeProvider
      clientId={import.meta.env.VITE_KINDE_CLIENT_ID || 'your_client_id'}
      domain={import.meta.env.VITE_KINDE_DOMAIN || 'https://your_domain.kinde.com'}
      redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URI || 'http://localhost:3000'}
      logoutUri={import.meta.env.VITE_KINDE_LOGOUT_URI || 'http://localhost:3000'}
    >
      <App />
    </KindeProvider>
  </React.StrictMode>,
)

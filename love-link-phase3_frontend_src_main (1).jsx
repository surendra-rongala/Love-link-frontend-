// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './lib/AuthContext'
import './styles/globals.css'

// Apply saved dark mode before first render to avoid flash
const saved = localStorage.getItem('ll-dark')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
if (saved === 'true' || (saved === null && prefersDark)) {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: 'var(--card)',
              color: 'var(--text)',
              borderRadius: '14px',
              boxShadow: '0 4px 24px var(--shadow)',
              border: '1px solid var(--border)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#be123c', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

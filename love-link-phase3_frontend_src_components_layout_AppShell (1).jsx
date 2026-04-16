// AppShell.jsx — Phase 3: 5-tab navigation
import { NavLink } from 'react-router-dom'
import { MessageCircle, Sparkles, BookImage, BarChart3, Settings2 } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { useEffect, useState } from 'react'
import NotificationBanner from './NotificationBanner'
import SnapInbox from '../snaps/SnapInbox'

const NAV = [
  { to:'/chat',     icon:MessageCircle, label:'Chat'    },
  { to:'/daily',    icon:Sparkles,      label:'Daily'   },
  { to:'/memories', icon:BookImage,     label:'Moments' },
  { to:'/insights', icon:BarChart3,     label:'Insights'},
  { to:'/settings', icon:Settings2,     label:'Me'      },
]

export default function AppShell({ children }) {
  const { touchLastActive } = useAuth()

  useEffect(() => {
    touchLastActive()
    const id = setInterval(touchLastActive, 120_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col bg-app">
      <NotificationBanner />
      <SnapInbox />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
      <nav className="flex-shrink-0 safe-bottom" style={{
        background:'var(--glass-bg)',
        backdropFilter:'blur(24px)',
        WebkitBackdropFilter:'blur(24px)',
        borderTop:'1px solid var(--border)',
      }}>
        <div className="flex">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                  isActive ? 'text-rose-500' : 'text-[var(--muted)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-10 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${isActive ? 'bg-rose-500/15' : ''}`}>
                    <Icon size={19} strokeWidth={isActive ? 2.3 : 1.7} />
                  </div>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

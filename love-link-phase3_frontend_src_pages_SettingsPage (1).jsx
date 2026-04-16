// src/pages/SettingsPage.jsx
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from '../hooks/useDarkMode'
import toast from 'react-hot-toast'
import {
  LogOut, Copy, RefreshCw, Heart, Edit2,
  Check, X, User, Shield, Moon, Sun,
} from 'lucide-react'
import { differenceInDays } from 'date-fns'

export default function SettingsPage() {
  const { user, profile, couple, partner, signOut, refreshInviteCode, updateNickname } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useDarkMode()

  const [editingNick, setEditingNick] = useState(false)
  const [nick,        setNick]        = useState(profile?.nickname || '')
  const [savingNick,  setSavingNick]  = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)

  const daysTogether = couple?.createdAt
    ? differenceInDays(
        new Date(),
        couple.createdAt.toDate ? couple.createdAt.toDate() : new Date(couple.createdAt)
      )
    : 0

  async function handleSignOut() {
    if (!confirm('Sign out of Love Link?')) return
    await signOut()
    navigate('/', { replace: true })
  }

  function copyCode() {
    navigator.clipboard.writeText(profile?.inviteCode || '')
    toast.success('Code copied! 💕')
  }

  async function handleRefresh() {
    setRefreshing(true)
    try { await refreshInviteCode(); toast.success('New code generated!') }
    finally { setRefreshing(false) }
  }

  async function saveNick() {
    if (!nick.trim()) return
    setSavingNick(true)
    try {
      await updateNickname(nick.trim())
      toast.success('Nickname updated! 💕')
      setEditingNick(false)
    } catch {
      toast.error('Failed to update')
    } finally {
      setSavingNick(false)
    }
  }

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-12 flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-display font-bold shadow-lg"
          style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
        >
          {profile?.name?.[0]?.toUpperCase()}
        </div>
        <div className="text-center">
          <h1 className="font-display text-2xl italic text-white">{profile?.name}</h1>
          <p className="text-rose-200 text-sm">{profile?.nickname}</p>
        </div>
      </div>

      <div className="px-4 -mt-6 flex flex-col gap-4">

        {/* Relationship card */}
        {couple && partner && (
          <div className="card p-5 animate-slide-up">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>
              Your Relationship
            </p>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold shadow-md">
                  {profile?.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold" style={{ color:'var(--text)' }}>{profile?.name}</span>
              </div>
              <Heart size={18} className="text-rose-500 fill-rose-500 animate-heartbeat" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color:'var(--text)' }}>{partner?.name}</span>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white font-bold shadow-md">
                  {partner?.name?.[0]?.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="rounded-2xl px-4 py-2.5 text-center" style={{ background:'var(--subtle)' }}>
              <span className="text-sm font-semibold" style={{ color:'var(--text)' }}>
                💑 Together for{' '}
                <strong className="text-rose-500">{daysTogether}</strong>
                {' '}{daysTogether === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
        )}

        {/* Appearance — Dark mode toggle */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '.04s' }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>
            Appearance
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dark
                ? <Moon size={18} className="text-rose-400" />
                : <Sun  size={18} className="text-rose-400" />
              }
              <div>
                <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>
                  {dark ? 'Dark Mode' : 'Light Mode'}
                </p>
                <p className="text-xs" style={{ color:'var(--muted)' }}>
                  {dark ? 'Easy on the eyes at night' : 'Bright and cheerful'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDark(d => !d)}
              className={`dark-toggle ${dark ? 'on' : ''}`}
              aria-label="Toggle dark mode"
            />
          </div>
        </div>

        {/* Edit nickname */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '.07s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User size={13} style={{ color:'var(--muted)' }} />
              <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>
                Pet Name / Nickname
              </p>
            </div>
            {!editingNick && (
              <button
                onClick={() => { setEditingNick(true); setNick(profile?.nickname || '') }}
                style={{ color:'var(--muted)' }}
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {editingNick ? (
            <div className="flex gap-2">
              <input
                className="input-rose flex-1 text-sm"
                value={nick}
                onChange={e => setNick(e.target.value)}
                maxLength={20}
                autoFocus
                placeholder="Your pet name…"
              />
              <button
                onClick={saveNick}
                disabled={savingNick || !nick.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white flex-shrink-0"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setEditingNick(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--subtle)' }}
              >
                <X size={14} style={{ color:'var(--muted)' }} />
              </button>
            </div>
          ) : (
            <p className="text-base font-semibold" style={{ color:'var(--text)' }}>
              {profile?.nickname}
            </p>
          )}
        </div>

        {/* Invite code (only if not paired) */}
        {!couple && (
          <div className="card p-5 animate-slide-up" style={{ animationDelay: '.1s' }}>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>
              Your Invite Code
            </p>
            <button
              onClick={copyCode}
              className="w-full flex items-center justify-between rounded-2xl px-4 py-3 mb-3 border-2 border-dashed active:scale-95 transition-transform"
              style={{ background:'var(--subtle)', borderColor:'var(--border)' }}
            >
              <span className="font-display text-2xl text-rose-600 tracking-[.2em] font-bold">
                {profile?.inviteCode}
              </span>
              <Copy size={15} style={{ color:'var(--muted)' }} />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color:'var(--muted)' }}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Generate new code
            </button>
          </div>
        )}

        {/* Account info */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '.13s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={13} style={{ color:'var(--muted)' }} />
            <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>Account</p>
          </div>
          {[
            ['Name',   profile?.name],
            ['Status', couple ? '💑 Linked with partner' : '🔗 Not linked yet'],
            ['App Version', 'Love Link v3.0'],
            ['User ID', (user?.uid?.slice(0, 14) || '') + '…'],
          ].map(([label, val], i, arr) => (
            <div key={label}>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm" style={{ color:'var(--muted)' }}>{label}</span>
                <span className="text-sm font-medium truncate max-w-[60%] text-right" style={{ color:'var(--text)' }}>
                  {val}
                </span>
              </div>
              {i < arr.length - 1 && <div className="h-px" style={{ background:'var(--border)' }} />}
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="card p-4 flex items-center gap-3 w-full active:scale-95 transition-transform animate-slide-up"
          style={{ animationDelay: '.16s', color:'var(--text)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:'var(--subtle)' }}
          >
            <LogOut size={16} className="text-rose-500" />
          </div>
          <span className="font-medium text-sm">Sign Out</span>
        </button>

        <p className="text-center text-xs pb-2" style={{ color:'var(--muted)', opacity:.5 }}>
          Love Link v3.0 · Made with 💕 by your favourite dev
        </p>
      </div>
    </div>
  )
}

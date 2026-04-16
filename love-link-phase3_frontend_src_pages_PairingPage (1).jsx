// src/pages/PairingPage.jsx
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import toast from 'react-hot-toast'
import { Copy, RefreshCw } from 'lucide-react'

export default function PairingPage() {
  const { profile, joinWithCode, refreshInviteCode, signOut } = useAuth()
  const [tab,       setTab]      = useState('share') // 'share' | 'join'
  const [code,      setCode]     = useState('')
  const [loading,   setLoading]  = useState(false)
  const [refreshing,setRefreshing] = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    if (code.length < 8) return toast.error('Enter the full 8-character code')
    setLoading(true)
    try {
      await joinWithCode(code)
      toast.success('Hearts connected! 💕')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refreshInviteCode()
      toast.success('New code ready!')
    } finally {
      setRefreshing(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(profile?.inviteCode || '')
    toast.success('Copied! Share it with your partner 💌')
  }

  return (
    <div className="fixed inset-0 bg-app flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 animate-float">💑</div>
          <h1 className="font-display text-3xl text-rose-700 italic">Link Your Hearts</h1>
          <p className="text-rose-400 text-sm mt-1">Connect with your special someone</p>
        </div>

        {/* Tab toggle */}
        <div className="glass rounded-2xl p-1 flex gap-1 mb-5">
          {[['share','🔗 My Code'],['join','💌 Join Partner']].map(([k,l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab===k ? 'bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-md' : 'text-rose-400'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Share tab */}
        {tab === 'share' && (
          <div className="card p-6 shadow-xl shadow-rose-100 animate-fade-in">
            <p className="text-sm text-rose-500 mb-4">Share this code with your partner so they can connect:</p>

            <button
              onClick={copyCode}
              className="w-full flex items-center justify-between bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-dashed border-rose-200 rounded-2xl px-5 py-4 mb-3 active:scale-95 transition-transform"
            >
              <span className="font-display text-3xl text-rose-700 tracking-[.2em] font-bold">
                {profile?.inviteCode || '--------'}
              </span>
              <Copy size={18} className="text-rose-400 flex-shrink-0" />
            </button>

            <p className="text-xs text-rose-300 text-center mb-4">Tap code to copy</p>

            <button onClick={copyCode} className="btn-primary mb-2">
              Copy & Share Code 💕
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-ghost flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Generate New Code
            </button>
          </div>
        )}

        {/* Join tab */}
        {tab === 'join' && (
          <div className="card p-6 shadow-xl shadow-rose-100 animate-fade-in">
            <p className="text-sm text-rose-500 mb-4">Ask your partner to share their code, then enter it below:</p>
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <input
                className="input-rose text-center text-2xl font-display tracking-[.25em] uppercase"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8))}
                placeholder="XXXXXXXX"
                maxLength={8}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || code.length < 8}
                className="btn-primary"
              >
                {loading ? 'Connecting…' : 'Connect Hearts 💕'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-rose-300/60 mt-5">
          Signed in as <span className="text-rose-500 font-medium">{profile?.name}</span>
        </p>
        <button onClick={signOut} className="w-full text-center text-xs text-rose-300/50 mt-2 py-2">
          Sign out
        </button>
      </div>
    </div>
  )
}

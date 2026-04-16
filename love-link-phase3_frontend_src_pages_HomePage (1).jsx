// src/pages/HomePage.jsx
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { differenceInDays, parseISO, format, addYears, isBefore, formatDistanceToNow } from 'date-fns'
import { Heart, Sparkles, Calendar, Edit3, Check, X, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'

const MOOD_EMOJI = { happy:'😊', sad:'😢', miss_you:'🥺', excited:'🤩', tired:'😴', love:'🥰', angry:'😤', calm:'😌' }

function AnniversaryRing({ progress }) {
  const r = 36, circ = 2 * Math.PI * r
  const offset = circ - Math.min(progress, 1) * circ
  return (
    <svg width="90" height="90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle cx="45" cy="45" r={r} fill="none" stroke="url(#rg)" strokeWidth="7"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        className="progress-ring__circle" />
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#be123c" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function HomePage() {
  const { user, profile, partner, couple, setAnniversary, sendRitual } = useAuth()
  const [editAnniv,   setEditAnniv]   = useState(false)
  const [annexInput,  setAnnexInput]  = useState(couple?.anniversary || '')
  const [savingAnniv, setSavingAnniv] = useState(false)
  const [ritualSent,  setRitualSent]  = useState(null)

  const daysTogether = couple?.createdAt
    ? differenceInDays(new Date(), couple.createdAt.toDate ? couple.createdAt.toDate() : new Date(couple.createdAt))
    : 0

  let daysToAnniv = null, nextAnnivStr = null
  if (couple?.anniversary) {
    try {
      const base = parseISO(couple.anniversary)
      const now  = new Date()
      let next = addYears(base, now.getFullYear() - base.getFullYear())
      if (isBefore(next, now)) next = addYears(next, 1)
      daysToAnniv = differenceInDays(next, now)
      nextAnnivStr = format(next, 'MMM d, yyyy')
    } catch {}
  }

  function formatActive(ts) {
    if (!ts) return 'a while ago'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return formatDistanceToNow(d, { addSuffix: true })
  }

  async function saveAnniv() {
    if (!annexInput) return
    setSavingAnniv(true)
    try { await setAnniversary(annexInput); toast.success('Anniversary saved 💕'); setEditAnniv(false) }
    catch { toast.error('Failed to save') }
    finally { setSavingAnniv(false) }
  }

  async function handleRitual(type) {
    try {
      await sendRitual(type)
      setRitualSent(type)
      toast.success(type === 'goodnight' ? '🌙 Good night sent!' : '☀️ Good morning sent!')
      setTimeout(() => setRitualSent(null), 4000)
    } catch { toast.error('Failed to send') }
  }

  const partnerRitual = partner ? couple?.ritual?.[partner.uid] : null
  const hour = new Date().getHours()
  const isNight = hour >= 20 || hour < 6

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="relative overflow-hidden header-gradient px-6 pt-14 pb-12">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute top-8 right-20 w-20 h-20 bg-white/5 rounded-full" />
        <p className="text-rose-200 text-sm font-light mb-1">Welcome back,</p>
        <h1 className="font-display text-4xl italic text-white mb-2">{profile?.nickname} 💕</h1>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-rose-200 text-xs">{partner?.name ? `${partner.name} is always in your heart` : 'Connected'}</span>
        </div>
      </div>

      <div className="px-4 -mt-5 flex flex-col gap-4">
        {/* Couple card */}
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-700 flex items-center justify-center text-white font-bold shadow-md">
                {profile?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{profile?.name}</p>
                <p className="text-xs" style={{ color:'var(--muted)' }}>{profile?.nickname}</p>
              </div>
            </div>
            <Heart size={22} className="text-rose-500 fill-rose-500 animate-heartbeat flex-shrink-0" />
            <div className="flex-1 flex items-center justify-end gap-2">
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{partner?.name || '…'}</p>
                <p className="text-xs" style={{ color:'var(--muted)' }}>{partner?.nickname || '…'}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white font-bold shadow-md">
                {partner?.name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>
          </div>
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background:'var(--subtle)' }}>
            <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>
              💑 Together for <span className="text-rose-500 font-bold text-lg">{daysTogether}</span> {daysTogether===1?'day':'days'}
            </span>
          </div>
        </div>

        {/* Ritual / Good night / Good morning */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay:'.04s' }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Daily Ritual</p>

          {/* Partner's last ritual */}
          {partnerRitual && (
            <div className="rounded-2xl px-4 py-3 mb-3 text-sm" style={{ background:'var(--subtle)' }}>
              <span style={{ color:'var(--muted)' }}>{partner?.nickname} sent you </span>
              <span className="font-semibold text-rose-500">
                {partnerRitual.type === 'goodnight' ? '🌙 Good Night' : '☀️ Good Morning'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRitual('goodnight')}
              disabled={ritualSent === 'goodnight'}
              className="ritual-btn text-sm"
              style={{ background: ritualSent==='goodnight' ? '#1e1b4b' : 'linear-gradient(135deg,#1e1b4b,#312e81)', color:'#e0e7ff', boxShadow:'0 4px 16px rgba(30,27,75,.4)' }}
            >
              🌙 Good Night
            </button>
            <button
              onClick={() => handleRitual('goodmorning')}
              disabled={ritualSent === 'goodmorning'}
              className="ritual-btn text-sm"
              style={{ background: ritualSent==='goodmorning' ? '#78350f' : 'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', boxShadow:'0 4px 16px rgba(245,158,11,.4)' }}
            >
              ☀️ Good Morning
            </button>
          </div>
        </div>

        {/* Anniversary */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay:'.08s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={13} style={{ color:'var(--muted)' }} />
              <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>Anniversary</p>
            </div>
            <button onClick={() => setEditAnniv(v => !v)} style={{ color:'var(--muted)' }}>
              <Edit3 size={14} />
            </button>
          </div>

          {editAnniv ? (
            <div className="flex gap-2">
              <input type="date" value={annexInput} onChange={e => setAnnexInput(e.target.value)} className="input-rose flex-1 text-sm" />
              <button onClick={saveAnniv} disabled={savingAnniv || !annexInput} className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white flex-shrink-0">
                <Check size={14} />
              </button>
              <button onClick={() => setEditAnniv(false)} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'var(--subtle)' }}>
                <X size={14} style={{ color:'var(--muted)' }} />
              </button>
            </div>
          ) : couple?.anniversary ? (
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <AnniversaryRing progress={daysToAnniv !== null ? 1 - (daysToAnniv / 365) : 0} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-rose-500 leading-none">{daysToAnniv ?? '–'}</span>
                  <span className="text-[9px] leading-none" style={{ color:'var(--muted)' }}>days</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{format(parseISO(couple.anniversary), 'MMMM d, yyyy')}</p>
                <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>
                  {daysToAnniv === 0 ? '🎉 Happy Anniversary!' : `Next in ${daysToAnniv} days · ${nextAnnivStr}`}
                </p>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditAnniv(true)} className="w-full py-3 border-2 border-dashed rounded-xl text-sm flex items-center justify-center gap-2" style={{ borderColor:'var(--border)', color:'var(--muted)' }}>
              <Calendar size={14} /> Set your anniversary date
            </button>
          )}
        </div>

        {/* Moods */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label:'Your Mood', mood: profile?.mood },
            { label:`${partner?.nickname || 'Partner'}`, mood: couple?.moods?.[partner?.uid] },
          ].map(({ label, mood }, i) => (
            <div key={i} className="card p-4 animate-slide-up" style={{ animationDelay: `${.1+i*.03}s` }}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color:'var(--muted)' }}>{label}</p>
              <div className="text-3xl mb-1">{mood ? MOOD_EMOJI[mood] : '🌸'}</div>
              <p className="text-sm font-semibold capitalize" style={{ color:'var(--text)' }}>{mood?.replace('_',' ') || 'Not set'}</p>
            </div>
          ))}
        </div>

        {/* Last active */}
        <div className="card p-4 animate-slide-up" style={{ animationDelay:'.16s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} style={{ color:'var(--muted)' }} />
            <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>Last Seen</p>
          </div>
          <div className="flex justify-between">
            {[['You', profile?.lastActive],[partner?.name, partner?.lastActive]].map(([name,ts],i) => (
              <div key={i} className={i===1?'text-right':''}>
                <p className="text-xs" style={{ color:'var(--muted)' }}>{name}</p>
                <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{formatActive(ts)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-4 animate-slide-up" style={{ animationDelay:'.2s' }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              {to:'/chat',  emoji:'💬',label:'Chat'  },
              {to:'/gifts', emoji:'🎁',label:'Gift'  },
              {to:'/vibes', emoji:'🎵',label:'Vibes' },
              {to:'/dates', emoji:'📅',label:'Dates' },
            ].map(({to,emoji,label}) => (
              <a key={to} href={to} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl active:scale-90 transition-transform" style={{ background:'var(--subtle)' }}>
                <span className="text-2xl">{emoji}</span>
                <span className="text-[10px] font-medium text-rose-500">{label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Note: Quick actions grid at the bottom has been extended in AppShell nav.
// The HomePage is kept as-is; Phase 2 features are accessible via the nav bar.

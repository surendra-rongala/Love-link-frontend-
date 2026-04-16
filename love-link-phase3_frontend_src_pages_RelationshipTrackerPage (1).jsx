// src/pages/RelationshipTrackerPage.jsx
// Daily check-ins, streak tracking, relationship health score
import { useState, useEffect } from 'react'
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, limit,
  doc, setDoc, getDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format, isToday, isYesterday, differenceInDays, parseISO, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { Flame, Heart, TrendingUp, Star, CheckCircle2 } from 'lucide-react'

const CHECK_IN_PROMPTS = [
  "How are you feeling about us today?",
  "What is one thing you appreciate about your partner today?",
  "Rate today's connection with your partner.",
  "Did you make your partner smile today?",
  "How well did you communicate today?",
]

const HEALTH_LABELS = [
  { min:0,  max:30, label:'Needs Attention', color:'#ef4444', emoji:'💔' },
  { min:30, max:55, label:'Growing',          color:'#f97316', emoji:'🌱' },
  { min:55, max:75, label:'Good',             color:'#eab308', emoji:'💛' },
  { min:75, max:90, label:'Strong',           color:'#22c55e', emoji:'💚' },
  { min:90, max:101,label:'Thriving',         color:'#f43f5e', emoji:'💕' },
]

function HealthGauge({ score }) {
  const h = HEALTH_LABELS.find(h => score >= h.min && score < h.max) || HEALTH_LABELS[0]
  const r = 52, circ = 2 * Math.PI * r
  const arc = circ * 0.75 // 270 deg arc
  const offset = arc - (score / 100) * arc

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width:140, height:100, overflow:'hidden' }}>
        <svg width="140" height="140" style={{ marginTop:0 }}>
          {/* Background arc */}
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--subtle)" strokeWidth="10"
            strokeDasharray={`${arc} ${circ}`} strokeDashoffset={-circ * 0.125}
            strokeLinecap="round" />
          {/* Score arc */}
          <circle cx="70" cy="70" r={r} fill="none" stroke={h.color} strokeWidth="10"
            strokeDasharray={`${arc - offset} ${circ}`}
            strokeDashoffset={-circ * 0.125}
            strokeLinecap="round"
            className="progress-ring__circle"
            style={{ transform:'none' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-3xl font-bold" style={{ color: h.color }}>{score}</span>
          <span className="text-[10px] font-semibold" style={{ color:'var(--muted)' }}>/ 100</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-lg">{h.emoji}</span>
        <span className="text-sm font-semibold" style={{ color: h.color }}>{h.label}</span>
      </div>
    </div>
  )
}

export default function RelationshipTrackerPage() {
  const { user, profile, couple, partner } = useAuth()
  const [checkins,      setCheckins]      = useState([])
  const [todayCheckin,  setTodayCheckin]  = useState(null)
  const [rating,        setRating]        = useState(0)
  const [note,          setNote]          = useState('')
  const [saving,        setSaving]        = useState(false)
  const [promptIdx,     setPromptIdx]     = useState(0)
  const coupleId = couple?.id

  useEffect(() => {
    setPromptIdx(Math.floor(Math.random() * CHECK_IN_PROMPTS.length))
  }, [])

  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'couples', coupleId, 'checkins'),
      orderBy('createdAt', 'desc'), limit(60)
    )
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setCheckins(all)
      // Check if I already checked in today
      const mine = all.find(c => c.authorUid === user.uid && isToday(c.createdAt?.toDate?.() || new Date(c.createdAt)))
      setTodayCheckin(mine || null)
    })
  }, [coupleId, user.uid])

  async function submitCheckin(e) {
    e.preventDefault()
    if (rating === 0) return toast.error('Rate your connection today ⭐')
    setSaving(true)
    try {
      await addDoc(collection(db, 'couples', coupleId, 'checkins'), {
        rating, note: note.trim(),
        authorUid:  user.uid,
        authorName: profile.name,
        dateStr:    format(new Date(), 'yyyy-MM-dd'),
        createdAt:  serverTimestamp(),
      })
      toast.success('✅ Check-in saved! 💕')
      setRating(0); setNote('')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  // ── Compute streak ─────────────────────────────────────────────────
  function computeStreak(checkins) {
    const myCheckins = checkins
      .filter(c => c.authorUid === user.uid)
      .map(c => {
        const d = c.createdAt?.toDate?.() || new Date(c.createdAt)
        return format(d, 'yyyy-MM-dd')
      })
    const unique = [...new Set(myCheckins)].sort().reverse()
    if (unique.length === 0) return 0
    let streak = 0, day = new Date()
    for (const dateStr of unique) {
      const expected = format(day, 'yyyy-MM-dd')
      if (dateStr === expected) { streak++; day = subDays(day, 1) }
      else if (streak === 0 && isToday(new Date(dateStr))) { streak = 1; day = subDays(day, 1) }
      else break
    }
    return streak
  }

  // ── Compute health score ───────────────────────────────────────────
  function computeHealthScore() {
    if (checkins.length === 0) return 0
    const recent = checkins.slice(0, 14) // last 14 entries
    const avgRating = recent.reduce((s, c) => s + (c.rating || 0), 0) / recent.length
    const ratingScore = (avgRating / 5) * 60 // 60% weight

    // Streak bonus (up to 20 pts)
    const streak = computeStreak(checkins)
    const streakScore = Math.min(streak * 2, 20)

    // Consistency bonus (up to 20 pts) — how many of last 7 days had a checkin from me
    const myLast7 = new Set(
      checkins
        .filter(c => c.authorUid === user.uid)
        .slice(0, 7)
        .map(c => format(c.createdAt?.toDate?.() || new Date(c.createdAt), 'yyyy-MM-dd'))
    )
    const consistencyScore = (myLast7.size / 7) * 20

    return Math.round(ratingScore + streakScore + consistencyScore)
  }

  const streak      = computeStreak(checkins)
  const healthScore = computeHealthScore()
  const myAvgRating = checkins.filter(c => c.authorUid === user.uid).slice(0, 7)
    .reduce((s, c, _, a) => s + c.rating / a.length, 0)
  const partnerCheckins = checkins.filter(c => c.authorUid !== user.uid)

  // Last 7 days for mini graph
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const ds = format(d, 'yyyy-MM-dd')
    const mine = checkins.find(c => c.authorUid === user.uid && c.dateStr === ds)
    return { date: ds, label: format(d, 'EEE'), rating: mine?.rating || 0 }
  })

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-8">
        <h1 className="font-display text-3xl italic text-white mb-1">Relationship Health 💕</h1>
        <p className="text-rose-200 text-sm">Daily check-ins to keep your love strong</p>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">

        {/* Health gauge */}
        <div className="card p-5 animate-slide-up">
          <p className="text-xs uppercase tracking-widest mb-4 text-center" style={{ color:'var(--muted)' }}>
            Relationship Health Score
          </p>
          <HealthGauge score={healthScore} />
          <p className="text-xs text-center mt-3" style={{ color:'var(--muted)' }}>
            Based on your last {Math.min(checkins.length, 14)} check-ins
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Streak',   val:`${streak}d`,  icon:<Flame size={16} className="text-orange-500" /> },
            { label:'Avg Score',val:`${myAvgRating.toFixed(1)}⭐`,icon:<Star size={16} className="text-yellow-500" /> },
            { label:'Check-ins',val:checkins.filter(c=>c.authorUid===user.uid).length, icon:<CheckCircle2 size={16} className="text-green-500" /> },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center animate-slide-up">
              <div className="flex justify-center mb-1">{s.icon}</div>
              <div className="text-lg font-bold text-rose-500">{s.val}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color:'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 7-day mini graph */}
        <div className="card p-4 animate-slide-up">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>
            Your last 7 days
          </p>
          <div className="flex items-end justify-between gap-1 h-16">
            {last7.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: day.rating > 0 ? `${(day.rating / 5) * 100}%` : '6px',
                      minHeight: '6px',
                      background: day.rating > 0 ? `linear-gradient(180deg,#f43f5e,#be123c)` : 'var(--border)',
                    }}
                  />
                </div>
                <span className="text-[9px]" style={{ color:'var(--muted)' }}>{day.label}</span>
                {day.rating > 0 && <span className="text-[9px] text-rose-500 font-bold">{day.rating}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Today's check-in */}
        <div className="card p-5 animate-slide-up">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>
            Today's Check-In
          </p>

          {todayCheckin ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-500" />
                <p className="text-sm font-semibold text-green-600">You checked in today!</p>
              </div>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className="text-xl">
                    {n <= todayCheckin.rating ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
              {todayCheckin.note && (
                <p className="text-sm italic mt-1" style={{ color:'var(--muted)' }}>
                  "{todayCheckin.note}"
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submitCheckin} className="flex flex-col gap-3">
              <p className="text-sm font-medium" style={{ color:'var(--text)' }}>
                {CHECK_IN_PROMPTS[promptIdx]}
              </p>
              {/* Star rating */}
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="text-3xl transition-transform active:scale-90"
                  >
                    {n <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              <textarea
                className="input-rose resize-none"
                placeholder="Add a note (optional)…"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                maxLength={200}
              />
              <button type="submit" disabled={saving || rating === 0} className="btn-primary">
                Submit Check-In ✅
              </button>
            </form>
          )}
        </div>

        {/* Partner's recent check-ins */}
        {partnerCheckins.length > 0 && (
          <div className="card p-4 animate-slide-up">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>
              {partner?.nickname}'s Recent Check-ins
            </p>
            <div className="flex flex-col gap-2">
              {partnerCheckins.slice(0, 5).map(c => {
                const d = c.createdAt?.toDate?.() || new Date(c.createdAt)
                const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d')
                return (
                  <div key={c.id} className="flex items-center gap-3 py-1">
                    <span className="text-xs w-16 flex-shrink-0" style={{ color:'var(--muted)' }}>{label}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className="text-sm">{n <= c.rating ? '⭐' : '☆'}</span>
                      ))}
                    </div>
                    {c.note && (
                      <span className="text-xs italic truncate flex-1" style={{ color:'var(--muted)' }}>
                        "{c.note}"
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="card p-4 animate-slide-up">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>
            💡 Tips to improve your score
          </p>
          <div className="flex flex-col gap-2">
            {[
              'Check in every day to build your streak 🔥',
              'Send a good morning message when you wake up ☀️',
              'Share one thing you love about them each week 💌',
              'Plan a date night at least once a month 📅',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-rose-500 font-bold">{i+1}</span>
                </div>
                <p className="text-xs" style={{ color:'var(--text)' }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

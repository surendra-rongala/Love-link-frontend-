// src/pages/LoveMissionsPage.jsx — Daily Challenges & Missions
import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format } from 'date-fns'
import { Trophy, Star, Flame, CheckCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const ALL_MISSIONS = [
  { id:'m1', emoji:'💌', title:'Send a Love Note', desc:'Write your partner a heartfelt message today', points:10, category:'connect' },
  { id:'m2', emoji:'📸', title:'Share a Photo Memory', desc:'Send a photo that makes you think of them', points:15, category:'memory' },
  { id:'m3', emoji:'🎵', title:'Dedicate a Song', desc:'Share a song that reminds you of your partner', points:10, category:'vibe' },
  { id:'m4', emoji:'😊', title:'Update Your Mood', desc:'Let your partner know how you\'re feeling', points:5, category:'connect' },
  { id:'m5', emoji:'🌹', title:'Pay a Compliment', desc:'Tell your partner one thing you love about them in chat', points:10, category:'connect' },
  { id:'m6', emoji:'📅', title:'Plan a Date', desc:'Suggest a date idea in the planner', points:20, category:'plan' },
  { id:'m7', emoji:'🎁', title:'Send a Virtual Gift', desc:'Surprise your partner with a gift', points:15, category:'gift' },
  { id:'m8', emoji:'💭', title:'Daily Question', desc:'Answer today\'s daily connect question', points:20, category:'connect' },
  { id:'m9', emoji:'⭐', title:'Add to Our Story', desc:'Record a milestone in your relationship timeline', points:25, category:'memory' },
  { id:'m10', emoji:'🤗', title:'Send a Thinking of You', desc:'Send a quick ping to your partner', points:5, category:'connect' },
  { id:'m11', emoji:'🌙', title:'Good Night Ritual', desc:'Send your partner a good night message', points:10, category:'ritual' },
  { id:'m12', emoji:'☀️', title:'Good Morning', desc:'Start the day by saying good morning', points:10, category:'ritual' },
  { id:'m13', emoji:'💬', title:'Long Conversation', desc:'Have a chat with at least 10 messages today', points:20, category:'connect' },
  { id:'m14', emoji:'🎯', title:'Bucket List', desc:'Add a shared goal to your bucket list', points:15, category:'plan' },
  { id:'m15', emoji:'💝', title:'Write a Love Letter', desc:'Write your partner a full love letter', points:30, category:'connect' },
]

function getDailyMissions() {
  const seed = Math.floor(Date.now() / 86400000)
  // Pick 5 missions for today using seeded selection
  const shuffled = [...ALL_MISSIONS].sort((a,b) => {
    const ha = parseInt(a.id.slice(1)) * seed % 100
    const hb = parseInt(b.id.slice(1)) * seed % 100
    return ha - hb
  })
  return shuffled.slice(0, 5)
}

const BADGE_THRESHOLDS = [
  { points:50,  badge:'🌸', label:'Bloom' },
  { points:100, badge:'💕', label:'Lover' },
  { points:200, badge:'🔥', label:'On Fire' },
  { points:500, badge:'👑', label:'Royalty' },
  { points:1000,badge:'💎', label:'Diamond' },
]

export default function LoveMissionsPage() {
  const { user, couple } = useAuth()
  const [completed, setCompleted] = useState({})   // missionId -> true
  const [totalPoints, setTotalPoints] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const coupleId = couple?.id
  const today = format(new Date(), 'yyyy-MM-dd')
  const missions = getDailyMissions()

  useEffect(() => {
    if (!coupleId || !user) return
    Promise.all([
      getDoc(doc(db, 'missions', `${coupleId}_${user.uid}_${today}`)),
      getDoc(doc(db, 'mission_totals', `${coupleId}_${user.uid}`)),
    ]).then(([todaySnap, totalsSnap]) => {
      if (todaySnap.exists()) setCompleted(todaySnap.data().completed || {})
      if (totalsSnap.exists()) {
        setTotalPoints(totalsSnap.data().totalPoints || 0)
        setStreak(totalsSnap.data().streak || 0)
      }
      setLoading(false)
    })
  }, [coupleId, user?.uid])

  async function completeMission(mission) {
    if (completed[mission.id] || !coupleId) return
    const newCompleted = { ...completed, [mission.id]: true }
    setCompleted(newCompleted)
    const newPoints = totalPoints + mission.points
    setTotalPoints(newPoints)
    try {
      await setDoc(doc(db, 'missions', `${coupleId}_${user.uid}_${today}`), {
        completed: newCompleted, date: today, userId: user.uid, coupleId,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      await setDoc(doc(db, 'mission_totals', `${coupleId}_${user.uid}`), {
        totalPoints: newPoints, userId: user.uid, coupleId,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      toast.success(`+${mission.points} pts! ${mission.emoji}`)
    } catch { toast.error('Failed to save') }
  }

  const currentBadge = BADGE_THRESHOLDS.filter(b => totalPoints >= b.points).pop()
  const nextBadge = BADGE_THRESHOLDS.find(b => totalPoints < b.points)
  const progress = nextBadge ? totalPoints / nextBadge.points : 1
  const todayPts = missions.filter(m => completed[m.id]).reduce((s,m) => s+m.points, 0)

  return (
    <div className="min-h-full pb-4">
      <div className="header-gradient px-6 pt-14 pb-10 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <h1 className="font-display text-3xl italic text-white mb-1">Love Missions 🎯</h1>
        <p className="text-rose-200 text-sm">Daily challenges to deepen your bond</p>
      </div>

      <div className="px-4 -mt-5 flex flex-col gap-4">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 animate-slide-up">
          <div className="card p-4 text-center">
            <div className="text-2xl mb-1">{currentBadge?.badge || '🌱'}</div>
            <div className="text-xs font-semibold text-rose-500">{currentBadge?.label || 'Seedling'}</div>
            <div className="text-[10px]" style={{ color:'var(--muted)' }}>Badge</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-rose-500">{totalPoints}</div>
            <div className="text-[10px]" style={{ color:'var(--muted)' }}>Total Points</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl">🔥</div>
            <div className="text-xs font-semibold text-orange-500">{streak} days</div>
            <div className="text-[10px]" style={{ color:'var(--muted)' }}>Streak</div>
          </div>
        </div>

        {/* Progress to next badge */}
        {nextBadge && (
          <div className="card p-4 animate-slide-up" style={{ animationDelay:'.04s' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color:'var(--muted)' }}>Next: {nextBadge.badge} {nextBadge.label}</p>
              <p className="text-xs font-bold text-rose-500">{totalPoints}/{nextBadge.points} pts</p>
            </div>
            <div className="h-2 rounded-full" style={{ background:'var(--subtle)' }}>
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{ width:`${Math.min(progress*100,100)}%`, background:'linear-gradient(90deg,#f43f5e,#be123c)' }}
              />
            </div>
          </div>
        )}

        {/* Today's missions */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay:'.08s' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>Today's Missions</p>
            <span className="text-xs font-semibold text-rose-500">+{todayPts} pts today</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {missions.map(mission => {
                const done = !!completed[mission.id]
                return (
                  <div
                    key={mission.id}
                    className="rounded-2xl p-4 flex items-center gap-3 transition-all"
                    style={{ background: done ? 'var(--subtle)' : 'var(--card)', border:'1.5px solid', borderColor: done ? '#f43f5e33' : 'var(--border)', opacity: done ? 0.8 : 1 }}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${done ? 'opacity-50' : ''}`}
                      style={{ background: done ? 'var(--border)' : 'var(--subtle)' }}>
                      {done ? '✅' : mission.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color:'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>{mission.title}</p>
                      <p className="text-xs" style={{ color:'var(--muted)' }}>{mission.desc}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs font-bold text-amber-500">+{mission.points}pt</span>
                      {!done && (
                        <button
                          onClick={() => completeMission(mission)}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                          style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)', color:'white' }}
                        >
                          Done!
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* All badges */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay:'.12s' }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>Badges</p>
          <div className="flex justify-between">
            {BADGE_THRESHOLDS.map(b => {
              const earned = totalPoints >= b.points
              return (
                <div key={b.points} className="flex flex-col items-center gap-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${earned ? 'shadow-lg' : 'opacity-30 grayscale'}`}
                    style={{ background: earned ? 'var(--subtle)' : 'var(--border)', border: earned ? '2px solid #f43f5e33' : 'none' }}>
                    {b.badge}
                  </div>
                  <span className="text-[9px] font-medium" style={{ color: earned ? 'var(--text)' : 'var(--muted)' }}>{b.label}</span>
                  <span className="text-[8px]" style={{ color:'var(--muted)' }}>{b.points}pt</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

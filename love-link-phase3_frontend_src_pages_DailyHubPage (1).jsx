// src/pages/DailyHubPage.jsx
// Single Daily tab — question + missions + AI suggestions
import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format } from 'date-fns'
import { Flame, Lock, Unlock, CheckCircle, Sparkles, RefreshCw, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Daily question bank ──────────────────────────────────────────
const QUESTIONS = [
  "What made you smile today?","What's one thing you love about me that you've never said out loud?",
  "If we could go anywhere right now, where would you take us?","What's your favorite memory of us?",
  "What do you think our relationship's superpower is?","Describe our love in three words.",
  "What's a small thing I do that means the world to you?","What's your love language right now?",
  "What song reminds you of me and why?","What's something you're looking forward to in our future?",
  "What was the moment you knew I was special?","What habit of mine do you find secretly adorable?",
  "When do you feel most connected to me?","What's one adventure you want us to have together?",
  "What does home feel like to you?","What's something I've taught you without realizing it?",
  "If you wrote a book about us, what would you title it?","What's the best decision we've made together?",
  "What does a perfect day with me look like?","How would you describe us to a stranger?",
]

// ── Daily missions ───────────────────────────────────────────────
const MISSIONS = [
  { id:'q', emoji:'💬', title:'Answer today\'s question', pts:20 },
  { id:'m', emoji:'❤️', title:'Send a love message', pts:10 },
  { id:'g', emoji:'🎁', title:'Send a virtual gift', pts:15 },
  { id:'s', emoji:'📸', title:'Take a Live Snap', pts:15 },
  { id:'d', emoji:'🎨', title:'Draw something together', pts:20 },
]

function getTodayIdx() {
  return Math.floor(Date.now() / 86400000) % QUESTIONS.length
}

// AI message suggestion using Claude
async function fetchAISuggestion(context) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      model:'claude-sonnet-4-20250514', max_tokens:120,
      messages:[{ role:'user', content:
        `You are a romantic partner assistant. Generate ONE short, warm, genuine message (1-2 sentences max) that someone could send to their partner right now. Context: ${context}. No quotation marks. No emojis at the end. Just the message.`
      }]
    })
  })
  const d = await res.json()
  return d.content?.[0]?.text?.trim() || ''
}

export default function DailyHubPage() {
  const { user, profile, couple, partner } = useAuth()
  const [myAnswer,     setMyAnswer]     = useState('')
  const [savedAnswer,  setSavedAnswer]  = useState(null)
  const [partnerAnswer,setPartnerAnswer]= useState(null)
  const [streak,       setStreak]       = useState(0)
  const [completed,    setCompleted]    = useState({})
  const [totalPts,     setTotalPts]     = useState(0)
  const [saving,       setSaving]       = useState(false)
  const [aiMsg,        setAiMsg]        = useState('')
  const [loadingAI,    setLoadingAI]    = useState(false)
  const coupleId = couple?.id
  const today    = format(new Date(), 'yyyy-MM-dd')
  const question = QUESTIONS[getTodayIdx()]

  // Load today's Q&A
  useEffect(() => {
    if (!coupleId || !user) return
    return onSnapshot(doc(db,'couples',coupleId,'daily_answers',today), snap => {
      if (!snap.exists()) return
      const d = snap.data()
      if (d[user.uid])     setSavedAnswer(d[user.uid])
      if (partner && d[partner.uid] && d[user.uid]) setPartnerAnswer(d[partner.uid])
    })
  }, [coupleId, user?.uid, partner?.uid, today])

  // Load streak + missions
  useEffect(() => {
    if (!coupleId || !user) return
    Promise.all([
      getDoc(doc(db,'streaks',coupleId)),
      getDoc(doc(db,'missions',`${coupleId}_${user.uid}_${today}`)),
      getDoc(doc(db,'mission_totals',`${coupleId}_${user.uid}`)),
    ]).then(([str, mis, tot]) => {
      if (str.exists()) setStreak(str.data().currentStreak||0)
      if (mis.exists()) setCompleted(mis.data().completed||{})
      if (tot.exists()) setTotalPts(tot.data().totalPoints||0)
    })
  }, [coupleId, user?.uid, today])

  async function submitAnswer() {
    if (!myAnswer.trim() || saving || !coupleId) return
    setSaving(true)
    try {
      await setDoc(doc(db,'couples',coupleId,'daily_answers',today), {
        [user.uid]: myAnswer.trim(), question, date: today, updatedAt: serverTimestamp(),
      }, { merge:true })
      setSavedAnswer(myAnswer.trim())
      await completeTask('q')
      await updateStreak()
      toast.success('Answer saved! 💕')
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  async function completeTask(id) {
    if (completed[id]) return
    const mission = MISSIONS.find(m => m.id === id)
    if (!mission || !coupleId) return
    const newCompleted = { ...completed, [id]: true }
    const newPts = totalPts + mission.pts
    setCompleted(newCompleted); setTotalPts(newPts)
    await Promise.all([
      setDoc(doc(db,'missions',`${coupleId}_${user.uid}_${today}`), {
        completed:newCompleted, date:today, userId:user.uid, coupleId, updatedAt:serverTimestamp(),
      }, {merge:true}),
      setDoc(doc(db,'mission_totals',`${coupleId}_${user.uid}`), {
        totalPoints:newPts, userId:user.uid, coupleId, updatedAt:serverTimestamp(),
      }, {merge:true}),
    ])
  }

  async function updateStreak() {
    const ref = doc(db,'streaks',coupleId)
    const snap = await getDoc(ref)
    const yesterday = format(new Date(Date.now()-86400000),'yyyy-MM-dd')
    if (snap.exists()) {
      const d = snap.data()
      if (d.lastActiveDate === today) return
      const newStr = d.lastActiveDate===yesterday ? (d.currentStreak||0)+1 : 1
      await setDoc(ref, { currentStreak:newStr, lastActiveDate:today, coupleId }, {merge:true})
      setStreak(newStr)
    } else {
      await setDoc(ref, { currentStreak:1, lastActiveDate:today, coupleId })
      setStreak(1)
    }
  }

  async function getAISuggestion() {
    setLoadingAI(true)
    try {
      const mood = profile?.mood || 'happy'
      const msg  = await fetchAISuggestion(`mood is ${mood}, together for a while, partner name is ${partner?.nickname || 'my love'}`)
      setAiMsg(msg)
    } catch { toast.error('Failed to get suggestion') }
    finally { setLoadingAI(false) }
  }

  const todayPts    = MISSIONS.filter(m => completed[m.id]).reduce((s,m)=>s+m.pts,0)
  const bothAnswered = savedAnswer && partnerAnswer

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-12 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full" />
        <div className="absolute top-8 right-8 w-20 h-20 bg-white/5 rounded-full" />
        <p className="text-rose-200 text-xs uppercase tracking-widest mb-1">{format(new Date(),'EEEE, MMMM d')}</p>
        <h1 className="font-display text-4xl italic text-white mb-3">Daily Love 💫</h1>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
              <Flame size={13} className="text-orange-300" />
              <span className="text-white text-xs font-semibold">{streak} day streak</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
            <span className="text-white text-xs font-semibold">+{todayPts} pts today</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 flex flex-col gap-4">

        {/* Daily Question */}
        <div className="card p-5 animate-slide-up">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Today's Question 💬</p>
          <p className="text-base font-semibold leading-snug mb-4" style={{ color:'var(--text)' }}>"{question}"</p>

          {savedAnswer ? (
            <div className="rounded-2xl p-4 mb-3" style={{ background:'var(--subtle)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle size={13} className="text-green-500" />
                <span className="text-xs font-semibold text-green-600">Your Answer</span>
              </div>
              <p className="text-sm" style={{ color:'var(--text)' }}>{savedAnswer}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <textarea value={myAnswer} onChange={e=>setMyAnswer(e.target.value)}
                placeholder="Share your thoughts… 💭" rows={3} className="input-rose resize-none" />
              <button onClick={submitAnswer} disabled={saving||!myAnswer.trim()} className="btn-primary">
                {saving ? 'Saving…' : 'Share Answer 💕'}
              </button>
            </div>
          )}

          <div className="rounded-2xl p-4" style={{ background:'var(--subtle)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              {bothAnswered ? <Unlock size={13} className="text-rose-500"/> : <Lock size={13} style={{ color:'var(--muted)' }}/>}
              <span className="text-xs font-semibold" style={{ color:bothAnswered?'#be123c':'var(--muted)' }}>
                {partner?.nickname}'s Answer
              </span>
            </div>
            {bothAnswered
              ? <p className="text-sm" style={{ color:'var(--text)' }}>{partnerAnswer}</p>
              : <p className="text-xs italic" style={{ color:'var(--muted)' }}>
                  {savedAnswer ? `Waiting for ${partner?.nickname}…` : 'Answer first to unlock 🔒'}
                </p>
            }
          </div>
        </div>

        {/* AI Message Suggestion */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay:'.05s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-amber-500" />
            <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>AI Message Idea</p>
          </div>
          {aiMsg ? (
            <div>
              <p className="text-sm leading-relaxed mb-3" style={{ color:'var(--text)' }}>"{aiMsg}"</p>
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(aiMsg); toast.success('Copied! 💕') }}
                  className="flex-1 btn-ghost py-2.5 text-xs">Copy to Clipboard</button>
                <button onClick={getAISuggestion} disabled={loadingAI}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:'var(--subtle)' }}>
                  <RefreshCw size={14} className={loadingAI?'animate-spin':''} style={{ color:'var(--muted)' }}/>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={getAISuggestion} disabled={loadingAI}
              className="btn-primary py-3">
              {loadingAI
                ? <><RefreshCw size={14} className="animate-spin"/> Thinking…</>
                : <><Sparkles size={14}/> Get a message suggestion</>}
            </button>
          )}
        </div>

        {/* Daily Missions */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay:'.08s' }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>Today's Missions</p>
          <div className="flex flex-col gap-2.5">
            {MISSIONS.map(m => {
              const done = !!completed[m.id]
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                  style={{ background:'var(--subtle)', opacity: done ? 0.65 : 1 }}>
                  <span className="text-xl">{done ? '✅' : m.emoji}</span>
                  <p className="flex-1 text-sm font-medium"
                    style={{ color:'var(--text)', textDecoration:done?'line-through':'none' }}>
                    {m.title}
                  </p>
                  <span className="text-xs font-bold text-amber-500 flex-shrink-0">+{m.pts}pt</span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 h-2 rounded-full" style={{ background:'var(--border)' }}>
            <div className="h-2 rounded-full transition-all duration-700"
              style={{ width:`${(Object.keys(completed).length/MISSIONS.length)*100}%`,
                background:'linear-gradient(90deg,#f43f5e,#be123c)' }} />
          </div>
          <p className="text-xs text-center mt-2" style={{ color:'var(--muted)' }}>
            {Object.keys(completed).length}/{MISSIONS.length} missions completed
          </p>
        </div>
      </div>
    </div>
  )
}

// src/pages/DailyConnectPage.jsx — Module 1: Daily Connect System
import { useState, useEffect } from 'react'
import {
  doc, getDoc, setDoc, collection, query, where,
  orderBy, onSnapshot, serverTimestamp, getDocs, addDoc, limit
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format } from 'date-fns'
import { Lock, Unlock, Heart, CheckCircle, Flame } from 'lucide-react'
import toast from 'react-hot-toast'

const QUESTIONS = [
  "What made you smile today?",
  "What's one thing you appreciate about me that you've never told me?",
  "If we could go anywhere right now, where would you take us?",
  "What's your favorite memory of us together?",
  "What do you think our relationship's superpower is?",
  "What's something you've been wanting to do together?",
  "Describe our relationship in three words.",
  "What's a little thing I do that means the world to you?",
  "What's your love language right now — what do you need most?",
  "What song reminds you of me and why?",
  "If you could give me one gift with no limits, what would it be?",
  "What's something you're looking forward to in our future?",
  "What was the moment you knew I was special to you?",
  "How do you want to grow together this year?",
  "What's the most romantic thing we've ever done?",
  "What do you love most about our relationship?",
  "If today was our last day together, how would you spend it?",
  "What habit of mine do you find secretly adorable?",
  "What's something you wish I knew about how you feel?",
  "What's your favorite inside joke of ours?",
  "When do you feel most connected to me?",
  "What's one adventure you want us to have?",
  "What does home feel like to you? Describe it.",
  "What's something I've taught you without realizing it?",
  "How would you describe us to a stranger?",
  "What song would be the soundtrack to our love story?",
  "What's something small I do that makes your day better?",
  "If you wrote a book about us, what would you title it?",
  "What's the best decision we've made together?",
  "What does a perfect day with me look like?",
]

function getTodayQuestionIndex() {
  const start = new Date('2024-01-01')
  const diff  = Math.floor((Date.now() - start.getTime()) / 86400000)
  return diff % QUESTIONS.length
}

export default function DailyConnectPage() {
  const { user, profile, couple, partner } = useAuth()
  const [myAnswer,      setMyAnswer]      = useState('')
  const [myAnswerSaved, setMyAnswerSaved] = useState(null)
  const [partnerAnswer, setPartnerAnswer] = useState(null)
  const [streak,        setStreak]        = useState(0)
  const [saving,        setSaving]        = useState(false)
  const [pastAnswers,   setPastAnswers]   = useState([])

  const coupleId  = couple?.id
  const today     = format(new Date(), 'yyyy-MM-dd')
  const qIndex    = getTodayQuestionIndex()
  const question  = QUESTIONS[qIndex]

  // Load today's answers
  useEffect(() => {
    if (!coupleId || !user) return
    const ref = doc(db, 'couples', coupleId, 'daily_answers', today)
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return
      const data = snap.data()
      if (data[user.uid]) setMyAnswerSaved(data[user.uid])
      if (partner && data[partner.uid] && data[user.uid]) {
        setPartnerAnswer(data[partner.uid])
      }
    })
  }, [coupleId, user?.uid, partner?.uid, today])

  // Load streak
  useEffect(() => {
    if (!coupleId) return
    getDoc(doc(db, 'streaks', coupleId)).then(snap => {
      if (snap.exists()) setStreak(snap.data().currentStreak || 0)
    })
  }, [coupleId])

  // Load past Q&A
  useEffect(() => {
    if (!coupleId || !user || !partner) return
    getDoc(doc(db, 'couples', coupleId, 'daily_answers', today)).then(() => {})
    // last 5 days answers
    const past = []
    const promises = []
    for (let i = 1; i <= 5; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = format(d, 'yyyy-MM-dd')
      promises.push(
        getDoc(doc(db, 'couples', coupleId, 'daily_answers', dateStr)).then(snap => {
          if (snap.exists()) {
            const data = snap.data()
            if (data[user.uid] && data[partner.uid]) {
              past.push({ date: dateStr, q: data.question || QUESTIONS[(getTodayQuestionIndex() - i + QUESTIONS.length) % QUESTIONS.length], myAns: data[user.uid], partnerAns: data[partner.uid] })
            }
          }
        })
      )
    }
    Promise.all(promises).then(() => setPastAnswers(past.sort((a,b) => b.date.localeCompare(a.date))))
  }, [coupleId, user?.uid, partner?.uid])

  async function submitAnswer() {
    if (!myAnswer.trim() || saving || !coupleId) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'couples', coupleId, 'daily_answers', today), {
        [user.uid]: myAnswer.trim(),
        question,
        date: today,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setMyAnswerSaved(myAnswer.trim())
      toast.success('Answer saved! 💕')
      // update streak
      await updateStreak()
    } catch {
      toast.error('Failed to save answer')
    } finally {
      setSaving(false)
    }
  }

  async function updateStreak() {
    const ref = doc(db, 'streaks', coupleId)
    const snap = await getDoc(ref)
    const now = format(new Date(), 'yyyy-MM-dd')
    if (snap.exists()) {
      const d = snap.data()
      const last = d.lastActiveDate
      if (last === now) return
      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
      const newStreak = last === yesterday ? (d.currentStreak || 0) + 1 : 1
      await setDoc(ref, { currentStreak: newStreak, lastActiveDate: now, coupleId }, { merge: true })
      setStreak(newStreak)
    } else {
      await setDoc(ref, { currentStreak: 1, lastActiveDate: now, coupleId })
      setStreak(1)
    }
  }

  const bothAnswered = myAnswerSaved && partnerAnswer

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-10 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <h1 className="font-display text-3xl italic text-white mb-1">Daily Connect 💬</h1>
        <p className="text-rose-200 text-sm">One question, two hearts — every day</p>
        {streak > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5">
            <Flame size={14} className="text-orange-300" />
            <span className="text-white text-sm font-semibold">{streak} day streak!</span>
          </div>
        )}
      </div>

      <div className="px-4 -mt-5 flex flex-col gap-4">
        {/* Today's Question */}
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
              <Heart size={14} className="text-rose-500 fill-rose-500" />
            </div>
            <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>Today's Question</p>
          </div>
          <p className="text-lg font-semibold leading-snug mb-5" style={{ color:'var(--text)' }}>
            "{question}"
          </p>

          {myAnswerSaved ? (
            <div className="rounded-2xl p-4 mb-3" style={{ background:'var(--subtle)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-xs font-medium text-green-600">Your Answer</span>
              </div>
              <p className="text-sm" style={{ color:'var(--text)' }}>{myAnswerSaved}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <textarea
                value={myAnswer}
                onChange={e => setMyAnswer(e.target.value)}
                placeholder="Share your thoughts… 💭"
                rows={3}
                className="input-rose resize-none"
              />
              <button onClick={submitAnswer} disabled={saving || !myAnswer.trim()} className="btn-primary">
                {saving ? 'Saving…' : 'Share My Answer 💕'}
              </button>
            </div>
          )}

          {/* Partner's answer — locked until both answer */}
          <div className="rounded-2xl p-4" style={{ background:'var(--subtle)' }}>
            <div className="flex items-center gap-2 mb-2">
              {bothAnswered
                ? <Unlock size={14} className="text-rose-500" />
                : <Lock size={14} style={{ color:'var(--muted)' }} />
              }
              <span className="text-xs font-medium" style={{ color: bothAnswered ? '#be123c' : 'var(--muted)' }}>
                {partner?.nickname || 'Partner'}'s Answer
              </span>
            </div>
            {bothAnswered ? (
              <p className="text-sm" style={{ color:'var(--text)' }}>{partnerAnswer}</p>
            ) : (
              <p className="text-xs italic" style={{ color:'var(--muted)' }}>
                {myAnswerSaved
                  ? `Waiting for ${partner?.nickname || 'your partner'} to answer…`
                  : 'Answer first to unlock your partner\'s response 🔒'}
              </p>
            )}
          </div>
        </div>

        {/* Streak card */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay:'.06s' }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Your Streak</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-3xl shadow-lg">
              🔥
            </div>
            <div>
              <p className="text-3xl font-bold text-rose-500">{streak}</p>
              <p className="text-sm" style={{ color:'var(--muted)' }}>consecutive days</p>
              {streak >= 7 && <p className="text-xs text-amber-500 font-medium mt-0.5">🏆 Week warrior!</p>}
            </div>
          </div>
        </div>

        {/* Past Answers */}
        {pastAnswers.length > 0 && (
          <div className="card p-5 animate-slide-up" style={{ animationDelay:'.12s' }}>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>Previous Answers</p>
            <div className="flex flex-col gap-4">
              {pastAnswers.map((item, i) => (
                <div key={i} className="rounded-2xl p-4" style={{ background:'var(--subtle)' }}>
                  <p className="text-xs font-semibold text-rose-400 mb-2">{format(new Date(item.date), 'MMMM d')}</p>
                  <p className="text-xs italic mb-3" style={{ color:'var(--muted)' }}>"{item.q}"</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="rounded-xl p-3 bg-rose-50 dark:bg-rose-900/20">
                      <p className="text-[10px] font-bold text-rose-400 mb-1">YOU</p>
                      <p className="text-xs" style={{ color:'var(--text)' }}>{item.myAns}</p>
                    </div>
                    <div className="rounded-xl p-3 bg-pink-50 dark:bg-pink-900/20">
                      <p className="text-[10px] font-bold text-pink-400 mb-1">{partner?.name?.toUpperCase()}</p>
                      <p className="text-xs" style={{ color:'var(--text)' }}>{item.partnerAns}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

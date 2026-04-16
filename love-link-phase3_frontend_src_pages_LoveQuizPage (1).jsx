// src/pages/LoveQuizPage.jsx
// 3 game modes: Couple Questions, Truth or Dare, Would You Rather
import { useState, useEffect } from 'react'
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, limit, doc, updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Gamepad2, RefreshCw, ChevronRight, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Question banks ─────────────────────────────────────────────────
const COUPLE_QUESTIONS = [
  "What is your favourite memory of us together?",
  "If we could travel anywhere tomorrow, where would you pick?",
  "What is the one thing I do that always makes you smile?",
  "Describe our relationship in three words.",
  "What song reminds you of us the most?",
  "What is one thing you want us to do together that we haven't yet?",
  "What was your first impression of me?",
  "What do you love most about our relationship?",
  "What is one small thing I do that means a lot to you?",
  "If you could relive one day with me, which would it be?",
  "What is your favourite thing we do together on weekends?",
  "How has being with me changed you?",
  "What is something you have always wanted to tell me but haven't?",
  "What is a dream we share together?",
  "When did you know you were falling for me?",
  "What is the most romantic thing I have ever done for you?",
  "What is one habit of mine you secretly love?",
  "What is your love language and how do I fulfil it?",
  "Where do you see us in five years?",
  "What song would be the soundtrack of our relationship?",
]

const TRUTH_OR_DARE = [
  { type:'truth', text:"What was your most embarrassing moment in front of me?" },
  { type:'dare',  text:"Send a voice note saying 'I love you' in the most dramatic way possible." },
  { type:'truth', text:"What is one thing you have never told me but want to?" },
  { type:'dare',  text:"Share your most recent selfie without filters." },
  { type:'truth', text:"What did you think of me when we first met?" },
  { type:'dare',  text:"Write me a 3-line love poem right now." },
  { type:'truth', text:"What is a secret talent you have that I might not know?" },
  { type:'dare',  text:"Send me a voice message of you singing any song for 10 seconds." },
  { type:'truth', text:"What is the biggest lie you have ever told me?" },
  { type:'dare',  text:"Text me the most romantic thing you can think of in 30 seconds." },
  { type:'truth', text:"What is something I do that you find adorable but have never mentioned?" },
  { type:'dare',  text:"Send me a photo of what you are looking at right now." },
  { type:'truth', text:"What is your biggest fear about our relationship?" },
  { type:'dare',  text:"Describe our relationship using only food emojis." },
  { type:'truth', text:"What is one quality in me you wish you had yourself?" },
  { type:'dare',  text:"Make up a short story about how we met if we lived in medieval times." },
]

const WOULD_YOU_RATHER = [
  { a:"Go on a surprise trip together", b:"Plan every detail of a trip together" },
  { a:"Spend a week apart from me", b:"Spend a week at home with no wifi together" },
  { a:"Never fight with me again", b:"Always make up quickly after every fight" },
  { a:"Know exactly what I am thinking", b:"Always know how I am feeling" },
  { a:"Relive our first date", b:"Fast-forward to 10 years from now together" },
  { a:"Cook dinner for me every night", b:"Have me cook for you every night" },
  { a:"Receive love letters every week", b:"Receive random surprise gifts" },
  { a:"Live in a tiny flat together in a big city", b:"Live in a big house in the countryside" },
  { a:"Be with me but poor", b:"Be rich but have to spend half the year apart" },
  { a:"Never argue again", b:"Argue but always end the day resolved" },
  { a:"Only communicate by handwritten notes for a week", b:"Only communicate by singing for a week" },
  { a:"Know the exact date of every major life event", b:"Have every day be a complete surprise" },
]

const MODES = [
  { id:'questions', label:'Couple Questions', emoji:'💬', color:'#f43f5e', bg:'#fff1f2' },
  { id:'tod',       label:'Truth or Dare',    emoji:'🎯', color:'#8b5cf6', bg:'#f5f3ff' },
  { id:'wyr',       label:'Would You Rather', emoji:'🤔', color:'#f59e0b', bg:'#fffbeb' },
]

function getRandom(arr, excludeIdx) {
  let idx
  do { idx = Math.floor(Math.random() * arr.length) } while (arr.length > 1 && idx === excludeIdx)
  return [arr[idx], idx]
}

export default function LoveQuizPage() {
  const { user, profile, couple, partner } = useAuth()
  const [mode,      setMode]      = useState(null)
  const [cardIdx,   setCardIdx]   = useState(0)
  const [card,      setCard]      = useState(null)
  const [answered,  setAnswered]  = useState(false) // local flag
  const [history,   setHistory]   = useState([])
  const [showHist,  setShowHist]  = useState(false)
  const coupleId = couple?.id

  // ── Load game history from Firestore ──────────────────────────────
  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'couples', coupleId, 'quiz'),
      orderBy('createdAt', 'desc'), limit(30)
    )
    return onSnapshot(q, snap => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [coupleId])

  // ── Pick a card ───────────────────────────────────────────────────
  function pickCard(selectedMode, currentIdx = -1) {
    let arr, newCard, newIdx
    if (selectedMode === 'questions') {
      ;[newCard, newIdx] = getRandom(COUPLE_QUESTIONS, currentIdx)
      setCard({ type: 'question', text: newCard })
    } else if (selectedMode === 'tod') {
      ;[newCard, newIdx] = getRandom(TRUTH_OR_DARE, currentIdx)
      setCard(newCard)
    } else {
      ;[newCard, newIdx] = getRandom(WOULD_YOU_RATHER, currentIdx)
      setCard(newCard)
    }
    setCardIdx(newIdx)
    setAnswered(false)
  }

  function startMode(m) {
    setMode(m)
    setShowHist(false)
    pickCard(m)
  }

  async function saveAndNext() {
    // Log this card to Firestore so both partners can see history
    if (card && coupleId) {
      const entry = {
        mode,
        card: JSON.stringify(card),
        playedBy: user.uid,
        playerName: profile.name,
        createdAt: serverTimestamp(),
      }
      await addDoc(collection(db, 'couples', coupleId, 'quiz'), entry).catch(() => {})
    }
    pickCard(mode, cardIdx)
  }

  const modeObj = MODES.find(m => m.id === mode)

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl italic text-white mb-1">Love Games 🎮</h1>
          <p className="text-rose-200 text-sm">Play together, grow closer</p>
        </div>
        <button
          onClick={() => { setMode(null); setShowHist(v => !v) }}
          className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform text-white text-sm font-bold"
        >
          {showHist ? '✕' : '📜'}
        </button>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">

        {/* Mode selector */}
        {!mode && !showHist && (
          <>
            <p className="text-xs uppercase tracking-widest pt-1" style={{ color:'var(--muted)' }}>
              Choose a game
            </p>
            {MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => startMode(m.id)}
                className="card p-5 flex items-center gap-4 active:scale-98 transition-transform animate-slide-up text-left"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: m.bg }}
                >
                  {m.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-base" style={{ color:'var(--text)' }}>{m.label}</p>
                  <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>
                    {m.id === 'questions' && `${COUPLE_QUESTIONS.length} questions about your relationship`}
                    {m.id === 'tod'       && `${TRUTH_OR_DARE.length} truth or dare challenges`}
                    {m.id === 'wyr'       && `${WOULD_YOU_RATHER.length} would you rather dilemmas`}
                  </p>
                </div>
                <ChevronRight size={18} style={{ color:'var(--muted)' }} />
              </button>
            ))}
          </>
        )}

        {/* Active game card */}
        {mode && card && !showHist && (
          <>
            {/* Back */}
            <button
              onClick={() => setMode(null)}
              className="flex items-center gap-1 text-sm pt-1"
              style={{ color:'var(--muted)' }}
            >
              ← Back to games
            </button>

            {/* Mode badge */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{modeObj?.emoji}</span>
              <span className="text-sm font-semibold" style={{ color: modeObj?.color }}>
                {modeObj?.label}
              </span>
            </div>

            {/* Card */}
            <div
              className="card p-6 animate-pop min-h-[200px] flex flex-col justify-between"
              style={{ border: `2px solid ${modeObj?.color}30` }}
            >
              {/* Truth or Dare badge */}
              {mode === 'tod' && card.type && (
                <span
                  className="self-start px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
                  style={{
                    background: card.type === 'truth' ? '#eff6ff' : '#fdf4ff',
                    color: card.type === 'truth' ? '#2563eb' : '#9333ea',
                  }}
                >
                  {card.type === 'truth' ? '🧠 Truth' : '🎯 Dare'}
                </span>
              )}

              {/* Would You Rather */}
              {mode === 'wyr' && (
                <div className="flex flex-col gap-3 flex-1 justify-center">
                  <p className="text-xs uppercase tracking-widest text-center mb-2" style={{ color:'var(--muted)' }}>
                    Would you rather…
                  </p>
                  <div
                    className="p-4 rounded-2xl text-sm font-semibold text-center"
                    style={{ background: '#fff1f2', color: '#be123c' }}
                  >
                    {card.a}
                  </div>
                  <p className="text-center text-xs font-bold" style={{ color:'var(--muted)' }}>OR</p>
                  <div
                    className="p-4 rounded-2xl text-sm font-semibold text-center"
                    style={{ background: '#fffbeb', color: '#92400e' }}
                  >
                    {card.b}
                  </div>
                </div>
              )}

              {/* Couple question or Truth/Dare text */}
              {(mode === 'questions' || mode === 'tod') && (
                <p
                  className="font-display text-2xl italic leading-snug flex-1 flex items-center"
                  style={{ color:'var(--text)' }}
                >
                  {mode === 'questions' ? card.text : card.text}
                </p>
              )}

              {/* Next button */}
              <button
                onClick={saveAndNext}
                className="btn-primary mt-6"
                style={{ background: `linear-gradient(135deg, ${modeObj?.color}, ${modeObj?.color}cc)` }}
              >
                <RefreshCw size={15} />
                Next Card
              </button>
            </div>

            {/* Stats */}
            <div className="card p-4">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color:'var(--muted)' }}>
                Cards played this session
              </p>
              <p className="text-2xl font-bold text-rose-500">
                {history.filter(h => h.mode === mode).length}
              </p>
            </div>
          </>
        )}

        {/* History */}
        {showHist && (
          <div className="flex flex-col gap-3 animate-fade-in">
            <p className="text-xs uppercase tracking-widest pt-1" style={{ color:'var(--muted)' }}>
              Recent cards played
            </p>
            {history.length === 0 ? (
              <div className="card p-8 text-center">
                <Gamepad2 size={36} className="mx-auto mb-3 text-rose-300" />
                <p className="font-display text-xl italic text-rose-600 mb-1">No games yet</p>
                <p className="text-sm" style={{ color:'var(--muted)' }}>Start a game to see history</p>
              </div>
            ) : history.map((h, i) => {
              const m = MODES.find(m => m.id === h.mode)
              let cardObj
              try { cardObj = JSON.parse(h.card) } catch { cardObj = null }
              return (
                <div key={h.id} className="card p-4 animate-slide-up" style={{ animationDelay:`${i*.03}s` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{m?.emoji}</span>
                    <span className="text-xs font-semibold" style={{ color: m?.color }}>{m?.label}</span>
                    <span className="ml-auto text-xs" style={{ color:'var(--muted)' }}>
                      by {h.playerName}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color:'var(--text)' }}>
                    {typeof cardObj === 'string' ? cardObj : cardObj?.text || `${cardObj?.a} · ${cardObj?.b}`}
                  </p>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}

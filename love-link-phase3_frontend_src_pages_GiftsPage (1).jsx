// src/pages/GiftsPage.jsx — Enhanced Gift System (Module 2 + Module 5 upgrade)
import { useState, useEffect, useRef } from 'react'
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, limit, doc, getDoc
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format } from 'date-fns'
import { Mic, MicOff, Clock, Lock, Send } from 'lucide-react'
import toast from 'react-hot-toast'

const GIFT_CATEGORIES = {
  free: {
    label:'Free Gifts', emoji:'🎁',
    gifts:[
      { id:'heart',    emoji:'❤️',  label:'Heart',      color:'#fce7e7', msg:'sent you a heart!' },
      { id:'kiss',     emoji:'💋',  label:'Kiss',        color:'#fde8f0', msg:'blew you a kiss!' },
      { id:'teddy',    emoji:'🧸',  label:'Teddy Bear', color:'#fef3e2', msg:'sent you a teddy!' },
      { id:'flowers',  emoji:'💐',  label:'Flowers',     color:'#f0fce7', msg:'sent you flowers!' },
      { id:'sparkle',  emoji:'✨',  label:'Sparkles',    color:'#fefae2', msg:'sprinkled sparkles!' },
      { id:'cake',     emoji:'🎂',  label:'Cake',        color:'#fce7f0', msg:'baked you a cake!' },
    ],
  },
  premium: {
    label:'Premium Gifts', emoji:'💎', unlockStreak:7,
    gifts:[
      { id:'ring',     emoji:'💍',  label:'Ring',        color:'#e7f0fc', msg:'gave you a ring! 💍' },
      { id:'letter',   emoji:'💌',  label:'Love Letter', color:'#fce7e7', msg:'wrote you a love letter!' },
      { id:'star',     emoji:'⭐',  label:'Star',        color:'#fefae2', msg:'gave you a star! ⭐' },
      { id:'moon',     emoji:'🌙',  label:'Moon',        color:'#ede7fc', msg:'gave you the moon! 🌙' },
      { id:'rainbow',  emoji:'🌈',  label:'Rainbow',     color:'#e7fce7', msg:'sent a rainbow! 🌈' },
      { id:'butterfly',emoji:'🦋',  label:'Butterfly',   color:'#e7f0fc', msg:'sent a butterfly! 🦋' },
    ],
  },
  special: {
    label:'Special Gifts', emoji:'👑', unlockStreak:30,
    gifts:[
      { id:'crown',    emoji:'👑',  label:'Crown',       color:'#fef9e7', msg:'crowned you royalty! 👑' },
      { id:'galaxy',   emoji:'🌌',  label:'Galaxy',      color:'#e8eaf6', msg:'gave you the galaxy! 🌌' },
      { id:'magic',    emoji:'🪄',  label:'Magic Wand',  color:'#f3e5f5', msg:'cast a love spell! 🪄' },
      { id:'infinity', emoji:'♾️',  label:'Infinity',    color:'#e8f5e9', msg:'loves you infinitely! ♾️' },
    ],
  },
}

export default function GiftsPage() {
  const { user, profile, couple, partner } = useAuth()
  const [history,      setHistory]      = useState([])
  const [sending,      setSending]      = useState(null)
  const [popping,      setPopping]      = useState(null)
  const [streak,       setStreak]       = useState(0)
  const [activeTab,    setActiveTab]    = useState('free')
  const [personalMsg,  setPersonalMsg]  = useState('')
  const [selectedGift, setSelectedGift] = useState(null)
  const [showModal,    setShowModal]    = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')
  const [isScheduled,  setIsScheduled]  = useState(false)
  const [recording,    setRecording]    = useState(false)
  const [voiceBlob,    setVoiceBlob]    = useState(null)
  const [voiceDuration,setVoiceDuration]= useState(0)
  const mediaRef = useRef(null)
  const timerRef = useRef(null)
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(collection(db,'couples',coupleId,'gifts'), orderBy('createdAt','desc'), limit(40))
    return onSnapshot(q, snap => setHistory(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [coupleId])

  useEffect(() => {
    if (!coupleId) return
    getDoc(doc(db,'streaks',coupleId)).then(s => { if (s.exists()) setStreak(s.data().currentStreak||0) })
  }, [coupleId])

  function openModal(gift) {
    setSelectedGift(gift); setPersonalMsg(''); setVoiceBlob(null)
    setVoiceDuration(0); setIsScheduled(false); setScheduleTime(''); setShowModal(true)
  }

  async function sendGift() {
    if (sending || !coupleId || !selectedGift) return
    setSending(selectedGift.id); setPopping(selectedGift.id)
    setTimeout(() => setPopping(null), 500)
    try {
      await addDoc(collection(db,'couples',coupleId,'gifts'), {
        giftId: selectedGift.id, emoji: selectedGift.emoji, label: selectedGift.label,
        senderUid: user.uid, senderName: profile.name,
        msg: personalMsg.trim() || selectedGift.msg,
        personalMsg: personalMsg.trim(),
        scheduledFor: isScheduled && scheduleTime ? scheduleTime : null,
        status: isScheduled && scheduleTime ? 'scheduled' : 'sent',
        createdAt: serverTimestamp(),
      })
      toast.success(`${selectedGift.emoji} ${selectedGift.label} sent!`, { duration:2500 })
      setShowModal(false)
    } catch { toast.error('Failed to send') }
    finally { setSending(null) }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
      const mr = new MediaRecorder(stream); const chunks = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = () => { setVoiceBlob(new Blob(chunks,{type:'audio/webm'})); stream.getTracks().forEach(t=>t.stop()) }
      mediaRef.current = mr; mr.start(); setRecording(true); let s=0
      timerRef.current = setInterval(()=>{ s++; setVoiceDuration(s); if(s>=60) stopRecording() },1000)
    } catch { toast.error('Microphone not available') }
  }

  function stopRecording() { mediaRef.current?.stop(); clearInterval(timerRef.current); setRecording(false) }

  function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return format(d, 'MMM d · h:mm a')
  }

  const categories = Object.entries(GIFT_CATEGORIES)

  return (
    <div className="min-h-full pb-4">
      <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 px-6 pt-14 pb-8 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <h1 className="font-display text-3xl italic text-white mb-1">Virtual Gifts 🎁</h1>
        <p className="text-rose-200 text-sm">Send love to {partner?.nickname || 'your partner'}</p>
        {streak > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
            <span className="text-white text-xs">🔥 {streak}-day streak unlocks premium gifts!</span>
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
          {categories.map(([key,cat]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border-2 transition-all"
              style={{ background:activeTab===key?'linear-gradient(135deg,#f43f5e,#be123c)':'var(--card)', color:activeTab===key?'white':'var(--text)', borderColor:activeTab===key?'transparent':'var(--border)' }}>
              {cat.emoji} {cat.label}
              {cat.unlockStreak && streak < cat.unlockStreak && <Lock size={10} className="opacity-60" />}
            </button>
          ))}
        </div>

        {/* Gift Grid */}
        {categories.map(([key,cat]) => {
          if (key !== activeTab) return null
          const isLocked = cat.unlockStreak && streak < cat.unlockStreak
          return (
            <div key={key} className="card p-5 shadow-lg shadow-rose-100 animate-slide-up">
              {isLocked && (
                <div className="rounded-2xl p-4 mb-4 text-center" style={{ background:'var(--subtle)' }}>
                  <Lock size={20} className="mx-auto mb-2 text-rose-400" />
                  <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>Reach a {cat.unlockStreak}-day streak to unlock!</p>
                  <p className="text-xs text-rose-400 mt-1">Current: {streak} days 🔥</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {cat.gifts.map(gift => (
                  <button key={gift.id} onClick={() => !isLocked && openModal(gift)} disabled={isLocked}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-90 ${popping===gift.id?'animate-bounce-in':''} ${isLocked?'opacity-40 grayscale':''}`}
                    style={{ background:gift.color }}>
                    <span className="text-3xl">{gift.emoji}</span>
                    <span className="text-[10px] text-rose-700 font-semibold text-center leading-tight">{gift.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {/* Send Modal */}
        {showModal && selectedGift && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={e => e.target===e.currentTarget && setShowModal(false)}>
            <div className="w-full max-w-md rounded-t-3xl p-6 flex flex-col gap-4 animate-slide-up shadow-2xl"
              style={{ background:'var(--card)' }}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background:selectedGift.color }}>
                  {selectedGift.emoji}
                </div>
                <div>
                  <p className="font-semibold" style={{ color:'var(--text)' }}>Send {selectedGift.label}</p>
                  <p className="text-xs" style={{ color:'var(--muted)' }}>to {partner?.nickname || 'your partner'}</p>
                </div>
              </div>
              <textarea value={personalMsg} onChange={e=>setPersonalMsg(e.target.value)}
                placeholder="Add a personal message… (optional)" rows={2} className="input-rose resize-none" />
              <div>
                <p className="text-xs mb-2" style={{ color:'var(--muted)' }}>🎙️ Voice note (optional)</p>
                <div className="flex items-center gap-3">
                  <button onClick={recording?stopRecording:startRecording}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${recording?'bg-red-500 text-white animate-pulse':''}`}
                    style={!recording?{background:'var(--subtle)',color:'var(--text)'}:{}}>
                    {recording?<><MicOff size={14}/> Stop ({voiceDuration}s)</>:<><Mic size={14}/> Record</>}
                  </button>
                  {voiceBlob&&!recording&&<span className="text-xs text-green-600 font-medium">✓ {voiceDuration}s recorded</span>}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isScheduled} onChange={e=>setIsScheduled(e.target.checked)} className="accent-rose-500" />
                <Clock size={14} style={{ color:'var(--muted)' }} />
                <span style={{ color:'var(--text)' }}>Schedule for later</span>
              </label>
              {isScheduled && (
                <input type="datetime-local" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} className="input-rose" />
              )}
              <div className="flex gap-2">
                <button onClick={sendGift} disabled={!!sending} className="btn-primary flex-1">
                  <Send size={14}/>{isScheduled?'Schedule Gift 📅':`Send ${selectedGift.emoji}`}
                </button>
                <button onClick={()=>setShowModal(false)} className="btn-ghost px-4 w-auto">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="card p-5 shadow-lg shadow-rose-100 animate-slide-up" style={{ animationDelay:'.1s' }}>
          <p className="text-xs text-rose-400 uppercase tracking-widest mb-4">Gift History</p>
          {history.length===0 ? (
            <div className="text-center py-8"><div className="text-4xl mb-2 animate-float">🎁</div>
              <p className="text-sm text-rose-400">No gifts yet — be the first!</p></div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {history.map(item => {
                const me = item.senderUid===user.uid
                return (
                  <div key={item.id} className={`flex items-start gap-3 p-3 rounded-2xl ${me?'bg-rose-50 dark:bg-rose-900/20':'bg-pink-50 dark:bg-pink-900/20'}`}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl bg-white shadow-sm flex-shrink-0">{item.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color:'var(--text)' }}>
                        <span className="text-rose-600">{me?'You':item.senderName}</span>{' '}{item.msg}
                      </p>
                      {item.personalMsg && <p className="text-xs mt-0.5 italic" style={{ color:'var(--muted)' }}>"{item.personalMsg}"</p>}
                      <p className="text-[10px] text-rose-400 mt-0.5">
                        {item.status==='scheduled'?`📅 Scheduled: ${item.scheduledFor}`:formatTime(item.createdAt)}
                      </p>
                    </div>
                    <span className="text-rose-300 text-xs flex-shrink-0">{me?'→':'←'}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

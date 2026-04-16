// src/pages/ChatPage.jsx — Enhanced with gift trigger, thinking ping, unsent drafts
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, limit,
  doc, updateDoc, arrayUnion, setDoc, getDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Send, Heart, Image, X, Smile, Gift, Zap } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const QUICK_REACT  = ['❤️','😂','😍','🥺','👏','🔥']
const GIFT_KEYWORDS = ['sorry','miss you','i love you','love you','💕','❤️','thinking of you','forgi']

function spawnHeart(x, y) {
  const emojis = ['💕','💗','💖','❤️','🌸','✨']
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const el = document.createElement('div')
      el.className = 'float-heart'
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)]
      el.style.left = `${x - 12 + (Math.random()-0.5)*30}px`
      el.style.top  = `${y - 12}px`
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 1700)
    }, i * 120)
  }
}

function isMe(uid, myUid) { return uid === myUid }

export default function ChatPage() {
  const { user, profile, couple, partner, setTyping } = useAuth()
  const navigate = useNavigate()
  const [messages,     setMessages]     = useState([])
  const [text,         setText]         = useState('')
  const [sending,      setSending]      = useState(false)
  const [imageFile,    setImageFile]    = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [reactingTo,   setReactingTo]   = useState(null)
  const [partnerTyping,setPartnerTyping]= useState(false)
  const [showGiftPop,  setShowGiftPop]  = useState(false)
  const [giftPopShown, setGiftPopShown] = useState(false)
  const [pingSent,     setPingSent]     = useState(false)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const fileRef     = useRef(null)
  const typingTimer = useRef(null)
  const draftTimer  = useRef(null)
  const coupleId    = couple?.id

  // ── Real-time messages ─────────────────────────────────────────────
  useEffect(() => {
    if (!coupleId) return
    const q = query(collection(db,'couples',coupleId,'messages'), orderBy('createdAt','asc'), limit(300))
    return onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [coupleId])

  // ── Partner typing ─────────────────────────────────────────────────
  useEffect(() => {
    if (!coupleId || !partner) return
    return onSnapshot(doc(db,'couples',coupleId), snap => {
      setPartnerTyping(!!(snap.data()?.typing?.[partner.uid]))
    })
  }, [coupleId, partner?.uid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, partnerTyping])

  // ── Typing + draft save ────────────────────────────────────────────
  function handleTextChange(e) {
    const val = e.target.value
    setText(val)
    setTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => setTyping(false), 2000)

    // Gift keyword detection
    if (!giftPopShown) {
      const lower = val.toLowerCase()
      if (GIFT_KEYWORDS.some(kw => lower.includes(kw))) {
        setShowGiftPop(true)
        setGiftPopShown(true)
        setTimeout(() => setShowGiftPop(false), 6000)
      }
    }

    // Auto-save draft
    clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => saveDraft(val), 2000)
  }

  async function saveDraft(val) {
    if (!coupleId || !val.trim()) return
    try {
      await setDoc(doc(db,'couples',coupleId,'drafts',user.uid), {
        text: val, savedAt: serverTimestamp(), uid: user.uid,
      })
    } catch {}
  }

  // ── Pick image ─────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5*1024*1024) return toast.error('Image must be under 5 MB')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null); setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Send message ───────────────────────────────────────────────────
  async function send(e) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed && !imageFile) return
    if (sending || !coupleId) return

    setText(''); setTyping(false); clearTimeout(typingTimer.current); setSending(true)
    setGiftPopShown(false); setShowGiftPop(false)

    try {
      let imageUrl = null
      if (imageFile) {
        const r = ref(storage, `couples/${coupleId}/chat/${Date.now()}_${imageFile.name}`)
        await uploadBytes(r, imageFile); imageUrl = await getDownloadURL(r); clearImage()
      }
      await addDoc(collection(db,'couples',coupleId,'messages'), {
        text: trimmed, imageUrl,
        senderUid: user.uid, senderName: profile.name,
        reactions: [], createdAt: serverTimestamp(),
      })
      // clear draft
      try { await setDoc(doc(db,'couples',coupleId,'drafts',user.uid), { text:'' }, { merge:true }) } catch {}
    } catch { toast.error('Failed to send') }
    finally { setSending(false); inputRef.current?.focus() }
  }

  // ── React ──────────────────────────────────────────────────────────
  async function addReaction(msgId, emoji) {
    setReactingTo(null)
    try {
      await updateDoc(doc(db,'couples',coupleId,'messages',msgId), {
        reactions: arrayUnion(`${emoji}:${user.uid}`)
      })
    } catch {}
  }

  // ── Thinking Ping ──────────────────────────────────────────────────
  async function sendPing() {
    if (pingSent || !coupleId) return
    try {
      await addDoc(collection(db,'couples',coupleId,'messages'), {
        text: '💭 Thinking of you…',
        isPing: true,
        senderUid: user.uid, senderName: profile.name,
        reactions: [], createdAt: serverTimestamp(),
      })
      setPingSent(true)
      setTimeout(() => setPingSent(false), 10000)
      toast.success('Ping sent! 💭')
    } catch { toast.error('Failed to send ping') }
  }

  // ── Date separators ────────────────────────────────────────────────
  function getDateLabel(ts) {
    if (!ts) return ''
    const d   = ts.toDate ? ts.toDate() : new Date(ts)
    const now  = new Date(), yest = new Date(now); yest.setDate(now.getDate()-1)
    if (d.toDateString() === now.toDateString())  return 'Today'
    if (d.toDateString() === yest.toDateString()) return 'Yesterday'
    return format(d, 'MMM d, yyyy')
  }

  const rendered = []; let lastDate = null
  for (const msg of messages) {
    const dl = getDateLabel(msg.createdAt)
    if (dl !== lastDate) { rendered.push({ type:'date', label:dl, key:`d-${msg.id}` }); lastDate = dl }
    rendered.push(msg)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass border-b border-rose-100 px-4 py-3 flex-shrink-0 flex items-center gap-3 safe-top">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white font-bold shadow-md">
          {partner?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color:'var(--text)' }}>{partner?.name || 'Partner'}</p>
          <p className="text-[11px] truncate" style={{ color:'var(--muted)' }}>
            {partnerTyping
              ? <span className="flex items-center gap-1 text-rose-500"><span>typing</span><span className="flex gap-0.5 items-center"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span></span>
              : `${partner?.nickname || ''} · always in my heart 💕`}
          </p>
        </div>
        {/* Thinking Ping */}
        <button onClick={sendPing} disabled={pingSent}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-90"
          style={{ background:pingSent?'var(--subtle)':'linear-gradient(135deg,#f43f5e,#be123c)', color:pingSent?'var(--muted)':'white' }}>
          <Zap size={11} /> {pingSent?'Sent!':'Ping'}
        </button>
        <Heart size={18} className="text-rose-500 fill-rose-500 animate-heartbeat flex-shrink-0" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1"
        onClick={() => reactingTo && setReactingTo(null)}>
        {messages.length===0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16">
            <div className="text-6xl animate-float">💌</div>
            <p className="font-display text-2xl italic text-rose-600">Say hello, love</p>
            <p className="text-sm text-rose-400">Your private conversation starts here</p>
          </div>
        )}

        {rendered.map(item => {
          if (item.type==='date') return (
            <div key={item.key} className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-rose-100"/>
              <span className="text-[10px] text-rose-300 font-medium px-2 rounded-full py-0.5" style={{ background:'var(--subtle)' }}>{item.label}</span>
              <div className="flex-1 h-px bg-rose-100"/>
            </div>
          )

          const me   = item.senderUid===user.uid
          const time = item.createdAt?.toDate ? format(item.createdAt.toDate(),'h:mm a') : ''
          const reactionMap = {}
          for (const r of (item.reactions||[])) {
            const [emoji] = r.split(':'); reactionMap[emoji] = (reactionMap[emoji]||0)+1
          }

          // Ping message
          if (item.isPing) return (
            <div key={item.id} className="flex justify-center my-2">
              <div className="px-4 py-2 rounded-full text-sm" style={{ background:'var(--subtle)', color:'var(--muted)' }}>
                {item.senderUid===user.uid?'You':partner?.nickname} {item.text} <span className="text-[10px]">{time}</span>
              </div>
            </div>
          )

          return (
            <div key={item.id} className={`flex items-end gap-2 animate-fade-in ${me?'flex-row-reverse':'flex-row'}`}>
              {!me && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-1">
                  {partner?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className={`flex flex-col gap-0.5 max-w-[78%] ${me?'items-end':'items-start'}`}>
                {item.imageUrl && (
                  <div className={`rounded-2xl overflow-hidden cursor-pointer ${me?'rounded-br-sm':'rounded-bl-sm'}`}
                    onClick={e => me && spawnHeart(e.clientX,e.clientY)}>
                    <img src={item.imageUrl} alt="shared" className="max-w-[220px] max-h-[280px] object-cover block"/>
                  </div>
                )}
                {item.text && (
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed relative group cursor-pointer ${me?'bubble-me':'bubble-them'}`}
                    onClick={e => { if(me) spawnHeart(e.clientX,e.clientY) }}
                    onContextMenu={e => { e.preventDefault(); setReactingTo(item.id) }}
                    onTouchStart={() => {
                      const t = setTimeout(()=>setReactingTo(item.id),500)
                      document.addEventListener('touchend',()=>clearTimeout(t),{once:true})
                    }}>
                    {item.text}
                    <button onClick={e=>{e.stopPropagation();setReactingTo(reactingTo===item.id?null:item.id)}}
                      className={`absolute ${me?'left-0 -translate-x-full':'right-0 translate-x-full'} top-1/2 -translate-y-1/2 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <Smile size={14} className="text-rose-300"/>
                    </button>
                  </div>
                )}
                {reactingTo===item.id && (
                  <div className={`flex gap-1 p-2 rounded-2xl shadow-xl border animate-pop z-10 ${me?'self-end':'self-start'}`}
                    style={{ background:'var(--card)', borderColor:'var(--border)' }}>
                    {QUICK_REACT.map(em => (
                      <button key={em} onClick={()=>addReaction(item.id,em)}
                        className="text-xl w-9 h-9 flex items-center justify-center rounded-xl active:scale-90 transition-transform"
                        style={{ background:'var(--subtle)' }}>{em}</button>
                    ))}
                  </div>
                )}
                {Object.keys(reactionMap).length>0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {Object.entries(reactionMap).map(([em,count]) => (
                      <button key={em} onClick={()=>addReaction(item.id,em)} className="reaction-pill text-sm">
                        {em} <span className="text-rose-500 font-medium">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-rose-300 px-1">{time}</span>
              </div>
            </div>
          )
        })}

        {partnerTyping && (
          <div className="flex items-end gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {partner?.name?.[0]?.toUpperCase()}
            </div>
            <div className="bubble-them px-4 py-3 flex items-center gap-1">
              <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Gift popup */}
      {showGiftPop && (
        <div className="mx-3 mb-2 p-3 rounded-2xl flex items-center gap-3 shadow-lg animate-slide-up"
          style={{ background:'linear-gradient(135deg,#fce7e7,#fde8f0)', border:'1px solid #fecdd3' }}>
          <span className="text-2xl">💝</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-700">Send a gift with your message?</p>
            <p className="text-xs text-rose-400">Make it extra special 💕</p>
          </div>
          <button onClick={() => { setShowGiftPop(false); navigate('/gifts') }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)' }}>
            Send Gift
          </button>
          <button onClick={() => setShowGiftPop(false)} className="text-rose-300"><X size={14}/></button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="relative inline-block">
            <img src={imagePreview} alt="preview" className="h-20 w-20 object-cover rounded-2xl border-2 border-rose-200"/>
            <button onClick={clearImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center text-white">
              <X size={12}/>
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="glass border-t border-rose-100 px-3 py-2 flex-shrink-0">
        <form onSubmit={send} className="flex items-end gap-2">
          <button type="button" onClick={()=>fileRef.current?.click()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-rose-400 flex-shrink-0 active:scale-90 transition-transform"
            style={{ background:'var(--subtle)' }}>
            <Image size={18}/>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>

          <div className="flex-1 rounded-2xl border px-4 py-2.5 min-h-[42px] flex items-center"
            style={{ background:'var(--input-bg)', borderColor:'var(--border)' }}>
            <textarea ref={inputRef} value={text} onChange={handleTextChange}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
              placeholder="Say something sweet… 💕" rows={1}
              className="w-full bg-transparent text-sm resize-none outline-none leading-snug max-h-24"
              style={{ color:'var(--text)' }}
              onInput={e=>{e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px'}}/>
          </div>

          <button type="submit" disabled={(!text.trim()&&!imageFile)||sending}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform disabled:opacity-40 flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)', boxShadow:'0 4px 12px rgba(244,63,94,.4)' }}>
            <Send size={16} className="ml-0.5"/>
          </button>
        </form>
      </div>
    </div>
  )
}

// src/pages/SyncModePage.jsx
// Real-time Watch Together — synced YouTube player + floating chat overlay
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  doc, onSnapshot, setDoc, serverTimestamp,
  collection, addDoc, query, orderBy, limit
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Play, Pause, Link2, X, Send, Maximize2, ChevronDown, Sync } from 'lucide-react'
import toast from 'react-hot-toast'

const EMOJI_REACTS = ['❤️','😂','😍','🥺','🔥','✨']

function extractYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

// Floating emoji particle
function EmojiParticle({ emoji, id, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="absolute pointer-events-none animate-float-up text-3xl" style={{
      left: `${15 + Math.random() * 70}%`,
      bottom: '80px',
      animation: 'floatUp 2s ease-out forwards',
    }}>
      {emoji}
    </div>
  )
}

export default function SyncModePage() {
  const { user, profile, couple, partner } = useAuth()
  const [url,          setUrl]          = useState('')
  const [videoId,      setVideoId]      = useState(null)
  const [syncState,    setSyncState]    = useState(null)
  const [messages,     setMessages]     = useState([])
  const [chatText,     setChatText]     = useState('')
  const [showChat,     setShowChat]     = useState(true)
  const [particles,    setParticles]    = useState([])
  const [isLeader,     setIsLeader]     = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(true)
  const playerRef    = useRef(null)
  const ytPlayerRef  = useRef(null)
  const syncInterval = useRef(null)
  const coupleId     = couple?.id

  // Listen to sync_state
  useEffect(() => {
    if (!coupleId) return
    return onSnapshot(doc(db, 'sync_state', coupleId), snap => {
      if (snap.exists()) {
        const d = snap.data()
        setSyncState(d)
        if (d.videoId && !videoId) {
          setVideoId(d.videoId)
          setShowUrlInput(false)
        }
      }
    })
  }, [coupleId])

  // Listen to sync chat
  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'sync_state', coupleId, 'chat'),
      orderBy('createdAt', 'asc'), limit(50)
    )
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [coupleId])

  function loadVideo() {
    const ytId = extractYouTubeId(url.trim())
    if (!ytId) { toast.error('Paste a YouTube link'); return }
    setVideoId(ytId)
    setShowUrlInput(false)
    setIsLeader(true)
    // Broadcast to partner
    setDoc(doc(db, 'sync_state', coupleId), {
      videoId: ytId,
      playing: false,
      timestamp: 0,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    })
  }

  async function broadcastSync(playing, ts) {
    if (!coupleId) return
    await setDoc(doc(db, 'sync_state', coupleId), {
      playing, timestamp: ts,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }

  function onYTReady(event) {
    ytPlayerRef.current = event.target
    // Apply incoming sync state
    if (syncState?.timestamp) event.target.seekTo(syncState.timestamp, true)
    if (syncState?.playing) event.target.playVideo()
  }

  function handlePlayPause() {
    const p = ytPlayerRef.current
    if (!p) return
    const state = p.getPlayerState()
    if (state === 1) { p.pauseVideo(); broadcastSync(false, p.getCurrentTime()) }
    else             { p.playVideo();  broadcastSync(true,  p.getCurrentTime()) }
  }

  function handleSync() {
    const p = ytPlayerRef.current
    if (!syncState || !p) return
    p.seekTo(syncState.timestamp, true)
    if (syncState.playing) p.playVideo()
    else p.pauseVideo()
    toast.success('Synced! 🔁')
  }

  async function sendChat(e) {
    e?.preventDefault()
    if (!chatText.trim() || !coupleId) return
    await addDoc(collection(db, 'sync_state', coupleId, 'chat'), {
      text: chatText.trim(),
      uid: user.uid,
      name: profile.nickname || profile.name,
      createdAt: serverTimestamp(),
    })
    setChatText('')
  }

  function spawnEmoji(emoji) {
    const id = Date.now()
    setParticles(p => [...p, { emoji, id }])
    // Also broadcast to sync chat
    addDoc(collection(db, 'sync_state', coupleId, 'chat'), {
      text: emoji, isReact: true,
      uid: user.uid, name: profile.nickname || profile.name,
      createdAt: serverTimestamp(),
    })
  }

  const isPlaying = syncState?.playing || false

  // Load YouTube IFrame API
  useEffect(() => {
    if (!videoId) return
    if (window.YT && window.YT.Player) { initPlayer(); return }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = initPlayer
  }, [videoId])

  function initPlayer() {
    if (!videoId || !document.getElementById('yt-player')) return
    try {
      new window.YT.Player('yt-player', {
        videoId,
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0 },
        events: { onReady: onYTReady },
      })
    } catch {}
  }

  // URL input screen
  if (showUrlInput) return (
    <div className="min-h-full pb-4 flex flex-col">
      <div className="header-gradient px-6 pt-14 pb-10 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <h1 className="font-display text-3xl italic text-white mb-1">Sync Mode 🎬</h1>
        <p className="text-rose-200 text-sm">Watch together, feel together</p>
      </div>
      <div className="px-4 -mt-5 flex flex-col gap-4">
        <div className="card p-5 animate-slide-up">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Paste a YouTube link</p>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="input-rose mb-3"
          />
          <button onClick={loadVideo} className="btn-primary">
            <Play size={14} /> Start Watching Together
          </button>
        </div>
        {syncState?.videoId && (
          <div className="card p-5 animate-slide-up" style={{ animationDelay:'.06s' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color:'var(--muted)' }}>
              {partner?.nickname} is already watching
            </p>
            <button onClick={() => { setVideoId(syncState.videoId); setShowUrlInput(false) }}
              className="btn-ghost">
              Join Session
            </button>
          </div>
        )}
        <div className="card p-5 animate-slide-up" style={{ animationDelay:'.1s' }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>How it works</p>
          <div className="flex flex-col gap-2">
            {['Paste any YouTube link','Both of you see and hear the same thing','Chat, react, and enjoy together'].map((t,i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)' }}>{i+1}</div>
                <p className="text-sm" style={{ color:'var(--text)' }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Player screen
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-40">
      {/* YouTube embed */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div id="yt-player" className="w-full h-full" style={{ aspectRatio:'16/9', maxHeight:'60vh' }} />

        {/* Emoji particles */}
        {particles.map(p => (
          <EmojiParticle key={p.id} emoji={p.emoji} id={p.id}
            onDone={() => setParticles(ps => ps.filter(x => x.id !== p.id))} />
        ))}

        {/* Chat overlay */}
        {showChat && (
          <div className="absolute bottom-4 left-3 right-3 pointer-events-none">
            <div className="flex flex-col gap-1 max-h-40 overflow-hidden justify-end">
              {messages.slice(-6).map(m => (
                <div key={m.id} className={`self-start max-w-[85%] px-3 py-1.5 rounded-2xl text-sm text-white
                  ${m.isReact ? 'bg-transparent text-2xl' : 'bg-black/50 backdrop-blur-md'}`}>
                  {!m.isReact && <span className="text-rose-300 text-xs font-medium">{m.name}: </span>}
                  {m.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Emoji reactions row */}
      <div className="flex justify-center gap-3 py-2 px-4">
        {EMOJI_REACTS.map(em => (
          <button key={em} onClick={() => spawnEmoji(em)}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl active:scale-75 transition-transform">
            {em}
          </button>
        ))}
      </div>

      {/* Chat input */}
      <div className="px-3 pb-2 flex gap-2 items-center">
        <input
          value={chatText}
          onChange={e => setChatText(e.target.value)}
          onKeyDown={e => e.key==='Enter' && sendChat()}
          placeholder="Say something… 💕"
          className="flex-1 px-4 py-2.5 rounded-2xl text-sm text-white placeholder-white/40 outline-none"
          style={{ background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)' }}
        />
        <button onClick={sendChat}
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)' }}>
          <Send size={14} className="text-white" />
        </button>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ paddingBottom:'max(env(safe-area-inset-bottom), 12px)', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(12px)' }}>
        <button onClick={() => { setVideoId(null); setShowUrlInput(true) }}
          className="flex items-center gap-1.5 text-white/60 text-xs">
          <X size={14} /> Exit
        </button>
        <div className="flex items-center gap-4">
          <button onClick={handleSync} className="text-white/60">
            <Sync size={18} />
          </button>
          <button onClick={handlePlayPause}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)', boxShadow:'0 4px 16px rgba(244,63,94,.5)' }}>
            {isPlaying ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
          </button>
          <button onClick={() => setShowChat(v => !v)} className="text-white/60">
            <ChevronDown size={18} className={showChat ? '' : 'rotate-180'} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/60 text-xs">{partner?.nickname}</span>
        </div>
      </div>
    </div>
  )
}

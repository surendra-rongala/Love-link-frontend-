// src/pages/LiveSnapPage.jsx
// Instant photo share — captures and sends full-screen to partner
import { useState, useRef, useEffect } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Camera, SwitchCamera, Send, X, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function LiveSnapPage() {
  const { user, profile, partner, couple } = useAuth()
  const navigate = useNavigate()
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const [facing,   setFacing]   = useState('user')
  const [captured, setCaptured] = useState(null) // dataURL
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [camReady, setCamReady] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [facing])

  async function startCamera() {
    stopCamera()
    setCamReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setCamReady(true)
      }
    } catch (e) {
      toast.error('Camera not available')
      navigate(-1)
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamReady(false)
  }

  function capture() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (facing === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.85))
    stopCamera()
  }

  function retake() {
    setCaptured(null)
    setMessage('')
    startCamera()
  }

  async function sendSnap() {
    if (!captured || sending || !couple) return
    setSending(true)
    try {
      // Convert dataURL → blob → upload
      const res   = await fetch(captured)
      const blob  = await res.blob()
      const path  = `snaps/${couple.id}/${Date.now()}.jpg`
      const snap  = await uploadBytes(storageRef(storage, path), blob)
      const url   = await getDownloadURL(snap.ref)

      await addDoc(collection(db, 'live_snaps'), {
        senderId:   user.uid,
        senderName: profile.name,
        receiverId: partner.uid,
        coupleId:   couple.id,
        imageUrl:   url,
        message:    message.trim(),
        viewed:     false,
        timestamp:  serverTimestamp(),
      })
      toast.success('Snap sent! 💖')
      navigate('/chat')
    } catch (e) {
      toast.error('Failed to send snap')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">

      {/* Header */}
      <div className="safe-top flex items-center justify-between px-5 py-3 absolute top-0 left-0 right-0 z-10">
        <button onClick={() => { stopCamera(); navigate(-1) }}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
          <X size={18} className="text-white" />
        </button>
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5">
          <Zap size={12} className="text-rose-400" />
          <span className="text-white text-xs font-semibold">Live Snap</span>
        </div>
        {!captured && (
          <button onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
            <SwitchCamera size={18} className="text-white" />
          </button>
        )}
        {captured && <div className="w-10" />}
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {!captured ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        ) : (
          <img src={captured} className="w-full h-full object-cover" alt="captured" />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Loading overlay */}
        {!camReady && !captured && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="pb-safe px-5 py-6" style={{ paddingBottom:'max(env(safe-area-inset-bottom), 24px)' }}>
        {!captured ? (
          <div className="flex items-center justify-center">
            <button
              onClick={capture}
              disabled={!camReady}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40"
              style={{ background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)' }}
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Add a message for ${partner?.nickname || 'them'}… 💕`}
              className="w-full px-4 py-3 rounded-2xl text-sm text-white placeholder-white/50 outline-none"
              style={{ background:'rgba(255,255,255,0.15)', backdropFilter:'blur(12px)' }}
            />
            <div className="flex gap-3">
              <button onClick={retake}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)' }}>
                <X size={14} /> Retake
              </button>
              <button onClick={sendSnap} disabled={sending}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)', boxShadow:'0 6px 20px rgba(244,63,94,.5)' }}>
                {sending
                  ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
                  : <><Send size={14} /> Send to {partner?.nickname || 'them'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

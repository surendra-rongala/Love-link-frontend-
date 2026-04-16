// src/components/snaps/SnapInbox.jsx
// Listens for incoming snaps and shows full-screen popup
import { useState, useEffect, useRef } from 'react'
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../lib/AuthContext'
import { X, Heart, Fire, Laugh } from 'lucide-react'

const REACTIONS = ['❤️','🔥','😂','😍','🥺','✨']

export default function SnapInbox() {
  const { user, partner } = useAuth()
  const [snap,      setSnap]      = useState(null)
  const [reaction,  setReaction]  = useState(null)
  const [fading,    setFading]    = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'live_snaps'),
      where('receiverId', '==', user.uid),
      where('viewed', '==', false)
    )
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (docs.length > 0) {
        // Show most recent unviewed snap
        const latest = docs.sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0))[0]
        setSnap(latest)
        setReaction(null)
        setFading(false)
      }
    })
  }, [user?.uid])

  async function dismiss() {
    if (!snap) return
    setFading(true)
    try {
      await updateDoc(doc(db, 'live_snaps', snap.id), {
        viewed: true,
        viewedAt: serverTimestamp(),
      })
    } catch {}
    setTimeout(() => { setSnap(null); setFading(false) }, 300)
  }

  async function sendReaction(emoji) {
    setReaction(emoji)
    if (snap) {
      try {
        await updateDoc(doc(db, 'live_snaps', snap.id), { reaction: emoji })
      } catch {}
    }
    setTimeout(dismiss, 1200)
  }

  if (!snap) return null

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col transition-all duration-300 ${fading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      style={{ background: 'rgba(0,0,0,0.92)' }}
    >
      {/* Sender label */}
      <div className="safe-top px-5 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-rose-700 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            {snap.senderName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{snap.senderName}</p>
            <p className="text-rose-300 text-xs">sent you a moment 💖</p>
          </div>
        </div>
        <button onClick={dismiss} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* Image — full screen */}
      <div className="flex-1 flex items-center justify-center px-4 py-4">
        {snap.imageUrl ? (
          <img
            src={snap.imageUrl}
            alt="snap"
            className="w-full max-h-full object-contain rounded-3xl shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 280px)' }}
          />
        ) : (
          <div className="w-full h-64 rounded-3xl bg-gradient-to-br from-rose-900 to-rose-600 flex items-center justify-center">
            <span className="text-6xl">📸</span>
          </div>
        )}
      </div>

      {/* Message */}
      {snap.message && (
        <div className="mx-5 mb-3 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md">
          <p className="text-white text-sm text-center italic">"{snap.message}"</p>
        </div>
      )}

      {/* Reactions */}
      {reaction ? (
        <div className="mx-5 mb-6 py-4 flex items-center justify-center">
          <span className="text-6xl animate-bounce">{reaction}</span>
        </div>
      ) : (
        <div className="mx-5 mb-6 flex justify-center gap-3">
          {REACTIONS.map(em => (
            <button
              key={em}
              onClick={() => sendReaction(em)}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl active:scale-75 transition-transform hover:bg-white/20"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Tap to close */}
      <div className="pb-8 text-center">
        <p className="text-white/40 text-xs">tap × to close</p>
      </div>
    </div>
  )
}

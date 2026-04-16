import { useEffect, useRef, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../lib/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

export default function NotificationBanner() {
  const { user, couple, partner } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [banner, setBanner] = useState(null)
  const [show,   setShow]   = useState(false)
  const lastMsg  = useRef(null)
  const lastGift = useRef(null)
  const timer    = useRef(null)

  function display(text, emoji, to) {
    setBanner({ text, emoji, to })
    setShow(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setShow(false), 4500)
  }

  useEffect(() => {
    if (!couple?.id) return
    const q = query(collection(db, 'couples', couple.id, 'messages'), orderBy('createdAt','desc'), limit(1))
    return onSnapshot(q, snap => {
      if (snap.empty) return
      const m = snap.docs[0]; const d = m.data()
      if (d.senderUid === user.uid || location.pathname === '/chat') return
      if (lastMsg.current === m.id) return
      lastMsg.current = m.id
      display(`${partner?.nickname || 'Partner'}: ${(d.text||'').slice(0,45)}`, '💬', '/chat')
    })
  }, [couple?.id, location.pathname])

  useEffect(() => {
    if (!couple?.id) return
    const q = query(collection(db, 'couples', couple.id, 'gifts'), orderBy('createdAt','desc'), limit(1))
    return onSnapshot(q, snap => {
      if (snap.empty) return
      const g = snap.docs[0]; const d = g.data()
      if (d.senderUid === user.uid || location.pathname === '/gifts') return
      if (lastGift.current === g.id) return
      lastGift.current = g.id
      display(`${d.senderName} sent you a ${d.label}!`, d.emoji, '/gifts')
    })
  }, [couple?.id, location.pathname])

  if (!show || !banner) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-up" style={{ maxWidth:440, margin:'0 auto' }}>
      <div
        className="glass rounded-2xl px-4 py-3 shadow-xl border border-rose-100 flex items-center gap-3 cursor-pointer"
        onClick={() => { setShow(false); navigate(banner.to) }}
      >
        <span className="text-2xl flex-shrink-0">{banner.emoji}</span>
        <p className="flex-1 text-sm font-medium text-rose-900 truncate">{banner.text}</p>
        <button onClick={e => { e.stopPropagation(); setShow(false) }} className="text-rose-300 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

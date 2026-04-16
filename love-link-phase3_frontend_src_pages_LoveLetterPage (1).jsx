// src/pages/LoveLetterPage.jsx
// Write a sealed love letter that unlocks at a chosen date/time
import { useState, useEffect } from 'react'
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, limit,
  deleteDoc, doc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format, parseISO, isPast, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { Mail, Lock, Unlock, Plus, X, Trash2, Clock } from 'lucide-react'

export default function LoveLetterPage() {
  const { user, profile, couple, partner } = useAuth()
  const [letters,  setLetters]  = useState([])
  const [showForm, setShowForm] = useState(false)
  const [body,     setBody]     = useState('')
  const [subject,  setSubject]  = useState('')
  const [unlockAt, setUnlockAt] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [opened,   setOpened]   = useState({}) // letterid -> bool
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'couples', coupleId, 'letters'),
      orderBy('createdAt', 'desc'), limit(30)
    )
    return onSnapshot(q, snap => setLetters(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [coupleId])

  // Minimum unlock time = 1 hour from now
  function minDateTime() {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    return d.toISOString().slice(0, 16)
  }

  async function save(e) {
    e.preventDefault()
    if (!body.trim())    return toast.error('Write something from your heart 💌')
    if (!unlockAt)       return toast.error('Set when your partner can open this')
    if (new Date(unlockAt) <= new Date()) return toast.error('Unlock time must be in the future')

    setSaving(true)
    try {
      await addDoc(collection(db, 'couples', coupleId, 'letters'), {
        subject:    subject.trim() || 'A letter for you 💌',
        body:       body.trim(),
        unlockAt:   unlockAt,
        authorUid:  user.uid,
        authorName: profile.name,
        createdAt:  serverTimestamp(),
      })
      toast.success('💌 Letter sealed! Your partner can open it on ' + format(parseISO(unlockAt), 'MMM d, yyyy'))
      setBody(''); setSubject(''); setUnlockAt(''); setShowForm(false)
    } catch { toast.error('Failed to seal letter') }
    finally { setSaving(false) }
  }

  async function deleteLetter(id) {
    if (!confirm('Delete this letter permanently?')) return
    await deleteDoc(doc(db, 'couples', coupleId, 'letters', id))
    toast.success('Letter deleted')
  }

  function toggleOpen(id) {
    setOpened(p => ({ ...p, [id]: !p[id] }))
  }

  // Separate my letters vs partner's letters
  const myLetters      = letters.filter(l => l.authorUid === user.uid)
  const partnerLetters = letters.filter(l => l.authorUid !== user.uid)

  function LetterCard({ letter, isFromMe }) {
    const unlocked   = isPast(parseISO(letter.unlockAt))
    const isOpen     = opened[letter.id]
    const timeUntil  = unlocked ? null : formatDistanceToNow(parseISO(letter.unlockAt), { addSuffix: true })
    const unlockDate = format(parseISO(letter.unlockAt), 'MMM d, yyyy · h:mm a')

    return (
      <div
        className="card overflow-hidden animate-slide-up"
        style={{
          border: unlocked ? '1.5px solid #fecdd3' : '1.5px solid var(--border)',
        }}
      >
        {/* Envelope top */}
        <div
          className="px-4 pt-4 pb-3 flex items-center gap-3"
          style={{ background: unlocked ? '#fff1f2' : 'var(--subtle)' }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: unlocked ? '#fde8e8' : 'var(--card)' }}
          >
            {unlocked
              ? <Mail size={18} className="text-rose-500" />
              : <Lock size={18} style={{ color:'var(--muted)' }} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color:'var(--text)' }}>
              {letter.subject}
            </p>
            <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>
              {isFromMe ? 'To your partner' : `From ${letter.authorName}`}
            </p>
          </div>
          {isFromMe && (
            <button
              onClick={() => deleteLetter(letter.id)}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:'var(--subtle)' }}
            >
              <Trash2 size={12} style={{ color:'var(--muted)' }} />
            </button>
          )}
        </div>

        {/* Unlock info */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop:'1px solid var(--border)' }}>
          {unlocked
            ? <Unlock size={13} className="text-rose-500 flex-shrink-0" />
            : <Clock  size={13} style={{ color:'var(--muted)' }} className="flex-shrink-0" />
          }
          <p className="text-xs flex-1" style={{ color: unlocked ? '#be123c' : 'var(--muted)' }}>
            {unlocked
              ? `Unlocked · ${unlockDate}`
              : `Opens ${timeUntil} · ${unlockDate}`
            }
          </p>
          {/* Only show open button for partner's unlocked letters */}
          {!isFromMe && unlocked && (
            <button
              onClick={() => toggleOpen(letter.id)}
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background:'#fff1f2', color:'#be123c', border:'1px solid #fecdd3' }}
            >
              {isOpen ? 'Close' : 'Open 💌'}
            </button>
          )}
          {/* Author can always preview their own */}
          {isFromMe && (
            <button
              onClick={() => toggleOpen(letter.id)}
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ background:'var(--subtle)', color:'var(--muted)' }}
            >
              {isOpen ? 'Hide' : 'Preview'}
            </button>
          )}
        </div>

        {/* Letter body — shown when open */}
        {isOpen && (
          <div
            className="px-5 py-4 animate-fade-in"
            style={{ borderTop:'1px solid var(--border)', background:'var(--card)' }}
          >
            {/* Decorative lines */}
            <div className="font-display text-xs italic mb-3 text-rose-400">
              — A letter, sealed with love —
            </div>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color:'var(--text)', fontFamily:"'Playfair Display', serif" }}
            >
              {letter.body}
            </p>
            <p className="text-xs mt-4 text-right italic" style={{ color:'var(--muted)' }}>
              With love, {letter.authorName} 💕
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl italic text-white mb-1">Love Letters 💌</h1>
          <p className="text-rose-200 text-sm">Words that wait to be discovered</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          {showForm ? <X size={18} className="text-white" /> : <Plus size={20} className="text-white" />}
        </button>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">

        {/* Info card */}
        <div className="card p-4 animate-slide-up">
          <p className="text-xs" style={{ color:'var(--muted)' }}>
            💡 Write a letter and set a date for your partner to open it — an anniversary, a random Tuesday, or any special moment. It stays sealed until then.
          </p>
        </div>

        {/* Write form */}
        {showForm && (
          <div className="card p-5 animate-slide-up">
            <p className="font-display text-lg italic text-rose-600 mb-4">Seal a Letter 💌</p>
            <form onSubmit={save} className="flex flex-col gap-3">
              <input
                className="input-rose"
                placeholder="Subject (e.g. 'Open on our anniversary')"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                maxLength={80}
              />
              <textarea
                className="input-rose resize-none"
                placeholder="Dear love…

Write anything from your heart. Your partner won't see this until the date you set."
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={7}
                maxLength={2000}
                style={{ fontFamily:"'Playfair Display', serif", fontSize:'15px', lineHeight:'1.7' }}
              />
              <div>
                <label className="text-xs uppercase tracking-widest block mb-1.5" style={{ color:'var(--muted)' }}>
                  Unlock date & time
                </label>
                <input
                  className="input-rose"
                  type="datetime-local"
                  value={unlockAt}
                  min={minDateTime()}
                  onChange={e => setUnlockAt(e.target.value)}
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving || !body.trim() || !unlockAt} className="btn-primary flex-1">
                  Seal Letter 💌
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Letters from partner */}
        {partnerLetters.length > 0 && (
          <>
            <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>
              Letters from {partner?.nickname || 'your partner'}
            </p>
            {partnerLetters.map(l => (
              <LetterCard key={l.id} letter={l} isFromMe={false} />
            ))}
          </>
        )}

        {/* My letters */}
        {myLetters.length > 0 && (
          <>
            <p className="text-xs uppercase tracking-widest mt-2" style={{ color:'var(--muted)' }}>
              Letters you've written
            </p>
            {myLetters.map(l => (
              <LetterCard key={l.id} letter={l} isFromMe={true} />
            ))}
          </>
        )}

        {/* Empty */}
        {letters.length === 0 && !showForm && (
          <div className="card p-8 text-center animate-slide-up">
            <Mail size={40} className="mx-auto mb-3 text-rose-300" />
            <p className="font-display text-xl italic text-rose-600 mb-2">No letters yet</p>
            <p className="text-sm mb-5" style={{ color:'var(--muted)' }}>
              Write your partner a letter they'll discover at just the right moment
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary max-w-xs mx-auto">
              Write a Letter 💌
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// src/pages/LoveNotesPage.jsx
// Private sticky notes shared between the couple — new feature in v2
import { useState, useEffect } from 'react'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Plus, X, StickyNote } from 'lucide-react'

const NOTE_COLORS = [
  { bg:'#fff7ed', border:'#fed7aa', label:'Warm'    },
  { bg:'#fdf2f8', border:'#f9a8d4', label:'Rose'    },
  { bg:'#f0fdf4', border:'#86efac', label:'Mint'    },
  { bg:'#eff6ff', border:'#93c5fd', label:'Sky'     },
  { bg:'#fefce8', border:'#fde047', label:'Sunny'   },
  { bg:'#faf5ff', border:'#c4b5fd', label:'Lavender'},
]

export default function LoveNotesPage() {
  const { user, profile, couple, partner } = useAuth()
  const [notes,     setNotes]     = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [noteText,  setNoteText]  = useState('')
  const [colorIdx,  setColorIdx]  = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(collection(db,'couples',coupleId,'notes'), orderBy('createdAt','desc'), limit(50))
    return onSnapshot(q, snap => setNotes(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [coupleId])

  async function saveNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return toast.error('Write something sweet first 💕')
    setSaving(true)
    try {
      const color = NOTE_COLORS[colorIdx]
      await addDoc(collection(db,'couples',coupleId,'notes'), {
        text:       noteText.trim(),
        authorUid:  user.uid,
        authorName: profile.name,
        colorBg:    color.bg,
        colorBorder:color.border,
        createdAt:  serverTimestamp(),
      })
      toast.success('Note pinned! 📝')
      setNoteText('')
      setShowForm(false)
    } catch {
      toast.error('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote(id) {
    setDeleting(id)
    try {
      await deleteDoc(doc(db,'couples',coupleId,'notes',id))
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return format(d, 'MMM d, h:mm a')
  }

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 px-6 pt-14 pb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl italic text-white mb-1">Love Notes 📝</h1>
          <p className="text-rose-200 text-sm">Leave little messages for each other</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          {showForm ? <X size={18} className="text-white" /> : <Plus size={20} className="text-white" />}
        </button>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">

        {/* New note form */}
        {showForm && (
          <div className="card p-5 shadow-lg shadow-rose-100 animate-slide-up">
            <p className="font-display text-lg italic text-rose-800 mb-4">New Note 💕</p>

            {/* Color picker */}
            <div className="flex gap-2 mb-3">
              {NOTE_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColorIdx(i)}
                  className="w-8 h-8 rounded-xl border-2 transition-transform active:scale-90"
                  style={{
                    background: c.bg,
                    borderColor: colorIdx === i ? c.border : 'transparent',
                    boxShadow: colorIdx === i ? `0 0 0 2px ${c.border}` : 'none',
                  }}
                />
              ))}
            </div>

            <form onSubmit={saveNote} className="flex flex-col gap-3">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write something from the heart… 💌"
                rows={4}
                maxLength={300}
                className="input-rose resize-none"
                style={{ background: NOTE_COLORS[colorIdx].bg, borderColor: NOTE_COLORS[colorIdx].border }}
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !noteText.trim()} className="btn-primary flex-1">
                  {saving ? 'Pinning…' : 'Pin Note 📌'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Empty state */}
        {notes.length === 0 && !showForm && (
          <div className="card p-8 text-center shadow-lg shadow-rose-100 animate-slide-up">
            <StickyNote size={40} className="text-rose-300 mx-auto mb-3" />
            <p className="font-display text-xl italic text-rose-700 mb-2">No notes yet</p>
            <p className="text-sm text-rose-400 mb-5">Leave a little something for your partner to find</p>
            <button onClick={() => setShowForm(true)} className="btn-primary max-w-xs mx-auto">
              Write First Note 💕
            </button>
          </div>
        )}

        {/* Notes masonry */}
        <div className="columns-2 gap-3 space-y-3">
          {notes.map((note, i) => (
            <div
              key={note.id}
              className="break-inside-avoid rounded-2xl p-4 shadow-sm animate-pop relative group"
              style={{
                background:   note.colorBg    || '#fff7ed',
                borderWidth:  '1.5px',
                borderStyle:  'solid',
                borderColor:  note.colorBorder || '#fed7aa',
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <p className="text-sm text-rose-900 leading-relaxed whitespace-pre-wrap mb-3">
                {note.text}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-rose-500">{note.authorName}</p>
                  <p className="text-[10px] text-rose-400">{formatTime(note.createdAt)}</p>
                </div>
                {note.authorUid === user.uid && (
                  <button
                    onClick={() => deleteNote(note.id)}
                    disabled={deleting === note.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-300 active:text-rose-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Decorative pin */}
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
                style={{ background: note.colorBorder || '#fed7aa' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

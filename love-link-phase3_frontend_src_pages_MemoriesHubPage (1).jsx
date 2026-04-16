// src/pages/MemoriesHubPage.jsx
// Moments tab — memories, love notes, drawings, snaps history, our story
import { useState, useEffect, useRef } from 'react'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, limit, deleteDoc, doc
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, Image, BookHeart, Pencil, Play, Trash2, Heart } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TABS = [
  { id:'all',      label:'All'     },
  { id:'photos',   label:'Photos'  },
  { id:'notes',    label:'Notes'   },
  { id:'drawings', label:'Art'     },
]

export default function MemoriesHubPage() {
  const { user, profile, couple, partner } = useAuth()
  const navigate   = useNavigate()
  const fileRef    = useRef(null)
  const [tab,      setTab]      = useState('all')
  const [items,    setItems]    = useState([])
  const [adding,   setAdding]   = useState(false)
  const [noteText, setNoteText] = useState('')
  const [caption,  setCaption]  = useState('')
  const [uploading,setUploading]= useState(false)
  const [selected, setSelected] = useState(null) // full-screen viewer
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db,'couples',coupleId,'memories'),
      orderBy('createdAt','desc'), limit(100)
    )
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [coupleId])

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file || !coupleId) return
    setUploading(true)
    try {
      const path = `memories/${coupleId}/${Date.now()}_${file.name}`
      const snap = await uploadBytes(storageRef(storage, path), file)
      const url  = await getDownloadURL(snap.ref)
      await addDoc(collection(db,'couples',coupleId,'memories'), {
        type:'photo', imageUrl:url, caption:caption.trim(),
        createdBy:user.uid, createdByName:profile.name,
        createdAt:serverTimestamp(),
      })
      setCaption(''); setAdding(false)
      toast.success('Memory saved! 💕')
    } catch { toast.error('Failed to upload') }
    finally { setUploading(false); e.target.value='' }
  }

  async function saveNote() {
    if (!noteText.trim() || !coupleId) return
    setUploading(true)
    try {
      await addDoc(collection(db,'couples',coupleId,'memories'), {
        type:'note', text:noteText.trim(),
        createdBy:user.uid, createdByName:profile.name,
        createdAt:serverTimestamp(),
      })
      setNoteText(''); setAdding(false)
      toast.success('Note saved! 💕')
    } catch { toast.error('Failed to save') }
    finally { setUploading(false) }
  }

  async function deleteItem(id) {
    if (!confirm('Remove this memory?')) return
    await deleteDoc(doc(db,'couples',coupleId,'memories',id))
    toast.success('Removed')
  }

  const filtered = tab==='all' ? items
    : tab==='photos'   ? items.filter(i => i.type==='photo')
    : tab==='notes'    ? items.filter(i => i.type==='note')
    : tab==='drawings' ? items.filter(i => i.type==='drawing')
    : items

  function formatTime(ts) {
    if (!ts) return ''
    return format(ts.toDate ? ts.toDate() : new Date(ts), 'MMM d, yyyy')
  }

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-10 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <h1 className="font-display text-3xl italic text-white mb-1">Moments 💖</h1>
        <p className="text-rose-200 text-sm">Your shared memories, art & notes</p>
      </div>

      <div className="px-4 -mt-5 flex flex-col gap-4">
        {/* Quick action buttons */}
        <div className="grid grid-cols-4 gap-2 animate-slide-up">
          {[
            { icon:'📸', label:'Live Snap', action:() => navigate('/snap') },
            { icon:'🎨', label:'Draw', action:() => navigate('/draw') },
            { icon:'📷', label:'Photo', action:() => { setAdding('photo') } },
            { icon:'📝', label:'Note', action:() => { setAdding('note') } },
          ].map((btn,i) => (
            <button key={i} onClick={btn.action}
              className="card p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <span className="text-2xl">{btn.icon}</span>
              <span className="text-[10px] font-semibold text-rose-500">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Add photo form */}
        {adding === 'photo' && (
          <div className="card p-5 animate-slide-up">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Add Photo Memory</p>
            <input value={caption} onChange={e=>setCaption(e.target.value)}
              placeholder="Caption… (optional)" className="input-rose mb-3" />
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="btn-primary flex-1" disabled={uploading}>
                {uploading ? 'Uploading…' : <><Image size={14}/> Choose Photo</>}
              </button>
              <button onClick={()=>setAdding(false)} className="btn-ghost w-auto px-4">Cancel</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </div>
        )}

        {/* Add note form */}
        {adding === 'note' && (
          <div className="card p-5 animate-slide-up">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Add Love Note</p>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)}
              placeholder="Write something from the heart… 💕" rows={4} className="input-rose resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={saveNote} disabled={uploading||!noteText.trim()} className="btn-primary flex-1">
                {uploading ? 'Saving…' : 'Save Note 💕'}
              </button>
              <button onClick={()=>setAdding(false)} className="btn-ghost w-auto px-4">Cancel</button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 animate-slide-up" style={{ scrollbarWidth:'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
              style={{ background:tab===t.id?'linear-gradient(135deg,#f43f5e,#be123c)':'var(--card)',
                color:tab===t.id?'white':'var(--text)', borderColor:tab===t.id?'transparent':'var(--border)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Masonry-style grid */}
        {filtered.length === 0 ? (
          <div className="card p-10 text-center animate-slide-up">
            <div className="text-5xl mb-3 animate-float">💖</div>
            <p className="font-display text-xl italic text-rose-400 mb-1">No memories yet</p>
            <p className="text-sm" style={{ color:'var(--muted)' }}>Add photos, notes, or draw together!</p>
          </div>
        ) : (
          <div className="columns-2 gap-3 animate-slide-up" style={{ animationDelay:'.06s' }}>
            {filtered.map(item => (
              <div key={item.id} className="break-inside-avoid mb-3 card overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setSelected(item)}>
                {item.type === 'photo' && (
                  <img src={item.imageUrl} alt={item.caption||'memory'} className="w-full object-cover" />
                )}
                {item.type === 'drawing' && (
                  <div className="relative">
                    <img src={item.imageUrl} alt="drawing" className="w-full object-cover bg-white" />
                    <div className="absolute top-2 left-2 bg-rose-500/80 rounded-full px-2 py-0.5 text-[9px] text-white font-medium">
                      🎨 Art
                    </div>
                  </div>
                )}
                {item.type === 'note' && (
                  <div className="p-4 min-h-[80px] flex flex-col justify-between"
                    style={{ background:'linear-gradient(135deg,#fff1f2,#fce7e7)' }}>
                    <p className="text-xs font-medium leading-snug text-rose-900 line-clamp-4">{item.text}</p>
                  </div>
                )}
                <div className="px-3 py-2 flex items-center justify-between"
                  style={{ borderTop:'1px solid var(--border)' }}>
                  <div>
                    {item.caption && <p className="text-[10px] font-medium truncate" style={{ color:'var(--text)' }}>{item.caption}</p>}
                    <p className="text-[9px]" style={{ color:'var(--muted)' }}>{item.createdByName} · {formatTime(item.createdAt)}</p>
                  </div>
                  {item.createdBy === user.uid && (
                    <button onClick={e => { e.stopPropagation(); deleteItem(item.id) }}>
                      <Trash2 size={12} style={{ color:'var(--muted)' }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen viewer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setSelected(null)}>
          <div className="flex-1 flex items-center justify-center p-4">
            {selected.type === 'photo' || selected.type === 'drawing'
              ? <img src={selected.imageUrl} className="max-w-full max-h-full object-contain rounded-2xl" alt="memory" />
              : <div className="max-w-sm w-full p-8 rounded-3xl text-center" style={{ background:'linear-gradient(135deg,#fff1f2,#fce7e7)' }}>
                  <p className="text-2xl mb-4">💌</p>
                  <p className="text-rose-900 font-medium leading-relaxed">{selected.text}</p>
                </div>
            }
          </div>
          <div className="pb-safe px-5 py-4 text-center" style={{ paddingBottom:'max(env(safe-area-inset-bottom),16px)' }}>
            {selected.caption && <p className="text-white text-sm font-medium mb-1">{selected.caption}</p>}
            <p className="text-white/50 text-xs">{selected.createdByName} · {formatTime(selected.createdAt)}</p>
            <p className="text-white/30 text-xs mt-2">tap anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  )
}

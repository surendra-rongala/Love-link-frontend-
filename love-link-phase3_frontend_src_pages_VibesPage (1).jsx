// src/pages/VibesPage.jsx  — NEW in v3
// Share a song, Spotify link, or YouTube link with your partner
import { useState, useEffect } from 'react'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Music2, Plus, ExternalLink, Trash2, X } from 'lucide-react'

const PLATFORMS = [
  { id:'spotify',  label:'Spotify',  color:'#1db954', icon:'🎧' },
  { id:'youtube',  label:'YouTube',  color:'#ff0000', icon:'▶️' },
  { id:'apple',    label:'Apple Music', color:'#fc3c44', icon:'🎵' },
  { id:'other',    label:'Other',    color:'#9b6470', icon:'🎶' },
]

export default function VibesPage() {
  const { user, profile, couple, partner } = useAuth()
  const [vibes,    setVibes]    = useState([])
  const [showForm, setShowForm] = useState(false)
  const [title,    setTitle]    = useState('')
  const [artist,   setArtist]   = useState('')
  const [link,     setLink]     = useState('')
  const [platform, setPlatform] = useState('spotify')
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(collection(db,'couples',coupleId,'vibes'), orderBy('createdAt','desc'), limit(50))
    return onSnapshot(q, snap => setVibes(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [coupleId])

  async function save(e) {
    e.preventDefault()
    if (!title.trim()) return toast.error('Add a song title')
    setSaving(true)
    try {
      await addDoc(collection(db,'couples',coupleId,'vibes'), {
        title: title.trim(), artist: artist.trim(), link: link.trim(),
        platform, note: note.trim(),
        senderUid: user.uid, senderName: profile.name,
        createdAt: serverTimestamp(),
      })
      toast.success('🎵 Vibe shared!'); setShowForm(false)
      setTitle(''); setArtist(''); setLink(''); setNote('')
    } catch { toast.error('Failed to share') }
    finally { setSaving(false) }
  }

  async function deleteVibe(id) {
    try { await deleteDoc(doc(db,'couples',coupleId,'vibes',id)) }
    catch { toast.error('Failed to delete') }
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return format(d, 'MMM d · h:mm a')
  }

  const selectedPlatform = PLATFORMS.find(p => p.id === platform)

  return (
    <div className="min-h-full pb-4">
      <div className="header-gradient px-6 pt-14 pb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl italic text-white mb-1">Our Vibes 🎵</h1>
          <p className="text-rose-200 text-sm">Share songs that remind you of each other</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform">
          {showForm ? <X size={18} className="text-white" /> : <Plus size={20} className="text-white" />}
        </button>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">
        {/* Add vibe form */}
        {showForm && (
          <div className="card p-5 animate-slide-up">
            <p className="font-display text-lg italic text-rose-600 mb-4">Share a Song 🎶</p>
            <form onSubmit={save} className="flex flex-col gap-3">
              {/* Platform selector */}
              <div className="flex gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} type="button" onClick={() => setPlatform(p.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: platform===p.id ? p.color : 'var(--subtle)', color: platform===p.id ? 'white' : 'var(--muted)', border: `1px solid ${platform===p.id ? p.color : 'var(--border)'}` }}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
              <input className="input-rose" placeholder="Song title *" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} />
              <input className="input-rose" placeholder="Artist name" value={artist} onChange={e => setArtist(e.target.value)} maxLength={60} />
              <input className="input-rose" placeholder="Link (optional)" value={link} onChange={e => setLink(e.target.value)} type="url" />
              <textarea className="input-rose resize-none" placeholder="Why this song? 💭" value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={200} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">Share 🎵</button>
              </div>
            </form>
          </div>
        )}

        {/* Empty */}
        {vibes.length === 0 && !showForm && (
          <div className="card p-8 text-center">
            <Music2 size={40} className="mx-auto mb-3 text-rose-300" />
            <p className="font-display text-xl italic text-rose-600 mb-2">No vibes yet</p>
            <p className="text-sm mb-5" style={{ color:'var(--muted)' }}>Share a song that makes you think of each other</p>
            <button onClick={() => setShowForm(true)} className="btn-primary max-w-xs mx-auto">Share First Song 🎵</button>
          </div>
        )}

        {/* Vibes list */}
        {vibes.map((vibe, i) => {
          const pl = PLATFORMS.find(p => p.id === vibe.platform) || PLATFORMS[3]
          const isMe = vibe.senderUid === user.uid
          return (
            <div key={vibe.id} className="song-card animate-slide-up" style={{ animationDelay:`${i*.04}s` }}>
              {/* Color bar */}
              <div className="h-1.5" style={{ background: pl.color }} />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${pl.color}20`, border:`1.5px solid ${pl.color}40` }}>
                    {pl.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color:'var(--text)' }}>{vibe.title}</p>
                    {vibe.artist && <p className="text-xs mt-0.5 truncate" style={{ color:'var(--muted)' }}>{vibe.artist}</p>}
                    {vibe.note && <p className="text-xs mt-2 italic" style={{ color:'var(--muted)' }}>"{vibe.note}"</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {vibe.link && (
                      <a href={vibe.link} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'var(--subtle)' }}>
                        <ExternalLink size={13} style={{ color: pl.color }} />
                      </a>
                    )}
                    {isMe && (
                      <button onClick={() => deleteVibe(vibe.id)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'var(--subtle)' }}>
                        <Trash2 size={13} style={{ color:'var(--muted)' }} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-medium" style={{ color: pl.color }}>{pl.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color:'var(--muted)' }}>
                      {isMe ? 'You' : vibe.senderName} · {formatTime(vibe.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// src/pages/DatePlannerPage.jsx  — NEW in v3
import { useState, useEffect } from 'react'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format, parseISO, isPast } from 'date-fns'
import toast from 'react-hot-toast'
import { Plus, X, CalendarHeart, Check, Trash2, MapPin, Clock } from 'lucide-react'

const DATE_TYPES = [
  { id:'dinner',   emoji:'🍽️', label:'Dinner'       },
  { id:'movie',    emoji:'🎬', label:'Movie Night'  },
  { id:'walk',     emoji:'🌿', label:'Walk / Hike'  },
  { id:'travel',   emoji:'✈️', label:'Travel'       },
  { id:'cafe',     emoji:'☕', label:'Café'          },
  { id:'home',     emoji:'🏡', label:'Cosy at Home' },
  { id:'concert',  emoji:'🎵', label:'Concert'      },
  { id:'surprise', emoji:'🎁', label:'Surprise'     },
]

export default function DatePlannerPage() {
  const { user, profile, couple, partner } = useAuth()
  const [dates,    setDates]    = useState([])
  const [showForm, setShowForm] = useState(false)
  const [title,    setTitle]    = useState('')
  const [dateType, setDateType] = useState('dinner')
  const [when,     setWhen]     = useState('')
  const [where,    setWhere]    = useState('')
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [tab,      setTab]      = useState('upcoming') // 'upcoming' | 'done'
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(collection(db,'couples',coupleId,'dates'), orderBy('createdAt','desc'), limit(60))
    return onSnapshot(q, snap => setDates(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [coupleId])

  async function save(e) {
    e.preventDefault()
    if (!title.trim()) return toast.error('Give your date a name!')
    setSaving(true)
    try {
      await addDoc(collection(db,'couples',coupleId,'dates'), {
        title: title.trim(), dateType, when, where: where.trim(),
        note: note.trim(), done: false,
        creatorUid: user.uid, creatorName: profile.name,
        createdAt: serverTimestamp(),
      })
      toast.success('📅 Date planned! 💕')
      setShowForm(false); setTitle(''); setWhen(''); setWhere(''); setNote('')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  async function toggleDone(d) {
    await updateDoc(doc(db,'couples',coupleId,'dates',d.id), { done: !d.done })
    toast.success(d.done ? 'Date restored!' : '✅ Date completed! 🎉')
  }

  async function deleteDate(id) {
    await deleteDoc(doc(db,'couples',coupleId,'dates',id))
  }

  const upcoming = dates.filter(d => !d.done)
  const done     = dates.filter(d => d.done)
  const shown    = tab === 'upcoming' ? upcoming : done
  const dt       = DATE_TYPES.find(t => t.id === dateType)

  return (
    <div className="min-h-full pb-4">
      <div className="header-gradient px-6 pt-14 pb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl italic text-white mb-1">Date Planner 📅</h1>
          <p className="text-rose-200 text-sm">Plan special moments together</p>
        </div>
        <button onClick={() => setShowForm(v=>!v)} className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform">
          {showForm ? <X size={18} className="text-white" /> : <Plus size={20} className="text-white" />}
        </button>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">
        {/* Add form */}
        {showForm && (
          <div className="card p-5 animate-slide-up">
            <p className="font-display text-lg italic text-rose-600 mb-4">Plan a Date 💕</p>
            <form onSubmit={save} className="flex flex-col gap-3">
              {/* Type grid */}
              <div className="grid grid-cols-4 gap-2">
                {DATE_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setDateType(t.id)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium transition-all"
                    style={{ background: dateType===t.id ? 'var(--subtle)' : 'transparent', border:`1.5px solid ${dateType===t.id ? '#f43f5e' : 'var(--border)'}`, color: dateType===t.id ? '#be123c' : 'var(--muted)' }}>
                    <span className="text-xl">{t.emoji}</span>
                    <span className="text-center leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
              <input className="input-rose" placeholder="Date title *" value={title} onChange={e=>setTitle(e.target.value)} maxLength={60} />
              <input className="input-rose" type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} />
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-300" />
                <input className="input-rose pl-9" placeholder="Where? (optional)" value={where} onChange={e=>setWhere(e.target.value)} maxLength={80} />
              </div>
              <textarea className="input-rose resize-none" placeholder="Any notes or ideas… 💭" value={note} onChange={e=>setNote(e.target.value)} rows={2} maxLength={200} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">Plan It 💕</button>
              </div>
            </form>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Planned', value: upcoming.length, emoji:'📅' },
            { label:'Completed', value: done.length, emoji:'✅' },
            { label:'Total', value: dates.length, emoji:'💑' },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center animate-slide-up">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-xl font-bold text-rose-500">{s.value}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color:'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab toggle */}
        <div className="glass rounded-2xl p-1 flex gap-1">
          {[['upcoming','📅 Upcoming'],['done','✅ Done']].map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab===k ? 'bg-gradient-to-r from-rose-500 to-rose-700 text-white shadow-md' : ''}`} style={{ color: tab!==k ? 'var(--muted)' : undefined }}>
              {l}
            </button>
          ))}
        </div>

        {/* Empty */}
        {shown.length === 0 && (
          <div className="card p-8 text-center">
            <CalendarHeart size={40} className="mx-auto mb-3 text-rose-300" />
            <p className="font-display text-xl italic text-rose-600 mb-2">
              {tab === 'upcoming' ? 'No dates planned yet' : 'No completed dates yet'}
            </p>
            <p className="text-sm mb-5" style={{ color:'var(--muted)' }}>
              {tab === 'upcoming' ? 'Plan your next special moment!' : 'Complete some dates first 💕'}
            </p>
            {tab==='upcoming' && <button onClick={() => setShowForm(true)} className="btn-primary max-w-xs mx-auto">Plan a Date 💕</button>}
          </div>
        )}

        {/* Date cards */}
        {shown.map((d, i) => {
          const type    = DATE_TYPES.find(t => t.id === d.dateType) || DATE_TYPES[0]
          const expired = d.when && isPast(parseISO(d.when)) && !d.done
          return (
            <div key={d.id} className="card p-4 animate-slide-up" style={{ animationDelay:`${i*.04}s`, opacity: d.done ? .75 : 1 }}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background:'var(--subtle)' }}>
                  {type.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${d.done ? 'line-through' : ''}`} style={{ color:'var(--text)' }}>{d.title}</p>
                  {d.when && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={10} style={{ color:'var(--muted)' }} />
                      <span className={`text-xs ${expired ? 'text-rose-400' : ''}`} style={{ color: expired ? undefined : 'var(--muted)' }}>
                        {format(parseISO(d.when), 'MMM d, yyyy · h:mm a')}
                        {expired && ' · overdue'}
                      </span>
                    </div>
                  )}
                  {d.where && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={10} style={{ color:'var(--muted)' }} />
                      <span className="text-xs truncate" style={{ color:'var(--muted)' }}>{d.where}</span>
                    </div>
                  )}
                  {d.note && <p className="text-xs italic mt-1.5" style={{ color:'var(--muted)' }}>"{d.note}"</p>}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleDone(d)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all" style={{ background: d.done ? '#dcfce7' : 'var(--subtle)', color: d.done ? '#16a34a' : 'var(--muted)' }}>
                    <Check size={14} />
                  </button>
                  {d.creatorUid === user.uid && (
                    <button onClick={() => deleteDate(d.id)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'var(--subtle)', color:'var(--muted)' }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

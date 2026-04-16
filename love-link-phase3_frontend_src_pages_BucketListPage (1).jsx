// src/pages/BucketListPage.jsx
// Shared couple bucket list with categories, completion tracking, and priority
import { useState, useEffect } from 'react'
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, limit,
  doc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Plus, X, Check, Trash2, Star, ListChecks } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { id:'travel',    emoji:'✈️',  label:'Travel',        color:'#0ea5e9' },
  { id:'adventure', emoji:'🏔️', label:'Adventure',     color:'#10b981' },
  { id:'food',      emoji:'🍜',  label:'Food & Dining', color:'#f59e0b' },
  { id:'romance',   emoji:'💕',  label:'Romance',       color:'#f43f5e' },
  { id:'home',      emoji:'🏡',  label:'Home & Life',   color:'#8b5cf6' },
  { id:'learn',     emoji:'📚',  label:'Learn Together',color:'#06b6d4' },
  { id:'creative',  emoji:'🎨',  label:'Creative',      color:'#ec4899' },
  { id:'milestone', emoji:'🏆',  label:'Milestone',     color:'#f97316' },
]

const SUGGESTIONS = [
  { text:'Watch the sunrise together',        cat:'romance'   },
  { text:'Cook a new cuisine from scratch',   cat:'food'      },
  { text:'Take a spontaneous road trip',      cat:'adventure' },
  { text:'Learn to dance together',           cat:'learn'     },
  { text:'Visit 3 new countries',             cat:'travel'    },
  { text:'Write letters to our future selves',cat:'milestone' },
  { text:'Stargaze in the countryside',       cat:'romance'   },
  { text:'Plant a garden together',           cat:'home'      },
  { text:'Complete a puzzle over 1000 pieces',cat:'creative'  },
  { text:'Take a cooking class',              cat:'food'      },
  { text:'Go camping for a weekend',          cat:'adventure' },
  { text:'Create a scrapbook of memories',    cat:'creative'  },
]

export default function BucketListPage() {
  const { user, profile, couple, partner } = useAuth()
  const [items,     setItems]     = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [text,      setText]      = useState('')
  const [category,  setCategory]  = useState('romance')
  const [priority,  setPriority]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [filter,    setFilter]    = useState('all') // 'all' | 'pending' | 'done'
  const [catFilter, setCatFilter] = useState('all')
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'couples', coupleId, 'bucketlist'),
      orderBy('createdAt', 'desc'), limit(100)
    )
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [coupleId])

  async function save(e) {
    e.preventDefault()
    if (!text.trim()) return toast.error('Add something you want to do together!')
    setSaving(true)
    try {
      await addDoc(collection(db, 'couples', coupleId, 'bucketlist'), {
        text: text.trim(), category, priority,
        done: false, doneAt: null,
        creatorUid: user.uid, creatorName: profile.name,
        createdAt: serverTimestamp(),
      })
      toast.success('🎯 Added to bucket list!')
      setText(''); setPriority(false); setShowForm(false)
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  async function toggleDone(item) {
    await updateDoc(doc(db, 'couples', coupleId, 'bucketlist', item.id), {
      done: !item.done,
      doneAt: !item.done ? serverTimestamp() : null,
    })
    if (!item.done) toast.success('🎉 Goal achieved! Amazing!')
  }

  async function togglePriority(item) {
    await updateDoc(doc(db, 'couples', coupleId, 'bucketlist', item.id), { priority: !item.priority })
  }

  async function deleteItem(id) {
    await deleteDoc(doc(db, 'couples', coupleId, 'bucketlist', id))
  }

  function addSuggestion(s) {
    setText(s.text); setCategory(s.cat); setShowForm(true)
  }

  // Filter items
  const filtered = items.filter(item => {
    const statusOk = filter === 'all' || (filter === 'done' ? item.done : !item.done)
    const catOk    = catFilter === 'all' || item.category === catFilter
    return statusOk && catOk
  })

  const total  = items.length
  const done   = items.filter(i => i.done).length
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0
  const cat    = CATEGORIES.find(c => c.id === category)

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl italic text-white mb-1">Bucket List 🎯</h1>
          <p className="text-rose-200 text-sm">Dreams you'll make come true together</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          {showForm ? <X size={18} className="text-white" /> : <Plus size={20} className="text-white" />}
        </button>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">

        {/* Progress bar */}
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>
              Progress Together
            </p>
            <span className="text-sm font-bold text-rose-500">{done}/{total} done</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background:'var(--subtle)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width:`${pct}%`, background:'linear-gradient(90deg,#f43f5e,#be123c)' }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color:'var(--muted)' }}>
            {pct}% of your bucket list completed 💕
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Total',   val: total, emoji:'🎯' },
            { label:'Done',    val: done,  emoji:'✅' },
            { label:'To Do',   val: total - done, emoji:'⭐' },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center animate-slide-up">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-xl font-bold text-rose-500">{s.val}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color:'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="card p-5 animate-slide-up">
            <p className="font-display text-lg italic text-rose-600 mb-4">Add to Bucket List 🎯</p>
            <form onSubmit={save} className="flex flex-col gap-3">
              <input
                className="input-rose"
                placeholder="Something you want to do together…"
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={120}
                autoFocus
              />
              {/* Category grid */}
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.id} type="button" onClick={() => setCategory(c.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-all"
                    style={{
                      background:   category === c.id ? `${c.color}18` : 'var(--subtle)',
                      border:       `1.5px solid ${category === c.id ? c.color : 'var(--border)'}`,
                      color:        category === c.id ? c.color : 'var(--muted)',
                    }}
                  >
                    <span className="text-xl">{c.emoji}</span>
                    <span className="text-center leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>
              {/* Priority toggle */}
              <button
                type="button"
                onClick={() => setPriority(v => !v)}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-all"
                style={{ background: priority ? '#fefce8' : 'var(--subtle)', color: priority ? '#92400e' : 'var(--muted)', border: `1px solid ${priority ? '#fde047' : 'var(--border)'}` }}
              >
                <Star size={14} className={priority ? 'fill-yellow-400 text-yellow-400' : ''} />
                {priority ? 'Priority item ⭐' : 'Mark as priority'}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving || !text.trim()} className="btn-primary flex-1">Add It 🎯</button>
              </div>
            </form>

            {/* Suggestions */}
            <div className="mt-4">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color:'var(--muted)' }}>Quick suggestions</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => addSuggestion(s)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{ background:'var(--subtle)', color:'var(--text)', border:'1px solid var(--border)' }}
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth:'none' }}>
          {[['all','All'],['pending','To Do'],['done','Done ✅']].map(([k,l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: filter===k ? 'linear-gradient(135deg,#f43f5e,#be123c)' : 'var(--subtle)',
                color:      filter===k ? 'white' : 'var(--muted)',
              }}
            >
              {l}
            </button>
          ))}
          <div className="w-px bg-[var(--border)] flex-shrink-0" />
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCatFilter(catFilter === c.id ? 'all' : c.id)}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: catFilter===c.id ? `${c.color}18` : 'var(--subtle)',
                color:      catFilter===c.id ? c.color : 'var(--muted)',
                border:     `1px solid ${catFilter===c.id ? c.color : 'var(--border)'}`,
              }}
            >
              {c.emoji}
            </button>
          ))}
        </div>

        {/* Empty */}
        {filtered.length === 0 && (
          <div className="card p-8 text-center animate-slide-up">
            <ListChecks size={40} className="mx-auto mb-3 text-rose-300" />
            <p className="font-display text-xl italic text-rose-600 mb-2">
              {items.length === 0 ? 'Start your bucket list' : 'No items match this filter'}
            </p>
            <p className="text-sm mb-5" style={{ color:'var(--muted)' }}>
              {items.length === 0 ? 'Add dreams you want to make real together' : 'Try changing your filters'}
            </p>
            {items.length === 0 && (
              <button onClick={() => setShowForm(true)} className="btn-primary max-w-xs mx-auto">
                Add First Goal 🎯
              </button>
            )}
          </div>
        )}

        {/* Bucket list items */}
        {filtered.map((item, i) => {
          const itemCat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0]
          return (
            <div
              key={item.id}
              className="card p-4 animate-slide-up"
              style={{ animationDelay:`${i*.03}s`, opacity: item.done ? .8 : 1 }}
            >
              <div className="flex items-start gap-3">
                {/* Category icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
                  style={{ background:`${itemCat.color}15` }}
                >
                  {itemCat.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.priority && <Star size={11} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                    <p
                      className={`text-sm font-medium leading-snug ${item.done ? 'line-through' : ''}`}
                      style={{ color: item.done ? 'var(--muted)' : 'var(--text)' }}
                    >
                      {item.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background:`${itemCat.color}15`, color: itemCat.color }}
                    >
                      {itemCat.label}
                    </span>
                    <span className="text-[10px]" style={{ color:'var(--muted)' }}>
                      by {item.creatorName}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => togglePriority(item)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ background:'var(--subtle)' }}
                  >
                    <Star size={12} className={item.priority ? 'fill-yellow-400 text-yellow-400' : ''} style={{ color: item.priority ? undefined : 'var(--muted)' }} />
                  </button>
                  <button
                    onClick={() => toggleDone(item)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
                    style={{ background: item.done ? '#dcfce7' : 'var(--subtle)', color: item.done ? '#16a34a' : 'var(--muted)' }}
                  >
                    <Check size={12} />
                  </button>
                  {item.creatorUid === user.uid && (
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{ background:'var(--subtle)', color:'var(--muted)' }}
                    >
                      <Trash2 size={11} />
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

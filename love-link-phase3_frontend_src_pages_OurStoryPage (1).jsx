// src/pages/OurStoryPage.jsx — Relationship Timeline
import { useState, useEffect } from 'react'
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, deleteDoc, doc, limit
} from 'firebase/firestore'

import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Plus, Heart, Trash2, Camera, Milestone } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'

const MILESTONE_TYPES = [
  { id:'moment', emoji:'✨', label:'Special Moment' },
  { id:'first',  emoji:'🥇', label:'First Time' },
  { id:'trip',   emoji:'✈️', label:'Trip Together' },
  { id:'fight',  emoji:'🕊️', label:'We Made Up' },
  { id:'gift',   emoji:'🎁', label:'Gift / Surprise' },
  { id:'custom', emoji:'💝', label:'Custom' },
]

export default function OurStoryPage() {
  const { user, profile, couple, partner } = useAuth()
  const [milestones, setMilestones] = useState([])
  const [adding,     setAdding]     = useState(false)
  const [form,       setForm]       = useState({ type:'moment', title:'', note:'', date: format(new Date(),'yyyy-MM-dd') })
  const [saving,     setSaving]     = useState(false)
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(collection(db,'couples',coupleId,'milestones'), orderBy('date','desc'), limit(50))
    return onSnapshot(q, snap => setMilestones(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [coupleId])

  async function addMilestone() {
    if (!form.title.trim() || saving || !coupleId) return
    setSaving(true)
    try {
      const mt = MILESTONE_TYPES.find(t => t.id === form.type)
      await addDoc(collection(db,'couples',coupleId,'milestones'), {
        ...form,
        emoji: mt?.emoji || '💝',
        typeLabel: mt?.label || 'Moment',
        createdBy: user.uid,
        createdByName: profile?.name,
        createdAt: serverTimestamp(),
      })
      setForm({ type:'moment', title:'', note:'', date: format(new Date(),'yyyy-MM-dd') })
      setAdding(false)
      toast.success('Milestone added! 💕')
    } catch { toast.error('Failed to add') }
    finally { setSaving(false) }
  }

  async function deleteMilestone(id) {
    if (!confirm('Remove this milestone?')) return
    await deleteDoc(doc(db,'couples',coupleId,'milestones',id))
    toast.success('Removed')
  }

  const daysTogether = couple?.createdAt
    ? differenceInDays(new Date(), couple.createdAt.toDate ? couple.createdAt.toDate() : new Date(couple.createdAt))
    : 0

  return (
    <div className="min-h-full pb-4">
      <div className="header-gradient px-6 pt-14 pb-10 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <h1 className="font-display text-3xl italic text-white mb-1">Our Story 💑</h1>
        <p className="text-rose-200 text-sm">Your love timeline · {daysTogether} days together</p>
      </div>

      <div className="px-4 -mt-5 flex flex-col gap-4">

        {/* Add milestone button */}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="card p-4 flex items-center gap-3 w-full animate-slide-up active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
              <Plus size={18} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>Add a Milestone</p>
              <p className="text-xs" style={{ color:'var(--muted)' }}>Capture a special moment together</p>
            </div>
          </button>
        )}

        {/* Add form */}
        {adding && (
          <div className="card p-5 animate-slide-up">
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>New Milestone</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {MILESTONE_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm(f => ({ ...f, type: t.id }))}
                    className="p-2 rounded-xl text-center border-2 transition-all"
                    style={{
                      background: form.type === t.id ? 'var(--subtle)' : 'var(--card)',
                      borderColor: form.type === t.id ? '#f43f5e' : 'var(--border)',
                    }}
                  >
                    <div className="text-xl">{t.emoji}</div>
                    <div className="text-[9px] mt-0.5 font-medium" style={{ color:'var(--text)' }}>{t.label}</div>
                  </button>
                ))}
              </div>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Title (e.g. Our first trip to Paris)"
                className="input-rose"
              />
              <textarea
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Add a note… (optional)"
                rows={2}
                className="input-rose resize-none"
              />
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="input-rose"
              />
              <div className="flex gap-2">
                <button onClick={addMilestone} disabled={saving || !form.title.trim()} className="btn-primary flex-1">
                  {saving ? 'Adding…' : 'Add Milestone 💕'}
                </button>
                <button onClick={() => setAdding(false)} className="btn-ghost px-4 w-auto">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {milestones.length === 0 && !adding ? (
          <div className="card p-8 text-center animate-slide-up">
            <div className="text-5xl mb-3 animate-float">💑</div>
            <p className="font-display text-xl italic text-rose-400 mb-1">Your story begins here</p>
            <p className="text-sm" style={{ color:'var(--muted)' }}>Add your first milestone to start your love timeline</p>
          </div>
        ) : (
          <div className="card p-5 animate-slide-up" style={{ animationDelay:'.06s' }}>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>Timeline</p>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5" style={{ background:'var(--border)' }} />
              <div className="flex flex-col gap-5">
                {milestones.map((m, i) => (
                  <div key={m.id} className="flex gap-4 relative">
                    {/* Dot */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-lg flex-shrink-0 z-10 shadow-md">
                      {m.emoji}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{m.title}</p>
                          <p className="text-[10px] text-rose-400 mt-0.5">{m.typeLabel} · {format(new Date(m.date), 'MMM d, yyyy')}</p>
                          {m.note && <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>{m.note}</p>}
                          <p className="text-[9px] mt-1" style={{ color:'var(--muted)' }}>Added by {m.createdByName}</p>
                        </div>
                        {m.createdBy === user?.uid && (
                          <button onClick={() => deleteMilestone(m.id)} className="flex-shrink-0 mt-0.5">
                            <Trash2 size={13} style={{ color:'var(--muted)' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Origin */}
                <div className="flex gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-rose-800 flex items-center justify-center text-lg flex-shrink-0 z-10 shadow-md">
                    💞
                  </div>
                  <div className="flex-1 pb-1">
                    <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>Love Link created</p>
                    <p className="text-[10px] text-rose-400 mt-0.5">
                      {couple?.createdAt
                        ? format(couple.createdAt.toDate ? couple.createdAt.toDate() : new Date(couple.createdAt), 'MMMM d, yyyy')
                        : 'The beginning'}
                    </p>
                    <p className="text-xs mt-1" style={{ color:'var(--muted)' }}>
                      {profile?.name} & {partner?.name} connected 💕
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

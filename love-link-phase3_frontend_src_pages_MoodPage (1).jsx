// src/pages/MoodPage.jsx
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import toast from 'react-hot-toast'

const MOODS = [
  { id:'love',     emoji:'🥰', label:'In Love',    bg:'#fde8f0', border:'#f9a8d4' },
  { id:'happy',    emoji:'😊', label:'Happy',       bg:'#fefce8', border:'#fde047' },
  { id:'miss_you', emoji:'🥺', label:'Miss You',   bg:'#f3e8ff', border:'#c084fc' },
  { id:'excited',  emoji:'🤩', label:'Excited',    bg:'#fff7ed', border:'#fb923c' },
  { id:'calm',     emoji:'😌', label:'Calm',        bg:'#ecfdf5', border:'#4ade80' },
  { id:'tired',    emoji:'😴', label:'Tired',       bg:'#f8fafc', border:'#94a3b8' },
  { id:'sad',      emoji:'😢', label:'Sad',         bg:'#eff6ff', border:'#60a5fa' },
  { id:'angry',    emoji:'😤', label:'Frustrated', bg:'#fef2f2', border:'#f87171' },
]

export default function MoodPage() {
  const { profile, couple, partner, user, updateMood } = useAuth()
  const [saving, setSaving] = useState(false)

  const myMood      = profile?.mood
  const partnerMood = couple?.moods?.[partner?.uid]

  const myMoodObj      = MOODS.find(m => m.id === myMood)
  const partnerMoodObj = MOODS.find(m => m.id === partnerMood)

  async function select(id) {
    if (saving) return
    setSaving(true)
    try {
      await updateMood(id)
      toast.success('Mood updated! 💕')
    } catch {
      toast.error('Failed to update mood')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full pb-4">
      <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 px-6 pt-14 pb-8">
        <h1 className="font-display text-3xl italic text-white mb-1">Daily Mood 🌸</h1>
        <p className="text-rose-200 text-sm">Let your partner know how you feel right now</p>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">

        {/* Partner's current mood */}
        {partner && (
          <div className="card p-5 shadow-lg shadow-rose-100 animate-slide-up">
            <p className="text-xs text-rose-400 uppercase tracking-widest mb-3">
              {partner.nickname}'s Mood Right Now
            </p>
            {partnerMoodObj ? (
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-sm"
                  style={{ background: partnerMoodObj.bg, border: `2px solid ${partnerMoodObj.border}` }}
                >
                  {partnerMoodObj.emoji}
                </div>
                <div>
                  <p className="font-display text-2xl italic text-rose-800">{partnerMoodObj.label}</p>
                  <p className="text-sm text-rose-400 mt-0.5">{partner.name} feels this way 💕</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <span className="text-3xl">🌸</span>
                <p className="text-sm text-rose-400">{partner.name} hasn't set a mood yet</p>
              </div>
            )}
          </div>
        )}

        {/* Set my mood */}
        <div className="card p-5 shadow-lg shadow-rose-100 animate-slide-up" style={{ animationDelay:'.08s' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-rose-400 uppercase tracking-widest">How Are You Feeling?</p>
            {myMoodObj && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: myMoodObj.bg, color: '#be123c', border: `1px solid ${myMoodObj.border}` }}
              >
                {myMoodObj.emoji} {myMoodObj.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {MOODS.map(mood => (
              <button
                key={mood.id}
                onClick={() => select(mood.id)}
                disabled={saving}
                className={`mood-chip ${myMood === mood.id ? 'selected' : ''}`}
                style={myMood === mood.id ? { background: mood.bg, borderColor: mood.border } : {}}
              >
                <span className="text-xl">{mood.emoji}</span>
                <span>{mood.label}</span>
                {myMood === mood.id && <span className="ml-auto text-rose-500 text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="card p-4 animate-slide-up" style={{ animationDelay:'.15s' }}>
          <p className="text-xs text-center text-rose-400">
            💡 Your partner sees your mood update instantly on their home screen
          </p>
        </div>
      </div>
    </div>
  )
}

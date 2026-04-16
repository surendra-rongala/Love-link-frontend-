// src/pages/WeeklySummaryPage.jsx — Weekly Love Summary (auto-generated)
import { useState, useEffect } from 'react'
import {
  collection, query, where, getDocs, orderBy, Timestamp, limit
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format, subDays } from 'date-fns'
import { Sparkles, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const MOOD_EMOJI = { happy:'😊', sad:'😢', miss_you:'🥺', excited:'🤩', tired:'😴', love:'🥰', angry:'😤', calm:'😌' }
const MOOD_LABEL = { happy:'Happy', sad:'Sad', miss_you:'Missing You', excited:'Excited', tired:'Tired', love:'In Love', angry:'Frustrated', calm:'Calm' }

export default function WeeklySummaryPage() {
  const { user, couple, partner, profile } = useAuth()
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [aiInsight,setAiInsight]= useState('')
  const [loadingAI,setLoadingAI]= useState(false)
  const coupleId = couple?.id

  useEffect(() => { if (coupleId) loadSummary() }, [coupleId])

  async function loadSummary() {
    if (!coupleId) return
    setLoading(true)
    try {
      const weekStart = Timestamp.fromDate(subDays(new Date(), 7))
      const [msgSnap, giftSnap] = await Promise.all([
        getDocs(query(
          collection(db,'couples',coupleId,'messages'),
          where('createdAt','>=',weekStart),
          orderBy('createdAt','asc'), limit(500)
        )),
        getDocs(query(
          collection(db,'couples',coupleId,'gifts'),
          where('createdAt','>=',weekStart),
          orderBy('createdAt','desc'), limit(50)
        )),
      ])

      const msgs  = msgSnap.docs.map(d => d.data())
      const gifts = giftSnap.docs.map(d => d.data())

      // Message stats
      const myMsgs      = msgs.filter(m => m.senderUid === user.uid)
      const partnerMsgs = msgs.filter(m => m.senderUid !== user.uid)
      const myGifts     = gifts.filter(g => g.senderUid === user.uid)
      const partnerGifts= gifts.filter(g => g.senderUid !== user.uid)

      // Per-day activity
      const dayActivity = Array(7).fill(0).map((_,i) => {
        const day = format(subDays(new Date(), 6-i), 'EEE')
        const dayStr = format(subDays(new Date(), 6-i), 'yyyy-MM-dd')
        const count = msgs.filter(m => {
          const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date()
          return format(d,'yyyy-MM-dd') === dayStr
        }).length
        return { day, count }
      })

      // Best day
      const bestDay = dayActivity.reduce((a,b) => b.count>a.count?b:a, dayActivity[0])

      // Most active hour
      const hourCounts = Array(24).fill(0)
      msgs.forEach(m => {
        const h = (m.createdAt?.toDate ? m.createdAt.toDate() : new Date()).getHours()
        hourCounts[h]++
      })
      const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
      const peakLabel = peakHour === 0 ? '12am' : peakHour < 12 ? `${peakHour}am` : peakHour===12?'12pm':`${peakHour-12}pm`

      // Images shared
      const imgCount = msgs.filter(m => m.imageUrl).length

      setSummary({
        totalMessages: msgs.length,
        myMessages:    myMsgs.length,
        partnerMessages: partnerMsgs.length,
        myGifts:       myGifts.length,
        partnerGifts:  partnerGifts.length,
        dayActivity,
        bestDay,
        peakHour: peakLabel,
        imagesShared: imgCount,
        weekStart: format(subDays(new Date(),7),'MMM d'),
        weekEnd:   format(new Date(),'MMM d, yyyy'),
      })
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function generateAIInsight() {
    if (!summary || loadingAI) return
    setLoadingAI(true)
    try {
      const prompt = `Based on this couple's week: ${summary.totalMessages} messages exchanged, ${summary.myGifts+summary.partnerGifts} gifts sent, most active on ${summary.bestDay?.day} around ${summary.peakHour}. Write a warm, encouraging 2-sentence love insight about their relationship this week. Be specific, romantic, and positive. End with a sweet tip for next week.`
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:200,
          messages:[{ role:'user', content: prompt }]
        })
      })
      const data = await res.json()
      setAiInsight(data.content?.[0]?.text || '')
    } catch { toast.error('Could not generate insight') }
    finally { setLoadingAI(false) }
  }

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full pb-4">
      <div className="header-gradient px-6 pt-14 pb-10 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <h1 className="font-display text-3xl italic text-white mb-1">Weekly Summary 📋</h1>
        <p className="text-rose-200 text-sm">
          {summary ? `${summary.weekStart} – ${summary.weekEnd}` : 'Your love week in review'}
        </p>
      </div>

      <div className="px-4 -mt-5 flex flex-col gap-4">

        {/* Stat cards */}
        {summary && (
          <>
            <div className="grid grid-cols-2 gap-3 animate-slide-up">
              {[
                { emoji:'💬', label:'Total Messages', value: summary.totalMessages },
                { emoji:'🎁', label:'Gifts Sent',     value: summary.myGifts + summary.partnerGifts },
                { emoji:'📸', label:'Photos Shared',  value: summary.imagesShared },
                { emoji:'⏰', label:'Peak Time',      value: summary.peakHour },
              ].map((s,i) => (
                <div key={i} className="card p-4 text-center">
                  <div className="text-3xl mb-1">{s.emoji}</div>
                  <div className="text-2xl font-bold text-rose-500">{s.value}</div>
                  <div className="text-[10px]" style={{ color:'var(--muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Message breakdown */}
            <div className="card p-5 animate-slide-up" style={{ animationDelay:'.06s' }}>
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>Message Breakdown</p>
              <div className="flex flex-col gap-3">
                {[
                  { name: profile?.name || 'You', count: summary.myMessages, color:'#f43f5e' },
                  { name: partner?.name || 'Partner', count: summary.partnerMessages, color:'#fb7185' },
                ].map((p,i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color:'var(--text)' }}>{p.name}</span>
                      <span className="font-bold" style={{ color:p.color }}>{p.count} msgs</span>
                    </div>
                    <div className="h-3 rounded-full" style={{ background:'var(--subtle)' }}>
                      <div className="h-3 rounded-full transition-all duration-700"
                        style={{ width:`${summary.totalMessages>0?(p.count/summary.totalMessages)*100:0}%`, background:p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day activity */}
            <div className="card p-5 animate-slide-up" style={{ animationDelay:'.1s' }}>
              <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>Daily Activity</p>
              <div className="flex items-end gap-2 h-20">
                {summary.dayActivity.map((d,i) => {
                  const max = Math.max(...summary.dayActivity.map(x=>x.count), 1)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-lg" style={{
                        height:`${Math.max((d.count/max)*72,4)}px`,
                        background: d.count>0 ? 'linear-gradient(135deg,#f43f5e,#be123c)' : 'var(--subtle)'
                      }}/>
                      <span className="text-[9px]" style={{ color:'var(--muted)' }}>{d.day}</span>
                    </div>
                  )
                })}
              </div>
              {summary.bestDay?.count > 0 && (
                <p className="text-xs mt-3 text-center" style={{ color:'var(--muted)' }}>
                  🏆 Most active on <strong className="text-rose-500">{summary.bestDay.day}</strong> ({summary.bestDay.count} messages)
                </p>
              )}
            </div>

            {/* AI Insight */}
            <div className="card p-5 animate-slide-up" style={{ animationDelay:'.14s' }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-amber-500" />
                <p className="text-xs uppercase tracking-widest" style={{ color:'var(--muted)' }}>AI Love Insight</p>
              </div>
              {aiInsight ? (
                <p className="text-sm leading-relaxed" style={{ color:'var(--text)' }}>{aiInsight}</p>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm mb-3" style={{ color:'var(--muted)' }}>Get a personalized analysis of your love week</p>
                  <button onClick={generateAIInsight} disabled={loadingAI}
                    className="btn-primary py-3">
                    {loadingAI
                      ? <><RefreshCw size={14} className="animate-spin"/> Generating…</>
                      : <><Sparkles size={14}/> Generate Insight</>}
                  </button>
                </div>
              )}
            </div>

            {/* Highlights */}
            <div className="card p-5 animate-slide-up" style={{ animationDelay:'.18s' }}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Weekly Highlights</p>
              <div className="flex flex-col gap-2">
                {[
                  summary.totalMessages > 50  && { emoji:'🔥', text:`You're on fire! ${summary.totalMessages} messages this week` },
                  summary.myGifts > 0         && { emoji:'🎁', text:`You sent ${summary.myGifts} gift${summary.myGifts>1?'s':''} to your partner` },
                  summary.partnerGifts > 0    && { emoji:'💌', text:`Your partner sent you ${summary.partnerGifts} gift${summary.partnerGifts>1?'s':''}` },
                  summary.imagesShared > 0    && { emoji:'📸', text:`${summary.imagesShared} photo${summary.imagesShared>1?'s':''} shared this week` },
                  summary.totalMessages < 10  && { emoji:'💡', text:`Chat more! Try to reach 10+ messages daily` },
                ].filter(Boolean).map((h,i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background:'var(--subtle)' }}>
                    <span className="text-xl">{h.emoji}</span>
                    <p className="text-sm" style={{ color:'var(--text)' }}>{h.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!summary && !loading && (
          <div className="card p-8 text-center animate-slide-up">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-display text-xl italic text-rose-400 mb-2">No data yet</p>
            <p className="text-sm" style={{ color:'var(--muted)' }}>Start chatting to generate your weekly summary!</p>
          </div>
        )}
      </div>
    </div>
  )
}

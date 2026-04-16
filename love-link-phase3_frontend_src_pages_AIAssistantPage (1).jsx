// src/pages/AIAssistantPage.jsx — Module 8: AI Love Assistant
import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, RefreshCw, Copy, Heart } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import toast from 'react-hot-toast'

const SYSTEM_PROMPT = `You are a warm, empathetic relationship coach and love assistant for a couple app called Love Link. 
Your role is to help couples communicate better, resolve conflicts gently, and deepen their emotional connection.

You help with:
- Suggesting thoughtful messages and what to say in difficult moments
- Conflict resolution with calm, compassionate language
- Romantic ideas, date suggestions, and surprise planning
- Understanding each other's feelings and love languages
- Celebrating milestones and special moments

Keep responses concise, warm, and actionable. Use occasional heart emojis. 
Never take sides. Always encourage open communication and mutual respect.
If suggesting a message to send, put it in quotes so it's easy to copy.`

const QUICK_PROMPTS = [
  { emoji:'💔', label:'We had a fight', prompt:'My partner and I had an argument and things are tense. Help me find the right words to start healing.' },
  { emoji:'💌', label:'Missing them', prompt:'I really miss my partner right now. What\'s a sweet message I can send?' },
  { emoji:'🎁', label:'Surprise idea', prompt:'I want to do something special and romantic for my partner. Give me a unique surprise idea.' },
  { emoji:'🗣️', label:'Hard to say', prompt:'There\'s something important I need to tell my partner but I don\'t know how to bring it up gently.' },
  { emoji:'💞', label:'Feel closer', prompt:'We\'ve been busy and feel a little disconnected lately. What can we do to feel closer again?' },
  { emoji:'🌹', label:'Just romantic', prompt:'Write me the most romantic and heartfelt message I could send to my partner right now.' },
]

export default function AIAssistantPage() {
  const { profile, partner } = useAuth()
  const [messages, setMessages] = useState([
    { role:'assistant', content:`Hi ${profile?.nickname || 'there'} 💕 I'm your Love Assistant! I can help you find the perfect words, plan surprises, or navigate tricky moments. What's on your heart today?` }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userText = text || input.trim()
    if (!userText || loading) return
    setInput('')

    const newMessages = [...messages, { role:'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      })
      const data = await res.json()
      const reply = data.content?.find(c => c.type === 'text')?.text || 'I\'m here for you 💕'
      setMessages(prev => [...prev, { role:'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role:'assistant', content: 'Sorry, I had trouble connecting. Please try again! 💕' }])
    } finally {
      setLoading(false)
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text)
    toast.success('Copied! 💕')
  }

  function clearChat() {
    setMessages([{ role:'assistant', content:`Hey ${profile?.nickname || 'there'} 💕 Fresh start! What would you like help with?` }])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="header-gradient px-6 pt-14 pb-6 flex-shrink-0 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl italic text-white mb-1">Love Assistant 🤖</h1>
            <p className="text-rose-200 text-sm">Your AI relationship coach</p>
          </div>
          <button onClick={clearChat} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <RefreshCw size={14} className="text-white" />
          </button>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="flex-shrink-0 px-4 py-3 overflow-x-auto flex gap-2" style={{ scrollbarWidth:'none' }}>
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            onClick={() => send(qp.prompt)}
            disabled={loading}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95"
            style={{ background:'var(--card)', borderColor:'var(--border)', color:'var(--text)' }}
          >
            <span>{qp.emoji}</span>
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-700 flex items-center justify-center text-sm flex-shrink-0 mt-1">
                🤖
              </div>
            )}
            <div className="max-w-[82%]">
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bubble-me'
                    : 'bubble-them'
                } ${msg.role === 'assistant' ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => copyText(msg.content)}
                  className="mt-1 ml-1 text-[10px] flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color:'var(--muted)' }}
                >
                  <Copy size={10} /> Copy
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-700 flex items-center justify-center text-sm flex-shrink-0">
              🤖
            </div>
            <div className="bubble-them px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0,1,2].map(j => (
                  <div key={j} className="w-2 h-2 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay:`${j*0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 flex gap-2 items-end" style={{ borderTop:'1px solid var(--border)' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }}}
          placeholder="Ask me anything about love… 💕"
          rows={1}
          className="input-rose flex-1 resize-none"
          style={{ maxHeight:'100px', overflowY:'auto' }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
          style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)', boxShadow:'0 4px 12px rgba(244,63,94,.4)' }}
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  )
}

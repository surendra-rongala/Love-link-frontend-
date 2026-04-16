// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [name,     setName]     = useState('')
  const [nickname, setNickname] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim())     return toast.error('What\'s your name? 💕')
    if (!nickname.trim()) return toast.error('Add a pet name for your partner to see!')
    setLoading(true)
    try {
      await signIn(name.trim(), nickname.trim())
    } catch (err) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-app flex flex-col items-center justify-center p-6 overflow-y-auto">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-rose-100/60 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-rose-200/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-400 to-rose-700 items-center justify-center shadow-xl shadow-rose-300/40 mb-5">
            <span className="text-4xl">💕</span>
          </div>
          <h1 className="font-display text-4xl text-rose-700 italic">Love Link</h1>
          <p className="text-rose-400 text-sm mt-1.5 font-light">Your private couple space</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-xl shadow-rose-100">
          <h2 className="font-display text-2xl text-rose-800 italic mb-1">Welcome 💕</h2>
          <p className="text-rose-400 text-sm mb-6">Tell us a little about yourself</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-rose-600/70 uppercase tracking-widest mb-2">
                Your Full Name
              </label>
              <input
                className="input-rose"
                type="text"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-600/70 uppercase tracking-widest mb-2">
                Pet Name / Nickname
              </label>
              <input
                className="input-rose"
                type="text"
                placeholder="e.g. Sunshine, Babe, Jaan…"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={20}
                autoComplete="off"
              />
              <p className="text-xs text-rose-300 mt-1.5">Your partner will see this name</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-2"
            >
              {loading ? 'Creating your space…' : 'Enter Love Link 💕'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-rose-300/70 mt-6">
          Your data is private & secure ❤️
        </p>
      </div>
    </div>
  )
}

// src/pages/PrivateSpacePage.jsx — Private PIN-protected space
import { useState, useEffect, useRef } from 'react'
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, deleteDoc, doc, limit
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Lock, Unlock, Plus, Trash2, Image, FileText, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const PIN_KEY = 'love_link_private_pin'
const UNLOCKED_KEY = 'love_link_private_unlocked'

export default function PrivateSpacePage() {
  const { user, couple } = useAuth()
  const [unlocked,    setUnlocked]    = useState(false)
  const [pin,         setPin]         = useState('')
  const [pinInput,    setPinInput]    = useState('')
  const [settingPin,  setSettingPin]  = useState(false)
  const [confirmPin,  setConfirmPin]  = useState('')
  const [secrets,     setSecrets]     = useState([])
  const [newText,     setNewText]     = useState('')
  const [adding,      setAdding]      = useState(false)
  const [showPin,     setShowPin]     = useState(false)
  const fileRef = useRef(null)
  const coupleId = couple?.id

  // Check if PIN is set
  useEffect(() => {
    const stored = localStorage.getItem(PIN_KEY)
    if (stored) setPin(stored)
    else setSettingPin(true)
    // check session
    if (sessionStorage.getItem(UNLOCKED_KEY) === '1') setUnlocked(true)
  }, [])

  // Load secrets
  useEffect(() => {
    if (!unlocked || !coupleId || !user) return
    const q = query(
      collection(db, 'couples', coupleId, `private_${user.uid}`),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    return onSnapshot(q, snap => setSecrets(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [unlocked, coupleId, user?.uid])

  function handleSetPin() {
    if (pinInput.length < 4) { toast.error('PIN must be at least 4 digits'); return }
    if (pinInput !== confirmPin) { toast.error('PINs don\'t match'); return }
    localStorage.setItem(PIN_KEY, pinInput)
    setPin(pinInput)
    setSettingPin(false)
    setUnlocked(true)
    sessionStorage.setItem(UNLOCKED_KEY, '1')
    toast.success('Private space secured! 🔐')
  }

  function handleUnlock() {
    if (pinInput === pin) {
      setUnlocked(true)
      sessionStorage.setItem(UNLOCKED_KEY, '1')
      setPinInput('')
    } else {
      toast.error('Wrong PIN 🔒')
      setPinInput('')
    }
  }

  function handleLock() {
    setUnlocked(false)
    sessionStorage.removeItem(UNLOCKED_KEY)
  }

  async function addSecret() {
    if (!newText.trim() || adding || !coupleId) return
    setAdding(true)
    try {
      await addDoc(collection(db, 'couples', coupleId, `private_${user.uid}`), {
        type: 'text',
        content: newText.trim(),
        createdAt: serverTimestamp(),
      })
      setNewText('')
      toast.success('Secret saved 🔐')
    } catch { toast.error('Failed to save') }
    finally { setAdding(false) }
  }

  async function addPhoto(e) {
    const file = e.target.files?.[0]
    if (!file || !coupleId) return
    try {
      const path = `private/${user.uid}/${Date.now()}_${file.name}`
      const snap = await uploadBytes(ref(storage, path), file)
      const url = await getDownloadURL(snap.ref)
      await addDoc(collection(db, 'couples', coupleId, `private_${user.uid}`), {
        type: 'photo',
        url,
        createdAt: serverTimestamp(),
      })
      toast.success('Photo added! 🔐')
    } catch { toast.error('Failed to upload photo') }
    e.target.value = ''
  }

  async function deleteSecret(id) {
    if (!confirm('Delete this secret?')) return
    await deleteDoc(doc(db, 'couples', coupleId, `private_${user.uid}`, id))
    toast.success('Deleted')
  }

  // PIN entry screen
  if (settingPin) return (
    <div className="min-h-full flex flex-col">
      <div className="header-gradient px-6 pt-14 pb-10">
        <h1 className="font-display text-3xl italic text-white mb-1">Private Space 🔐</h1>
        <p className="text-rose-200 text-sm">Set up your personal PIN</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-800 flex items-center justify-center text-4xl shadow-xl">
          🔐
        </div>
        <h2 className="font-display text-2xl italic text-rose-500">Create Your PIN</h2>
        <p className="text-sm text-center" style={{ color:'var(--muted)' }}>Only you can see your private space</p>
        <div className="w-full flex flex-col gap-3">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g,'').slice(0,8))}
              placeholder="Enter PIN (4-8 digits)"
              className="input-rose pr-10"
            />
            <button onClick={() => setShowPin(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--muted)' }}>
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,8))}
            placeholder="Confirm PIN"
            className="input-rose"
          />
          <button onClick={handleSetPin} className="btn-primary">
            <Lock size={16} /> Set PIN & Enter
          </button>
        </div>
      </div>
    </div>
  )

  if (!unlocked) return (
    <div className="min-h-full flex flex-col">
      <div className="header-gradient px-6 pt-14 pb-10">
        <h1 className="font-display text-3xl italic text-white mb-1">Private Space 🔐</h1>
        <p className="text-rose-200 text-sm">Your personal sanctuary</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-800 flex items-center justify-center text-5xl shadow-xl">
          🔒
        </div>
        <h2 className="font-display text-2xl italic text-rose-500">Enter PIN</h2>
        <div className="w-full flex flex-col gap-3">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g,'').slice(0,8))}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="Your PIN"
              className="input-rose pr-10"
              autoFocus
            />
            <button onClick={() => setShowPin(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--muted)' }}>
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button onClick={handleUnlock} className="btn-primary">
            <Unlock size={16} /> Unlock
          </button>
          <button
            onClick={() => { localStorage.removeItem(PIN_KEY); setPin(''); setPinInput(''); setConfirmPin(''); setSettingPin(true) }}
            className="text-xs text-center"
            style={{ color:'var(--muted)' }}
          >
            Forgot PIN? Reset (clears all secrets)
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-full pb-4">
      <div className="header-gradient px-6 pt-14 pb-8 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl italic text-white mb-1">Private Space 🔐</h1>
            <p className="text-rose-200 text-sm">Your personal secrets</p>
          </div>
          <button onClick={handleLock} className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
            <Lock size={12} className="text-white" />
            <span className="text-white text-xs">Lock</span>
          </button>
        </div>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">
        {/* Add */}
        <div className="card p-5 animate-slide-up">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color:'var(--muted)' }}>Add a Secret</p>
          <div className="flex flex-col gap-3">
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Write a secret thought, wish, or note… 🔐"
              rows={3}
              className="input-rose resize-none"
            />
            <div className="flex gap-2">
              <button onClick={addSecret} disabled={adding || !newText.trim()} className="btn-primary flex-1">
                <Plus size={14} /> Save Secret
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background:'var(--subtle)', border:'1.5px solid var(--border)' }}
              >
                <Image size={16} style={{ color:'var(--muted)' }} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={addPhoto} />
            </div>
          </div>
        </div>

        {/* Secrets list */}
        {secrets.length === 0 ? (
          <div className="card p-8 text-center animate-slide-up">
            <div className="text-4xl mb-3">🔐</div>
            <p className="text-sm" style={{ color:'var(--muted)' }}>Your private space is empty.<br />Add secrets, photos, or thoughts!</p>
          </div>
        ) : (
          <div className="card p-5 animate-slide-up" style={{ animationDelay:'.06s' }}>
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color:'var(--muted)' }}>My Secrets ({secrets.length})</p>
            <div className="flex flex-col gap-3">
              {secrets.map(secret => (
                <div key={secret.id} className="rounded-2xl p-4 relative" style={{ background:'var(--subtle)' }}>
                  {secret.type === 'photo' ? (
                    <img src={secret.url} className="w-full rounded-xl object-cover max-h-48" alt="private" />
                  ) : (
                    <p className="text-sm pr-8" style={{ color:'var(--text)' }}>{secret.content}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px]" style={{ color:'var(--muted)' }}>
                      {secret.createdAt ? format(secret.createdAt.toDate(), 'MMM d, h:mm a') : ''}
                    </span>
                    <button onClick={() => deleteSecret(secret.id)}>
                      <Trash2 size={13} style={{ color:'var(--muted)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

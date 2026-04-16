// src/lib/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { signInAnonymously, onAuthStateChanged, updateProfile, signOut as fbSignOut } from 'firebase/auth'
import { doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import { v4 as uuidv4 } from 'uuid'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(undefined)
  const [profile,     setProfile]     = useState(null)
  const [couple,      setCouple]      = useState(null)
  const [partner,     setPartner]     = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) { setUser(fbUser); await loadProfile(fbUser.uid) }
      else { setUser(null); setProfile(null); setCouple(null); setPartner(null) }
      setLoadingAuth(false)
    })
  }, [])

  async function loadProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid))
    if (snap.exists()) {
      const data = snap.data(); setProfile(data)
      if (data.coupleId) return loadCouple(data.coupleId, uid)
    }
  }

  function loadCouple(coupleId, myUid) {
    return onSnapshot(doc(db, 'couples', coupleId), async (snap) => {
      if (!snap.exists()) return
      const data = snap.data(); setCouple({ id: snap.id, ...data })
      const partnerUid = data.members.find(u => u !== myUid)
      if (partnerUid) {
        const ps = await getDoc(doc(db, 'users', partnerUid))
        if (ps.exists()) setPartner({ uid: partnerUid, ...ps.data() })
      }
    })
  }

  async function signIn(name, nickname) {
    const cred = await signInAnonymously(auth)
    await updateProfile(cred.user, { displayName: name })
    const profileData = { uid: cred.user.uid, name, nickname, inviteCode: uuidv4().slice(0,8).toUpperCase(), coupleId: null, mood: null, lastActive: serverTimestamp(), createdAt: serverTimestamp() }
    await setDoc(doc(db, 'users', cred.user.uid), profileData)
    setProfile(profileData)
  }

  async function signOut() { await fbSignOut(auth) }

  async function refreshInviteCode() {
    const code = uuidv4().slice(0,8).toUpperCase()
    await setDoc(doc(db, 'users', user.uid), { inviteCode: code }, { merge: true })
    setProfile(p => ({ ...p, inviteCode: code })); return code
  }

  async function joinWithCode(code) {
    const upper = code.trim().toUpperCase()
    const q = query(collection(db, 'users'), where('inviteCode', '==', upper))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error('Invalid invite code.')
    const pd = snap.docs[0].data()
    if (pd.uid === user.uid)  throw new Error("That's your own code 😅")
    if (pd.coupleId)          throw new Error('This person is already paired.')
    if (profile?.coupleId)    throw new Error('You are already paired.')
    const coupleId = uuidv4()
    await setDoc(doc(db, 'couples', coupleId), { id: coupleId, members: [user.uid, pd.uid], names: { [user.uid]: profile.name, [pd.uid]: pd.name }, nicknames: { [user.uid]: profile.nickname, [pd.uid]: pd.nickname }, moods: {}, typing: {}, ritual: {}, createdAt: serverTimestamp(), anniversary: null })
    await setDoc(doc(db, 'users', user.uid), { coupleId }, { merge: true })
    await setDoc(doc(db, 'users', pd.uid),   { coupleId }, { merge: true })
    setProfile(p => ({ ...p, coupleId })); loadCouple(coupleId, user.uid)
  }

  async function updateMood(mood) {
    await setDoc(doc(db, 'users', user.uid), { mood }, { merge: true })
    setProfile(p => ({ ...p, mood }))
    if (couple) await setDoc(doc(db, 'couples', couple.id), { [`moods.${user.uid}`]: mood }, { merge: true })
  }

  async function updateNickname(nickname) {
    await setDoc(doc(db, 'users', user.uid), { nickname }, { merge: true })
    setProfile(p => ({ ...p, nickname }))
    if (couple) await setDoc(doc(db, 'couples', couple.id), { [`nicknames.${user.uid}`]: nickname }, { merge: true })
  }

  async function setAnniversary(dateStr) {
    if (!couple) return
    await setDoc(doc(db, 'couples', couple.id), { anniversary: dateStr }, { merge: true })
  }

  const touchLastActive = useCallback(async () => {
    if (!user) return
    await setDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() }, { merge: true })
  }, [user])

  async function setTyping(isTyping) {
    if (!couple) return
    await setDoc(doc(db, 'couples', couple.id), { [`typing.${user.uid}`]: isTyping }, { merge: true })
  }

  async function sendRitual(type) {
    if (!couple) return
    await setDoc(doc(db, 'couples', couple.id), { [`ritual.${user.uid}`]: { type, sentAt: serverTimestamp() } }, { merge: true })
  }

  return (
    <Ctx.Provider value={{ user, profile, couple, partner, loadingAuth, signIn, signOut, joinWithCode, refreshInviteCode, updateMood, updateNickname, setAnniversary, touchLastActive, setTyping, sendRitual }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => { const ctx = useContext(Ctx); if (!ctx) throw new Error('useAuth must be inside AuthProvider'); return ctx }

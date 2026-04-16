// src/lib/firebase.js
// ─── Replace ALL values below with your Firebase project config ───────────────
// Firebase Console → Project Settings → Your Apps → Web App → SDK setup & config
import { initializeApp } from 'firebase/app'
import { getAuth }       from 'firebase/auth'
import { getFirestore }  from 'firebase/firestore'
import { getStorage }    from 'firebase/storage'

const firebaseConfig = {
  apiKey:            "AIzaSyAnG3eIsyADTwNZotRDrgujuaS2L_kijM0",
  authDomain:        "codejoy.firebaseapp.com",
  projectId:         "codejoy",
  storageBucket:     "codejoy.firebasestorage.app",
  messagingSenderId: "552302634071",
  appId:             "1:552302634071:web:e7146f0a6d03531385af12",
}

const app = initializeApp(firebaseConfig)

export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const storage = getStorage(app)
export default app

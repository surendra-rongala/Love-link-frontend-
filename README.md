# 💕 Love Link v4 — Final Full Stack Couple App

Complete production-ready couple app — React + Vite + Firebase.

---

## ⚡ Quick Start

```bash
cd love-link/frontend
npm install
npm run dev
```

Open **http://localhost:5173** — then add your Firebase config to `src/lib/firebase.js`.

---

## 📂 Complete File Structure

```
love-link/
├── firestore.rules            # Production security rules (all collections)
├── storage.rules              # Firebase Storage rules
├── README.md
│
├── frontend/
│   ├── index.html             # PWA shell
│   ├── vite.config.js
│   ├── tailwind.config.js     # Dark mode + custom design tokens
│   ├── postcss.config.js
│   ├── package.json           # v4.0.0
│   ├── public/
│   │   ├── heart.svg          # Favicon + PWA icon
│   │   └── manifest.json      # Add to Home Screen
│   └── src/
│       ├── main.jsx           # Entry + dark mode init
│       ├── App.jsx            # Router (lazy-loaded Phase 3 features)
│       ├── styles/globals.css # All CSS vars, dark mode, animations
│       ├── hooks/useDarkMode.js
│       ├── lib/
│       │   ├── firebase.js    ← YOUR FIREBASE KEYS GO HERE
│       │   └── AuthContext.jsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.jsx          # 5-tab nav
│       │   │   ├── LoadingScreen.jsx
│       │   │   ├── ErrorBoundary.jsx
│       │   │   └── NotificationBanner.jsx
│       │   └── snaps/
│       │       └── SnapInbox.jsx         # Real-time snap receiver
│       └── pages/
│           │
│           ├── ── CORE TABS ──
│           ├── ChatPage.jsx              # Real-time chat + reactions + images
│           ├── DailyHubPage.jsx          # Daily Q + missions + AI suggestions
│           ├── MemoriesHubPage.jsx       # Photos, notes, drawings, snaps hub
│           ├── InsightsPage.jsx          # Analytics, heatmap, mood trends
│           ├── SettingsPage.jsx          # Dark mode, nickname, anniversary
│           │
│           ├── ── PHASE 3: NEW FEATURES ──
│           ├── SyncModePage.jsx          # Watch YouTube together (synced)
│           ├── DrawTogetherPage.jsx      # Real-time shared canvas
│           ├── LiveSnapPage.jsx          # Ephemeral camera snaps
│           ├── AIAssistantPage.jsx       # Claude-powered love coach
│           │
│           ├── ── HUB PAGES ──
│           ├── DailyConnectPage.jsx      # Deep dive daily connect
│           ├── LoveMissionsPage.jsx      # Weekly missions
│           ├── WeeklySummaryPage.jsx     # Weekly relationship recap
│           ├── OurStoryPage.jsx          # Relationship timeline
│           ├── PrivateSpacePage.jsx      # Private journal entries
│           │
│           └── ── LEGACY (still accessible) ──
│               ├── HomePage.jsx, MoodPage.jsx, GiftsPage.jsx
│               ├── DatePlannerPage.jsx, BucketListPage.jsx
│               ├── LoveQuizPage.jsx, LoveLetterPage.jsx
│               ├── RelationshipTrackerPage.jsx, LoveNotesPage.jsx
│               ├── MemoryPage.jsx, VibesPage.jsx
│               └── PairingPage.jsx, LoginPage.jsx
│
└── backend/
    ├── server.js              # Express + FCM push notifications
    ├── package.json
    └── .env.example
```

---

## 🔥 Firebase Setup (5 min)

### 1. Create project
- https://console.firebase.google.com → Add project → `love-link`

### 2. Enable services
- **Authentication** → Anonymous → Enable
- **Firestore** → Create database → Test mode → Choose region
- **Storage** → Get started → Test mode

### 3. Add your config
`frontend/src/lib/firebase.js`:
```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-app.firebaseapp.com",
  projectId:         "your-app",
  storageBucket:     "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...",
}
```

### 4. Deploy security rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # → use firestore.rules
firebase init storage     # → use storage.rules
firebase deploy --only firestore:rules,storage
```

---

## 🤖 AI Love Assistant Setup

The AI Assistant page uses the Claude API. To enable it:

1. Get an API key at https://console.anthropic.com
2. The key is entered by users directly in the AI chat UI (no server needed)
3. Or for production, proxy through your backend to hide the key

---

## 📱 Run on Mobile (Same WiFi)

```bash
# Vite exposes on LAN automatically (host: true in vite.config.js)
npm run dev
# On phone: http://YOUR_COMPUTER_IP:5173
```

**Add to Home Screen** for full PWA experience.

---

## 🚀 Deploy

```bash
# Vercel (recommended)
cd frontend && npm run build
npx vercel --prod

# Firebase Hosting
firebase init hosting  # dist folder, SPA: yes
npm run build
firebase deploy --only hosting
```

---

## ✨ All Features

### 5 Main Tabs
| Tab | Feature |
|---|---|
| 💬 Chat | Real-time messages, photo sharing, typing indicator, emoji reactions |
| ✨ Daily | Daily question, missions tracker, AI message suggestions |
| 📸 Moments | Unified hub — photos, notes, drawings, snap history |
| 📊 Insights | Message heatmap, mood trends, activity analytics |
| ⚙️ Me | Dark mode, nickname, anniversary, sign out |

### Phase 3 Features (accessible via Daily tab)
| Feature | What it does |
|---|---|
| 🎬 Sync Mode | Watch YouTube together in real-time sync with floating chat |
| 🎨 Draw Together | Shared canvas — strokes sync via Firestore in real-time |
| 📸 Live Snap | Ephemeral camera snaps — visible for 10 seconds then gone |
| 🤖 AI Assistant | Claude-powered love coach — conflict help, message suggestions, romance ideas |

### Legacy Features (deep link accessible)
Gifts, Mood, Date Planner, Bucket List, Love Quiz, Love Letters, Relationship Tracker, Love Notes, Memory Wall, Vibes, Our Story, Weekly Summary, Private Space, Love Missions

---

## 🗄 Firestore Schema

```
users/{uid}               name, nickname, inviteCode, coupleId, mood, lastActive
couples/{coupleId}        members[], names{}, nicknames{}, moods{}, typing{}, ritual{}, anniversary
  /messages               text, imageUrl, senderUid, reactions[], createdAt
  /gifts                  giftId, emoji, senderUid, createdAt
  /memories               caption, imageUrl, authorUid, createdAt
  /notes                  text, colorBg, authorUid, createdAt
  /vibes                  title, artist, link, platform, senderUid, createdAt
  /dates                  title, dateType, when, done, creatorUid, createdAt
  /quiz                   mode, card, playerName, createdAt
  /bucketlist             text, category, done, priority, creatorUid, createdAt
  /letters                subject, body, unlockAt, authorUid, createdAt
  /checkins               rating, note, authorUid, dateStr, createdAt
  /daily                  questionIdx, myAnswer, partnerAnswer, date
  /missions               completed{}, date
  /strokes                path[], color, size, authorUid, createdAt
  /drawings               imageUrl, authorUid, createdAt
  /sync                   videoId, playing, currentTime, updatedBy, updatedAt
  /sync_chat              text, senderUid, createdAt
  /story                  entries[]
  /private                text, authorUid, createdAt
  /hub_items              type, content, authorUid, createdAt

live_snaps/{snapId}       senderId, receiverId, imageUrl, viewed, timestamp
```

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 (lazy loading for heavy pages) |
| Styling | Tailwind CSS 3 + CSS Variables (full dark mode) |
| Routing | React Router v6 |
| Auth | Firebase Anonymous Auth |
| Database | Firestore (real-time) |
| Storage | Firebase Storage |
| AI | Claude API (claude-sonnet-4-20250514) |
| Push | Express + Firebase Cloud Messaging |
| Fonts | Playfair Display + Plus Jakarta Sans |

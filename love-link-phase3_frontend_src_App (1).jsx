// src/App.jsx — Phase 3: 5-tab clean architecture
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import LoadingScreen  from './components/layout/LoadingScreen'
import ErrorBoundary  from './components/layout/ErrorBoundary'
import AppShell       from './components/layout/AppShell'
import LoginPage      from './pages/LoginPage'
import PairingPage    from './pages/PairingPage'

// ── Core tabs (eagerly loaded) ────────────────────────────────────
import ChatPage        from './pages/ChatPage'
import DailyHubPage   from './pages/DailyHubPage'
import MemoriesHubPage from './pages/MemoriesHubPage'
import InsightsPage   from './pages/InsightsPage'
import SettingsPage   from './pages/SettingsPage'

// ── Heavy features (lazy loaded) ──────────────────────────────────
const SyncModePage     = lazy(() => import('./pages/SyncModePage'))
const DrawTogetherPage = lazy(() => import('./pages/DrawTogetherPage'))
const LiveSnapPage     = lazy(() => import('./pages/LiveSnapPage'))

// ── Legacy pages still accessible via deep link ───────────────────
import MoodPage                from './pages/MoodPage'
import GiftsPage               from './pages/GiftsPage'
import LoveMissionsPage        from './pages/LoveMissionsPage'
import WeeklySummaryPage       from './pages/WeeklySummaryPage'
import OurStoryPage            from './pages/OurStoryPage'
import PrivateSpacePage        from './pages/PrivateSpacePage'
import AIAssistantPage         from './pages/AIAssistantPage'
import DatePlannerPage         from './pages/DatePlannerPage'
import BucketListPage          from './pages/BucketListPage'
import LoveQuizPage            from './pages/LoveQuizPage'
import LoveLetterPage          from './pages/LoveLetterPage'
import RelationshipTrackerPage from './pages/RelationshipTrackerPage'
import LoveNotesPage           from './pages/LoveNotesPage'
import MemoryPage              from './pages/MemoryPage'
import VibesPage               from './pages/VibesPage'
import HomeSplash              from './pages/HomePage'

function LazyFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { user, profile, couple, loadingAuth } = useAuth()

  if (loadingAuth)       return <LoadingScreen />
  if (!user || !profile) return <LoginPage />
  if (!couple)           return <PairingPage />

  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            {/* ── 5 Main Tabs ── */}
            <Route path="/"          element={<Navigate to="/chat" replace />} />
            <Route path="/chat"      element={<ChatPage          />} />
            <Route path="/daily"     element={<DailyHubPage      />} />
            <Route path="/memories"  element={<MemoriesHubPage   />} />
            <Route path="/insights"  element={<InsightsPage      />} />
            <Route path="/settings"  element={<SettingsPage      />} />

            {/* ── New Phase 3 Features ── */}
            <Route path="/sync"      element={<SyncModePage      />} />
            <Route path="/draw"      element={<DrawTogetherPage  />} />
            <Route path="/snap"      element={<LiveSnapPage      />} />

            {/* ── Legacy / Deep links (still work) ── */}
            <Route path="/mood"      element={<MoodPage                />} />
            <Route path="/gifts"     element={<GiftsPage               />} />
            <Route path="/missions"  element={<LoveMissionsPage        />} />
            <Route path="/summary"   element={<WeeklySummaryPage       />} />
            <Route path="/story"     element={<OurStoryPage            />} />
            <Route path="/private"   element={<PrivateSpacePage        />} />
            <Route path="/ai"        element={<AIAssistantPage         />} />
            <Route path="/dates"     element={<DatePlannerPage         />} />
            <Route path="/bucket"    element={<BucketListPage          />} />
            <Route path="/quiz"      element={<LoveQuizPage            />} />
            <Route path="/letters"   element={<LoveLetterPage          />} />
            <Route path="/tracker"   element={<RelationshipTrackerPage />} />
            <Route path="/notes"     element={<LoveNotesPage           />} />
            <Route path="/memory"    element={<MemoryPage              />} />
            <Route path="/vibes"     element={<VibesPage               />} />
            <Route path="/home"      element={<HomeSplash              />} />

            <Route path="*"          element={<Navigate to="/chat" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ErrorBoundary>
  )
}

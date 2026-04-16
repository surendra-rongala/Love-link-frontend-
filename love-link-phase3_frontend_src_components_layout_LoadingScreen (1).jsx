export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-app flex flex-col items-center justify-center gap-5">
      <div className="relative">
        <div className="text-6xl animate-heartbeat">💕</div>
        <div className="absolute inset-0 text-6xl animate-ping-once opacity-30">💕</div>
      </div>
      <div>
        <p className="font-display text-3xl text-rose-600 italic text-center">Love Link</p>
        <p className="text-rose-300 text-sm text-center mt-1">Loading your love story…</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0,1,2].map(i => (
          <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />
        ))}
      </div>
    </div>
  )
}

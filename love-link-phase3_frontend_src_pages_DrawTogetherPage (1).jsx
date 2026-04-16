// src/pages/DrawTogetherPage.jsx
// Real-time shared canvas — strokes sync via Firestore
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection, addDoc, onSnapshot, query,
  orderBy, doc, setDoc, deleteDoc, getDocs,
  serverTimestamp, limit, writeBatch
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { Eraser, Trash2, Download, BookImage, Undo2, Palette } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const MY_COLORS    = ['#f43f5e','#fb923c','#facc15','#4ade80','#60a5fa','#c084fc','#fff','#000']
const BRUSH_SIZES  = [3, 6, 10, 16]

export default function DrawTogetherPage() {
  const { user, profile, couple, partner } = useAuth()
  const navigate   = useNavigate()
  const canvasRef  = useRef(null)
  const offscreenRef = useRef(null) // redrawn from strokes
  const drawing    = useRef(false)
  const currentPath= useRef([])
  const lastFlush  = useRef(null)
  const [color,    setColor]    = useState('#f43f5e')
  const [brushSize,setBrushSize]= useState(6)
  const [erasing,  setErasing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [showColors, setShowColors] = useState(false)
  const coupleId = couple?.id

  // Resize canvas to window
  useEffect(() => {
    function resize() {
      const c = canvasRef.current
      if (!c) return
      const { width, height } = c.getBoundingClientRect()
      // preserve existing drawing
      const temp = document.createElement('canvas')
      temp.width = c.width; temp.height = c.height
      temp.getContext('2d').drawImage(c, 0, 0)
      c.width  = width * devicePixelRatio
      c.height = height * devicePixelRatio
      const ctx = c.getContext('2d')
      ctx.scale(devicePixelRatio, devicePixelRatio)
      ctx.drawImage(temp, 0, 0, width, height)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // Listen to partner strokes (only strokes NOT from me)
  useEffect(() => {
    if (!coupleId) return
    const q = query(
      collection(db, 'draw_sessions', coupleId, 'strokes'),
      orderBy('createdAt', 'asc'),
      limit(500)
    )
    let loaded = false
    const unsub = onSnapshot(q, snap => {
      // On first load, redraw all strokes
      if (!loaded) {
        loaded = true
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const rect = canvas.getBoundingClientRect()
        snap.docs.forEach(d => drawStroke(ctx, d.data(), rect.width, rect.height))
        return
      }
      // On updates, draw new partner strokes only
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const s = change.doc.data()
          if (s.uid !== user.uid) {
            const canvas = canvasRef.current
            if (!canvas) return
            const rect = canvas.getBoundingClientRect()
            drawStroke(canvas.getContext('2d'), s, rect.width, rect.height)
          }
        }
      })
    })
    return unsub
  }, [coupleId, user?.uid])

  function drawStroke(ctx, strokeData, w, h) {
    const { points, color, size, erasing } = strokeData
    if (!points || points.length < 2) return
    ctx.save()
    ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over'
    ctx.strokeStyle = color || '#f43f5e'
    ctx.lineWidth   = size || 6
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.beginPath()
    ctx.moveTo(points[0].x * w, points[0].y * h)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * w, points[i].y * h)
    }
    ctx.stroke()
    ctx.restore()
  }

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches?.[0]
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top)  / rect.height,
    }
  }

  function startDraw(e) {
    e.preventDefault()
    drawing.current = true
    currentPath.current = []
    const pos = getPos(e, canvasRef.current)
    currentPath.current.push(pos)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const rect   = canvas.getBoundingClientRect()
    const pos    = getPos(e, canvas)
    const prev   = currentPath.current[currentPath.current.length - 1]
    currentPath.current.push(pos)

    // Draw locally immediately
    ctx.save()
    ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over'
    ctx.strokeStyle = erasing ? 'rgba(0,0,0,1)' : color
    ctx.lineWidth   = brushSize
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.beginPath()
    ctx.moveTo(prev.x * rect.width, prev.y * rect.height)
    ctx.lineTo(pos.x  * rect.width, pos.y  * rect.height)
    ctx.stroke()
    ctx.restore()
  }

  async function endDraw(e) {
    if (!drawing.current) return
    drawing.current = false
    if (currentPath.current.length < 2 || !coupleId) return

    // Upload stroke to Firestore
    try {
      await addDoc(collection(db, 'draw_sessions', coupleId, 'strokes'), {
        uid:      user.uid,
        uname:    profile.name,
        points:   currentPath.current,
        color:    erasing ? '#000' : color,
        size:     brushSize,
        erasing,
        createdAt: serverTimestamp(),
      })
    } catch {}
    currentPath.current = []
  }

  async function clearCanvas() {
    if (!confirm('Clear the drawing for both of you?')) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const rect   = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    // Delete all strokes
    try {
      const snap = await getDocs(collection(db, 'draw_sessions', coupleId, 'strokes'))
      const batch = writeBatch(db)
      snap.docs.forEach(d => batch.delete(d.ref))
      await batch.commit()
      toast.success('Canvas cleared')
    } catch { toast.error('Failed to clear') }
  }

  async function saveToMemories() {
    setSaving(true)
    try {
      const canvas = canvasRef.current
      const blob   = await new Promise(res => canvas.toBlob(res, 'image/png'))
      const path   = `drawings/${coupleId}/${Date.now()}.png`
      const snap   = await uploadBytes(storageRef(storage, path), blob)
      const url    = await getDownloadURL(snap.ref)
      // Save to memories collection
      await addDoc(collection(db, 'couples', coupleId, 'memories'), {
        type:      'drawing',
        imageUrl:  url,
        caption:   `Drawing by ${profile.name} & ${partner?.name}`,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
      toast.success('Saved to memories! 💕')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-3 py-2 flex items-center gap-2"
        style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--border)' }}>

        {/* Color picker toggle */}
        <button onClick={() => setShowColors(v => !v)}
          className="w-9 h-9 rounded-full border-2 border-white/30 flex-shrink-0 shadow-lg"
          style={{ background: erasing ? '#6b7280' : color }} />

        {/* Brush sizes */}
        <div className="flex items-center gap-1.5 px-2">
          {BRUSH_SIZES.map(s => (
            <button key={s} onClick={() => { setBrushSize(s); setErasing(false) }}
              className="rounded-full flex-shrink-0 transition-all"
              style={{
                width:  s + 8 + 'px',
                height: s + 8 + 'px',
                background: brushSize === s && !erasing ? color : 'var(--border)',
                border: brushSize === s && !erasing ? `2px solid white` : '2px solid transparent',
              }} />
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={() => setErasing(v => !v)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${erasing ? 'bg-rose-500 text-white' : 'text-[var(--muted)]'}`}
          style={{ background: erasing ? '#f43f5e' : 'var(--subtle)' }}>
          <Eraser size={15} />
        </button>
        <button onClick={saveToMemories} disabled={saving}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background:'var(--subtle)', color:'var(--muted)' }}>
          {saving ? <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /> : <BookImage size={15} />}
        </button>
        <button onClick={clearCanvas}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background:'var(--subtle)', color:'var(--muted)' }}>
          <Trash2 size={15} />
        </button>
      </div>

      {/* Color palette popover */}
      {showColors && (
        <div className="flex-shrink-0 flex gap-2 px-3 py-2 flex-wrap"
          style={{ background:'var(--card)', borderBottom:'1px solid var(--border)' }}>
          {MY_COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); setErasing(false); setShowColors(false) }}
              className="w-8 h-8 rounded-full border-2 transition-all active:scale-90"
              style={{ background:c, borderColor: color===c ? 'white' : 'transparent',
                boxShadow: color===c ? '0 0 0 2px rgba(244,63,94,.6)' : 'none' }} />
          ))}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full touch-none cursor-crosshair"
        style={{ background: 'white' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />

      {/* Partner indicator */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2"
        style={{ background:'var(--glass-bg)', backdropFilter:'blur(12px)', borderTop:'1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs" style={{ color:'var(--muted)' }}>{partner?.nickname || 'Partner'} can draw too</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
            style={{ background:'linear-gradient(135deg,#f43f5e,#be123c)' }}>
            {profile?.name?.[0]?.toUpperCase()}
          </div>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
            style={{ background:'linear-gradient(135deg,#fb7185,#f43f5e)' }}>
            {partner?.name?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      </div>
    </div>
  )
}

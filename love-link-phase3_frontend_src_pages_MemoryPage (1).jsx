// src/pages/MemoryPage.jsx
import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, deleteDoc, doc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../lib/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Plus, Image, X, Trash2, BookHeart } from 'lucide-react'

export default function MemoryPage() {
  const { user, profile, couple } = useAuth()
  const [memories,  setMemories]  = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [caption,   setCaption]   = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const [expanded,  setExpanded]  = useState(null)
  const fileRef = useRef(null)
  const coupleId = couple?.id

  useEffect(() => {
    if (!coupleId) return
    const q = query(collection(db,'couples',coupleId,'memories'), orderBy('createdAt','desc'), limit(60))
    return onSnapshot(q, snap => setMemories(snap.docs.map(d => ({ id:d.id, ...d.data() }))))
  }, [coupleId])

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 8*1024*1024) return toast.error('Image must be under 8 MB')
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  function cancelForm() {
    setShowForm(false); setCaption(''); setImageFile(null); setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function save(e) {
    e.preventDefault()
    if (!caption.trim() && !imageFile) return toast.error('Add a caption or image')
    setSaving(true)
    try {
      let imageUrl = null
      if (imageFile) {
        const r = ref(storage, `couples/${coupleId}/memories/${Date.now()}_${imageFile.name}`)
        await uploadBytes(r, imageFile)
        imageUrl = await getDownloadURL(r)
      }
      await addDoc(collection(db,'couples',coupleId,'memories'), {
        caption: caption.trim(), imageUrl,
        authorUid: user.uid, authorName: profile.name,
        createdAt: serverTimestamp(),
      })
      toast.success('Memory saved! 💕')
      cancelForm()
    } catch (err) {
      toast.error('Failed to save memory')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteMemory(mem) {
    if (!confirm('Delete this memory?')) return
    setDeleting(mem.id)
    try {
      if (mem.imageUrl) {
        try {
          // Try to delete from storage (may fail if URL is from different path)
          const pathMatch = mem.imageUrl.match(/couples%2F[^?]+/)
          if (pathMatch) {
            const path = decodeURIComponent(pathMatch[0])
            await deleteObject(ref(storage, path))
          }
        } catch {}
      }
      await deleteDoc(doc(db,'couples',coupleId,'memories',mem.id))
      toast.success('Memory deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return format(d, 'MMMM d, yyyy')
  }

  return (
    <div className="min-h-full pb-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 px-6 pt-14 pb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl italic text-white mb-1">Memory Wall 📸</h1>
          <p className="text-rose-200 text-sm">Your private scrapbook together</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      <div className="px-4 -mt-4 flex flex-col gap-4">

        {/* Add form */}
        {showForm && (
          <div className="card p-5 shadow-lg shadow-rose-100 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-lg italic text-rose-800">New Memory 💕</p>
              <button onClick={cancelForm} className="text-rose-300">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={save} className="flex flex-col gap-3">
              {/* Image picker */}
              <div
                onClick={() => fileRef.current?.click()}
                className="w-full h-44 rounded-2xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-98 transition-transform overflow-hidden bg-rose-50"
              >
                {preview ? (
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Image size={30} className="text-rose-300" />
                    <p className="text-xs text-rose-400">Tap to add a photo (optional)</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write something sweet about this memory… 💭"
                rows={3}
                maxLength={400}
                className="input-rose resize-none"
              />
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save Memory 💕'}
              </button>
            </form>
          </div>
        )}

        {/* Empty state */}
        {memories.length === 0 && !showForm && (
          <div className="card p-8 text-center shadow-lg shadow-rose-100 animate-slide-up">
            <BookHeart size={40} className="text-rose-300 mx-auto mb-3" />
            <p className="font-display text-xl italic text-rose-700 mb-2">Your story starts here</p>
            <p className="text-sm text-rose-400 mb-5">Add your first memory together</p>
            <button onClick={() => setShowForm(true)} className="btn-primary max-w-xs mx-auto">
              Add First Memory 💕
            </button>
          </div>
        )}

        {/* Memory cards */}
        {memories.map((mem, i) => (
          <div
            key={mem.id}
            className="card shadow-lg shadow-rose-100 animate-slide-up overflow-hidden"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            {/* Image */}
            {mem.imageUrl && (
              <div
                className="w-full overflow-hidden cursor-pointer"
                style={{ maxHeight: expanded === mem.id ? '600px' : '260px' }}
                onClick={() => setExpanded(expanded === mem.id ? null : mem.id)}
              >
                <img
                  src={mem.imageUrl}
                  alt={mem.caption || 'Memory'}
                  className="w-full object-cover transition-all duration-500"
                  loading="lazy"
                  style={{ maxHeight: expanded === mem.id ? '600px' : '260px' }}
                />
              </div>
            )}

            <div className="p-4">
              {mem.caption && (
                <p className="text-sm text-rose-900 leading-relaxed mb-3">{mem.caption}</p>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-500">{mem.authorName}</span>
                  <span className="text-xs text-rose-300 ml-2">{formatTime(mem.createdAt)}</span>
                </div>
                {mem.authorUid === user.uid && (
                  <button
                    onClick={() => deleteMemory(mem)}
                    disabled={deleting === mem.id}
                    className="text-rose-200 active:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

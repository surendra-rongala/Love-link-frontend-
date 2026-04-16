// src/hooks/useDarkMode.js
import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('ll-dark')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else       root.classList.remove('dark')
    localStorage.setItem('ll-dark', dark)
  }, [dark])

  return [dark, setDark]
}

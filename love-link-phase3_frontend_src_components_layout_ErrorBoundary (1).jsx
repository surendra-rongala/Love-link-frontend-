import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(err, info) { console.error('Love Link crash:', err, info) }

  render() {
    if (this.state.hasError) return (
      <div className="fixed inset-0 bg-app flex flex-col items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">💔</div>
        <h2 className="font-display text-2xl text-rose-700 italic mb-2">Something went wrong</h2>
        <p className="text-rose-400 text-sm mb-6">{this.state.error?.message || 'Unexpected error'}</p>
        <button className="btn-primary max-w-xs" onClick={() => window.location.reload()}>
          Reload App 💕
        </button>
      </div>
    )
    return this.props.children
  }
}

import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Top-level error boundary.
 *
 * React error boundaries must be class components. This one stops a rendering
 * failure in any screen from blanking the whole app, and offers a recovery
 * path. It reports the error to the console (no external service, in keeping
 * with the frontend-only constraint).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Central place to surface the failure; no network calls are made.
    console.error('Unhandled UI error:', error, info?.componentStack)
  }

  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        className="mx-auto flex min-h-[60svh] w-full max-w-[1200px] flex-col items-center justify-center px-6 py-16 text-center"
      >
        <span
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border"
          style={{
            borderColor: 'rgba(239,68,68,0.5)',
            backgroundColor: 'rgba(239,68,68,0.12)',
            color: '#fca5a5',
          }}
          aria-hidden="true"
        >
          <AlertTriangle size={22} strokeWidth={1.75} />
        </span>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--color-ink-soft)]">
          This part of the archive failed to render. You can try again, or
          reload the page to start from the overview.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-lg bg-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4b5fd]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.assign('/')
            }}
            className="rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[#8b5cf6]"
          >
            Back to Overview
          </button>
        </div>
      </div>
    )
  }
}
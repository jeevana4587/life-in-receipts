import { Suspense, lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import Landing from './pages/Landing'
import EmptyState from './components/EmptyState'

/**
 * Route table. Every screen from the Information Architecture (PRD §5) is a
 * real URL, so browser-back and deep-linking both work: the Journey, Explore,
 * a specific Moment, its Story chapter, and Insights.
 *
 * The overview (Landing) ships in the initial bundle since it is the entry
 * point; the remaining screens are route-split so a first visit only loads
 * the code it needs (PRD §13.1).
 */
const Journey = lazy(() => import('./pages/Journey'))
const Explore = lazy(() => import('./pages/Explore'))
const MomentDetail = lazy(() => import('./pages/MomentDetail'))
const Story = lazy(() => import('./pages/Story'))
const Insights = lazy(() => import('./pages/Insights'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Landing />} />
        <Route
          path="journey"
          element={
            <RouteBoundary>
              <Journey />
            </RouteBoundary>
          }
        />
        <Route
          path="explore"
          element={
            <RouteBoundary>
              <Explore />
            </RouteBoundary>
          }
        />
        <Route
          path="moment/:id"
          element={
            <RouteBoundary>
              <MomentDetail />
            </RouteBoundary>
          }
        />
        <Route
          path="story/:id"
          element={
            <RouteBoundary>
              <Story />
            </RouteBoundary>
          }
        />
        <Route
          path="insights"
          element={
            <RouteBoundary>
              <Insights />
            </RouteBoundary>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

/** Suspense wrapper that shows a lightweight, accessible loading state. */
function RouteBoundary({ children }) {
  return (
    <Suspense fallback={<RouteFallback />}>{children}</Suspense>
  )
}

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40svh] flex-col items-center justify-center gap-4"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)]"
        style={{ borderTopColor: '#8b5cf6' }}
        aria-hidden="true"
      />
      <p className="text-sm text-[var(--color-ink-soft)]">Loading…</p>
    </div>
  )
}

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="That route does not exist in this archive. Head back to the overview to keep exploring."
      action={
        <Link
          to="/"
          className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[#8b5cf6] hover:bg-[rgba(139,92,246,0.1)]"
        >
          Back to Overview
        </Link>
      }
    />
  )
}
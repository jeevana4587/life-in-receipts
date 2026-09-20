import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Compass, GitBranch, Home, Search, Sparkles } from 'lucide-react'

/**
 * App shell — persistent header, main landmark, and footer.
 *
 * Renders once around every route through <Outlet />. On desktop the nav is a
 * horizontal bar; on mobile it collapses into a bottom tab bar so the flow
 * stays usable at every breakpoint (PRD §11).
 */

const NAV = [
  { to: '/', label: 'Overview', Icon: Home, end: true },
  { to: '/journey', label: 'Journey', Icon: GitBranch },
  { to: '/explore', label: 'Explore', Icon: Search },
  { to: '/insights', label: 'Insights', Icon: Sparkles },
]

export default function AppShell() {
  const location = useLocation()
  const mainRef = useRef(null)

  // Move focus to the top of main on route change for keyboard users.
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.setAttribute('tabindex', '-1')
      mainRef.current.focus({ preventScroll: true })
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <div className="flex min-h-svh flex-col bg-[var(--color-bg)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--color-surface)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-ink)]"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <NavLink
            to="/"
            className="group flex items-center gap-2.5 rounded-lg py-1"
            aria-label="Your Life, In Receipts — home"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg border"
              style={{
                borderColor: 'rgba(139, 92, 246, 0.5)',
                backgroundColor: 'rgba(139, 92, 246, 0.14)',
                color: '#c4b5fd',
              }}
              aria-hidden="true"
            >
              <Compass size={16} strokeWidth={1.75} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">
                Your Life, In Receipts
              </span>
              <span className="hidden text-[11px] text-[var(--color-ink-soft)] sm:block">
                A digital life story
              </span>
            </span>
          </NavLink>

          <nav aria-label="Primary" className="hidden sm:block">
            <ul className="flex items-center gap-1">
              {NAV.map(({ to, label, Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? 'bg-[rgba(139,92,246,0.14)] text-[var(--color-ink)]'
                          : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]'
                      }`
                    }
                  >
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main
        id="main"
        ref={mainRef}
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 pt-6 outline-none sm:px-6 sm:pb-16 sm:pt-8 lg:px-8"
      >
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-line)] pb-20 sm:pb-8">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
            A constructed composite persona assembled from a curated 2017 slice
            of public household and music datasets, plus hand-authored entries
            for categories with no source. All narrative text is derived from
            recorded signals only.
          </p>
        </div>
      </footer>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[var(--color-bg)]/95 backdrop-blur-md sm:hidden"
      >
        <ul className="mx-auto flex max-w-[1200px] items-stretch justify-around px-2 py-1.5">
          {NAV.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-soft)]'
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? { backgroundColor: 'rgba(139,92,246,0.14)' }
                    : undefined
                }
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
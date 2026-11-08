import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useBreakpoint } from '../../app/useMediaQuery'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const bp = useBreakpoint()
  const { pathname } = useLocation()
  const [tabletCollapsed, setTabletCollapsed] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // close the drawer whenever the route or breakpoint changes
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname, bp])

  // move focus to the main region after navigation (keyboard / screen-reader friendly)
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const node = drawerRef.current
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
      if (e.key === 'Tab' && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    node?.querySelector<HTMLElement>('a[href]')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const showRail = bp !== 'mobile'
  const collapsed = bp === 'tablet' && tabletCollapsed
  const sidebarWidth = collapsed ? 'w-[76px]' : 'w-64'

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-ctl bg-navy px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      {showRail && (
        <aside
          className={`fixed inset-y-0 left-0 z-40 border-r border-line transition-[width] duration-150 ${sidebarWidth}`}
          aria-label="Sidebar"
        >
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={bp === 'tablet' ? () => setTabletCollapsed((c) => !c) : undefined}
          />
        </aside>
      )}

      {bp === 'mobile' && drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line shadow-pop"
          >
            <Sidebar onClose={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className={showRail ? (collapsed ? 'pl-[76px]' : 'pl-64') : ''}>
        <Topbar showMenuButton={bp === 'mobile'} onOpenMenu={() => setDrawerOpen(true)} />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] px-4 py-6 focus:outline-none sm:px-6"
        >
          <Outlet />
        </main>
        <footer className="px-6 pb-6 text-center text-xs text-muted">
          COE Portal · Frontend demonstration only · Simulated actions do not provide real security or deliver data to
          real recipients.
        </footer>
      </div>
    </div>
  )
}

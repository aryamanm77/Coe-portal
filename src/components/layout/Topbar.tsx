import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, RotateCcw, UserCircle2 } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from '../../app/navigation'
import { useAuth } from '../../features/auth/AuthContext'
import { examStart, formatDateTime } from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import { ConfirmModal } from '../ui/Modal'
import { useToast } from '../ui/Toast'

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

export function Topbar({ onOpenMenu, showMenuButton }: { onOpenMenu: () => void; showMenuButton: boolean }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { signOut, session } = useAuth()
  const { counts, exams, resetDemo, log } = useApp()
  const nav = NAV_ITEMS.find((n) => pathname.startsWith(n.path))
  const title = nav?.title ?? 'COE Portal'

  const bell = usePopover()
  const profile = usePopover()
  const [confirmReset, setConfirmReset] = useState(false)

  const notifications = useMemo(() => {
    const items: Array<{ id: string; text: string; to: string }> = []
    if (counts.papersDue)
      items.push({
        id: 'papers',
        text: `${counts.papersDue} question paper${counts.papersDue > 1 ? 's are' : ' is'} ready to publish to the HOD (exam started)`,
        to: '/schedule-exam#paper-release',
      })
    if (counts.awaitingPublication)
      items.push({
        id: 'pub',
        text: `${counts.awaitingPublication} result set${counts.awaitingPublication > 1 ? 's' : ''} awaiting publication`,
        to: '/results',
      })
    const soon = exams.filter((e) => {
      if (e.status === 'Draft' || e.status === 'Results Imported' || e.status === 'Published') return false
      const diff = examStart(e).getTime() - Date.now()
      return diff > 0 && diff < 3 * 24 * 3600 * 1000
    })
    for (const e of soon) {
      items.push({
        id: e.id,
        text: `${e.subject} (${e.classSection}, ${e.examType}) starts ${formatDateTime(examStart(e).toISOString())}${
          e.status === 'Scheduled' ? ' — package not exported yet' : ''
        }`,
        to: e.status === 'Scheduled' ? '/file-transfer' : '/schedule-exam',
      })
    }
    return items
  }, [counts, exams])

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {showMenuButton && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="-ml-1 rounded-md p-2 text-navy hover:bg-navsel"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="hidden text-xs text-muted sm:block">
            <ol className="flex items-center gap-1">
              <li>
                <Link to="/dashboard" className="hover:text-navy hover:underline">
                  COE Portal
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3 w-3" />
              </li>
              <li aria-current="page" className="font-medium text-ink">
                {title}
              </li>
            </ol>
          </nav>
          <h1 className="truncate text-lg font-semibold leading-tight text-navy sm:text-xl">{title}</h1>
        </div>

        <span className="hidden rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 md:inline">
          Demo build
        </span>

        {/* notifications */}
        <div className="relative" ref={bell.ref}>
          <button
            type="button"
            onClick={() => {
              bell.setOpen((o) => !o)
              profile.setOpen(false)
            }}
            aria-label={`Notifications${notifications.length ? `, ${notifications.length} items` : ''}`}
            aria-haspopup="true"
            aria-expanded={bell.open}
            className="relative rounded-full p-2 text-navy hover:bg-navsel"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {notifications.length > 0 && (
              <span
                className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[10px] font-semibold text-white"
                aria-hidden="true"
              >
                {notifications.length}
              </span>
            )}
          </button>
          {bell.open && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-white shadow-pop">
              <p className="border-b border-line px-4 py-3 text-sm font-semibold text-navy">Notifications</p>
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-muted">You're all caught up.</p>
              ) : (
                <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        to={n.to}
                        onClick={() => bell.setOpen(false)}
                        className="block px-4 py-3 text-[13px] text-ink hover:bg-slate-50"
                      >
                        {n.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* profile */}
        <div className="relative" ref={profile.ref}>
          <button
            type="button"
            onClick={() => {
              profile.setOpen((o) => !o)
              bell.setOpen(false)
            }}
            aria-haspopup="menu"
            aria-expanded={profile.open}
            aria-label="Open profile menu"
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-navsel"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
              CO
            </span>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-[13px] font-medium text-ink">Demo COE</span>
              <span className="block text-[11px] text-muted">{session?.username}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
          </button>
          {profile.open && (
            <div role="menu" className="absolute right-0 mt-2 w-72 rounded-card border border-line bg-white shadow-pop">
              <div className="flex items-start gap-3 border-b border-line px-4 py-3">
                <UserCircle2 className="mt-0.5 h-8 w-8 text-navy-2" aria-hidden="true" />
                <div className="text-[13px]">
                  <p className="font-semibold text-navy">Controller of Examinations</p>
                  <p className="text-muted">Demo profile · {session?.username}</p>
                </div>
              </div>
              <p className="border-b border-line bg-amber-50 px-4 py-2 text-[11px] leading-snug text-amber-950">
                Demo sign-in only — this is not production authentication.
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  profile.setOpen(false)
                  setConfirmReset(true)
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4 text-muted" aria-hidden="true" /> Reset demo data
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  log('Session', 'Signed out (demo session)')
                  signOut()
                  navigate('/login', { replace: true })
                }}
                className="flex w-full items-center gap-2 rounded-b-card px-4 py-2.5 text-left text-sm text-ink hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 text-muted" aria-hidden="true" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmReset}
        title="Reset demo data?"
        description="This restores the original sample exams, results and activity log in this browser."
        confirmLabel="Reset data"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo()
          setConfirmReset(false)
          toast('Demo data restored to the original sample records.', 'info')
          navigate('/dashboard')
        }}
      />
    </header>
  )
}

import { GraduationCap, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../../app/navigation'
import { cx } from '../../lib/utils'
import { useApp } from '../../store/AppStore'

interface SidebarProps {
  /** Icon-only rail (tablet, collapsed). */
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Rendered inside the mobile drawer. */
  onNavigate?: () => void
  onClose?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse, onNavigate, onClose }: SidebarProps) {
  const { counts } = useApp()

  return (
    <div className="flex h-full flex-col bg-white">
      {/* identity */}
      <div className={cx('flex items-center gap-3 border-b border-line px-4 py-4', collapsed && 'justify-center px-2')}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-navy text-white">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-navy">COE Portal</p>
            <p className="truncate text-xs text-muted">[College Name]</p>
          </div>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-md p-1.5 text-muted hover:bg-navsel hover:text-navy"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const badge = item.badgeKey ? counts[item.badgeKey] : 0
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? `${item.label}${badge ? `, ${badge} pending` : ''}` : undefined}
                  className={({ isActive }) =>
                    cx(
                      'group relative flex items-center gap-3 rounded-ctl px-3 py-2.5 text-sm font-medium transition-colors',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-navsel text-navy' : 'text-slate-600 hover:bg-slate-50 hover:text-navy',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-navy" aria-hidden="true" />
                      )}
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {badge > 0 && (
                        <span
                          className={cx(
                            'inline-flex min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-semibold leading-5 text-white',
                            collapsed && 'absolute right-1.5 top-1 min-w-4 px-1 text-[10px] leading-4',
                          )}
                          aria-hidden={collapsed ? true : undefined}
                        >
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        {!collapsed && (
          <p className="mb-2 rounded-ctl bg-slate-50 px-3 py-2 text-[11px] leading-snug text-muted">
            Frontend demonstration — data lives only in this browser.
          </p>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cx(
              'flex w-full items-center gap-2 rounded-ctl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-navy',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
                Collapse
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

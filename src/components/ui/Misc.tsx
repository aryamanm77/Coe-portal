import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { Info, ShieldAlert, type LucideIcon } from 'lucide-react'
import { cx } from '../../lib/utils'

/** Horizontally scrollable table wrapper with an accessible caption. */
export function TableWrap({ caption, children, className }: { caption: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)} role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cx(
        'whitespace-nowrap border-b border-line bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted',
        className,
      )}
      {...rest}
    />
  )
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx('border-b border-line px-4 py-3 align-middle text-ink', className)} {...rest} />
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-navsel text-navy-2">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-navy">{title}</p>
      {children && <div className="mt-1 max-w-sm text-[13px] text-muted">{children}</div>}
    </div>
  )
}

/** Clearly labels browser-only simulated behaviour. */
export function SimNotice({
  title,
  children,
  tone = 'info',
  className,
}: {
  title: string
  children?: ReactNode
  tone?: 'info' | 'warn'
  className?: string
}) {
  const Icon = tone === 'warn' ? ShieldAlert : Info
  return (
    <div
      className={cx(
        'flex gap-3 rounded-ctl border px-4 py-3 text-[13px]',
        tone === 'warn' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-[#C6D6EA] bg-navsel text-navy',
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}

export function DefList({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{k}</dt>
          <dd className="mt-0.5 text-sm text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

/** Simple "Showing a–b of n" pager used by long student lists. */
export function Pager({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-muted">
      <p aria-live="polite">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 0} onClick={() => onChange(page - 1)} icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}>
          Previous
        </Button>
        <span className="tabular-nums">
          Page {Math.min(page + 1, pages)} of {pages}
        </span>
        <Button size="sm" variant="secondary" disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}

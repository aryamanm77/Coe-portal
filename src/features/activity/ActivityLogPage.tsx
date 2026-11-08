import { useMemo, useState } from 'react'
import { Download, History, Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { SelectInput } from '../../components/ui/Field'
import { EmptyState, TableWrap, Td, Th } from '../../components/ui/Misc'
import { useToast } from '../../components/ui/Toast'
import { downloadFile, formatDateTime, toCsv } from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import type { ActivityCategory } from '../../types'
import { CategoryIcon } from './CategoryIcon'

const CATEGORIES: ActivityCategory[] = ['Schedule', 'Transfer', 'Question Paper', 'Publishing', 'Session', 'System']
const PAGE = 25

export function ActivityLogPage() {
  const { activity } = useApp()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return activity.filter((a) => {
      if (category && a.category !== category) return false
      return !needle || `${a.message} ${a.actor} ${a.category}`.toLowerCase().includes(needle)
    })
  }, [activity, q, category])

  const exportCsv = () => {
    downloadFile(
      'coe-activity-log.csv',
      toCsv([['Time', 'Category', 'Event', 'Actor'], ...rows.map((a) => [a.at, a.category, a.message, a.actor])]),
      'text/csv',
    )
    toast(`Exported ${rows.length} log entries as CSV.`, 'info')
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        A browser-local record of actions taken in this demo — scheduling, question paper releases, exports, imports and publishing.
        It is stored in localStorage on this device and is not a tamper-proof audit trail.
      </p>

      <Card>
        <CardHeader
          title="Activity"
          actions={
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" aria-hidden="true" />} onClick={exportCsv} disabled={rows.length === 0}>
              Export CSV
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-3 border-b border-line px-5 py-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <label htmlFor="log-search" className="sr-only">
              Search activity
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="log-search"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setLimit(PAGE)
              }}
              placeholder="Search events…"
              className="block h-10 w-full rounded-ctl border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400"
            />
          </div>
          <div>
            <label htmlFor="log-category" className="sr-only">
              Filter by category
            </label>
            <SelectInput
              id="log-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setLimit(PAGE)
              }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>

        <p className="px-5 py-2.5 text-xs text-muted" aria-live="polite">
          Showing {Math.min(limit, rows.length)} of {rows.length} entries
        </p>

        {rows.length === 0 ? (
          <EmptyState icon={History} title="No matching activity">
            Try a different search or category.
          </EmptyState>
        ) : (
          <>
            <TableWrap caption="Activity log">
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Category</Th>
                  <Th>Event</Th>
                  <Th>Actor</Th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <Td className="whitespace-nowrap text-[13px] text-muted">{formatDateTime(a.at)}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C6D6EA] bg-navsel px-2.5 py-0.5 text-xs font-medium text-navy-2">
                        <CategoryIcon category={a.category} className="h-3.5 w-3.5" />
                        {a.category}
                      </span>
                    </Td>
                    <Td className="min-w-[320px]">{a.message}</Td>
                    <Td className="whitespace-nowrap text-[13px] text-muted">{a.actor}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            {rows.length > limit && (
              <div className="border-t border-line p-4 text-center">
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

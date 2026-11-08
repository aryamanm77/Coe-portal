import { useMemo, useState } from 'react'
import { FileDown, ListChecks, Users } from 'lucide-react'
import { LinkButton } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SelectInput } from '../../components/ui/Field'
import { EmptyState } from '../../components/ui/Misc'
import { Tabs } from '../../components/ui/Tabs'
import { DEPARTMENTS } from '../../data/catalog'
import { yearLabel } from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import { applyFilters, buildRows, NO_FILTERS, type Filters } from './groups'
import { PublishTab } from './PublishTab'
import { RecordsTab } from './RecordsTab'
import { SheetModal } from './SheetModal'

export function ResultsPage() {
  const { resultSets, exams } = useApp()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [tab, setTab] = useState('publish')
  const [openSheet, setOpenSheet] = useState<string | null>(null)

  const allRows = useMemo(() => buildRows(resultSets, exams), [resultSets, exams])
  const rows = useMemo(() => applyFilters(allRows, filters), [allRows, filters])

  const years = useMemo(() => [...new Set(allRows.map((r) => r.year))].sort((a, b) => a - b), [allRows])
  const sections = useMemo(() => [...new Set(allRows.map((r) => r.section))].sort(), [allRows])
  const depts = DEPARTMENTS.filter((d) => allRows.some((r) => r.dept === d))
  const filtered = Object.values(filters).some(Boolean)
  const sheet = allRows.find((r) => r.rs.id === openSheet) ?? null

  if (allRows.length === 0) {
    return (
      <Card>
        <EmptyState icon={FileDown} title="No results to review yet">
          Import a verified result file on the File Transfer page and it will appear here, grouped by year, department
          and section.
          <div className="mt-4">
            <LinkButton to="/file-transfer" variant="primary">
              Go to File Transfer
            </LinkButton>
          </div>
        </EmptyState>
      </Card>
    )
  }

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        Student results are kept year-wise, department-wise and section-wise, however many students a section has. Review
        them, then publish whole sheets — or a whole department or year at once — to the HOD of each department and to the
        Principal.
      </p>

      <Card>
        <fieldset className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <legend className="sr-only">Filter by year, department, section and publication status</legend>
          <FilterSelect label="Year" value={filters.year} onChange={(v) => set({ year: v })} all="All years">
            {years.map((y) => (
              <option key={y} value={y}>
                {yearLabel(y)} (sem {y * 2 - 1}–{y * 2})
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Department" value={filters.dept} onChange={(v) => set({ dept: v })} all="All departments">
            {depts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Section" value={filters.section} onChange={(v) => set({ section: v })} all="All sections">
            {sections.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Publication"
            value={filters.status}
            onChange={(v) => set({ status: v as Filters['status'] })}
            all="All"
          >
            <option value="Awaiting">Awaiting publication</option>
            <option value="Published">Published</option>
          </FilterSelect>
          <div className="flex items-end">
            <button
              type="button"
              disabled={!filtered}
              onClick={() => setFilters(NO_FILTERS)}
              className="h-10 rounded-ctl px-3 text-[13px] font-medium text-navy-2 underline underline-offset-2 hover:text-navy disabled:no-underline disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>
        </fieldset>
      </Card>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'publish', label: 'Result sheets & publishing', icon: <ListChecks className="h-4 w-4" aria-hidden="true" /> },
          { id: 'records', label: 'Student records', icon: <Users className="h-4 w-4" aria-hidden="true" /> },
        ]}
      >
        {tab === 'publish' ? (
          <PublishTab rows={rows} filtered={filtered} onView={setOpenSheet} />
        ) : (
          <RecordsTab rows={rows} onView={setOpenSheet} />
        )}
      </Tabs>

      <SheetModal row={sheet} onClose={() => setOpenSheet(null)} />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  all,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  all: string
  children: React.ReactNode
}) {
  const id = `rf-${label.toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      <SelectInput id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {children}
      </SelectInput>
    </div>
  )
}

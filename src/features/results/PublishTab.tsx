import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, Megaphone, Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/Modal'
import { EmptyState, SimNotice, TableWrap, Td, Th } from '../../components/ui/Misc'
import { Pill, StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import { HOD_NAMES } from '../../data/catalog'
import { cx, yearLabel } from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import { groupRows, type SheetRow } from './groups'

export function PublishTab({
  rows,
  filtered,
  onView,
}: {
  rows: SheetRow[]
  filtered: boolean
  onView: (id: string) => void
}) {
  const { publishResultSets } = useApp()
  const toast = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)

  const groups = useMemo(() => groupRows(rows), [rows])
  const awaiting = rows.filter((r) => !r.published)
  const picked = rows.filter((r) => selected.has(r.rs.id) && !r.published)
  const pickedStudents = picked.reduce((a, r) => a + r.total, 0)

  const totals = {
    students: rows.reduce((a, r) => a + r.total, 0),
    present: rows.reduce((a, r) => a + r.present, 0),
    absent: rows.reduce((a, r) => a + r.absent, 0),
  }

  const toggle = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      for (const id of ids) on ? n.add(id) : n.delete(id)
      return n
    })

  const pickedByDept = useMemo(() => {
    const m = new Map<string, SheetRow[]>()
    for (const r of picked) m.set(r.dept, [...(m.get(r.dept) ?? []), r])
    return [...m.entries()]
  }, [picked])

  const confirmPublish = () => {
    const n = publishResultSets(picked.map((r) => r.rs.id))
    setConfirmOpen(false)
    setSelected(new Set())
    toast(`${n} result sheet${n === 1 ? '' : 's'} published to the HOD${pickedByDept.length > 1 ? 's' : ''} and Principal (simulated — nothing was sent).`)
  }

  return (
    <div className="space-y-5">
      <section aria-label="Summary for the current filters" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Result sheets" value={rows.length} />
        <Stat label="Students" value={totals.students} />
        <Stat label="Present" value={totals.present} />
        <Stat label="Absent" value={totals.absent} />
        <Stat label="Awaiting publication" value={awaiting.length} />
      </section>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Search} title="No result sheets match these filters">
            Clear a filter to see more years, departments or sections.
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-navy">Result sheets by year, department and section</h2>
              <p className="mt-0.5 text-[13px] text-muted">
                Tick the sheets to publish. Use a department or year checkbox to select everything still awaiting
                publication in it.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={awaiting.length === 0}
                onClick={() => toggle(awaiting.map((r) => r.rs.id), true)}
              >
                Select all awaiting ({awaiting.length})
              </Button>
              <Button size="sm" variant="ghost" disabled={selected.size === 0} onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
            </div>
          </div>

          <div className="divide-y divide-line">
            {groups.map((g) => {
              const isCollapsed = collapsed.has(g.year)
              const yearAwaiting = g.depts.flatMap((d) => d.rows).filter((r) => !r.published)
              const yearAllOn = yearAwaiting.length > 0 && yearAwaiting.every((r) => selected.has(r.rs.id))
              return (
                <section key={g.year} aria-label={yearLabel(g.year)}>
                  <div className="flex flex-wrap items-center gap-3 bg-navsel/60 px-5 py-3">
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() =>
                        setCollapsed((c) => {
                          const n = new Set(c)
                          n.has(g.year) ? n.delete(g.year) : n.add(g.year)
                          return n
                        })
                      }
                      className="flex items-center gap-2 rounded-md text-left text-sm font-semibold text-navy"
                    >
                      {isCollapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                      {yearLabel(g.year)}
                    </button>
                    <span className="text-[13px] text-muted">
                      Semesters {g.year * 2 - 1}–{g.year * 2} · {g.sheets} sheet{g.sheets === 1 ? '' : 's'} · {g.students} students
                    </span>
                    {yearAwaiting.length > 0 && (
                      <label className="ml-auto flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#102A43]"
                          checked={yearAllOn}
                          onChange={(e) => toggle(yearAwaiting.map((r) => r.rs.id), e.target.checked)}
                        />
                        Select all awaiting in {yearLabel(g.year)}
                      </label>
                    )}
                  </div>

                  {!isCollapsed &&
                    g.depts.map((d) => {
                      const dAwaiting = d.rows.filter((r) => !r.published)
                      const dAllOn = dAwaiting.length > 0 && dAwaiting.every((r) => selected.has(r.rs.id))
                      return (
                        <div key={d.dept} className="border-t border-line">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                            <h3 className="text-sm font-semibold text-ink">{d.dept}</h3>
                            <span className="text-[13px] text-muted">
                              {d.students} students · publishes to {HOD_NAMES[d.dept] ?? `HOD — ${d.dept}`}
                            </span>
                            {dAwaiting.length > 0 && (
                              <label className="ml-auto flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-[#102A43]"
                                  checked={dAllOn}
                                  onChange={(e) => toggle(dAwaiting.map((r) => r.rs.id), e.target.checked)}
                                />
                                Select all awaiting in {d.deptShort}
                              </label>
                            )}
                          </div>
                          <TableWrap caption={`${yearLabel(g.year)} · ${d.dept} result sheets`} className="border-t border-line">
                            <thead>
                              <tr>
                                <Th className="w-10">
                                  <span className="sr-only">Select</span>
                                </Th>
                                <Th>Section</Th>
                                <Th>Subject</Th>
                                <Th>Type</Th>
                                <Th className="text-right">Students</Th>
                                <Th className="text-right">Present</Th>
                                <Th className="text-right">Absent</Th>
                                <Th className="text-right">Average</Th>
                                <Th>Status</Th>
                                <Th className="text-right">
                                  <span className="sr-only">Actions</span>
                                </Th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.rows.map((r) => (
                                <tr key={r.rs.id} className={cx('hover:bg-slate-50', selected.has(r.rs.id) && !r.published && 'bg-navsel/40')}>
                                  <Td>
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 accent-[#102A43] disabled:opacity-40"
                                      aria-label={`Select ${r.exam.subject}, section ${r.section}, ${r.deptShort}, ${yearLabel(r.year)}`}
                                      disabled={r.published}
                                      checked={!r.published && selected.has(r.rs.id)}
                                      onChange={(e) => toggle([r.rs.id], e.target.checked)}
                                    />
                                  </Td>
                                  <Td className="font-semibold">
                                    {r.exam.classSection}
                                  </Td>
                                  <Td>
                                    <p className="font-medium">{r.exam.subject}</p>
                                    <p className="text-xs text-muted">{r.exam.subjectCode}</p>
                                  </Td>
                                  <Td>
                                    <Pill tone="navy">{r.exam.examType}</Pill>
                                  </Td>
                                  <Td className="text-right tabular-nums">{r.total}</Td>
                                  <Td className="text-right tabular-nums">{r.present}</Td>
                                  <Td className="text-right tabular-nums">{r.absent}</Td>
                                  <Td className="text-right tabular-nums">
                                    {r.average.toFixed(1)}/{r.max}
                                  </Td>
                                  <Td>
                                    <StatusBadge status={r.published ? 'Published' : 'Not published'} />
                                  </Td>
                                  <Td className="text-right">
                                    <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" aria-hidden="true" />} onClick={() => onView(r.rs.id)}>
                                      Students
                                      <span className="sr-only"> in {r.exam.subject} section {r.exam.classSection}</span>
                                    </Button>
                                  </Td>
                                </tr>
                              ))}
                            </tbody>
                          </TableWrap>
                        </div>
                      )
                    })}
                </section>
              )
            })}
          </div>

          {/* publish bar */}
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-card border-t border-line bg-white px-5 py-4 shadow-[0_-4px_12px_rgba(16,42,67,0.06)]">
            <p className="text-sm text-ink" aria-live="polite">
              {picked.length === 0 ? (
                filtered ? 'No sheets selected in the current filters.' : 'No sheets selected.'
              ) : (
                <>
                  <span className="font-semibold text-navy">{picked.length}</span> sheet{picked.length === 1 ? '' : 's'} ·{' '}
                  <span className="font-semibold text-navy">{pickedStudents}</span> students · {pickedByDept.length} department
                  {pickedByDept.length === 1 ? '' : 's'}
                </>
              )}
            </p>
            <Button icon={<Megaphone className="h-4 w-4" aria-hidden="true" />} disabled={picked.length === 0} onClick={() => setConfirmOpen(true)}>
              Publish selected to HOD &amp; Principal
            </Button>
          </div>
        </Card>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Publish selected results?"
        description={`${picked.length} result sheet${picked.length === 1 ? '' : 's'} · ${pickedStudents} students`}
        confirmLabel="Confirm publication"
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmPublish}
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Each department's HOD receives only its own sheets</p>
            <ul className="mt-2 divide-y divide-line rounded-ctl border border-line text-sm">
              {pickedByDept.map(([dept, list]) => (
                <li key={dept} className="px-3 py-2.5">
                  <p className="font-medium text-ink">{HOD_NAMES[dept] ?? `HOD — ${dept}`}</p>
                  <p className="text-[13px] text-muted">
                    {list.length} sheet{list.length === 1 ? '' : 's'} · {list.reduce((a, r) => a + r.total, 0)} students ·{' '}
                    {list.map((r) => `${yearLabel(r.year)} ${r.exam.classSection}`).join(', ')}
                  </p>
                </li>
              ))}
              <li className="bg-slate-50 px-3 py-2.5">
                <p className="font-medium text-ink">Principal</p>
                <p className="text-[13px] text-muted">Consolidated view of all {picked.length} sheets across {pickedByDept.length} department{pickedByDept.length === 1 ? '' : 's'}.</p>
              </li>
            </ul>
          </div>
          <SimNotice title="Publishing simulation" tone="warn">
            This only records a publication in this browser. No email, notification or file is sent to any HOD, the
            Principal or anyone else.
          </SimNotice>
        </div>
      </ConfirmModal>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <p className="text-2xl font-semibold tabular-nums text-navy">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}

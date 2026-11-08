import { useEffect, useMemo, useState } from 'react'
import { Download, Search, UserX } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SelectInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, TableWrap, Td, Th } from '../../components/ui/Misc'
import { Pager } from '../../components/ui/Pager'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import { DEMO_PASS_PERCENT, downloadFile, formatDate, formatDateTime, toCsv, yearLabel } from '../../lib/utils'
import type { SheetRow } from './groups'

const PAGE = 15

export function SheetModal({ row, onClose }: { row: SheetRow | null; onClose: () => void }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [attendance, setAttendance] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    setQ('')
    setAttendance('')
    setPage(0)
  }, [row?.rs.id])
  useEffect(() => setPage(0), [q, attendance])

  const students = useMemo(() => {
    if (!row) return []
    const needle = q.trim().toLowerCase()
    return row.rs.students.filter((s) => {
      if (attendance && s.status !== attendance) return false
      return !needle || `${s.usn} ${s.name}`.toLowerCase().includes(needle)
    })
  }, [row, q, attendance])

  if (!row) return <Modal open={false} title="" onClose={onClose} />
  const { exam, rs, max } = row
  const absentees = rs.students.filter((s) => s.status === 'Absent')
  const latest = rs.publications[rs.publications.length - 1]
  const verdict = (marks: number | null) => (marks !== null && (marks / max) * 100 >= DEMO_PASS_PERCENT ? 'Pass' : 'Fail')

  const exportCsv = () => {
    downloadFile(
      `result-sheet_${exam.subjectCode}_${exam.classSection}_${exam.examType}.csv`,
      toCsv([
        ['USN', 'Name', 'Attendance', `Marks (/${max})`, 'Result'],
        ...rs.students.map((s) => [s.usn, s.name, s.status, s.marks, s.status === 'Absent' ? 'Absent' : verdict(s.marks)]),
      ]),
      'text/csv',
    )
    toast('Result sheet downloaded as CSV.', 'info')
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${exam.subject} · ${exam.classSection} · ${exam.examType}`}
      description={`${yearLabel(row.year)} · ${exam.department} · Section ${row.section} · ${formatDate(exam.date)}`}
      footer={
        <>
          <Button variant="secondary" icon={<Download className="h-4 w-4" aria-hidden="true" />} onClick={exportCsv}>
            Download CSV
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge status={row.published ? 'Published' : 'Not published'} />
          <p className="text-muted">
            {row.published && latest
              ? `Published ${formatDateTime(latest.at)} to ${latest.recipients.join(' and ')} (simulated).`
              : `Imported ${formatDateTime(rs.importedAt)}. Not published yet — select it on the previous screen to publish.`}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['Students', row.total],
            ['Present', row.present],
            ['Absent', row.absent],
            [`Average (/${max})`, row.average.toFixed(1)],
            [`Pass ≥ ${DEMO_PASS_PERCENT}%`, `${row.passed}/${row.present}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-ctl border border-line px-3 py-2">
              <dd className="text-lg font-semibold tabular-nums text-navy">{v}</dd>
              <dt className="text-xs text-muted">{k}</dt>
            </div>
          ))}
        </dl>

        <div className="overflow-hidden rounded-ctl border border-line">
          <div className="grid grid-cols-1 gap-3 border-b border-line p-3 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="relative">
              <label htmlFor="sheet-search" className="sr-only">
                Search students
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="sheet-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by USN or name…"
                className="block h-10 w-full rounded-ctl border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400"
              />
            </div>
            <div>
              <label htmlFor="sheet-att" className="sr-only">
                Filter by attendance
              </label>
              <SelectInput id="sheet-att" value={attendance} onChange={(e) => setAttendance(e.target.value)}>
                <option value="">All attendance</option>
                <option value="Present">Present only</option>
                <option value="Absent">Absent only</option>
              </SelectInput>
            </div>
          </div>
          {students.length === 0 ? (
            <EmptyState icon={Search} title="No students match">
              Adjust the search or attendance filter.
            </EmptyState>
          ) : (
            <>
              <TableWrap caption="Result sheet">
                <thead>
                  <tr>
                    <Th>USN</Th>
                    <Th>Name</Th>
                    <Th>Attendance</Th>
                    <Th className="text-right">Marks (/{max})</Th>
                    <Th>Result</Th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(page * PAGE, page * PAGE + PAGE).map((s) => (
                    <tr key={s.usn} className="hover:bg-slate-50">
                      <Td className="font-mono text-[13px]">{s.usn}</Td>
                      <Td>{s.name}</Td>
                      <Td>
                        <StatusBadge status={s.status} />
                      </Td>
                      <Td className="text-right tabular-nums">{s.marks ?? '—'}</Td>
                      <Td>{s.status === 'Absent' ? '—' : verdict(s.marks)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <Pager page={page} pageSize={PAGE} total={students.length} onChange={setPage} />
            </>
          )}
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <UserX className="h-4 w-4 text-red-700" aria-hidden="true" /> Absentees ({absentees.length})
          </h3>
          {absentees.length === 0 ? (
            <p className="mt-1 text-sm text-muted">Everyone was present.</p>
          ) : (
            <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {absentees.map((s) => (
                <li key={s.usn} className="flex items-center justify-between gap-2 border-b border-line py-1">
                  <span>{s.name}</span>
                  <span className="font-mono text-xs text-muted">{s.usn}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

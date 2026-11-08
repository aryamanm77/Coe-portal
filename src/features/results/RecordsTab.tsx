import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { SelectInput } from '../../components/ui/Field'
import { EmptyState, TableWrap, Td, Th } from '../../components/ui/Misc'
import { Pager } from '../../components/ui/Pager'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import { DEMO_PASS_PERCENT, downloadFile, toCsv, yearLabel } from '../../lib/utils'
import { flattenStudents, type SheetRow } from './groups'

const PAGE = 25

export function RecordsTab({ rows, onView }: { rows: SheetRow[]; onView: (id: string) => void }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [attendance, setAttendance] = useState('')
  const [page, setPage] = useState(0)

  const all = useMemo(() => flattenStudents(rows), [rows])
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter((s) => {
      if (attendance && s.status !== attendance) return false
      return !needle || `${s.usn} ${s.name} ${s.subject}`.toLowerCase().includes(needle)
    })
  }, [all, q, attendance])

  useEffect(() => setPage(0), [q, attendance, rows])
  const pageRows = list.slice(page * PAGE, page * PAGE + PAGE)

  // roster: distinct students per year / department / section
  const roster = useMemo(() => {
    const m = new Map<string, { year: number; dept: string; deptShort: string; section: string; usns: Set<string>; absent: number; present: number }>()
    for (const s of all) {
      const key = `${s.year}|${s.dept}|${s.section}`
      const g = m.get(key) ?? { year: s.year, dept: s.dept, deptShort: s.deptShort, section: s.section, usns: new Set<string>(), absent: 0, present: 0 }
      g.usns.add(s.usn)
      if (s.status === 'Absent') g.absent++
      else g.present++
      m.set(key, g)
    }
    return [...m.values()].sort((a, b) => a.year - b.year || a.dept.localeCompare(b.dept) || a.section.localeCompare(b.section))
  }, [all])

  const exportCsv = () => {
    downloadFile(
      'student-records.csv',
      toCsv([
        ['USN', 'Name', 'Year', 'Department', 'Section', 'Subject', 'Exam', 'Attendance', 'Marks', 'Out of', 'Result', 'Published'],
        ...list.map((s) => [
          s.usn,
          s.name,
          s.year,
          s.dept,
          s.section,
          s.subject,
          s.examType,
          s.status,
          s.marks,
          s.max,
          s.status === 'Absent' ? 'Absent' : ((s.marks ?? 0) / s.max) * 100 >= DEMO_PASS_PERCENT ? 'Pass' : 'Fail',
          s.published ? 'Yes' : 'No',
        ]),
      ]),
      'text/csv',
    )
    toast(`Downloaded ${list.length} student records (current filters) as CSV.`, 'info')
  }

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon={Search} title="No student records match these filters">
          Clear a filter to see more years, departments or sections.
        </EmptyState>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Roster by year, department and section"
          description={`${roster.reduce((a, g) => a + g.usns.size, 0)} students on record in the current filters (counted once by USN).`}
        />
        <TableWrap caption="Students on record by year, department and section">
          <thead>
            <tr>
              <Th>Year</Th>
              <Th>Department</Th>
              <Th>Section</Th>
              <Th className="text-right">Students</Th>
              <Th className="text-right">Present records</Th>
              <Th className="text-right">Absent records</Th>
            </tr>
          </thead>
          <tbody>
            {roster.map((g) => (
              <tr key={`${g.year}${g.dept}${g.section}`} className="hover:bg-slate-50">
                <Td>{yearLabel(g.year)}</Td>
                <Td>
                  {g.deptShort} <span className="text-xs text-muted">· {g.dept}</span>
                </Td>
                <Td className="font-semibold">{g.section}</Td>
                <Td className="text-right tabular-nums">{g.usns.size}</Td>
                <Td className="text-right tabular-nums">{g.present}</Td>
                <Td className="text-right tabular-nums">{g.absent}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader
          title="Student records"
          description="One row per student per exam. Open a section's sheet for its full result list."
          actions={
            <Button size="sm" variant="secondary" icon={<Download className="h-4 w-4" aria-hidden="true" />} onClick={exportCsv} disabled={list.length === 0}>
              Download CSV ({list.length})
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-3 border-b border-line px-5 py-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="relative">
            <label htmlFor="rec-search" className="sr-only">
              Search students
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id="rec-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by USN, name or subject…"
              className="block h-10 w-full rounded-ctl border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400"
            />
          </div>
          <div>
            <label htmlFor="rec-att" className="sr-only">
              Filter by attendance
            </label>
            <SelectInput id="rec-att" value={attendance} onChange={(e) => setAttendance(e.target.value)}>
              <option value="">All attendance</option>
              <option value="Present">Present only</option>
              <option value="Absent">Absent only</option>
            </SelectInput>
          </div>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={Search} title="No students match">
            Adjust the search or attendance filter.
          </EmptyState>
        ) : (
          <>
            <TableWrap caption="Student records">
              <thead>
                <tr>
                  <Th>USN</Th>
                  <Th>Name</Th>
                  <Th>Year</Th>
                  <Th>Dept</Th>
                  <Th>Section</Th>
                  <Th>Subject</Th>
                  <Th>Attendance</Th>
                  <Th className="text-right">Marks</Th>
                  <Th>Published</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr key={`${s.sheetId}-${s.usn}`} className="hover:bg-slate-50">
                    <Td className="font-mono text-[13px]">{s.usn}</Td>
                    <Td>{s.name}</Td>
                    <Td>{s.year}</Td>
                    <Td>{s.deptShort}</Td>
                    <Td>{s.section}</Td>
                    <Td>
                      <button type="button" className="text-left text-navy-2 underline-offset-2 hover:underline" onClick={() => onView(s.sheetId)}>
                        {s.subject} <span className="text-xs text-muted">({s.examType})</span>
                      </button>
                    </Td>
                    <Td>
                      <StatusBadge status={s.status} />
                    </Td>
                    <Td className="text-right tabular-nums">{s.marks === null ? '—' : `${s.marks}/${s.max}`}</Td>
                    <Td>{s.published ? 'Yes' : 'No'}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pager page={page} pageSize={PAGE} total={list.length} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}

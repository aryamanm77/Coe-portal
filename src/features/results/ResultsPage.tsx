import { useMemo, useState } from 'react'
import { Download, FileDown, Megaphone, RefreshCw, Search, UserX } from 'lucide-react'
import { LinkButton, Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Field, SelectInput } from '../../components/ui/Field'
import { ConfirmModal } from '../../components/ui/Modal'
import { EmptyState, SimNotice, TableWrap, Td, Th } from '../../components/ui/Misc'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import {
  awaitingPublication,
  DEMO_PASS_PERCENT,
  downloadFile,
  formatDate,
  formatDateTime,
  isPublished,
  resultSummary,
  toCsv,
  totalQuestions,
} from '../../lib/utils'
import { useApp } from '../../store/AppStore'

type AttendanceFilter = 'All' | 'Present' | 'Absent'

export function ResultsPage() {
  const { resultSets, exams, keyRequests, publishResults } = useApp()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState('')
  const [q, setQ] = useState('')
  const [attendance, setAttendance] = useState<AttendanceFilter>('All')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const ordered = useMemo(
    () =>
      [...resultSets].sort((a, b) => {
        const wa = awaitingPublication(a) ? 0 : 1
        const wb = awaitingPublication(b) ? 0 : 1
        return wa - wb || b.importedAt.localeCompare(a.importedAt)
      }),
    [resultSets],
  )

  const rs = ordered.find((r) => r.id === selectedId) ?? ordered[0]
  const exam = rs ? exams.find((e) => e.id === rs.examId) : undefined

  if (!rs || !exam) {
    return (
      <Card>
        <EmptyState icon={FileDown} title="No results to review yet">
          Import a verified result file on the File Transfer page and it will appear here.
          <div className="mt-4">
            <LinkButton to="/file-transfer" variant="primary">
              Go to File Transfer
            </LinkButton>
          </div>
        </EmptyState>
      </Card>
    )
  }

  const max = totalQuestions(exam)
  const sum = resultSummary(rs, max)
  const published = isPublished(rs)
  const latest = rs.publications[rs.publications.length - 1]
  const republish = published && rs.needsRepublish
  const recipients = [`HOD — ${exam.department}`, 'Principal']
  const approvedFixes = keyRequests.filter((k) => k.examId === exam.id && k.status === 'Approved')
  const absentees = rs.students.filter((s) => s.status === 'Absent')

  const students = rs.students.filter((s) => {
    if (attendance !== 'All' && s.status !== attendance) return false
    const needle = q.trim().toLowerCase()
    return !needle || `${s.usn} ${s.name}`.toLowerCase().includes(needle)
  })

  const statusLabel = republish ? 'Correction pending re-publish' : published ? 'Published' : 'Not published'

  const exportCsv = () => {
    const rows: Array<Array<string | number | null>> = [
      ['USN', 'Name', 'Attendance', `Marks (/${max})`, 'Result'],
      ...rs.students.map((s) => [
        s.usn,
        s.name,
        s.status,
        s.marks,
        s.status === 'Absent' ? 'Absent' : (s.marks ?? 0) / max * 100 >= DEMO_PASS_PERCENT ? 'Pass' : 'Fail',
      ]),
    ]
    downloadFile(`result-sheet_${exam.subjectCode}_${exam.classSection}_${exam.examType}.csv`, toCsv(rows), 'text/csv')
    toast('Result sheet downloaded as CSV.', 'info')
  }

  const confirmPublish = () => {
    publishResults(rs.id, recipients)
    setConfirmOpen(false)
    toast(
      republish
        ? 'Corrected results re-published (simulated — nothing was sent).'
        : 'Results published (simulated — nothing was sent).',
    )
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        Review imported results and absentees, then publish to the HOD and Principal. If an approved key correction
        changes marks after publication, re-publish the corrected sheet.
      </p>

      <Card>
        <CardBody className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="max-w-xl">
            <Field label="Result set">
              <SelectInput
                value={rs.id}
                onChange={(e) => {
                  setSelectedId(e.target.value)
                  setQ('')
                  setAttendance('All')
                }}
              >
                {ordered.map((r) => {
                  const e = exams.find((x) => x.id === r.examId)
                  return (
                    <option key={r.id} value={r.id}>
                      {e ? `${e.subject} · ${e.classSection} · ${e.examType}` : r.examId} —{' '}
                      {r.needsRepublish ? 'correction pending' : isPublished(r) ? 'published' : 'awaiting publication'}
                    </option>
                  )
                })}
              </SelectInput>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon={<Download className="h-4 w-4" aria-hidden="true" />} onClick={exportCsv}>
              Download result sheet (CSV)
            </Button>
            <Button
              icon={republish ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <Megaphone className="h-4 w-4" aria-hidden="true" />}
              disabled={published && !republish}
              onClick={() => setConfirmOpen(true)}
            >
              {republish ? 'Re-publish corrected results' : published ? 'Published' : 'Publish to HOD & Principal'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* status banner */}
      <div
        className={`flex flex-wrap items-center gap-3 rounded-card border px-4 py-3 text-sm ${
          republish
            ? 'border-amber-300 bg-amber-50 text-amber-950'
            : published
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-slate-300 bg-white text-ink'
        }`}
      >
        <StatusBadge status={statusLabel} />
        {republish ? (
          <p>
            An approved key correction changed marks after version {latest.version} was published on{' '}
            {formatDateTime(latest.at)}. Re-publish so the HOD and Principal receive the corrected sheet.
          </p>
        ) : published ? (
          <p>
            Version {latest.version} published on {formatDateTime(latest.at)} to {latest.recipients.join(' and ')}.
          </p>
        ) : (
          <p>Imported {formatDateTime(rs.importedAt)}. Not published yet.</p>
        )}
      </div>

      <section aria-label="Result summary" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Students" value={sum.total} />
        <Stat label="Present" value={sum.present} />
        <Stat label="Absent" value={sum.absent} />
        <Stat label={`Average (/${max})`} value={sum.average.toFixed(1)} />
        <Stat label={`Pass ≥ ${DEMO_PASS_PERCENT}%`} value={`${sum.passed}/${sum.present}`} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader
            title="Result sheet"
            description={`${exam.subject} · ${exam.classSection} · ${exam.examType} · ${formatDate(exam.date)}`}
          />
          <div className="grid grid-cols-1 gap-3 border-b border-line px-5 py-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="relative">
              <label htmlFor="student-search" className="sr-only">
                Search students
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="student-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by USN or name…"
                className="block h-10 w-full rounded-ctl border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400"
              />
            </div>
            <div>
              <label htmlFor="attendance-filter" className="sr-only">
                Filter by attendance
              </label>
              <SelectInput id="attendance-filter" value={attendance} onChange={(e) => setAttendance(e.target.value as AttendanceFilter)}>
                <option value="All">All attendance</option>
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
            <TableWrap caption="Result sheet">
              <thead>
                <tr>
                  <Th>USN</Th>
                  <Th>Name</Th>
                  <Th>Attendance</Th>
                  <Th>Marks (/{max})</Th>
                  <Th>Result</Th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const pass = s.status === 'Present' && ((s.marks ?? 0) / max) * 100 >= DEMO_PASS_PERCENT
                  return (
                    <tr key={s.usn} className="hover:bg-slate-50">
                      <Td className="font-mono text-[13px]">{s.usn}</Td>
                      <Td>{s.name}</Td>
                      <Td>
                        <StatusBadge status={s.status} />
                      </Td>
                      <Td className="tabular-nums">{s.marks ?? '—'}</Td>
                      <Td>{s.status === 'Absent' ? '—' : pass ? 'Pass' : 'Fail'}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={`Absentees (${absentees.length})`} />
            <CardBody>
              {absentees.length === 0 ? (
                <p className="text-sm text-muted">Everyone was present.</p>
              ) : (
                <ul className="space-y-2">
                  {absentees.map((s) => (
                    <li key={s.usn} className="flex items-center gap-2 text-sm">
                      <UserX className="h-4 w-4 text-red-700" aria-hidden="true" />
                      <span className="flex-1">{s.name}</span>
                      <span className="font-mono text-xs text-muted">{s.usn}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Publication history" />
            <CardBody>
              {rs.publications.length === 0 ? (
                <p className="text-sm text-muted">Nothing published yet.</p>
              ) : (
                <ol className="space-y-3">
                  {[...rs.publications].reverse().map((p) => (
                    <li key={p.version} className="rounded-ctl border border-line p-3 text-[13px]">
                      <p className="font-semibold text-navy">
                        v{p.version} · {p.kind}
                      </p>
                      <p className="mt-0.5 text-muted">{formatDateTime(p.at)}</p>
                      <p className="mt-0.5 text-ink">To: {p.recipients.join(', ')}</p>
                    </li>
                  ))}
                </ol>
              )}
              {approvedFixes.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Approved corrections applied</p>
                  <ul className="mt-2 space-y-1 text-[13px]">
                    {approvedFixes.map((k) => (
                      <li key={k.id}>
                        <span className="font-mono font-semibold">{k.questionId}</span> · {k.oldKey} → {k.newKey}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={republish ? 'Re-publish corrected results?' : 'Publish results?'}
        confirmLabel={republish ? 'Confirm re-publication' : 'Confirm publication'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmPublish}
        description={`${exam.subject} · ${exam.classSection} · ${exam.examType}`}
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Recipients</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-ink">
              {recipients.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-ink">
            {sum.present} present · {sum.absent} absent · average {sum.average.toFixed(1)}/{max}
          </p>
          <SimNotice title="Publishing simulation" tone="warn">
            This only records a publication in this browser. No email, notification or file is sent to the HOD, the
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

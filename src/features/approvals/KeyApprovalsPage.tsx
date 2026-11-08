import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, KeyRound, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Field, TextArea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { DefList, EmptyState, SimNotice, TableWrap, Td, Th } from '../../components/ui/Misc'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import { keyChangeImpact } from '../../lib/resultFile'
import { cx, formatDateTime, relativeTime } from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import type { KeyRequest, KeyRequestStatus } from '../../types'

type Filter = 'Pending' | 'Decided' | 'All'

export function KeyApprovalsPage() {
  const { keyRequests, exams } = useApp()
  const [filter, setFilter] = useState<Filter>('Pending')
  const [openId, setOpenId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<KeyRequestStatus, number> = { Pending: 0, Approved: 0, Rejected: 0 }
    keyRequests.forEach((k) => c[k.status]++)
    return c
  }, [keyRequests])

  const rows = useMemo(
    () =>
      keyRequests
        .filter((k) => (filter === 'All' ? true : filter === 'Pending' ? k.status === 'Pending' : k.status !== 'Pending'))
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    [keyRequests, filter],
  )

  const open = keyRequests.find((k) => k.id === openId) ?? null
  const examName = (id: string) => {
    const e = exams.find((x) => x.id === id)
    return e ? `${e.subject} (${e.classSection}, ${e.examType})` : id
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        Heads of Department can ask for an answer-key correction after results are imported. Review the old key, the
        proposed key and the reason, then approve (the marks are re-calculated for that question ID) or reject.
      </p>

      <section aria-label="Request totals" className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {(['Pending', 'Approved', 'Rejected'] as const).map((s) => (
          <div key={s} className="rounded-card border border-line bg-white p-4 shadow-card">
            <p className="text-2xl font-semibold tabular-nums text-navy">{counts[s]}</p>
            <p className="mt-0.5 text-xs text-muted">{s}</p>
          </div>
        ))}
      </section>

      <Card>
        <CardHeader
          title="Correction requests"
          actions={
            <div role="group" aria-label="Filter requests" className="inline-flex rounded-ctl border border-slate-300 bg-white p-0.5">
              {(['Pending', 'Decided', 'All'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    'rounded-[8px] px-3 py-1 text-[13px] font-medium',
                    filter === f ? 'bg-navy text-white' : 'text-slate-600 hover:bg-navsel',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />
        {rows.length === 0 ? (
          <EmptyState icon={KeyRound} title={filter === 'Pending' ? 'No pending requests' : 'No requests here'}>
            {filter === 'Pending' ? 'You are all caught up.' : 'Try another filter.'}
          </EmptyState>
        ) : (
          <TableWrap caption="Key correction requests">
            <thead>
              <tr>
                <Th>Exam</Th>
                <Th>Question ID</Th>
                <Th>Key change</Th>
                <Th>Requested by</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50">
                  <Td>
                    <p className="font-medium">{examName(k.examId)}</p>
                    <p className="max-w-xs truncate text-xs text-muted" title={k.reason}>
                      {k.reason}
                    </p>
                  </Td>
                  <Td>
                    <span className="rounded-md bg-navsel px-2 py-0.5 font-mono text-[13px] font-semibold text-navy">{k.questionId}</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <KeyChip value={k.oldKey} muted /> <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                      <span className="sr-only">changed to</span> <KeyChip value={k.newKey} />
                    </span>
                  </Td>
                  <Td>
                    <p>{k.requestedBy}</p>
                    <p className="text-xs text-muted">{relativeTime(k.requestedAt)}</p>
                  </Td>
                  <Td>
                    <StatusBadge status={k.status} />
                  </Td>
                  <Td className="text-right">
                    <Button size="sm" variant={k.status === 'Pending' ? 'primary' : 'secondary'} onClick={() => setOpenId(k.id)}>
                      {k.status === 'Pending' ? 'Review' : 'View'}
                      <span className="sr-only"> request {k.questionId}</span>
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {open && <ReviewModal key={open.id} request={open} examName={examName(open.examId)} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function KeyChip({ value, muted }: { value: string; muted?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex h-7 w-7 items-center justify-center rounded-md border text-sm',
        muted ? 'border-slate-300 bg-slate-50 text-slate-600 line-through' : 'border-navy bg-navsel text-navy',
      )}
    >
      {value}
    </span>
  )
}

function ReviewModal({ request, examName, onClose }: { request: KeyRequest; examName: string; onClose: () => void }) {
  const { resultSets, decideKeyRequest } = useApp()
  const toast = useToast()
  const [mode, setMode] = useState<'view' | 'reject'>('view')
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  const rs = resultSets.find((r) => r.examId === request.examId)
  const pending = request.status === 'Pending'
  const currentKey = rs?.answerKey[request.questionId]
  const published = !!rs && rs.publications.length > 0

  const impact = useMemo(() => {
    if (!rs) return null
    const { gained, lost } = keyChangeImpact(rs.students, request.questionId, request.oldKey, request.newKey)
    const affected = rs.students
      .filter((s) => s.status === 'Present' && (s.answers[request.questionId] === request.newKey || s.answers[request.questionId] === request.oldKey))
      .map((s) => {
        const gain = s.answers[request.questionId] === request.newKey
        return { usn: s.usn, name: s.name, before: s.marks ?? 0, after: (s.marks ?? 0) + (gain ? 1 : -1) }
      })
    return { gained, lost, affected }
  }, [rs, request])

  const approve = () => {
    decideKeyRequest(request.id, 'Approved', 'Approved and re-marked by question ID.')
    toast(
      rs
        ? `Approved. ${request.questionId} was re-marked${published ? '; the results now need re-publishing.' : '.'}`
        : 'Approved.',
    )
    onClose()
  }

  const reject = () => {
    if (!note.trim()) {
      setNoteError('Add a short note explaining the rejection.')
      return
    }
    decideKeyRequest(request.id, 'Rejected', note.trim())
    toast(`Request for ${request.questionId} rejected.`, 'info')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${request.questionId} · key correction`}
      description={examName}
      footer={
        pending ? (
          mode === 'view' ? (
            <>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button variant="danger" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={() => setMode('reject')}>
                Reject…
              </Button>
              <Button icon={<Check className="h-4 w-4" aria-hidden="true" />} onClick={approve}>
                Approve &amp; re-mark {request.questionId}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setMode('view')}>
                Back
              </Button>
              <Button variant="danger" onClick={reject}>
                Confirm rejection
              </Button>
            </>
          )
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4 rounded-ctl border border-line bg-slate-50 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Old key</p>
            <p className="mt-1 flex h-12 w-12 items-center justify-center rounded-ctl border border-slate-300 bg-white text-xl font-semibold text-slate-600">
              {request.oldKey}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">New key</p>
            <p className="mt-1 flex h-12 w-12 items-center justify-center rounded-ctl border-2 border-navy bg-navsel text-xl font-semibold text-navy">
              {request.newKey}
            </p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={request.status} />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">HOD's reason</p>
          <p className="mt-1 rounded-ctl border border-line bg-white p-3 text-sm leading-relaxed text-ink">{request.reason}</p>
        </div>

        <DefList
          items={[
            ['Requested by', request.requestedBy],
            ['Requested', formatDateTime(request.requestedAt)],
            ...(request.decidedAt ? ([['Decided', formatDateTime(request.decidedAt)]] as Array<[string, string]>) : []),
            ...(request.decisionNote ? ([['Decision note', request.decisionNote]] as Array<[string, string]>) : []),
          ]}
        />

        {pending && currentKey && currentKey !== request.oldKey && (
          <SimNotice title="The key on file differs from the request" tone="warn">
            The current key for {request.questionId} is {currentKey}, but the request says the old key was {request.oldKey}.
          </SimNotice>
        )}

        {pending && published && (
          <SimNotice title="These results were already published" tone="warn">
            Approving will re-mark the question and flag the results as needing re-publication to the HOD and Principal.
          </SimNotice>
        )}

        {/* impact */}
        {impact ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {pending ? 'Impact of re-marking by question ID' : 'Marks impact'}
            </p>
            {request.status === 'Approved' && request.gained !== undefined ? (
              <p className="mt-1 text-sm text-ink">
                Re-marked <span className="font-semibold">{request.questionId}</span>: {request.gained} student
                {request.gained === 1 ? '' : 's'} gained 1 mark, {request.lost} lost 1 mark.
              </p>
            ) : request.status === 'Rejected' ? (
              <p className="mt-1 text-sm text-muted">No marks were changed.</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-ink">
                  <span className="font-semibold text-green-800">+1 mark</span> for {impact.gained} student
                  {impact.gained === 1 ? '' : 's'} · <span className="font-semibold text-red-800">−1 mark</span> for{' '}
                  {impact.lost} student{impact.lost === 1 ? '' : 's'}
                </p>
                {impact.affected.length > 0 && (
                  <TableWrap caption="Students affected (first 5)" className="mt-2 rounded-ctl border border-line">
                    <thead>
                      <tr>
                        <Th>USN</Th>
                        <Th>Name</Th>
                        <Th>Marks change</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {impact.affected.slice(0, 5).map((a) => (
                        <tr key={a.usn}>
                          <Td className="font-mono text-[13px]">{a.usn}</Td>
                          <Td>{a.name}</Td>
                          <Td>
                            {a.before} → <span className={a.after > a.before ? 'font-semibold text-green-800' : 'font-semibold text-red-800'}>{a.after}</span>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                )}
                {impact.affected.length > 5 && <p className="mt-1.5 text-xs text-muted">…and {impact.affected.length - 5} more.</p>}
              </>
            )}
          </div>
        ) : (
          <p className="flex gap-2 text-[13px] text-muted">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            No results have been imported for this exam yet, so approving only records the decision.
          </p>
        )}

        {mode === 'reject' && (
          <Field label="Reason for rejection" required error={noteError}>
            <TextArea
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setNoteError('')
              }}
              placeholder="e.g. Scheme of evaluation confirms the existing key."
              autoFocus
            />
          </Field>
        )}
      </div>
    </Modal>
  )
}

import { useMemo, useState } from 'react'
import { Download, Eye, FastForward, Send } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { ConfirmModal, Modal } from '../../components/ui/Modal'
import { DefList, EmptyState, SimNotice, TableWrap, Td, Th } from '../../components/ui/Misc'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import { HOD_NAMES } from '../../data/catalog'
import { buildPaperFile, buildPaperModules, PAPER_NOTICE, paperFileName, paperIdFor } from '../../lib/questionPaper'
import {
  downloadFile,
  examStart,
  formatDate,
  formatDateTime,
  formatTime,
  paperState,
  timeUntil,
  totalQuestions,
} from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import type { Exam } from '../../types'

const RELEASED_VISIBLE = 5

export function PaperReleaseSection() {
  const { exams, now, releasePaper, setAutoRelease, simulateExamStart } = useApp()
  const toast = useToast()
  const [preview, setPreview] = useState<Exam | null>(null)
  const [confirm, setConfirm] = useState<Exam | null>(null)
  const [showAll, setShowAll] = useState(false)

  const { open, released } = useMemo(() => {
    const live = exams.filter((e) => e.status !== 'Draft')
    return {
      open: live
        .filter((e) => !e.paperRelease)
        .sort((a, b) => examStart(a).getTime() - examStart(b).getTime()),
      released: live
        .filter((e) => e.paperRelease)
        .sort((a, b) => (b.paperRelease!.releasedAt).localeCompare(a.paperRelease!.releasedAt)),
    }
  }, [exams])

  const rows = [...open, ...(showAll ? released : released.slice(0, RELEASED_VISIBLE))]

  const doRelease = (e: Exam) => {
    const ok = releasePaper(e.id, 'Manual')
    setConfirm(null)
    setPreview(null)
    toast(
      ok
        ? `Question paper for ${e.subject} published to ${HOD_NAMES[e.department] ?? 'the HOD'} (simulated — nothing was sent).`
        : 'The paper can only be published after the exam has started.',
      ok ? 'success' : 'error',
    )
  }

  return (
    <section id="paper-release" aria-labelledby="paper-release-title" className="scroll-mt-24">
      <Card>
        <CardHeader
          id="paper-release-title"
          title="Question paper release to HOD"
          description="The generated question paper is published to the HOD just after the scheduled exam starts — never before."
        />
        <div className="space-y-3 border-b border-line px-5 py-4">
          <SimNotice title="Release simulation">
            Papers are generated in this browser with placeholder questions. "Publishing" records the release here and in
            the activity log — nothing is emailed or delivered to a real HOD. Automatic release only runs while this
            portal is open in a browser tab.
          </SimNotice>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Send} title="No scheduled exams yet">
            Schedule an exam above and its question paper release will be tracked here.
          </EmptyState>
        ) : (
          <TableWrap caption="Question paper release status" className="min-w-0">
            <thead>
              <tr>
                <Th>Exam</Th>
                <Th>Starts</Th>
                <Th>Publishes to</Th>
                <Th>Paper status</Th>
                <Th>Auto-release</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const st = paperState(e, now)
                const start = examStart(e)
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td>
                      <p className="font-medium">{e.subject}</p>
                      <p className="text-xs text-muted">
                        {e.classSection} · {e.examType} · {totalQuestions(e)} questions
                      </p>
                    </Td>
                    <Td>
                      <p>
                        {formatDate(e.date)}, {formatTime(e.startTime)}
                      </p>
                      <p className="text-xs text-muted">
                        {e.demoStarted && !e.paperRelease ? 'started (demo)' : e.paperRelease ? 'started' : timeUntil(start, now)}
                      </p>
                    </Td>
                    <Td className="text-[13px]">{HOD_NAMES[e.department] ?? `HOD — ${e.department}`}</Td>
                    <Td>
                      <StatusBadge status={st} />
                      {e.paperRelease && (
                        <p className="mt-1 text-xs text-muted">
                          {formatDateTime(e.paperRelease.releasedAt)} · {e.paperRelease.mode.toLowerCase()}
                        </p>
                      )}
                    </Td>
                    <Td>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#102A43] disabled:opacity-40"
                          checked={e.autoReleasePaper}
                          disabled={!!e.paperRelease}
                          onChange={(ev) => setAutoRelease(e.id, ev.target.checked)}
                        />
                        <span>{e.autoReleasePaper ? 'On' : 'Off'}</span>
                        <span className="sr-only"> automatic release for {e.subject}</span>
                      </label>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" aria-hidden="true" />} onClick={() => setPreview(e)}>
                          Preview<span className="sr-only"> paper for {e.subject}</span>
                        </Button>
                        {st === 'Ready to publish' && (
                          <Button size="sm" icon={<Send className="h-4 w-4" aria-hidden="true" />} onClick={() => setConfirm(e)}>
                            Publish to HOD<span className="sr-only"> for {e.subject}</span>
                          </Button>
                        )}
                        {st === 'Not started' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<FastForward className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => {
                              simulateExamStart(e.id)
                              toast('Demo: the exam is now treated as started. Auto-release (if on) fires within seconds.', 'info')
                            }}
                          >
                            Simulate start (demo)<span className="sr-only"> for {e.subject}</span>
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        )}

        {released.length > RELEASED_VISIBLE && (
          <div className="border-t border-line px-5 py-3 text-[13px]">
            <button
              type="button"
              className="font-medium text-navy-2 underline underline-offset-2 hover:text-navy"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Show fewer released papers' : `Show all ${released.length} released papers`}
            </button>
          </div>
        )}
      </Card>

      {/* confirm release */}
      <ConfirmModal
        open={!!confirm}
        title="Publish question paper to the HOD?"
        description={confirm ? `${confirm.subject} · ${confirm.classSection} · ${confirm.examType}` : undefined}
        confirmLabel="Publish to HOD"
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && doRelease(confirm)}
      >
        {confirm && (
          <div className="space-y-4">
            <DefList
              items={[
                ['Paper ID', <span key="p" className="font-mono text-[13px]">{paperIdFor(confirm)}</span>],
                ['Recipient', HOD_NAMES[confirm.department] ?? `HOD — ${confirm.department}`],
                ['Exam started', `${formatDate(confirm.date)}, ${formatTime(confirm.startTime)}${confirm.demoStarted ? ' (demo start)' : ''}`],
                ['Questions', `${totalQuestions(confirm)} (${confirm.moduleQuestions.join(' / ')})`],
              ]}
            />
            <SimNotice title="Publishing simulation" tone="warn">
              This only records the release in this browser. No file or message is sent to the HOD.
            </SimNotice>
          </div>
        )}
      </ConfirmModal>

      {/* preview */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview ? `Question paper — ${preview.subject}` : ''}
        description={preview ? `${preview.subjectCode} · ${preview.classSection} · ${preview.examType} · ${paperIdFor(preview)}` : undefined}
        footer={
          preview && (
            <>
              <Button
                variant="secondary"
                icon={<Download className="h-4 w-4" aria-hidden="true" />}
                onClick={() => {
                  const id = preview.paperRelease?.paperId ?? paperIdFor(preview)
                  downloadFile(paperFileName(preview, id), buildPaperFile(preview, id, new Date().toISOString()))
                  toast('Demo question paper downloaded as JSON.', 'info')
                }}
              >
                Download demo paper
              </Button>
              {paperState(preview, now) === 'Ready to publish' && (
                <Button icon={<Send className="h-4 w-4" aria-hidden="true" />} onClick={() => { setConfirm(preview); setPreview(null) }}>
                  Publish to HOD
                </Button>
              )}
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Close
              </Button>
            </>
          )
        }
      >
        {preview && <PaperPreview exam={preview} />}
      </Modal>
    </section>
  )
}

function PaperPreview({ exam }: { exam: Exam }) {
  const { now } = useApp()
  const st = paperState(exam, now)
  const modules = buildPaperModules(exam)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={st} />
        <p className="text-sm text-muted">
          {st === 'Released to HOD' && exam.paperRelease
            ? `Released ${formatDateTime(exam.paperRelease.releasedAt)} to ${exam.paperRelease.recipient} (${exam.paperRelease.mode.toLowerCase()}).`
            : st === 'Ready to publish'
              ? 'The exam has started, so this paper can now be published to the HOD.'
              : `Held back until the exam starts (${formatDateTime(examStart(exam).toISOString())}).`}
        </p>
      </div>
      <SimNotice title="Demo content">{PAPER_NOTICE}</SimNotice>
      <div className="max-h-[45vh] space-y-4 overflow-y-auto rounded-ctl border border-line p-4" tabIndex={0} aria-label="Question paper preview">
        {modules.map((m) => (
          <section key={m.module}>
            <h3 className="text-sm font-semibold text-navy">
              Module {m.module} <span className="font-normal text-muted">· {m.questions.length} questions</span>
            </h3>
            <ol className="mt-1.5 space-y-1 text-[13px] text-ink">
              {m.questions.map((q) => (
                <li key={q.id} className="flex gap-2">
                  <span className="w-14 shrink-0 font-mono text-xs text-muted">{q.id}</span>
                  <span>{q.text}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}

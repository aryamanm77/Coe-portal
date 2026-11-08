import { useMemo, useState } from 'react'
import { CalendarPlus, Check, Download, FileJson, Info, PackageCheck } from 'lucide-react'
import { Button, LinkButton } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Field, SelectInput } from '../../components/ui/Field'
import { DefList, EmptyState, SimNotice } from '../../components/ui/Misc'
import { Pill, StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import { PACKAGE_CONTENTS, previewPackageId, SEAL_LABEL, TRANSFER_STEPS } from '../../lib/examPackage'
import { cx, downloadFile, formatDate, formatDateTime, formatDuration, formatTime, totalQuestions } from '../../lib/utils'
import { useApp } from '../../store/AppStore'

export function ExportTab() {
  const { exams, exportPackage, redownloadPackage, toggleChecklist } = useApp()
  const toast = useToast()

  const eligible = useMemo(
    () => exams.filter((e) => e.status === 'Scheduled' || e.status === 'Package Exported'),
    [exams],
  )
  const [selectedId, setSelectedId] = useState('')
  const exam = eligible.find((e) => e.id === selectedId) ?? eligible[0]

  // fixed at selection time so the preview timestamp does not tick on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previewTs = useMemo(() => new Date().toISOString(), [exam?.id])

  if (!exam) {
    return (
      <Card>
        <EmptyState icon={CalendarPlus} title="No scheduled exams to export">
          Schedule an exam first — only exams with status Scheduled or Package Exported can produce a package.
          <div className="mt-4">
            <LinkButton to="/schedule-exam" variant="primary">
              Schedule an exam
            </LinkButton>
          </div>
        </EmptyState>
      </Card>
    )
  }

  const exported = !!exam.packageId
  const packageId = exam.packageId ?? previewPackageId(exam)
  const createdAt = exam.packageCreatedAt ?? previewTs
  const doneCount = exam.transferChecklist.filter(Boolean).length

  const doExport = () => {
    const out = exported ? redownloadPackage(exam.id) : exportPackage(exam.id)
    if (!out) {
      toast('Could not generate the package for this exam.', 'error')
      return
    }
    downloadFile(out.filename, out.json)
    toast(
      exported
        ? `Re-downloaded ${out.filename}.`
        : `Demo package ${packageId} generated. Export recorded in the activity log.`,
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="1 · Select a scheduled exam" />
          <CardBody>
            <div className="max-w-xl">
              <Field label="Exam">
                <SelectInput value={exam.id} onChange={(e) => setSelectedId(e.target.value)}>
                  {eligible.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.subject} · {e.classSection} · {e.examType} · {formatDate(e.date)} ({e.status})
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="2 · Package preview"
            description="What the demo package will contain."
            actions={<StatusBadge status={exam.status} />}
          />
          <CardBody className="space-y-6">
            <DefList
              items={[
                ['Subject', `${exam.subject} (${exam.subjectCode})`],
                ['Department', exam.department],
                ['Class / section', `${exam.classSection} · Semester ${exam.semester}`],
                ['Exam type', exam.examType === 'IA' ? 'IA — Internal Assessment' : 'SEE — Semester End Exam'],
                ['Date & time', `${formatDate(exam.date)}, ${formatTime(exam.startTime)}`],
                ['Duration', formatDuration(exam.durationMinutes)],
              ]}
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Module question counts</p>
              <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {exam.moduleQuestions.map((q, i) => (
                  <li key={i} className="rounded-ctl border border-line bg-slate-50 px-3 py-2 text-center">
                    <p className="text-xs text-muted">Module {i + 1}</p>
                    <p className="text-lg font-semibold text-navy">{q}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm">
                Total <span className="font-semibold">{totalQuestions(exam)}</span> questions
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Package contents</p>
              <ul className="mt-2 divide-y divide-line rounded-ctl border border-line">
                {PACKAGE_CONTENTS.map((c) => (
                  <li key={c.name} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                    <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-navy-2" aria-hidden="true" />
                    <div>
                      <p className="font-mono text-[13px] text-ink">{c.name}</p>
                      <p className="text-xs text-muted">{c.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">All sections are stored in one downloadable JSON file.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-ctl border border-line bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Mock package ID</p>
                <p className="mt-0.5 font-mono text-sm text-ink">{packageId}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Creation timestamp {!exported && <Pill>preview</Pill>}
                </p>
                <p className="mt-0.5 text-sm text-ink">{formatDateTime(createdAt)}</p>
                {!exported && <p className="text-xs text-muted">Final timestamp is set when you export.</p>}
              </div>
            </div>

            <SimNotice title={SEAL_LABEL} tone="warn">
              The package carries a simple demo checksum so the import step has something to compare. It does not prove
              who created the file and cannot stop tampering.
            </SimNotice>

            <div className="flex flex-wrap items-center gap-3">
              <Button icon={<Download className="h-4 w-4" aria-hidden="true" />} onClick={doExport}>
                {exported ? 'Download package again' : 'Generate & download demo package'}
              </Button>
              {exported && (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-green-800">
                  <PackageCheck className="h-4 w-4" aria-hidden="true" /> Exported — the same package ID is reused so
                  imports can match it.
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* checklist */}
      <aside aria-label="Transfer checklist" className="xl:sticky xl:top-24 xl:self-start">
        <Card>
          <CardHeader
            title="Transfer checklist"
            description="Track the physical hand-off yourself."
            actions={
              <span className="text-[13px] font-medium text-navy">
                {doneCount} of {TRANSFER_STEPS.length} done
              </span>
            }
          />
          <CardBody className="space-y-4">
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={TRANSFER_STEPS.length}
              aria-valuenow={doneCount}
              aria-label="Checklist progress"
            >
              <div className="h-full rounded-full bg-navy transition-[width]" style={{ width: `${(doneCount / 4) * 100}%` }} />
            </div>

            <ol className="space-y-2">
              {TRANSFER_STEPS.map((label, i) => {
                const checked = exam.transferChecklist[i]
                const locked = i === 0
                const disabled = locked || !exported
                return (
                  <li key={label}>
                    <label
                      className={cx(
                        'flex items-start gap-3 rounded-ctl border px-3 py-2.5 text-sm',
                        checked ? 'border-green-200 bg-green-50' : 'border-line bg-white',
                        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[#102A43]"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleChecklist(exam.id, i)}
                      />
                      <span className="flex-1">
                        <span className="font-medium text-ink">
                          {i + 1}. {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {locked
                            ? checked
                              ? 'Completed automatically by the export.'
                              : 'Completed automatically when you export.'
                            : !exported
                              ? 'Available after the package is exported.'
                              : checked
                                ? 'Marked done by you.'
                                : 'Tick when you have done this.'}
                        </span>
                      </span>
                      {checked && <Check className="mt-0.5 h-4 w-4 text-green-800" aria-label="Done" />}
                    </label>
                  </li>
                )
              })}
            </ol>

            <p className="flex gap-2 text-xs leading-relaxed text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Manual tracking only. This portal cannot detect a pen drive or access a lab server — steps 2–4 are ticked by
              you.
            </p>
          </CardBody>
        </Card>
      </aside>
    </div>
  )
}

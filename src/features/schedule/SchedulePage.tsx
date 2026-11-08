import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Pencil,
  Save,
  Search,
  X,
} from 'lucide-react'
import { Button, LinkButton } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Field, SelectInput, TextInput } from '../../components/ui/Field'
import { ConfirmModal, Modal } from '../../components/ui/Modal'
import { DefList, EmptyState, SimNotice, TableWrap, Td, Th } from '../../components/ui/Misc'
import { Pill, StatusBadge } from '../../components/ui/StatusBadge'
import { useToast } from '../../components/ui/Toast'
import { CLASS_SECTIONS, DEPARTMENT_SHORT, DEPARTMENTS, SEMESTERS, SUBJECTS } from '../../data/catalog'
import {
  cx,
  DEFAULT_QUESTIONS_PER_MODULE,
  DEMO_MODULE_COUNT,
  examStart,
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  toDateInput,
  totalQuestions,
} from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import { EXAM_STATUSES, type Exam, type ExamDraftInput, type ExamType } from '../../types'

/* ---------------- form model ---------------- */

interface FormState {
  department: string
  subjectCode: string
  classSection: string
  semester: string
  examType: ExamType
  moduleQuestions: string[]
  date: string
  startTime: string
  duration: string
}

type Errors = Record<string, string>

const emptyForm = (): FormState => ({
  department: '',
  subjectCode: '',
  classSection: '',
  semester: '',
  examType: 'IA',
  moduleQuestions: Array.from({ length: DEMO_MODULE_COUNT }, () => String(DEFAULT_QUESTIONS_PER_MODULE)),
  date: '',
  startTime: '',
  duration: '',
})

const fromExam = (e: Exam): FormState => ({
  department: e.department,
  subjectCode: e.subjectCode,
  classSection: e.classSection,
  semester: e.semester ? String(e.semester) : '',
  examType: e.examType,
  moduleQuestions: e.moduleQuestions.map(String),
  date: e.date,
  startTime: e.startTime,
  duration: e.durationMinutes ? String(e.durationMinutes) : '',
})

const STEPS = [
  { id: 0, label: 'Course details', keys: ['department', 'subject', 'classSection', 'semester', 'examType'] },
  { id: 1, label: 'Questions per module', keys: Array.from({ length: DEMO_MODULE_COUNT }, (_, i) => `mq${i}`) },
  { id: 2, label: 'Date & time', keys: ['date', 'startTime', 'duration'] },
]

const isPositiveInt = (s: string) => /^\d+$/.test(s.trim()) && Number(s) > 0

function validate(f: FormState, mode: 'draft' | 'schedule'): Errors {
  const err: Errors = {}
  const req = mode === 'schedule'

  if (!f.department) err.department = 'Select a department.'
  if (!f.subjectCode) err.subject = 'Select a subject.'

  if (req) {
    if (!f.classSection) err.classSection = 'Select a class / section.'
    if (!f.semester) err.semester = 'Select a semester.'
    else if (f.classSection && !f.classSection.startsWith(`${f.semester}-`))
      err.classSection = `Class ${f.classSection} does not belong to semester ${f.semester}.`
  }

  f.moduleQuestions.forEach((v, i) => {
    if (!v.trim()) {
      if (req) err[`mq${i}`] = 'Enter a number.'
    } else if (!isPositiveInt(v)) err[`mq${i}`] = 'Use a positive whole number.'
    else if (Number(v) > 100) err[`mq${i}`] = 'Maximum 100 questions.'
  })

  if (req && !f.date) err.date = 'Choose the exam date.'
  if (req && !f.startTime) err.startTime = 'Choose a start time.'

  if (!f.duration.trim()) {
    if (req) err.duration = 'Enter the duration in minutes.'
  } else if (!isPositiveInt(f.duration)) err.duration = 'Use a positive whole number of minutes.'
  else if (Number(f.duration) > 480) err.duration = 'Maximum 480 minutes (8 hours).'

  if (req && f.date && f.startTime && !err.date && !err.startTime) {
    const today = toDateInput(new Date())
    if (f.date < today) err.date = 'The exam date cannot be in the past.'
    else if (new Date(`${f.date}T${f.startTime}`).getTime() <= Date.now())
      err.startTime = 'This start time has already passed. Choose a later time.'
  }
  return err
}

function toInput(f: FormState): ExamDraftInput {
  const subject = SUBJECTS.find((s) => s.code === f.subjectCode)
  return {
    department: f.department,
    subjectCode: f.subjectCode,
    subject: subject?.name ?? '',
    classSection: f.classSection,
    semester: f.semester ? Number(f.semester) : null,
    examType: f.examType,
    moduleQuestions: f.moduleQuestions.map((v) => (isPositiveInt(v) ? Number(v) : DEFAULT_QUESTIONS_PER_MODULE)),
    date: f.date,
    startTime: f.startTime,
    durationMinutes: isPositiveInt(f.duration) ? Number(f.duration) : null,
  }
}

function endTime(start: string, minutes: number): string {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + minutes
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

/* ---------------- page ---------------- */

export function SchedulePage() {
  const { exams, saveExam } = useApp()
  const toast = useToast()
  const formTop = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [step, setStep] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [viewing, setViewing] = useState<Exam | null>(null)
  const [applyAll, setApplyAll] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K], clear: string[] = []) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => {
      const next = { ...e }
      for (const k of [String(key), ...clear]) delete next[k]
      return next
    })
  }

  const subjectOptions = SUBJECTS.filter((s) => !form.department || s.department === form.department)
  const editing = editingId ? exams.find((e) => e.id === editingId) : undefined

  const stepHasError = (i: number) => STEPS[i].keys.some((k) => errors[k])
  const firstErrorStep = (errs: Errors) => STEPS.findIndex((s) => s.keys.some((k) => errs[k]))

  const resetForm = () => {
    setForm(emptyForm())
    setErrors({})
    setStep(0)
    setEditingId(null)
    setApplyAll('')
  }

  const goNext = () => {
    // validate the current step as a "schedule" pass, but only surface this step's messages
    const all = validate(form, 'schedule')
    const mine = Object.fromEntries(Object.entries(all).filter(([k]) => STEPS[step].keys.includes(k)))
    setErrors((e) => ({ ...e, ...mine }))
    if (Object.keys(mine).length === 0) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const saveDraft = () => {
    const errs = validate(form, 'draft')
    setErrors(errs)
    if (Object.keys(errs).length) {
      setStep(Math.max(0, firstErrorStep(errs)))
      toast('A draft needs at least a department and subject, and any numbers entered must be valid.', 'error')
      return
    }
    const saved = saveExam(toInput(form), 'draft', editingId ?? undefined)
    toast(`Draft saved for ${saved.subject}.`)
    resetForm()
  }

  const requestSchedule = () => {
    const errs = validate(form, 'schedule')
    setErrors(errs)
    const count = Object.keys(errs).length
    if (count) {
      setStep(Math.max(0, firstErrorStep(errs)))
      toast(`Please fix ${count} field${count > 1 ? 's' : ''} before scheduling.`, 'error')
      return
    }
    setConfirmOpen(true)
  }

  const confirmSchedule = () => {
    const saved = saveExam(toInput(form), 'schedule', editingId ?? undefined)
    setConfirmOpen(false)
    toast(`${saved.subject} (${saved.classSection}, ${saved.examType}) scheduled for ${formatDate(saved.date)}.`)
    resetForm()
  }

  const startEdit = (e: Exam) => {
    setForm(fromExam(e))
    setEditingId(e.id)
    setErrors({})
    setStep(0)
    setViewing(null)
    formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const summary = toInput(form)
  const total = summary.moduleQuestions.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        Configure an internal assessment (IA) or semester end exam (SEE), then schedule it. Scheduled exams become
        available for package export on the File Transfer page.
      </p>

      <div ref={formTop} className="scroll-mt-24 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---------- form ---------- */}
        <Card>
          <CardHeader
            title={editing ? 'Edit draft exam' : 'New exam'}
            description="Fields marked * are required to schedule. A draft only needs a department and subject."
            actions={
              editing && (
                <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" aria-hidden="true" />} onClick={resetForm}>
                  Cancel editing
                </Button>
              )
            }
          />

          {/* stepper */}
          <ol className="flex flex-wrap gap-2 border-b border-line px-5 py-3" aria-label="Form steps">
            {STEPS.map((s, i) => {
              const current = i === step
              const bad = stepHasError(i)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={current ? 'step' : undefined}
                    className={cx(
                      'flex items-center gap-2 rounded-ctl border px-3 py-1.5 text-[13px] font-medium',
                      current ? 'border-navy bg-navsel text-navy' : 'border-line text-slate-600 hover:bg-slate-50',
                      bad && !current && 'border-red-300 text-red-800',
                    )}
                  >
                    <span
                      className={cx(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                        bad ? 'bg-red-700 text-white' : current ? 'bg-navy text-white' : 'bg-slate-200 text-slate-700',
                      )}
                    >
                      {bad ? '!' : i + 1}
                    </span>
                    {s.label}
                    {bad && <span className="sr-only"> (has errors)</span>}
                  </button>
                </li>
              )
            })}
          </ol>

          <CardBody>
            {step === 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Department" required error={errors.department}>
                  <SelectInput
                    value={form.department}
                    onChange={(e) => {
                      const dept = e.target.value
                      const stillValid = SUBJECTS.some((s) => s.code === form.subjectCode && s.department === dept)
                      setForm((f) => ({ ...f, department: dept, subjectCode: stillValid ? f.subjectCode : '' }))
                      setErrors((er) => {
                        const n = { ...er }
                        delete n.department
                        return n
                      })
                    }}
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Subject" required error={errors.subject} hint={!form.department ? 'Choose a department first to narrow the list.' : undefined}>
                  <SelectInput
                    value={form.subjectCode}
                    onChange={(e) => {
                      const sub = SUBJECTS.find((s) => s.code === e.target.value)
                      setForm((f) => {
                        const semester = sub ? String(sub.semester) : f.semester
                        const classOk = f.classSection.startsWith(`${semester}-`)
                        return {
                          ...f,
                          subjectCode: e.target.value,
                          department: sub?.department ?? f.department,
                          semester,
                          classSection: classOk ? f.classSection : '',
                        }
                      })
                      setErrors((er) => {
                        const n = { ...er }
                        delete n.subject
                        delete n.semester
                        delete n.department
                        return n
                      })
                    }}
                  >
                    <option value="">Select subject</option>
                    {subjectOptions.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Semester" required error={errors.semester}>
                  <SelectInput
                    value={form.semester}
                    onChange={(e) => {
                      const sem = e.target.value
                      setForm((f) => ({
                        ...f,
                        semester: sem,
                        classSection: f.classSection.startsWith(`${sem}-`) ? f.classSection : '',
                      }))
                      setErrors((er) => {
                        const n = { ...er }
                        delete n.semester
                        delete n.classSection
                        return n
                      })
                    }}
                  >
                    <option value="">Select semester</option>
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field
                  label="Class / section"
                  required
                  error={errors.classSection}
                  hint={!form.semester ? 'Pick a semester to see its sections.' : undefined}
                >
                  <SelectInput
                    value={form.classSection}
                    disabled={!form.semester}
                    onChange={(e) => set('classSection', e.target.value)}
                  >
                    <option value="">Select class / section</option>
                    {CLASS_SECTIONS.filter((c) => c.startsWith(`${form.semester}-`)).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <fieldset className="sm:col-span-2">
                  <legend className="mb-1.5 text-[13px] font-medium text-ink">
                    Exam type<span className="ml-0.5 text-red-700" aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </legend>
                  <div className="grid max-w-md grid-cols-2 gap-2">
                    {(
                      [
                        ['IA', 'Internal Assessment', 'IA'],
                        ['SEE', 'Semester End Exam', 'SEE'],
                      ] as const
                    ).map(([value, label, short]) => {
                      const checked = form.examType === value
                      return (
                        <label
                          key={value}
                          className={cx(
                            'flex cursor-pointer items-center gap-3 rounded-ctl border px-3 py-2.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600',
                            checked ? 'border-navy bg-navsel' : 'border-slate-300 hover:bg-slate-50',
                          )}
                        >
                          <input
                            type="radio"
                            name="examType"
                            value={value}
                            checked={checked}
                            onChange={() => set('examType', value)}
                            className="h-4 w-4 accent-[#102A43]"
                          />
                          <span>
                            <span className="block font-semibold text-navy">{short}</span>
                            <span className="block text-xs text-muted">{label}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <SimNotice title={`Demo module count: ${DEMO_MODULE_COUNT} modules`}>
                  The source workflow does not say how many modules an exam has, so this prototype assumes{' '}
                  {DEMO_MODULE_COUNT}. Each module defaults to {DEFAULT_QUESTIONS_PER_MODULE} questions and can be set
                  independently.
                </SimNotice>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {form.moduleQuestions.map((v, i) => (
                    <Field key={i} label={`Module ${i + 1}`} required error={errors[`mq${i}`]}>
                      <TextInput
                        inputMode="numeric"
                        value={v}
                        onChange={(e) => {
                          const next = [...form.moduleQuestions]
                          next[i] = e.target.value
                          set('moduleQuestions', next, [`mq${i}`])
                        }}
                      />
                    </Field>
                  ))}
                </div>

                <div className="flex flex-wrap items-end gap-3 rounded-ctl border border-line bg-slate-50 p-3">
                  <div className="w-36">
                    <Field label="Set all modules to">
                      <TextInput inputMode="numeric" value={applyAll} onChange={(e) => setApplyAll(e.target.value)} placeholder="e.g. 6" />
                    </Field>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={!isPositiveInt(applyAll) || Number(applyAll) > 100}
                    onClick={() => {
                      set('moduleQuestions', Array.from({ length: DEMO_MODULE_COUNT }, () => String(Number(applyAll))), STEPS[1].keys)
                    }}
                  >
                    Apply to all
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      set('moduleQuestions', Array.from({ length: DEMO_MODULE_COUNT }, () => String(DEFAULT_QUESTIONS_PER_MODULE)), STEPS[1].keys)
                    }
                  >
                    Reset to {DEFAULT_QUESTIONS_PER_MODULE} each
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Exam date" required error={errors.date}>
                  <TextInput type="date" min={toDateInput(new Date())} value={form.date} onChange={(e) => set('date', e.target.value, ['startTime'])} />
                </Field>
                <Field label="Start time" required error={errors.startTime}>
                  <TextInput type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value, ['date'])} />
                </Field>
                <div>
                  <Field label="Duration (minutes)" required error={errors.duration}>
                    <TextInput inputMode="numeric" value={form.duration} onChange={(e) => set('duration', e.target.value)} placeholder="e.g. 90" />
                  </Field>
                  <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Duration presets">
                    {[60, 90, 120, 180].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => set('duration', String(m))}
                        className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-700 hover:bg-navsel"
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
                <p className="flex gap-2 text-xs text-muted sm:col-span-3">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  The exam must start in the future (checked against this device's clock).
                </p>
              </div>
            )}
          </CardBody>

          {/* actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={step === 0}
                icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              {step < STEPS.length - 1 && (
                <Button variant="secondary" onClick={goNext}>
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Save className="h-4 w-4" aria-hidden="true" />} onClick={saveDraft}>
                Save Draft
              </Button>
              <Button icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />} onClick={requestSchedule}>
                Schedule Exam
              </Button>
            </div>
          </div>
        </Card>

        {/* ---------- live summary ---------- */}
        <aside aria-label="Live exam summary" className="xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader
              title="Exam summary"
              description="Updates as you type."
              actions={<span className="text-xs font-medium text-muted">{editing ? 'Editing draft' : 'New exam'}</span>}
            />
            <CardBody className="space-y-4">
              <SummaryRow label="Department" value={form.department ? `${form.department} (${DEPARTMENT_SHORT[form.department]})` : ''} />
              <SummaryRow
                label="Subject"
                value={summary.subject ? `${summary.subject} (${form.subjectCode})` : ''}
              />
              <div className="grid grid-cols-2 gap-4">
                <SummaryRow label="Class / section" value={form.classSection} />
                <SummaryRow label="Semester" value={form.semester ? `Semester ${form.semester}` : ''} />
              </div>
              <SummaryRow label="Exam type" value={form.examType === 'IA' ? 'IA — Internal Assessment' : 'SEE — Semester End Exam'} />
              <div className="grid grid-cols-2 gap-4">
                <SummaryRow label="Date" value={form.date ? formatDate(form.date) : ''} />
                <SummaryRow
                  label="Time"
                  value={
                    form.startTime
                      ? `${formatTime(form.startTime)}${
                          summary.durationMinutes ? ` – ${formatTime(endTime(form.startTime, summary.durationMinutes))}` : ''
                        }`
                      : ''
                  }
                />
              </div>
              <SummaryRow label="Duration" value={summary.durationMinutes ? formatDuration(summary.durationMinutes) : ''} />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Questions per module</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {summary.moduleQuestions.map((q, i) => (
                    <li key={i} className="rounded-md border border-line bg-slate-50 px-2 py-1 text-xs text-ink">
                      M{i + 1}: <span className="font-semibold">{q}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-ink">
                  Total: <span className="font-semibold text-navy">{total}</span> questions
                </p>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>

      <ScheduledTable onView={setViewing} onEdit={startEdit} />

      {/* confirm */}
      <ConfirmModal
        open={confirmOpen}
        title="Schedule this exam?"
        description="Once scheduled, the exam can be exported as a package. Drafts can still be edited; scheduled exams are locked in this demo."
        confirmLabel="Confirm & schedule"
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSchedule}
      >
        <DefList
          items={[
            ['Subject', `${summary.subject} (${form.subjectCode})`],
            ['Class / section', `${form.classSection} · Semester ${form.semester}`],
            ['Exam type', form.examType],
            ['Date & time', `${formatDate(form.date)}, ${formatTime(form.startTime)}`],
            ['Duration', summary.durationMinutes ? formatDuration(summary.durationMinutes) : '—'],
            ['Questions', `${total} total (${summary.moduleQuestions.join(' / ')})`],
          ]}
        />
      </ConfirmModal>

      {/* details */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.subject : ''}
        description={viewing ? `${viewing.subjectCode} · ${viewing.department}` : undefined}
        size="lg"
        footer={
          viewing && (
            <>
              {viewing.status === 'Draft' && (
                <Button icon={<Pencil className="h-4 w-4" aria-hidden="true" />} onClick={() => startEdit(viewing)}>
                  Edit draft
                </Button>
              )}
              {viewing.status === 'Scheduled' && (
                <LinkButton to="/file-transfer" variant="primary">
                  Go to File Transfer
                </LinkButton>
              )}
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
            </>
          )
        }
      >
        {viewing && <ExamDetails exam={viewing} />}
      </Modal>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cx('mt-0.5 text-sm', value ? 'text-ink' : 'italic text-muted')}>{value || 'Not set yet'}</p>
    </div>
  )
}

function ExamDetails({ exam }: { exam: Exam }) {
  return (
    <div className="space-y-5">
      <DefList
        items={[
          ['Status', <StatusBadge key="s" status={exam.status} />],
          ['Exam type', exam.examType === 'IA' ? 'IA — Internal Assessment' : 'SEE — Semester End Exam'],
          ['Class / section', `${exam.classSection} (Semester ${exam.semester || '—'})`],
          ['Date', formatDate(exam.date)],
          [
            'Time',
            exam.startTime
              ? `${formatTime(exam.startTime)}${exam.durationMinutes ? ` – ${formatTime(endTime(exam.startTime, exam.durationMinutes))}` : ''}`
              : '—',
          ],
          ['Duration', exam.durationMinutes ? formatDuration(exam.durationMinutes) : '—'],
          ['Created', formatDateTime(exam.createdAt)],
          ['Last updated', formatDateTime(exam.updatedAt)],
        ]}
      />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Questions per module</p>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {exam.moduleQuestions.map((q, i) => (
            <li key={i} className="rounded-ctl border border-line bg-slate-50 px-3 py-2 text-center">
              <p className="text-xs text-muted">Module {i + 1}</p>
              <p className="text-lg font-semibold text-navy">{q}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ink">
          Total <span className="font-semibold">{totalQuestions(exam)}</span> questions
        </p>
      </div>
      {exam.packageId && (
        <div className="rounded-ctl border border-line p-3 text-sm">
          <p className="font-medium text-navy">Demo package</p>
          <p className="mt-1 text-muted">
            <span className="font-mono text-ink">{exam.packageId}</span> · created{' '}
            {exam.packageCreatedAt ? formatDateTime(exam.packageCreatedAt) : '—'}
          </p>
        </div>
      )}
    </div>
  )
}

/* ---------------- scheduled exams table ---------------- */

function ScheduledTable({ onView, onEdit }: { onView: (e: Exam) => void; onEdit: (e: Exam) => void }) {
  const { exams } = useApp()
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const [cls, setCls] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')

  const subjects = useMemo(() => [...new Set(exams.map((e) => e.subject))].sort(), [exams])
  const classes = useMemo(() => [...new Set(exams.map((e) => e.classSection))].sort(), [exams])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return exams
      .filter((e) => {
        if (subject && e.subject !== subject) return false
        if (cls && e.classSection !== cls) return false
        if (type && e.examType !== type) return false
        if (status && e.status !== status) return false
        if (needle) {
          const hay = `${e.subject} ${e.subjectCode} ${e.classSection} ${e.department} ${e.status}`.toLowerCase()
          if (!hay.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => (examStart(b).getTime() || 0) - (examStart(a).getTime() || 0))
  }, [exams, q, subject, cls, type, status])

  const filtered = !!(q || subject || cls || type || status)

  return (
    <Card>
      <CardHeader title="Exams" description="All drafts and scheduled exams. Only drafts can be edited." />
      <div className="grid grid-cols-1 gap-3 border-b border-line px-5 py-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <label htmlFor="exam-search" className="sr-only">
            Search exams
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="exam-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subject, code, class…"
            className="block h-10 w-full rounded-ctl border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400"
          />
        </div>
        <FilterSelect label="subject" all="All subjects" value={subject} onChange={setSubject} options={subjects} />
        <FilterSelect label="class" all="All classes" value={cls} onChange={setCls} options={classes} />
        <FilterSelect label="exam type" all="All exam types" value={type} onChange={setType} options={['IA', 'SEE']} />
        <FilterSelect label="status" all="All statuses" value={status} onChange={setStatus} options={EXAM_STATUSES} />
      </div>

      <div className="flex items-center justify-between px-5 py-2.5 text-xs text-muted" aria-live="polite">
        <span>
          Showing {rows.length} of {exams.length} exams
        </span>
        {filtered && (
          <button
            type="button"
            className="font-medium text-navy-2 underline underline-offset-2 hover:text-navy"
            onClick={() => {
              setQ('')
              setSubject('')
              setCls('')
              setType('')
              setStatus('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No exams match these filters">
          Try clearing a filter or searching for something else.
        </EmptyState>
      ) : (
        <TableWrap caption="Exams">
          <thead>
            <tr>
              <Th>Subject</Th>
              <Th>Dept</Th>
              <Th>Class</Th>
              <Th>Type</Th>
              <Th>Date &amp; time</Th>
              <Th>Duration</Th>
              <Th>Questions</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium">{e.subject}</p>
                  <p className="text-xs text-muted">{e.subjectCode}</p>
                </Td>
                <Td>{DEPARTMENT_SHORT[e.department] ?? '—'}</Td>
                <Td>{e.classSection}</Td>
                <Td>
                  <Pill tone="navy">{e.examType}</Pill>
                </Td>
                <Td>
                  <p>{formatDate(e.date)}</p>
                  <p className="text-xs text-muted">{formatTime(e.startTime)}</p>
                </Td>
                <Td>{e.durationMinutes ? `${e.durationMinutes} min` : '—'}</Td>
                <Td>{totalQuestions(e)}</Td>
                <Td>
                  <StatusBadge status={e.status} />
                </Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" aria-hidden="true" />} onClick={() => onView(e)}>
                      View<span className="sr-only"> details for {e.subject}</span>
                    </Button>
                    {e.status === 'Draft' && (
                      <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" aria-hidden="true" />} onClick={() => onEdit(e)}>
                        Edit<span className="sr-only"> draft {e.subject}</span>
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </Card>
  )
}

function FilterSelect({
  label,
  all,
  value,
  onChange,
  options,
}: {
  label: string
  all: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  const id = `f-${label.replace(/\s/g, '-').toLowerCase()}`
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Filter by {label}
      </label>
      <SelectInput id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </SelectInput>
    </div>
  )
}

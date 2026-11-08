import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ACTOR, createSeedData } from '../data/seed'
import { buildPackage, packageFileName, previewPackageId, TRANSFER_STEPS } from '../lib/examPackage'
import { paperIdFor } from '../lib/questionPaper'
import { awaitingPublication, hasStarted, uid } from '../lib/utils'
import type {
  ActivityCategory,
  ActivityEntry,
  AppData,
  Exam,
  ExamDraftInput,
  ResultSet,
  StudentResult,
} from '../types'

const STORAGE_KEY = 'coe.demo.data.v2'

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (
        Array.isArray(parsed.exams) &&
        Array.isArray(parsed.resultSets) &&
        Array.isArray(parsed.activity)
      ) {
        return parsed
      }
    }
  } catch {
    /* fall through to seed */
  }
  return createSeedData()
}

interface ExportOutcome {
  filename: string
  json: string
  exam: Exam
}

interface AppStore extends AppData {
  log: (category: ActivityCategory, message: string, examId?: string) => void
  saveExam: (input: ExamDraftInput, mode: 'draft' | 'schedule', editingId?: string) => Exam
  exportPackage: (examId: string) => ExportOutcome | null
  redownloadPackage: (examId: string) => ExportOutcome | null
  toggleChecklist: (examId: string, index: number) => void
  importResults: (args: {
    examId: string
    fileName: string
    importBatchId: string
    answerKey: Record<string, string>
    students: StudentResult[]
  }) => ResultSet | null
  /** Publish one or more result sheets to each department's HOD and to the Principal (simulated). */
  publishResultSets: (resultSetIds: string[]) => number
  /** Simulated release of the generated question paper to the exam's HOD. Only allowed once the exam has started. */
  releasePaper: (examId: string, mode?: 'Manual' | 'Automatic') => boolean
  setAutoRelease: (examId: string, on: boolean) => void
  /** Demo helper: pretend the exam has started so the release flow can be tried early. */
  simulateExamStart: (examId: string) => void
  /** Current time, refreshed every 15 s so countdowns and counts stay live. */
  now: number
  resetDemo: () => void
  counts: {
    scheduled: number
    packagesReady: number
    papersPending: number
    papersDue: number
    awaitingPublication: number
  }
}

const Ctx = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* storage may be full or blocked — the demo keeps working in memory */
    }
  }, [data])

  const log = useCallback((category: ActivityCategory, message: string, examId?: string) => {
    const entry: ActivityEntry = {
      id: uid('act'),
      at: new Date().toISOString(),
      category,
      message,
      actor: ACTOR,
      examId,
    }
    setData((d) => ({ ...d, activity: [entry, ...d.activity] }))
  }, [])

  const examName = (e: Pick<Exam, 'subject' | 'classSection' | 'examType'>) =>
    `${e.subject} (${e.classSection}, ${e.examType})`

  const saveExam: AppStore['saveExam'] = useCallback(
    (input, mode, editingId) => {
      const now = new Date().toISOString()
      const status = mode === 'draft' ? 'Draft' : 'Scheduled'
      const existing = editingId ? data.exams.find((e) => e.id === editingId) : undefined
      const exam: Exam = {
        id: existing?.id ?? uid('ex'),
        department: input.department,
        subjectCode: input.subjectCode,
        subject: input.subject,
        classSection: input.classSection,
        semester: input.semester ?? 0,
        examType: input.examType,
        moduleQuestions: input.moduleQuestions,
        date: input.date,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes ?? 0,
        status,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        transferChecklist: existing?.transferChecklist ?? [false, false, false, false],
        autoReleasePaper: input.autoReleasePaper,
        demoStarted: existing?.demoStarted,
        paperRelease: existing?.paperRelease,
      }
      const entry: ActivityEntry = {
        id: uid('act'),
        at: now,
        category: 'Schedule',
        actor: ACTOR,
        examId: exam.id,
        message:
          mode === 'draft'
            ? `Saved draft for ${examName(exam)}`
            : `Scheduled ${examName(exam)}`,
      }
      setData((d) => ({
        ...d,
        exams: existing ? d.exams.map((e) => (e.id === exam.id ? exam : e)) : [exam, ...d.exams],
        activity: [entry, ...d.activity],
      }))
      return exam
    },
    [data.exams],
  )

  const buildOutcome = (exam: Exam, packageId: string, createdAt: string): ExportOutcome => ({
    exam,
    filename: packageFileName(exam, packageId),
    json: JSON.stringify(buildPackage(exam, packageId, createdAt), null, 2),
  })

  const exportPackage: AppStore['exportPackage'] = useCallback(
    (examId) => {
      const exam = data.exams.find((e) => e.id === examId)
      if (!exam || (exam.status !== 'Scheduled' && exam.status !== 'Package Exported')) return null
      if (exam.packageId && exam.packageCreatedAt) {
        return buildOutcome(exam, exam.packageId, exam.packageCreatedAt)
      }
      const now = new Date().toISOString()
      const packageId = previewPackageId(exam)
      const updated: Exam = {
        ...exam,
        status: 'Package Exported',
        packageId,
        packageCreatedAt: now,
        updatedAt: now,
        transferChecklist: [true, exam.transferChecklist[1], exam.transferChecklist[2], exam.transferChecklist[3]],
      }
      const entry: ActivityEntry = {
        id: uid('act'),
        at: now,
        category: 'Transfer',
        actor: ACTOR,
        examId: exam.id,
        message: `Exported package ${packageId} for ${examName(exam)} (demo simulation)`,
      }
      setData((d) => ({
        ...d,
        exams: d.exams.map((e) => (e.id === exam.id ? updated : e)),
        activity: [entry, ...d.activity],
      }))
      return buildOutcome(updated, packageId, now)
    },
    [data.exams],
  )

  const redownloadPackage: AppStore['redownloadPackage'] = useCallback(
    (examId) => {
      const exam = data.exams.find((e) => e.id === examId)
      if (!exam?.packageId || !exam.packageCreatedAt) return null
      return buildOutcome(exam, exam.packageId, exam.packageCreatedAt)
    },
    [data.exams],
  )

  const toggleChecklist: AppStore['toggleChecklist'] = useCallback(
    (examId, index) => {
      const exam = data.exams.find((e) => e.id === examId)
      if (!exam || index === 0) return
      const next = [...exam.transferChecklist] as Exam['transferChecklist']
      next[index] = !next[index]
      const entry: ActivityEntry = {
        id: uid('act'),
        at: new Date().toISOString(),
        category: 'Transfer',
        actor: ACTOR,
        examId,
        message: `Marked "${TRANSFER_STEPS[index]}" as ${next[index] ? 'done' : 'not done'} for ${examName(exam)} (manual tracking)`,
      }
      setData((d) => ({
        ...d,
        exams: d.exams.map((e) => (e.id === examId ? { ...e, transferChecklist: next } : e)),
        activity: [entry, ...d.activity],
      }))
    },
    [data.exams],
  )

  const importResults: AppStore['importResults'] = useCallback(
    ({ examId, fileName, importBatchId, answerKey, students }) => {
      const exam = data.exams.find((e) => e.id === examId)
      if (!exam) return null
      // duplicate guard (also enforced by validation, repeated here defensively)
      if (data.resultSets.some((r) => r.examId === examId || r.importBatchId === importBatchId)) return null
      const now = new Date().toISOString()
      const rs: ResultSet = {
        id: uid('rs'),
        examId,
        fileName,
        importBatchId,
        importedAt: now,
        answerKey,
        students,
        publications: [],
      }
      const entry: ActivityEntry = {
        id: uid('act'),
        at: now,
        category: 'Transfer',
        actor: ACTOR,
        examId,
        message: `Imported results file for ${examName(exam)} — ${students.length} students (integrity check simulated)`,
      }
      setData((d) => ({
        ...d,
        resultSets: [rs, ...d.resultSets],
        exams: d.exams.map((e) =>
          e.id === examId
            ? {
                ...e,
                status: 'Results Imported',
                updatedAt: now,
                transferChecklist: [true, true, true, true] as Exam['transferChecklist'],
              }
            : e,
        ),
        activity: [entry, ...d.activity],
      }))
      return rs
    },
    [data.exams, data.resultSets],
  )

  const releaseExamPaper = (exam: Exam, mode: 'Manual' | 'Automatic', at: string) => {
    const paperId = paperIdFor(exam)
    const recipient = `HOD — ${exam.department}`
    const released: Exam = { ...exam, updatedAt: at, paperRelease: { paperId, releasedAt: at, mode, recipient } }
    const entry: ActivityEntry = {
      id: uid('act'),
      at,
      category: 'Question Paper',
      actor: mode === 'Automatic' ? 'System (automatic release, simulated)' : ACTOR,
      examId: exam.id,
      message: `Question paper ${paperId} released to ${recipient} for ${examName(exam)} after the exam started (${mode.toLowerCase()}, simulated — nothing was sent)`,
    }
    return { released, entry }
  }

  const releasePaper: AppStore['releasePaper'] = useCallback(
    (examId, mode = 'Manual') => {
      const exam = data.exams.find((e) => e.id === examId)
      if (!exam || exam.paperRelease || exam.status === 'Draft' || !hasStarted(exam)) return false
      const { released, entry } = releaseExamPaper(exam, mode, new Date().toISOString())
      setData((d) => ({
        ...d,
        exams: d.exams.map((e) => (e.id === examId ? released : e)),
        activity: [entry, ...d.activity],
      }))
      return true
    },
    [data.exams],
  )

  const setAutoRelease: AppStore['setAutoRelease'] = useCallback((examId, on) => {
    setData((d) => ({ ...d, exams: d.exams.map((e) => (e.id === examId ? { ...e, autoReleasePaper: on } : e)) }))
  }, [])

  const simulateExamStart: AppStore['simulateExamStart'] = useCallback(
    (examId) => {
      const exam = data.exams.find((e) => e.id === examId)
      if (!exam || exam.status === 'Draft' || exam.paperRelease) return
      const entry: ActivityEntry = {
        id: uid('act'),
        at: new Date().toISOString(),
        category: 'Question Paper',
        actor: ACTOR,
        examId,
        message: `Demo: treated ${examName(exam)} as started so the question paper release can be tried`,
      }
      setData((d) => ({
        ...d,
        exams: d.exams.map((e) => (e.id === examId ? { ...e, demoStarted: true } : e)),
        activity: [entry, ...d.activity],
      }))
    },
    [data.exams],
  )

  // Automatic release: while the portal is open, publish each paper to its HOD once the exam has started.
  const runAutoRelease = useCallback(() => {
    setNow(Date.now())
    setData((d) => {
      const t = Date.now()
      const due = d.exams.filter((e) => e.autoReleasePaper && !e.paperRelease && e.status !== 'Draft' && hasStarted(e, t))
      if (due.length === 0) return d
      const at = new Date(t).toISOString()
      const results = due.map((e) => releaseExamPaper(e, 'Automatic', at))
      const byId = new Map(results.map((r) => [r.released.id, r.released]))
      return {
        ...d,
        exams: d.exams.map((e) => byId.get(e.id) ?? e),
        activity: [...results.map((r) => r.entry).reverse(), ...d.activity],
      }
    })
  }, [])

  useEffect(() => {
    const id = window.setInterval(runAutoRelease, 15000)
    return () => window.clearInterval(id)
  }, [runAutoRelease])

  // also re-check right away whenever the exams change (e.g. a new exam, auto-release switched on, demo start)
  useEffect(() => {
    runAutoRelease()
  }, [data.exams, runAutoRelease])

  const publishResultSets: AppStore['publishResultSets'] = useCallback(
    (ids) => {
      const sheets = data.resultSets.filter((r) => ids.includes(r.id) && r.publications.length === 0)
      if (sheets.length === 0) return 0
      const now = new Date().toISOString()
      const batchId = `PUB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      const examOf = (r: ResultSet) => data.exams.find((e) => e.id === r.examId)
      const entries: ActivityEntry[] = []

      // one HOD entry per department
      const byDept = new Map<string, ResultSet[]>()
      for (const r of sheets) {
        const dept = examOf(r)?.department ?? 'Unknown'
        byDept.set(dept, [...(byDept.get(dept) ?? []), r])
      }
      for (const [dept, list] of byDept) {
        const count = list.reduce((a, r) => a + r.students.length, 0)
        entries.push({
          id: uid('act'),
          at: now,
          category: 'Publishing',
          actor: ACTOR,
          message: `Published ${list.length} result sheet${list.length > 1 ? 's' : ''} (${count} students) to HOD — ${dept} (simulated, nothing was sent)`,
        })
      }
      const total = sheets.reduce((a, r) => a + r.students.length, 0)
      entries.push({
        id: uid('act'),
        at: now,
        category: 'Publishing',
        actor: ACTOR,
        message: `Published consolidated results — ${sheets.length} sheet${sheets.length > 1 ? 's' : ''}, ${total} students across ${byDept.size} department${byDept.size > 1 ? 's' : ''} — to the Principal (simulated, nothing was sent)`,
      })

      const sheetIds = new Set(sheets.map((r) => r.id))
      const examIds = new Set(sheets.map((r) => r.examId))
      setData((d) => ({
        ...d,
        resultSets: d.resultSets.map((r) =>
          sheetIds.has(r.id)
            ? {
                ...r,
                publications: [
                  {
                    version: 1,
                    at: now,
                    recipients: [`HOD — ${examOf(r)?.department ?? 'Department'}`, 'Principal'],
                    kind: 'Initial publication' as const,
                    batchId,
                  },
                ],
              }
            : r,
        ),
        exams: d.exams.map((e) => (examIds.has(e.id) ? { ...e, status: 'Published' as const, updatedAt: now } : e)),
        activity: [...entries.reverse(), ...d.activity],
      }))
      return sheets.length
    },
    [data.resultSets, data.exams],
  )

  const resetDemo = useCallback(() => {
    setData(createSeedData())
  }, [])

  const counts = useMemo(() => {
    const unreleased = data.exams.filter(
      (e) => !e.paperRelease && (e.status === 'Scheduled' || e.status === 'Package Exported'),
    )
    return {
      scheduled: data.exams.filter((e) => e.status === 'Scheduled').length,
      packagesReady: data.exams.filter((e) => e.status === 'Package Exported').length,
      papersPending: unreleased.length,
      papersDue: unreleased.filter((e) => hasStarted(e, now)).length,
      awaitingPublication: data.resultSets.filter(awaitingPublication).length,
    }
  }, [data, now])

  const value: AppStore = {
    ...data,
    log,
    saveExam,
    exportPackage,
    redownloadPackage,
    toggleChecklist,
    importResults,
    publishResultSets,
    releasePaper,
    setAutoRelease,
    simulateExamStart,
    now,
    resetDemo,
    counts,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppStore {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

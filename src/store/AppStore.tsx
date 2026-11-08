import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ACTOR, createSeedData } from '../data/seed'
import { buildPackage, packageFileName, previewPackageId, TRANSFER_STEPS } from '../lib/examPackage'
import { keyChangeImpact } from '../lib/resultFile'
import {
  awaitingPublication,
  recomputeStudents,
  uid,
} from '../lib/utils'
import type {
  ActivityCategory,
  ActivityEntry,
  AppData,
  Exam,
  ExamDraftInput,
  KeyRequest,
  ResultSet,
  StudentResult,
} from '../types'

const STORAGE_KEY = 'coe.demo.data.v1'

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppData
      if (
        Array.isArray(parsed.exams) &&
        Array.isArray(parsed.resultSets) &&
        Array.isArray(parsed.keyRequests) &&
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
  decideKeyRequest: (id: string, decision: 'Approved' | 'Rejected', note: string) => void
  publishResults: (resultSetId: string, recipients: string[]) => void
  resetDemo: () => void
  counts: {
    scheduled: number
    packagesReady: number
    pendingApprovals: number
    awaitingPublication: number
  }
}

const Ctx = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load)

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
        needsRepublish: false,
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

  const decideKeyRequest: AppStore['decideKeyRequest'] = useCallback(
    (id, decision, note) => {
      const req = data.keyRequests.find((k) => k.id === id)
      if (!req || req.status !== 'Pending') return
      const exam = data.exams.find((e) => e.id === req.examId)
      const rs = data.resultSets.find((r) => r.examId === req.examId)
      const now = new Date().toISOString()
      const label = exam ? examName(exam) : req.examId

      let updatedReq: KeyRequest = { ...req, status: decision, decidedAt: now, decisionNote: note }
      let updatedRs: ResultSet | undefined
      let message: string

      if (decision === 'Approved' && rs) {
        const { gained, lost } = keyChangeImpact(rs.students, req.questionId, req.oldKey, req.newKey)
        const answerKey = { ...rs.answerKey, [req.questionId]: req.newKey }
        const wasPublished = rs.publications.length > 0
        updatedRs = {
          ...rs,
          answerKey,
          students: recomputeStudents(rs.students, answerKey),
          needsRepublish: rs.needsRepublish || wasPublished,
        }
        updatedReq = { ...updatedReq, gained, lost }
        message = `Approved key change for ${label} · ${req.questionId} (${req.oldKey} → ${req.newKey}); re-marked by question ID — ${gained} gained, ${lost} lost${wasPublished ? '. Re-publication required' : ''}`
      } else if (decision === 'Approved') {
        message = `Approved key change for ${label} · ${req.questionId} (${req.oldKey} → ${req.newKey})`
      } else {
        message = `Rejected key change for ${label} · ${req.questionId} (${req.oldKey} → ${req.newKey})`
      }

      const entry: ActivityEntry = {
        id: uid('act'),
        at: now,
        category: 'Approval',
        actor: ACTOR,
        examId: req.examId,
        message,
      }
      setData((d) => ({
        ...d,
        keyRequests: d.keyRequests.map((k) => (k.id === id ? updatedReq : k)),
        resultSets: updatedRs ? d.resultSets.map((r) => (r.id === updatedRs!.id ? updatedRs! : r)) : d.resultSets,
        activity: [entry, ...d.activity],
      }))
    },
    [data.keyRequests, data.exams, data.resultSets],
  )

  const publishResults: AppStore['publishResults'] = useCallback(
    (resultSetId, recipients) => {
      const rs = data.resultSets.find((r) => r.id === resultSetId)
      if (!rs) return
      const exam = data.exams.find((e) => e.id === rs.examId)
      const now = new Date().toISOString()
      const version = rs.publications.length + 1
      const republish = rs.publications.length > 0
      const updatedRs: ResultSet = {
        ...rs,
        needsRepublish: false,
        publications: [
          ...rs.publications,
          {
            version,
            at: now,
            recipients,
            kind: republish ? 'Re-publication after correction' : 'Initial publication',
          },
        ],
      }
      const label = exam ? examName(exam) : rs.examId
      const entry: ActivityEntry = {
        id: uid('act'),
        at: now,
        category: 'Publishing',
        actor: ACTOR,
        examId: rs.examId,
        message: `${republish ? 'Re-published corrected results' : 'Published results'} (v${version}) for ${label} to ${recipients.join(' and ')} — simulated, nothing was sent`,
      }
      setData((d) => ({
        ...d,
        resultSets: d.resultSets.map((r) => (r.id === rs.id ? updatedRs : r)),
        exams: d.exams.map((e) => (e.id === rs.examId ? { ...e, status: 'Published', updatedAt: now } : e)),
        activity: [entry, ...d.activity],
      }))
    },
    [data.resultSets, data.exams],
  )

  const resetDemo = useCallback(() => {
    setData(createSeedData())
  }, [])

  const counts = useMemo(
    () => ({
      scheduled: data.exams.filter((e) => e.status === 'Scheduled').length,
      packagesReady: data.exams.filter((e) => e.status === 'Package Exported').length,
      pendingApprovals: data.keyRequests.filter((k) => k.status === 'Pending').length,
      awaitingPublication: data.resultSets.filter(awaitingPublication).length,
    }),
    [data],
  )

  const value: AppStore = {
    ...data,
    log,
    saveExam,
    exportPackage,
    redownloadPackage,
    toggleChecklist,
    importResults,
    decideKeyRequest,
    publishResults,
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

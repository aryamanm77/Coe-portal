export type ExamType = 'IA' | 'SEE'

export type ExamStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Package Exported'
  | 'Results Imported'
  | 'Published'

export const EXAM_STATUSES: ExamStatus[] = [
  'Draft',
  'Scheduled',
  'Package Exported',
  'Results Imported',
  'Published',
]

export interface Exam {
  id: string
  department: string
  subjectCode: string
  subject: string
  classSection: string
  semester: number
  examType: ExamType
  /** Questions in each module; length === DEMO_MODULE_COUNT */
  moduleQuestions: number[]
  /** yyyy-mm-dd (local) */
  date: string
  /** HH:mm (local) */
  startTime: string
  durationMinutes: number
  status: ExamStatus
  createdAt: string
  updatedAt: string
  packageId?: string
  packageCreatedAt?: string
  /** Manual transfer checklist (index 0 mirrors "package exported") */
  transferChecklist: [boolean, boolean, boolean, boolean]
}

export interface ExamDraftInput {
  department: string
  subjectCode: string
  subject: string
  classSection: string
  semester: number | null
  examType: ExamType
  moduleQuestions: number[]
  date: string
  startTime: string
  durationMinutes: number | null
}

export type AttendanceStatus = 'Present' | 'Absent'

export interface StudentResult {
  usn: string
  name: string
  status: AttendanceStatus
  /** questionId -> chosen option (A–D). Empty for absentees. */
  answers: Record<string, string>
  /** Derived from answers + answer key. null for absentees. */
  marks: number | null
}

export interface Publication {
  version: number
  at: string
  recipients: string[]
  kind: 'Initial publication' | 'Re-publication after correction'
}

export interface ResultSet {
  id: string
  examId: string
  fileName: string
  importBatchId: string
  importedAt: string
  /** questionId -> correct option */
  answerKey: Record<string, string>
  students: StudentResult[]
  publications: Publication[]
  /** Set when an approved key correction changed marks after publication */
  needsRepublish: boolean
}

export type KeyRequestStatus = 'Pending' | 'Approved' | 'Rejected'

export interface KeyRequest {
  id: string
  examId: string
  questionId: string
  oldKey: string
  newKey: string
  reason: string
  requestedBy: string
  requestedAt: string
  status: KeyRequestStatus
  decidedAt?: string
  decisionNote?: string
  /** Filled in when approved */
  gained?: number
  lost?: number
}

export type ActivityCategory =
  | 'Schedule'
  | 'Transfer'
  | 'Approval'
  | 'Publishing'
  | 'Session'
  | 'System'

export interface ActivityEntry {
  id: string
  at: string
  category: ActivityCategory
  message: string
  actor: string
  examId?: string
}

export interface AppData {
  exams: Exam[]
  resultSets: ResultSet[]
  keyRequests: KeyRequest[]
  activity: ActivityEntry[]
}

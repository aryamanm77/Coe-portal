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
  /** Publish the question paper to the HOD automatically once the exam has started (simulated). */
  autoReleasePaper: boolean
  /** Demo-only: treat the exam as already started, so the release flow can be tried before the real start time. */
  demoStarted?: boolean
  /** Set once the question paper has been (simulated) published to the HOD. */
  paperRelease?: PaperRelease
}

export interface PaperRelease {
  paperId: string
  releasedAt: string
  mode: 'Automatic' | 'Manual'
  recipient: string
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
  autoReleasePaper: boolean
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
  kind: 'Initial publication'
  /** Shared by every result sheet published in the same bulk action */
  batchId: string
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
}

export type ActivityCategory =
  | 'Schedule'
  | 'Transfer'
  | 'Question Paper'
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
  activity: ActivityEntry[]
}

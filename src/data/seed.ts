import type { ActivityEntry, AppData, Exam, KeyRequest, ResultSet } from '../types'
import { HOD_NAMES } from './catalog'
import { previewPackageId } from '../lib/examPackage'
import {
  buildAnswerKey,
  generateStudents,
  keyChangeImpact,
} from '../lib/resultFile'
import {
  addDays,
  demoHash,
  mulberry32,
  recomputeStudents,
  seedFromString,
  toDateInput,
} from '../lib/utils'

export const ACTOR = 'COE (demo user)'

export function createSeedData(now = new Date()): AppData {
  const iso = (daysOffset: number, hour = 10, minute = 0) => {
    const d = addDays(now, daysOffset)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }
  const day = (offset: number) => toDateInput(addDays(now, offset))

  const base = (
    id: string,
    over: Partial<Exam> & Pick<Exam, 'department' | 'subjectCode' | 'subject' | 'classSection' | 'semester' | 'examType' | 'date' | 'startTime' | 'durationMinutes' | 'status'>,
  ): Exam => ({
    id,
    moduleQuestions: [6, 6, 6, 6, 6],
    createdAt: iso(-20),
    updatedAt: iso(-3),
    transferChecklist: [false, false, false, false],
    ...over,
  })

  const e1 = base('ex-1001', {
    department: 'Computer Science & Engineering', subjectCode: '21CS32', subject: 'Data Structures and Algorithms',
    classSection: '3-A', semester: 3, examType: 'SEE', date: day(6), startTime: '10:00', durationMinutes: 180, status: 'Scheduled',
  })
  const e2: Exam = base('ex-1002', {
    department: 'Information Science & Engineering', subjectCode: '21IS42', subject: 'Database Management Systems',
    classSection: '4-B', semester: 4, examType: 'IA', date: day(2), startTime: '09:30', durationMinutes: 90, status: 'Package Exported',
    packageCreatedAt: iso(-1, 16, 20), transferChecklist: [true, true, false, false],
  })
  e2.packageId = previewPackageId(e2)
  const e3 = base('ex-1003', {
    department: 'Electronics & Communication Engineering', subjectCode: '21EC52', subject: 'Digital Signal Processing',
    classSection: '5-A', semester: 5, examType: 'IA', date: day(9), startTime: '14:00', durationMinutes: 90, status: 'Scheduled',
    moduleQuestions: [6, 6, 6, 4, 4],
  })
  const e4: Exam = base('ex-1004', {
    department: 'Computer Science & Engineering', subjectCode: '21CS52', subject: 'Operating Systems',
    classSection: '5-A', semester: 5, examType: 'IA', date: day(-5), startTime: '10:00', durationMinutes: 90, status: 'Results Imported',
    packageCreatedAt: iso(-9, 11, 5), transferChecklist: [true, true, true, true],
  })
  e4.packageId = previewPackageId(e4)
  const e5: Exam = base('ex-1005', {
    department: 'Mechanical Engineering', subjectCode: '21ME33', subject: 'Basic Thermodynamics',
    classSection: '3-A', semester: 3, examType: 'SEE', date: day(-14), startTime: '10:00', durationMinutes: 180, status: 'Published',
    packageCreatedAt: iso(-18, 15, 40), transferChecklist: [true, true, true, true], moduleQuestions: [6, 6, 6, 6, 6],
  })
  e5.packageId = previewPackageId(e5)
  const e6 = base('ex-1006', {
    department: 'Computer Science & Engineering', subjectCode: '21CS62', subject: 'Computer Networks',
    classSection: '6-B', semester: 6, examType: 'SEE', date: day(20), startTime: '10:00', durationMinutes: 180, status: 'Draft',
    updatedAt: iso(-1),
  })
  const e7 = base('ex-1007', {
    department: 'Electronics & Communication Engineering', subjectCode: '21EC34', subject: 'Analog Electronic Circuits',
    classSection: '3-B', semester: 3, examType: 'IA', date: day(4), startTime: '11:00', durationMinutes: 90, status: 'Scheduled',
    moduleQuestions: [5, 5, 5, 5, 5],
  })
  const exams = [e1, e2, e3, e4, e5, e6, e7]

  /* ----- result sets ----- */
  const makeResultSet = (exam: Exam, id: string, importedAt: string, count: number, absent: number): ResultSet => {
    const rand = mulberry32(seedFromString(`seed-${exam.id}`))
    const answerKey = buildAnswerKey(exam, rand)
    const students = generateStudents(exam, answerKey, rand, count, absent)
    return {
      id,
      examId: exam.id,
      fileName: `results_${exam.subjectCode}_${exam.classSection}_${exam.examType}.json`,
      importBatchId: `BATCH-${demoHash(`seed-batch-${exam.id}`).toUpperCase()}`,
      importedAt,
      answerKey,
      students,
      publications: [],
      needsRepublish: false,
    }
  }

  const rs4 = makeResultSet(e4, 'rs-1004', iso(-3, 14, 10), 27, 3)
  const rs5 = makeResultSet(e5, 'rs-1005', iso(-12, 12, 30), 30, 4)
  rs5.publications = [
    {
      version: 1,
      at: iso(-10, 11, 0),
      recipients: ['HOD — Mechanical Engineering', 'Principal'],
      kind: 'Initial publication',
    },
  ]

  /* ----- key requests (answer keys are aligned so "old" really is the current key) ----- */
  const setKey = (rs: ResultSet, qid: string, key: string) => {
    rs.answerKey[qid] = key
    rs.students = recomputeStudents(rs.students, rs.answerKey)
  }
  const pickOther = (current: string) => (['A', 'B', 'C', 'D'].find((o) => o !== current) as string)

  const k1Old = 'B'
  setKey(rs5, 'M2-Q3', k1Old)
  const k2Old = 'A'
  setKey(rs4, 'M1-Q4', k2Old)
  const k3Old = 'D'
  setKey(rs5, 'M3-Q2', k3Old)
  // approved earlier: key already moved to the new value
  const k4Old = 'A'
  const k4New = 'C'
  const k4Impact = keyChangeImpact(rs4.students, 'M2-Q1', k4Old, k4New)
  setKey(rs4, 'M2-Q1', k4New)
  void pickOther

  const keyRequests: KeyRequest[] = [
    {
      id: 'kr-2001', examId: e5.id, questionId: 'M2-Q3', oldKey: k1Old, newKey: 'C',
      reason: 'Option C is also correct as per Module 2 textbook definition (Ch. 4, p. 112); the question wording is ambiguous.',
      requestedBy: HOD_NAMES[e5.department], requestedAt: iso(-1, 10, 15), status: 'Pending',
    },
    {
      id: 'kr-2002', examId: e4.id, questionId: 'M1-Q4', oldKey: k2Old, newKey: 'D',
      reason: 'Key entered incorrectly during paper setting. Verified against the faculty scheme of evaluation.',
      requestedBy: HOD_NAMES[e4.department], requestedAt: iso(-2, 16, 40), status: 'Pending',
    },
    {
      id: 'kr-2003', examId: e5.id, questionId: 'M3-Q2', oldKey: k3Old, newKey: 'B',
      reason: 'Student representation claims option B is valid.',
      requestedBy: HOD_NAMES[e5.department], requestedAt: iso(-9, 9, 5), status: 'Rejected',
      decidedAt: iso(-8, 12, 0), decisionNote: 'Scheme of evaluation confirms D. No change.',
    },
    {
      id: 'kr-2004', examId: e4.id, questionId: 'M2-Q1', oldKey: k4Old, newKey: k4New,
      reason: 'Typographical error in option text made A incorrect.',
      requestedBy: HOD_NAMES[e4.department], requestedAt: iso(-4, 11, 0), status: 'Approved',
      decidedAt: iso(-4, 15, 30), gained: k4Impact.gained, lost: k4Impact.lost,
      decisionNote: 'Approved and re-marked by question ID.',
    },
  ]

  /* ----- activity ----- */
  let n = 0
  const act = (
    daysOffset: number, hour: number, minute: number,
    category: ActivityEntry['category'], message: string, examId?: string,
  ): ActivityEntry => ({
    id: `act-seed-${++n}`, at: iso(daysOffset, hour, minute), category, message, actor: ACTOR, examId,
  })

  const activity: ActivityEntry[] = [
    act(-18, 15, 40, 'Transfer', `Exported package ${e5.packageId} for Basic Thermodynamics (3-A, SEE)`, e5.id),
    act(-12, 12, 30, 'Transfer', 'Imported results file for Basic Thermodynamics (3-A, SEE) — 30 students', e5.id),
    act(-10, 11, 0, 'Publishing', 'Published results for Basic Thermodynamics to HOD — Mechanical Engineering and Principal', e5.id),
    act(-9, 11, 5, 'Transfer', `Exported package ${e4.packageId} for Operating Systems (5-A, IA)`, e4.id),
    act(-4, 15, 30, 'Approval', 'Approved key change for Operating Systems · M2-Q1 (A → C), re-marked by question ID', e4.id),
    act(-3, 14, 10, 'Transfer', 'Imported results file for Operating Systems (5-A, IA) — 27 students', e4.id),
    act(-3, 9, 0, 'Schedule', 'Scheduled Analog Electronic Circuits (3-B, IA)', e7.id),
    act(-2, 10, 20, 'Schedule', 'Scheduled Data Structures and Algorithms (3-A, SEE)', e1.id),
    act(-1, 16, 20, 'Transfer', `Exported package ${e2.packageId} for Database Management Systems (4-B, IA)`, e2.id),
    act(-1, 11, 10, 'Schedule', 'Saved draft for Computer Networks (6-B, SEE)', e6.id),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return { exams, resultSets: [rs4, rs5], keyRequests, activity }
}

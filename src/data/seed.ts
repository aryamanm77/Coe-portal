import type { ActivityEntry, AppData, Exam, ResultSet } from '../types'
import { DEPARTMENT_SHORT } from './catalog'
import { previewPackageId } from '../lib/examPackage'
import { paperIdFor } from '../lib/questionPaper'
import { buildAnswerKey, generateStudents } from '../lib/resultFile'
import { addDays, demoHash, mulberry32, seedFromString, toDateInput } from '../lib/utils'

export const ACTOR = 'COE (demo user)'

export function createSeedData(now = new Date()): AppData {
  const iso = (daysOffset: number, hour = 10, minute = 0) => {
    const d = addDays(now, daysOffset)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }
  const day = (offset: number) => toDateInput(addDays(now, offset))

  type Required = 'department' | 'subjectCode' | 'subject' | 'classSection' | 'semester' | 'examType' | 'date' | 'startTime' | 'durationMinutes' | 'status'
  const base = (id: string, over: Partial<Exam> & Pick<Exam, Required>): Exam => ({
    id,
    moduleQuestions: [6, 6, 6, 6, 6],
    createdAt: iso(-20),
    updatedAt: iso(-3),
    transferChecklist: [false, false, false, false],
    autoReleasePaper: true,
    ...over,
  })

  /** A finished exam: package exported, paper already released to the HOD at its start time. */
  const past = (id: string, over: Partial<Exam> & Pick<Exam, Required>, daysAgo: number): Exam => {
    const e = base(id, {
      packageCreatedAt: iso(daysAgo - 3, 11, 5),
      transferChecklist: [true, true, true, true],
      ...over,
    })
    e.packageId = previewPackageId(e)
    const [h, m] = e.startTime.split(':').map(Number)
    e.paperRelease = {
      paperId: paperIdFor(e),
      releasedAt: iso(-daysAgo, h, m + 1),
      mode: 'Automatic',
      recipient: `HOD — ${e.department}`,
    }
    return e
  }

  /* ----- upcoming / draft exams ----- */
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
  // Started ~20 minutes ago, auto-release switched off → shows "Ready to publish" so the manual release can be tried.
  const startedAt = new Date(now.getTime() - 20 * 60000)
  const e14 = base('ex-1014', {
    department: 'Information Science & Engineering', subjectCode: '21IS53', subject: 'Software Engineering',
    classSection: '5-A', semester: 5, examType: 'IA', date: toDateInput(startedAt),
    startTime: `${String(startedAt.getHours()).padStart(2, '0')}:${String(startedAt.getMinutes()).padStart(2, '0')}`,
    durationMinutes: 90, status: 'Scheduled', autoReleasePaper: false, updatedAt: iso(-1),
  })

  /* ----- finished exams with imported / published results (several years, departments, sections) ----- */
  const e4 = past('ex-1004', {
    department: 'Computer Science & Engineering', subjectCode: '21CS52', subject: 'Operating Systems',
    classSection: '5-A', semester: 5, examType: 'IA', date: day(-5), startTime: '10:00', durationMinutes: 90, status: 'Results Imported',
  }, 5)
  const e8 = past('ex-1008', {
    department: 'Computer Science & Engineering', subjectCode: '21CS52', subject: 'Operating Systems',
    classSection: '5-B', semester: 5, examType: 'IA', date: day(-5), startTime: '14:00', durationMinutes: 90, status: 'Results Imported',
  }, 5)
  const e5 = past('ex-1005', {
    department: 'Mechanical Engineering', subjectCode: '21ME33', subject: 'Basic Thermodynamics',
    classSection: '3-A', semester: 3, examType: 'SEE', date: day(-14), startTime: '10:00', durationMinutes: 180, status: 'Published',
  }, 14)
  const e9 = past('ex-1009', {
    department: 'Electronics & Communication Engineering', subjectCode: '21EC34', subject: 'Analog Electronic Circuits',
    classSection: '3-A', semester: 3, examType: 'IA', date: day(-6), startTime: '10:00', durationMinutes: 90, status: 'Results Imported',
  }, 6)
  const e10 = past('ex-1010', {
    department: 'Information Science & Engineering', subjectCode: '21IS63', subject: 'Information Security',
    classSection: '6-A', semester: 6, examType: 'SEE', date: day(-4), startTime: '10:00', durationMinutes: 180, status: 'Results Imported',
  }, 4)
  const e11 = past('ex-1011', {
    department: 'Computer Science & Engineering', subjectCode: '21MA11', subject: 'Calculus and Differential Equations',
    classSection: '1-A', semester: 1, examType: 'IA', date: day(-7), startTime: '10:00', durationMinutes: 90, status: 'Results Imported',
  }, 7)
  const e12 = past('ex-1012', {
    department: 'Information Science & Engineering', subjectCode: '21IS71', subject: 'Big Data Analytics',
    classSection: '7-A', semester: 7, examType: 'IA', date: day(-3), startTime: '10:00', durationMinutes: 90, status: 'Results Imported',
  }, 3)
  const e13 = past('ex-1013', {
    department: 'Mechanical Engineering', subjectCode: '21ME45', subject: 'Fluid Mechanics',
    classSection: '4-A', semester: 4, examType: 'IA', date: day(-10), startTime: '10:00', durationMinutes: 90, status: 'Published',
  }, 10)
  const e15 = past('ex-1015', {
    department: 'Information Science & Engineering', subjectCode: '21PH22', subject: 'Engineering Physics',
    classSection: '2-B', semester: 2, examType: 'IA', date: day(-8), startTime: '10:00', durationMinutes: 90, status: 'Results Imported',
  }, 8)

  const exams = [e14, e1, e2, e3, e7, e6, e4, e8, e9, e10, e11, e12, e5, e13, e15]

  /* ----- result sets ----- */
  const makeResultSet = (exam: Exam, importedDaysAgo: number, count: number, absent: number): ResultSet => {
    const rand = mulberry32(seedFromString(`seed-${exam.id}`))
    const answerKey = buildAnswerKey(exam, rand)
    const students = generateStudents(exam, answerKey, rand, count, absent)
    return {
      id: `rs-${exam.id.slice(3)}`,
      examId: exam.id,
      fileName: `results_${exam.subjectCode}_${exam.classSection}_${exam.examType}.json`,
      importBatchId: `BATCH-${demoHash(`seed-batch-${exam.id}`).toUpperCase()}`,
      importedAt: iso(-importedDaysAgo, 14, 10),
      answerKey,
      students,
      publications: [],
    }
  }

  const publish = (rs: ResultSet, exam: Exam, daysAgo: number) => {
    rs.publications = [
      {
        version: 1,
        at: iso(-daysAgo, 11, 0),
        recipients: [`HOD — ${exam.department}`, 'Principal'],
        kind: 'Initial publication',
        batchId: `PUB-${demoHash(`seed-pub-${exam.id}`).toUpperCase().slice(0, 6)}`,
      },
    ]
  }

  const rs4 = makeResultSet(e4, 3, 58, 5)
  const rs8 = makeResultSet(e8, 3, 54, 4)
  const rs5 = makeResultSet(e5, 12, 60, 6)
  const rs9 = makeResultSet(e9, 4, 52, 3)
  const rs10 = makeResultSet(e10, 2, 48, 4)
  const rs11 = makeResultSet(e11, 5, 62, 5)
  const rs12 = makeResultSet(e12, 1, 44, 2)
  const rs13 = makeResultSet(e13, 8, 56, 4)
  const rs15 = makeResultSet(e15, 6, 40, 3)
  publish(rs5, e5, 10)
  publish(rs13, e13, 7)
  const resultSets = [rs4, rs8, rs9, rs10, rs11, rs12, rs15, rs5, rs13]

  /* ----- activity ----- */
  let n = 0
  const act = (
    daysOffset: number, hour: number, minute: number,
    category: ActivityEntry['category'], message: string, examId?: string,
  ): ActivityEntry => ({
    id: `act-seed-${++n}`, at: iso(daysOffset, hour, minute), category, message, actor: ACTOR, examId,
  })
  const label = (e: Exam) => `${e.subject} (${e.classSection}, ${e.examType})`
  const hod = (e: Exam) => `HOD — ${DEPARTMENT_SHORT[e.department]}`

  const activity: ActivityEntry[] = [
    act(-14, 10, 1, 'Question Paper', `Question paper ${e5.paperRelease?.paperId} released to ${hod(e5)} at exam start (automatic, simulated)`, e5.id),
    act(-12, 12, 30, 'Transfer', `Imported results file for ${label(e5)} — ${rs5.students.length} students`, e5.id),
    act(-10, 11, 0, 'Publishing', `Published results for ${label(e5)} to ${hod(e5)} and Principal`, e5.id),
    act(-10, 10, 1, 'Question Paper', `Question paper ${e13.paperRelease?.paperId} released to ${hod(e13)} at exam start (automatic, simulated)`, e13.id),
    act(-7, 11, 0, 'Publishing', `Published results for ${label(e13)} to ${hod(e13)} and Principal`, e13.id),
    act(-5, 10, 1, 'Question Paper', `Question paper ${e4.paperRelease?.paperId} released to ${hod(e4)} at exam start (automatic, simulated)`, e4.id),
    act(-3, 14, 10, 'Transfer', `Imported results file for ${label(e4)} — ${rs4.students.length} students`, e4.id),
    act(-3, 14, 20, 'Transfer', `Imported results file for ${label(e8)} — ${rs8.students.length} students`, e8.id),
    act(-3, 9, 0, 'Schedule', `Scheduled ${label(e7)}`, e7.id),
    act(-2, 10, 20, 'Schedule', `Scheduled ${label(e1)}`, e1.id),
    act(-1, 16, 20, 'Transfer', `Exported package ${e2.packageId} for ${label(e2)}`, e2.id),
    act(-1, 11, 10, 'Schedule', `Saved draft for ${label(e6)}`, e6.id),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return { exams, resultSets, activity }
}

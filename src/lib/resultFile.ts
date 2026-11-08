import { DEPARTMENT_SHORT, STUDENT_NAMES } from '../data/catalog'
import type { Exam, ResultSet, StudentResult } from '../types'
import {
  computeMarks,
  demoHash,
  mulberry32,
  questionIds,
  seedFromString,
  stableStringify,
  totalQuestions,
} from './utils'

const OPTIONS = ['A', 'B', 'C', 'D']

export const RESULT_FILE_TYPE = 'exam-results-demo'
export const INTEGRITY_METHOD = 'FNV-1a demo checksum (not cryptographic)'

export function buildAnswerKey(exam: Exam, rand: () => number): Record<string, string> {
  const key: Record<string, string> = {}
  for (const qid of questionIds(exam)) key[qid] = OPTIONS[Math.floor(rand() * 4)]
  return key
}

export function generateStudents(
  exam: Exam,
  answerKey: Record<string, string>,
  rand: () => number,
  count: number,
  absentCount: number,
): StudentResult[] {
  const short = DEPARTMENT_SHORT[exam.department] ?? 'XX'
  const absentIdx = new Set<number>()
  while (absentIdx.size < absentCount) absentIdx.add(Math.floor(rand() * count))

  return Array.from({ length: count }, (_, i) => {
    const usn = `1CE22${short}${String(i + 1).padStart(3, '0')}`
    const name = STUDENT_NAMES[i % STUDENT_NAMES.length]
    if (absentIdx.has(i)) {
      return { usn, name, status: 'Absent' as const, answers: {}, marks: null }
    }
    const strength = 0.45 + rand() * 0.5
    const answers: Record<string, string> = {}
    for (const [qid, correct] of Object.entries(answerKey)) {
      if (rand() < strength) answers[qid] = correct
      else {
        const wrong = OPTIONS.filter((o) => o !== correct)
        answers[qid] = wrong[Math.floor(rand() * wrong.length)]
      }
    }
    return { usn, name, status: 'Present' as const, answers, marks: computeMarks(answers, answerKey) }
  })
}

export function keyChangeImpact(
  students: StudentResult[],
  qid: string,
  oldKey: string,
  newKey: string,
): { gained: number; lost: number } {
  let gained = 0
  let lost = 0
  for (const s of students) {
    if (s.status !== 'Present') continue
    if (s.answers[qid] === newKey && oldKey !== newKey) gained++
    if (s.answers[qid] === oldKey && oldKey !== newKey) lost++
  }
  return { gained, lost }
}

/* ---------- result-file building ---------- */

interface ResultFileBody {
  examId: string
  packageId: string
  importBatchId: string
  answerKey: Record<string, string>
  students: Array<Pick<StudentResult, 'usn' | 'name' | 'status' | 'answers'>>
}

export function resultChecksum(body: ResultFileBody): string {
  return demoHash(
    stableStringify({
      examId: body.examId,
      packageId: body.packageId,
      importBatchId: body.importBatchId,
      answerKey: body.answerKey,
      students: body.students.map((s) => ({
        usn: s.usn,
        name: s.name,
        status: s.status,
        answers: s.answers,
      })),
    }),
  )
}

export function sampleFileName(exam: Exam, tampered = false): string {
  return `results_${exam.subjectCode}_${exam.classSection}_${exam.examType}${tampered ? '_TAMPERED' : ''}.json`
}

export function buildSampleResultFile(exam: Exam, tamper = false): string {
  const rand = mulberry32(seedFromString(`sample-${exam.id}`))
  const answerKey = buildAnswerKey(exam, rand)
  const students = generateStudents(exam, answerKey, rand, 24, 3).map((s) => ({
    usn: s.usn,
    name: s.name,
    status: s.status,
    answers: s.answers,
  }))
  const body: ResultFileBody = {
    examId: exam.id,
    packageId: exam.packageId ?? '',
    importBatchId: `BATCH-${demoHash(`batch-${exam.id}`).toUpperCase()}`,
    answerKey,
    students,
  }
  const checksum = resultChecksum(body)

  if (tamper) {
    // Change one answer AFTER the checksum was computed → integrity check must fail.
    const victim = students.find((s) => s.status === 'Present')
    if (victim) {
      const qid = Object.keys(victim.answers)[0]
      victim.answers[qid] = victim.answers[qid] === 'A' ? 'B' : 'A'
    }
  }

  return JSON.stringify(
    {
      type: RESULT_FILE_TYPE,
      schemaVersion: 1,
      notice:
        'Demo result file for the COE portal prototype. Checksum is a simple demo hash, not a digital signature.',
      ...body,
      generatedAt: new Date().toISOString(),
      integrity: { method: INTEGRITY_METHOD, value: checksum },
    },
    null,
    2,
  )
}

/* ---------- validation (simulation) ---------- */

export type CheckState = 'pass' | 'fail' | 'skipped'

export interface ImportCheck {
  id: string
  label: string
  state: CheckState
  detail: string
}

export interface ImportValidation {
  checks: ImportCheck[]
  ok: boolean
  exam?: Exam
  importBatchId?: string
  answerKey?: Record<string, string>
  students?: StudentResult[]
}

const MAX_FILE_BYTES = 2 * 1024 * 1024

export function validateResultFile(
  text: string,
  fileName: string,
  size: number,
  exams: Exam[],
  resultSets: ResultSet[],
): ImportValidation {
  const checks: ImportCheck[] = [
    { id: 'json', label: 'File is readable JSON', state: 'skipped', detail: '' },
    { id: 'format', label: 'Matches the demo result-file format', state: 'skipped', detail: '' },
    { id: 'package', label: 'Exam and package ID match an exported package', state: 'skipped', detail: '' },
    { id: 'integrity', label: 'Integrity checksum matches (simulation)', state: 'skipped', detail: '' },
    { id: 'students', label: 'Student records are complete', state: 'skipped', detail: '' },
    { id: 'dupes', label: 'No duplicate students inside the file', state: 'skipped', detail: '' },
    { id: 'already', label: 'Not imported before (duplicate guard)', state: 'skipped', detail: '' },
  ]
  const set = (id: string, state: CheckState, detail: string) => {
    const c = checks.find((x) => x.id === id)!
    c.state = state
    c.detail = detail
  }
  const finish = (extra: Partial<ImportValidation> = {}): ImportValidation => ({
    checks,
    ok: checks.every((c) => c.state === 'pass'),
    ...extra,
  })

  if (!fileName.toLowerCase().endsWith('.json')) {
    set('json', 'fail', 'Only .json files are accepted.')
    return finish()
  }
  if (size > MAX_FILE_BYTES) {
    set('json', 'fail', 'File is larger than the 2 MB demo limit.')
    return finish()
  }

  let data: unknown
  try {
    data = JSON.parse(text)
    set('json', 'pass', `${fileName} parsed successfully.`)
  } catch {
    set('json', 'fail', 'The file is not valid JSON.')
    return finish()
  }

  const d = data as Record<string, unknown>
  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)

  const missing: string[] = []
  if (!isObj(d)) missing.push('top-level object')
  else {
    if (d.type !== RESULT_FILE_TYPE) missing.push(`type = "${RESULT_FILE_TYPE}"`)
    if (typeof d.examId !== 'string') missing.push('examId')
    if (typeof d.packageId !== 'string') missing.push('packageId')
    if (typeof d.importBatchId !== 'string') missing.push('importBatchId')
    if (!isObj(d.answerKey)) missing.push('answerKey')
    if (!Array.isArray(d.students)) missing.push('students[]')
    if (!isObj(d.integrity) || typeof (d.integrity as Record<string, unknown>).value !== 'string')
      missing.push('integrity.value')
  }
  if (missing.length) {
    set('format', 'fail', `Missing or invalid: ${missing.join(', ')}.`)
    return finish()
  }
  set('format', 'pass', 'All required fields are present.')

  const examId = d.examId as string
  const packageId = d.packageId as string
  const batchId = d.importBatchId as string
  const answerKey = d.answerKey as Record<string, string>
  const rawStudents = d.students as unknown[]

  // package / exam match
  const exam = exams.find((e) => e.id === examId)
  if (!exam) {
    set('package', 'fail', `No exam with ID ${examId} exists in this portal.`)
  } else if (!exam.packageId) {
    set('package', 'fail', `A package has not been exported for "${exam.subject}" yet.`)
  } else if (exam.packageId !== packageId) {
    set('package', 'fail', `Package ID ${packageId} does not match the exported package ${exam.packageId}.`)
  } else {
    const expected = questionIds(exam)
    const keys = Object.keys(answerKey)
    const sameSet = expected.length === keys.length && expected.every((q) => keys.includes(q))
    if (!sameSet) {
      set(
        'package',
        'fail',
        `Answer key must cover exactly the ${totalQuestions(exam)} question IDs of the exported exam.`,
      )
    } else {
      set('package', 'pass', `Matches ${exam.subject} (${exam.classSection}, ${exam.examType}) — ${packageId}.`)
    }
  }

  // integrity
  const students = rawStudents as StudentResult[]
  const claimed = (d.integrity as Record<string, unknown>).value as string
  const actual = resultChecksum({
    examId,
    packageId,
    importBatchId: batchId,
    answerKey,
    students: students as ResultFileBody['students'],
  })
  if (claimed === actual) {
    set('integrity', 'pass', `Checksum ${actual} matches. (Simulation — not a cryptographic signature.)`)
  } else {
    set(
      'integrity',
      'fail',
      `Checksum mismatch (file says ${claimed}, content computes ${actual}). The file may have been modified after it was generated.`,
    )
  }

  // student records
  const problems: string[] = []
  rawStudents.forEach((s, i) => {
    if (!isObj(s)) {
      problems.push(`row ${i + 1} is not an object`)
      return
    }
    if (typeof s.usn !== 'string' || !s.usn.trim()) problems.push(`row ${i + 1}: usn`)
    else if (typeof s.name !== 'string' || !s.name.trim()) problems.push(`${s.usn}: name`)
    else if (s.status !== 'Present' && s.status !== 'Absent') problems.push(`${s.usn}: status must be Present or Absent`)
    else if (s.status === 'Present') {
      const ans = s.answers
      if (!isObj(ans)) problems.push(`${s.usn}: answers missing`)
      else if (Object.values(ans).some((v) => !OPTIONS.includes(String(v)))) problems.push(`${s.usn}: answers must be A–D`)
    }
  })
  if (rawStudents.length === 0) problems.push('no student records')
  if (problems.length) {
    set('students', 'fail', `${problems.length} problem(s): ${problems.slice(0, 3).join('; ')}${problems.length > 3 ? '…' : ''}.`)
  } else {
    set('students', 'pass', `${rawStudents.length} student records are well-formed.`)
  }

  // duplicates inside file
  if (problems.length) {
    set('dupes', 'skipped', 'Skipped because student records are invalid.')
  } else {
    const seen = new Set<string>()
    const dupes = new Set<string>()
    for (const s of students) {
      const k = s.usn.trim().toUpperCase()
      if (seen.has(k)) dupes.add(k)
      seen.add(k)
    }
    if (dupes.size) set('dupes', 'fail', `Duplicate USN(s): ${[...dupes].slice(0, 4).join(', ')}.`)
    else set('dupes', 'pass', 'Every USN appears once.')
  }

  // already imported
  const byBatch = resultSets.find((r) => r.importBatchId === batchId)
  const byExam = exam ? resultSets.find((r) => r.examId === exam.id) : undefined
  if (byBatch) set('already', 'fail', `Batch ${batchId} was already imported on ${new Date(byBatch.importedAt).toLocaleString('en-IN')}. Duplicate blocked.`)
  else if (byExam) set('already', 'fail', `Results for this exam were already imported (${byExam.fileName}). Duplicate blocked.`)
  else if (!exam) set('already', 'skipped', 'Skipped because the exam could not be matched.')
  else set('already', 'pass', `Batch ${batchId} has not been imported before.`)

  const out = finish()
  if (out.ok && exam) {
    out.exam = exam
    out.importBatchId = batchId
    out.answerKey = answerKey
    out.students = students.map((s) => ({
      usn: s.usn.trim(),
      name: s.name.trim(),
      status: s.status,
      answers: s.status === 'Present' ? s.answers : {},
      marks: s.status === 'Present' ? computeMarks(s.answers, answerKey) : null,
    }))
  }
  return out
}

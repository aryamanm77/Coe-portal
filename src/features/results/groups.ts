import { DEPARTMENT_SHORT } from '../../data/catalog'
import type { Exam, ResultSet, StudentResult } from '../../types'
import { isPublished, resultSummary, sectionOf, totalQuestions, yearOfSemester } from '../../lib/utils'

export interface SheetRow {
  rs: ResultSet
  exam: Exam
  year: number
  dept: string
  deptShort: string
  section: string
  max: number
  total: number
  present: number
  absent: number
  average: number
  passed: number
  published: boolean
}

export function buildRows(resultSets: ResultSet[], exams: Exam[]): SheetRow[] {
  const rows: SheetRow[] = []
  for (const rs of resultSets) {
    const exam = exams.find((e) => e.id === rs.examId)
    if (!exam) continue
    const max = totalQuestions(exam)
    const sum = resultSummary(rs, max)
    rows.push({
      rs,
      exam,
      year: yearOfSemester(exam.semester),
      dept: exam.department,
      deptShort: DEPARTMENT_SHORT[exam.department] ?? exam.department,
      section: sectionOf(exam.classSection),
      max,
      total: sum.total,
      present: sum.present,
      absent: sum.absent,
      average: sum.average,
      passed: sum.passed,
      published: isPublished(rs),
    })
  }
  return rows
}

export interface Filters {
  year: string
  dept: string
  section: string
  status: '' | 'Awaiting' | 'Published'
}

export const NO_FILTERS: Filters = { year: '', dept: '', section: '', status: '' }

export function applyFilters(rows: SheetRow[], f: Filters): SheetRow[] {
  return rows.filter((r) => {
    if (f.year && String(r.year) !== f.year) return false
    if (f.dept && r.dept !== f.dept) return false
    if (f.section && r.section !== f.section) return false
    if (f.status === 'Awaiting' && r.published) return false
    if (f.status === 'Published' && !r.published) return false
    return true
  })
}

export interface DeptGroup {
  dept: string
  deptShort: string
  rows: SheetRow[]
  students: number
}
export interface YearGroup {
  year: number
  students: number
  sheets: number
  depts: DeptGroup[]
}

/** Year → Department → Section hierarchy (sections are the rows inside each department). */
export function groupRows(rows: SheetRow[]): YearGroup[] {
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b)
  return years.map((year) => {
    const inYear = rows.filter((r) => r.year === year)
    const depts = [...new Set(inYear.map((r) => r.dept))].sort().map((dept) => {
      const list = inYear
        .filter((r) => r.dept === dept)
        .sort((a, b) => a.section.localeCompare(b.section) || a.exam.subject.localeCompare(b.exam.subject))
      return { dept, deptShort: list[0].deptShort, rows: list, students: list.reduce((a, r) => a + r.total, 0) }
    })
    return {
      year,
      students: inYear.reduce((a, r) => a + r.total, 0),
      sheets: inYear.length,
      depts,
    }
  })
}

export interface StudentRecord extends StudentResult {
  year: number
  dept: string
  deptShort: string
  section: string
  subject: string
  subjectCode: string
  examType: string
  max: number
  published: boolean
  sheetId: string
}

export function flattenStudents(rows: SheetRow[]): StudentRecord[] {
  return rows.flatMap((r) =>
    r.rs.students.map((s) => ({
      ...s,
      year: r.year,
      dept: r.dept,
      deptShort: r.deptShort,
      section: r.section,
      subject: r.exam.subject,
      subjectCode: r.exam.subjectCode,
      examType: r.exam.examType,
      max: r.max,
      published: r.published,
      sheetId: r.rs.id,
    })),
  )
}

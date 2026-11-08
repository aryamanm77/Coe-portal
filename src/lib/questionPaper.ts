import type { Exam } from '../types'
import { demoHash, totalQuestions } from './utils'

export const PAPER_NOTICE =
  'Demo question paper generated in the browser with placeholder questions. It is not real exam content and nothing is sent to the HOD.'

export function paperIdFor(exam: Pick<Exam, 'id' | 'subjectCode' | 'classSection' | 'examType'>): string {
  return `QP-${exam.subjectCode}-${exam.classSection}-${exam.examType}-${demoHash(`paper-${exam.id}`).toUpperCase().slice(0, 4)}`
}

export interface PaperQuestion {
  id: string
  number: number
  text: string
  options: Record<'A' | 'B' | 'C' | 'D', string>
}

export interface PaperModule {
  module: number
  questions: PaperQuestion[]
}

export function buildPaperModules(exam: Pick<Exam, 'subject' | 'moduleQuestions'>): PaperModule[] {
  return exam.moduleQuestions.map((count, mi) => ({
    module: mi + 1,
    questions: Array.from({ length: count }, (_, qi) => ({
      id: `M${mi + 1}-Q${qi + 1}`,
      number: qi + 1,
      text: `Placeholder question ${qi + 1} on Module ${mi + 1} of ${exam.subject}.`,
      options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
    })),
  }))
}

export function buildPaperFile(exam: Exam, paperId: string, generatedAt: string): string {
  return JSON.stringify(
    {
      type: 'question-paper-demo',
      notice: PAPER_NOTICE,
      paperId,
      generatedAt,
      exam: {
        id: exam.id,
        department: exam.department,
        subjectCode: exam.subjectCode,
        subject: exam.subject,
        classSection: exam.classSection,
        semester: exam.semester,
        examType: exam.examType,
        date: exam.date,
        startTime: exam.startTime,
        durationMinutes: exam.durationMinutes,
        totalQuestions: totalQuestions(exam),
      },
      modules: buildPaperModules(exam),
    },
    null,
    2,
  )
}

export function paperFileName(exam: Exam, paperId: string): string {
  return `${paperId}_${exam.subjectCode}_${exam.classSection}.json`
}

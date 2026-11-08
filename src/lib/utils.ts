import type { Exam, ResultSet, StudentResult } from '../types'

/** The source workflow does not specify a module count — 5 is a demo assumption. */
export const DEMO_MODULE_COUNT = 5
export const DEFAULT_QUESTIONS_PER_MODULE = 6
export const DEMO_PASS_PERCENT = 40

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`
}

/** Non-cryptographic FNV-1a hash — used ONLY for demo checksums. */
export function demoHash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`
}

/** Small deterministic PRNG so seeded / sample data is stable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedFromString(s: string): number {
  return parseInt(demoHash(s), 16)
}

/* ---------- dates ---------- */

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export function examStart(exam: Pick<Exam, 'date' | 'startTime'>): Date {
  return new Date(`${exam.date}T${exam.startTime || '00:00'}`)
}

export function formatDate(date: string): string {
  if (!date) return '—'
  const d = new Date(`${date}T00:00`)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(time: string): string {
  if (!time) return '—'
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  return `${day} day${day === 1 ? '' : 's'} ago`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/* ---------- exam helpers ---------- */

export function totalQuestions(exam: Pick<Exam, 'moduleQuestions'>): number {
  return exam.moduleQuestions.reduce((a, b) => a + b, 0)
}

export function questionIds(exam: Pick<Exam, 'moduleQuestions'>): string[] {
  const ids: string[] = []
  exam.moduleQuestions.forEach((count, mi) => {
    for (let q = 1; q <= count; q++) ids.push(`M${mi + 1}-Q${q}`)
  })
  return ids
}

export function examLabel(exam: Exam): string {
  return `${exam.subject} · ${exam.classSection} · ${exam.examType}`
}

/* ---------- results helpers ---------- */

export function computeMarks(
  answers: Record<string, string>,
  answerKey: Record<string, string>,
): number {
  let marks = 0
  for (const [qid, correct] of Object.entries(answerKey)) {
    if (answers[qid] === correct) marks++
  }
  return marks
}

export function recomputeStudents(
  students: StudentResult[],
  answerKey: Record<string, string>,
): StudentResult[] {
  return students.map((s) =>
    s.status === 'Present' ? { ...s, marks: computeMarks(s.answers, answerKey) } : s,
  )
}

export function resultSummary(rs: ResultSet, maxMarks: number) {
  const present = rs.students.filter((s) => s.status === 'Present')
  const absent = rs.students.length - present.length
  const marks = present.map((s) => s.marks ?? 0)
  const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0
  const passed = marks.filter((m) => (m / maxMarks) * 100 >= DEMO_PASS_PERCENT).length
  return {
    total: rs.students.length,
    present: present.length,
    absent,
    average: avg,
    passed,
    highest: marks.length ? Math.max(...marks) : 0,
    lowest: marks.length ? Math.min(...marks) : 0,
    maxMarks,
  }
}

export function isPublished(rs: ResultSet): boolean {
  return rs.publications.length > 0
}

export function awaitingPublication(rs: ResultSet): boolean {
  return !isPublished(rs) || rs.needsRepublish
}

/* ---------- downloads ---------- */

export function downloadFile(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toCsv(rows: Array<Array<string | number | null>>): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = cell === null ? '' : String(cell)
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(','),
    )
    .join('\n')
}

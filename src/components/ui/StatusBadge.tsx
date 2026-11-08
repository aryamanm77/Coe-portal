import {
  CalendarCheck,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileDown,
  Package,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cx } from '../../lib/utils'

type Tone = 'neutral' | 'navy' | 'green' | 'amber' | 'red'

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-300',
  navy: 'bg-navsel text-navy-2 border-[#C6D6EA]',
  green: 'bg-green-50 text-green-800 border-green-200',
  amber: 'bg-amber-50 text-amber-900 border-amber-300',
  red: 'bg-red-50 text-red-800 border-red-200',
}

const MAP: Record<string, { tone: Tone; icon: LucideIcon }> = {
  Draft: { tone: 'neutral', icon: CircleDashed },
  Scheduled: { tone: 'navy', icon: CalendarCheck },
  'Package Exported': { tone: 'navy', icon: Package },
  'Results Imported': { tone: 'amber', icon: FileDown },
  Published: { tone: 'green', icon: CheckCircle2 },
  Pending: { tone: 'amber', icon: Clock },
  Approved: { tone: 'green', icon: CheckCircle2 },
  Rejected: { tone: 'red', icon: XCircle },
  Present: { tone: 'green', icon: CheckCircle2 },
  Absent: { tone: 'red', icon: XCircle },
  'Not published': { tone: 'amber', icon: Clock },
  'Correction pending re-publish': { tone: 'amber', icon: Clock },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const m = MAP[status] ?? { tone: 'neutral' as Tone, icon: CircleDashed }
  const Icon = m.icon
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[m.tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {status}
    </span>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={cx('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold', tones[tone])}>
      {children}
    </span>
  )
}

import { CalendarPlus, ClipboardCheck, FileText, LogIn, Settings2, Usb, type LucideIcon } from 'lucide-react'
import type { ActivityCategory } from '../../types'

export const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  Schedule: CalendarPlus,
  Transfer: Usb,
  'Question Paper': FileText,
  Publishing: ClipboardCheck,
  Session: LogIn,
  System: Settings2,
}

export function CategoryIcon({ category, className = 'h-4 w-4' }: { category: ActivityCategory; className?: string }) {
  const Icon = CATEGORY_ICONS[category]
  return <Icon className={className} aria-hidden="true" />
}

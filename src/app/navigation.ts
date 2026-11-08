import {
  CalendarPlus,
  ClipboardCheck,
  History,
  KeyRound,
  LayoutDashboard,
  Usb,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  title: string
  icon: LucideIcon
  badgeKey?: 'pendingApprovals' | 'awaitingPublication'
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { path: '/schedule-exam', label: 'Schedule Exam', title: 'Schedule Exam', icon: CalendarPlus },
  { path: '/file-transfer', label: 'File Transfer', title: 'File Transfer', icon: Usb },
  { path: '/key-approvals', label: 'Key Approvals', title: 'Key Approvals', icon: KeyRound, badgeKey: 'pendingApprovals' },
  {
    path: '/results',
    label: 'Results & Publishing',
    title: 'Results & Publishing',
    icon: ClipboardCheck,
    badgeKey: 'awaitingPublication',
  },
  { path: '/activity-log', label: 'Activity Log', title: 'Activity Log', icon: History },
]

import { useMemo } from 'react'
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  ClipboardCheck,
  KeyRound,
  Package,
  PackageCheck,
  Send,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { LinkButton } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState, TableWrap, Td, Th } from '../../components/ui/Misc'
import { Pill, StatusBadge } from '../../components/ui/StatusBadge'
import { examStart, formatDate, formatTime, relativeTime } from '../../lib/utils'
import { useApp } from '../../store/AppStore'
import { CategoryIcon } from '../activity/CategoryIcon'

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
}: {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  to: string
}) {
  return (
    <Link
      to={to}
      className="group block rounded-card border border-line bg-white p-5 shadow-card transition-colors hover:border-navy-2"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-ctl bg-navsel text-navy-2">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <ArrowRight
          className="h-4 w-4 text-slate-400 transition-colors group-hover:text-navy"
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-navy">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </Link>
  )
}

export function DashboardPage() {
  const { counts, exams, keyRequests, activity } = useApp()

  const upcoming = useMemo(
    () =>
      exams
        .filter((e) => (e.status === 'Scheduled' || e.status === 'Package Exported') && examStart(e).getTime() >= Date.now())
        .sort((a, b) => examStart(a).getTime() - examStart(b).getTime())
        .slice(0, 6),
    [exams],
  )

  const pending = keyRequests.filter((k) => k.status === 'Pending')
  const examById = (id: string) => exams.find((e) => e.id === id)

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        Overview of the exam administration workflow: schedule → export package → import verified results → review key
        corrections → publish. All figures are calculated from the demo records stored in this browser.
      </p>

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Scheduled Exams" value={counts.scheduled} hint="Ready for package export" icon={CalendarCheck} to="/schedule-exam" />
        <SummaryCard label="Exam Packages Ready" value={counts.packagesReady} hint="Exported, awaiting results" icon={PackageCheck} to="/file-transfer" />
        <SummaryCard label="Pending Key Approvals" value={counts.pendingApprovals} hint="HOD requests to decide" icon={KeyRound} to="/key-approvals" />
        <SummaryCard label="Results Awaiting Publication" value={counts.awaitingPublication} hint="Includes re-publish after correction" icon={ClipboardCheck} to="/results" />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title="Upcoming exams"
              description="Scheduled exams and exported packages, soonest first."
              actions={
                <LinkButton to="/schedule-exam" size="sm" variant="secondary">
                  View all
                </LinkButton>
              }
            />
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarPlus} title="No upcoming exams">
                Schedule an exam to see it here.
              </EmptyState>
            ) : (
              <TableWrap caption="Upcoming exams">
                <thead>
                  <tr>
                    <Th>Subject</Th>
                    <Th>Class</Th>
                    <Th>Type</Th>
                    <Th>Date &amp; time</Th>
                    <Th>Status</Th>
                    <Th>
                      <span className="sr-only">Action</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <Td>
                        <p className="font-medium">{e.subject}</p>
                        <p className="text-xs text-muted">{e.subjectCode}</p>
                      </Td>
                      <Td>{e.classSection}</Td>
                      <Td>
                        <Pill tone="navy">{e.examType}</Pill>
                      </Td>
                      <Td>
                        <p>{formatDate(e.date)}</p>
                        <p className="text-xs text-muted">{formatTime(e.startTime)}</p>
                      </Td>
                      <Td>
                        <StatusBadge status={e.status} />
                      </Td>
                      <Td className="text-right">
                        <LinkButton to="/file-transfer" size="sm" variant="ghost" icon={<Package className="h-4 w-4" aria-hidden="true" />}>
                          {e.status === 'Scheduled' ? 'Export' : 'Transfer'}
                          <span className="sr-only"> {e.subject}</span>
                        </LinkButton>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Pending correction requests"
              description="Answer-key changes requested by HODs."
              actions={
                <LinkButton to="/key-approvals" size="sm" variant="secondary">
                  Review all
                </LinkButton>
              }
            />
            {pending.length === 0 ? (
              <EmptyState icon={KeyRound} title="No pending requests">
                New HOD correction requests will appear here.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {pending.map((k) => {
                  const e = examById(k.examId)
                  return (
                    <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {e ? `${e.subject} (${e.classSection}, ${e.examType})` : k.examId}
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted">
                          <span className="font-semibold text-ink">{k.questionId}</span> · key {k.oldKey} → {k.newKey} ·{' '}
                          {k.requestedBy} · {relativeTime(k.requestedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status="Pending" />
                        <LinkButton to="/key-approvals" size="sm">
                          Review
                        </LinkButton>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Quick actions" />
            <CardBody className="grid grid-cols-1 gap-2.5">
              <QuickAction to="/schedule-exam" icon={CalendarPlus} label="Schedule an exam" primary />
              <QuickAction to="/file-transfer" icon={Package} label="Export a package" />
              <QuickAction to="/key-approvals" icon={KeyRound} label="Review approvals" />
              <QuickAction to="/results" icon={Send} label="Publish results" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Recent activity"
              actions={
                <LinkButton to="/activity-log" size="sm" variant="ghost">
                  Full log
                </LinkButton>
              }
            />
            <CardBody>
              {activity.length === 0 ? (
                <p className="text-sm text-muted">No activity recorded yet.</p>
              ) : (
                <ol className="relative space-y-5 border-l border-line pl-6">
                  {activity.slice(0, 6).map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-navy-2">
                        <CategoryIcon category={a.category} className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-[13px] leading-snug text-ink">{a.message}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {a.category} · {relativeTime(a.at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  to,
  icon: Icon,
  label,
  primary,
}: {
  to: string
  icon: LucideIcon
  label: string
  primary?: boolean
}) {
  return (
    <LinkButton
      to={to}
      variant={primary ? 'primary' : 'secondary'}
      className="w-full justify-start"
      icon={<Icon className="h-4 w-4" aria-hidden="true" />}
    >
      {label}
    </LinkButton>
  )
}

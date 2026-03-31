'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, formatDistanceToNow, isSameMonth } from 'date-fns';
import Image from 'next/image';
import { contractorsApi, dashboardApi, eventsApi, sponsorApi, tenantApi } from '@/lib/api';
import activityEmptyLight from '@/assets/activity-empty-light.svg';
import activityEmptyDark from '@/assets/activity-empty-dark.svg';
import expiringEmptyLight from '@/assets/expiring-light.svg';
import expiringEmptyDark from '@/assets/expiring-dark.svg';
import { AlertTriangle, CalendarClock4, CheckCircleDashed, ChevronRight, ClockAlert, Group2, PeopleAdd } from '@/components/icons';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getEventLabel } from '@/lib/event-labels';
import { deriveWorkspaceName } from '@/lib/workspace';

type DashboardSummary = {
  active_contractors: number;
  suspended_contractors: number;
  expiring_soon: number;
  expiring_within_days: number;
  overdue_access: number;
  failed_revocations: number;
};

type DashboardCollectionResponse = {
  data?: Record<string, unknown>[];
  pagination?: {
    total?: number;
  };
};

type KpiTone = 'emerald' | 'blue' | 'violet' | 'cyan' | 'amber' | 'danger';

type KpiCardConfig = {
  label: string;
  value: React.ReactNode;
  description: React.ReactNode;
  href?: string;
  icon: React.ElementType;
  tone: KpiTone;
};

type PanelState = 'loading' | 'empty' | 'ready';

type ContractorRecord = Record<string, unknown> & {
  contracts?: Record<string, unknown>[];
  created_at?: unknown;
  createdAt?: unknown;
};

const HIGH_PRIORITY_EVENTS = new Set([
  'contract.expired',
  'contract.terminated',
  'access.revoked',
  'access.overdue',
  'sync.failed',
]);

const eventColors: Record<string, string> = {
  'contractor.created': 'bg-muted-foreground/40',
  'contract.suspended': 'bg-muted-foreground/40',
  'contract.expired': 'bg-destructive',
  'contract.terminated': 'bg-destructive',
  'access.revoked': 'bg-foreground/60',
};

const KPI_STYLES: Record<KpiTone, string> = {
  emerald: 'overflow-visible rounded-lg border-transparent bg-sidebar text-foreground ring-0 shadow-none [box-shadow:none]',
  blue: 'overflow-visible rounded-lg border-transparent bg-sidebar text-foreground ring-0 shadow-none [box-shadow:none]',
  violet: 'overflow-visible rounded-lg border-transparent bg-sidebar text-foreground ring-0 shadow-none [box-shadow:none]',
  cyan: 'overflow-visible rounded-lg border-transparent bg-sidebar text-foreground ring-0 shadow-none [box-shadow:none]',
  amber: 'overflow-visible rounded-lg border-transparent bg-sidebar text-foreground ring-0 shadow-none [box-shadow:none]',
  danger: 'overflow-visible rounded-lg border-transparent bg-sidebar text-foreground ring-0 shadow-none [box-shadow:none]',
};

const KPI_WRAPPER_HOVER_STYLES: Record<KpiTone, string> = {
  emerald: 'group-hover:bg-emerald-50 group-focus-visible:bg-emerald-50 dark:group-hover:bg-emerald-950/50 dark:group-focus-visible:bg-emerald-950/50',
  blue: 'group-hover:bg-blue-50 group-focus-visible:bg-blue-50 dark:group-hover:bg-blue-950/50 dark:group-focus-visible:bg-blue-950/50',
  violet: 'group-hover:bg-violet-50 group-focus-visible:bg-violet-50 dark:group-hover:bg-violet-950/50 dark:group-focus-visible:bg-violet-950/50',
  cyan: 'group-hover:bg-cyan-50 group-focus-visible:bg-cyan-50 dark:group-hover:bg-cyan-950/50 dark:group-focus-visible:bg-cyan-950/50',
  amber: 'group-hover:bg-amber-50/70 group-focus-visible:bg-amber-50/70 dark:group-hover:bg-amber-950/35 dark:group-focus-visible:bg-amber-950/35',
  danger: 'group-hover:bg-destructive/6 group-focus-visible:bg-destructive/6 dark:group-hover:bg-destructive/15 dark:group-focus-visible:bg-destructive/15',
};

const KPI_ICON_STYLES: Record<KpiTone, string> = {
  emerald: 'text-muted-foreground',
  blue: 'text-muted-foreground',
  violet: 'text-muted-foreground',
  cyan: 'text-muted-foreground',
  amber: 'text-muted-foreground',
  danger: 'text-muted-foreground',
};

const KPI_TEXT_HOVER_STYLES: Record<KpiTone, string> = {
  emerald: 'group-hover:text-emerald-700 group-focus-visible:text-emerald-700 dark:group-hover:text-emerald-200 dark:group-focus-visible:text-emerald-200',
  blue: 'group-hover:text-blue-700 group-focus-visible:text-blue-700 dark:group-hover:text-blue-200 dark:group-focus-visible:text-blue-200',
  violet: 'group-hover:text-violet-700 group-focus-visible:text-violet-700 dark:group-hover:text-violet-200 dark:group-focus-visible:text-violet-200',
  cyan: 'group-hover:text-cyan-700 group-focus-visible:text-cyan-700 dark:group-hover:text-cyan-200 dark:group-focus-visible:text-cyan-200',
  amber: 'group-hover:text-amber-700 group-focus-visible:text-amber-700 dark:group-hover:text-amber-200 dark:group-focus-visible:text-amber-200',
  danger: 'group-hover:text-destructive group-focus-visible:text-destructive',
};

const KPI_INNER_STYLES: Record<KpiTone, string> = {
  emerald: 'card-surface-soft bg-background text-foreground',
  blue: 'card-surface-soft bg-background text-foreground',
  violet: 'card-surface-soft bg-background text-foreground',
  cyan: 'card-surface-soft bg-background text-foreground',
  amber: 'card-surface-soft bg-background text-foreground',
  danger: 'card-surface-soft bg-background text-foreground',
};

function getGreetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getUserFirstName(user: { name?: string; email?: string } | null) {
  const name = user?.name?.trim();
  if (name) return name.split(/\s+/)[0];

  const emailLocalPart = user?.email?.split('@')[0]?.trim();
  if (!emailLocalPart) return 'there';

  const fallbackName = emailLocalPart.split(/[._-]+/)[0];
  if (!fallbackName) return 'there';

  return fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
}

function getPanelState(isLoading: boolean, count: number): PanelState {
  if (isLoading) return 'loading';
  return count > 0 ? 'ready' : 'empty';
}

function getPrimaryContract(contractor: ContractorRecord) {
  return (contractor.contracts as Record<string, unknown>[] | undefined)?.[0];
}

function getContractorCreatedDate(contractor: ContractorRecord) {
  const primaryContract = getPrimaryContract(contractor);
  const rawDate =
    contractor.createdAt ??
    contractor.created_at ??
    primaryContract?.createdAt ??
    primaryContract?.created_at;

  if (!rawDate) return null;

  const parsedDate = new Date(String(rawDate));
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function DashboardSurface({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="card-surface-soft flex h-full flex-col bg-card ring-0">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-5">{children}</CardContent>
    </Card>
  );
}

function DashboardListSkeleton({
  rows = 5,
  showTrailingValue = true,
  timeline = false,
}: {
  rows?: number;
  showTrailingValue?: boolean;
  timeline?: boolean;
}) {
  return (
    <div className={cn(timeline ? 'space-y-4' : 'space-y-3')}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            timeline ? 'flex gap-3' : 'flex items-center justify-between py-4',
            !timeline && index !== rows - 1 && 'border-b border-border/60',
            !timeline && index === 0 && 'pt-0',
            !timeline && index === rows - 1 && 'pb-0',
          )}
        >
          {timeline ? <Skeleton className="mt-1 size-2 rounded-full" /> : null}
          <div className="flex-1 space-y-2">
            <Skeleton className={cn('h-4 rounded-full', timeline ? 'w-40' : 'w-36')} />
            <Skeleton className={cn('h-3 rounded-full', timeline ? 'w-24' : 'w-24')} />
          </div>
          {showTrailingValue && !timeline ? <Skeleton className="h-8 w-28 rounded-full" /> : null}
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  description,
  href,
  icon: Icon,
  tone,
}: KpiCardConfig) {
  const content = (
    <Card
      className={cn(
        'h-full p-px transition-colors ring-0 dark:ring-0',
        KPI_STYLES[tone],
        href ? KPI_WRAPPER_HOVER_STYLES[tone] : '',
        href ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <div className="flex flex-col">
        <div
          className={cn(
            'flex items-center justify-between rounded-t-lg px-4 py-2.5',
          )}
        >
          <div className="flex items-center gap-1.5">
            <div className={cn('flex size-5 items-center justify-center transition-colors', KPI_ICON_STYLES[tone], href ? KPI_TEXT_HOVER_STYLES[tone] : '')}>
              <Icon size={16} />
            </div>
            <p className={cn('text-base font-semibold text-foreground transition-colors', href ? KPI_TEXT_HOVER_STYLES[tone] : '')}>{label}</p>
          </div>
          {href ? (
            <ChevronRight
              size={16}
              className={cn(
                'text-foreground/60 opacity-0 transition-[opacity,color] group-hover:opacity-100 group-focus-visible:opacity-100',
                KPI_TEXT_HOVER_STYLES[tone],
              )}
            />
          ) : null}
        </div>
        <div>
          <div className={cn('flex flex-col rounded-lg px-5 py-4', KPI_INNER_STYLES[tone])}>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {description}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {content}
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: async () => (await tenantApi.getProfile()).data,
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await dashboardApi.getSummary()).data as DashboardSummary,
  });

  const { data: expiring, isLoading: expiringLoading } = useQuery({
    queryKey: ['dashboard-expiring'],
    queryFn: async () => (await dashboardApi.getExpiring({ limit: 5 })).data as DashboardCollectionResponse,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events-recent'],
    queryFn: async () => (await eventsApi.list({ limit: 5 })).data as DashboardCollectionResponse,
  });

  const { data: pendingRequests, isLoading: pendingLoading } = useQuery({
    queryKey: ['dashboard-pending-requests'],
    queryFn: async () => (await sponsorApi.list({ status: 'pending' })).data as DashboardCollectionResponse,
  });

  const { data: contractorsData, isLoading: newThisMonthLoading } = useQuery({
    queryKey: ['dashboard-new-this-month'],
    queryFn: async () => (await contractorsApi.list()).data as DashboardCollectionResponse,
  });

  const expiringContracts = (expiring?.data ?? []) as Record<string, unknown>[];
  const allEvents = (events?.data ?? []) as Record<string, unknown>[];
  const contractors = (contractorsData?.data ?? []) as ContractorRecord[];
  const now = new Date();
  const newThisMonth = contractors.filter((contractor) => {
    const createdDate = getContractorCreatedDate(contractor);
    return createdDate ? isSameMonth(createdDate, now) : false;
  }).length;
  const pendingApprovals = pendingLoading
    ? '—'
    : pendingRequests?.pagination?.total ?? pendingRequests?.data?.length ?? 0;
  const firstName = getUserFirstName(user);
  const greeting = getGreetingForHour(new Date().getHours());
  const workspaceName = deriveWorkspaceName(tenantProfile, user?.email);
  const expiringPanelState = getPanelState(expiringLoading, expiringContracts.length);
  const activityPanelState = getPanelState(eventsLoading, allEvents.length);

  const kpiCards: KpiCardConfig[] = [
    {
      label: 'Active Contractors',
      value: summaryLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : summary?.active_contractors ?? 0,
      description: summaryLoading ? <Skeleton className="h-4 w-40 rounded-full" /> : 'Currently under active contract.',
      href: '/contractors?status=active',
      icon: Group2,
      tone: 'emerald',
    },
    {
      label: 'Expiring Soon',
      value: summaryLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : summary?.expiring_soon ?? 0,
      description: summaryLoading ? <Skeleton className="h-4 w-44 rounded-full" /> : `Ending in the next ${summary?.expiring_within_days ?? 30} days.`,
      href: '/dashboard/expiring',
      icon: CalendarClock4,
      tone: 'amber',
    },
    {
      label: 'New This Month',
      value: newThisMonthLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : newThisMonth,
      description: newThisMonthLoading ? <Skeleton className="h-4 w-40 rounded-full" /> : 'Contractors added during the current month.',
      href: '/contractors',
      icon: PeopleAdd,
      tone: 'cyan',
    },
    {
      label: 'Pending Approval',
      value: pendingLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : pendingApprovals,
      description: pendingLoading ? <Skeleton className="h-4 w-40 rounded-full" /> : 'Requests waiting for review.',
      href: '/sponsor?status=pending',
      icon: CheckCircleDashed,
      tone: 'blue',
    },
    {
      label: 'Overdue',
      value: summaryLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : summary?.overdue_access ?? 0,
      description: summaryLoading ? <Skeleton className="h-4 w-40 rounded-full" /> : 'Ended contracts with access still open.',
      href: '/dashboard/overdue',
      icon: ClockAlert,
      tone: 'danger',
    },
    {
      label: 'Suspended',
      value: summaryLoading ? <Skeleton className="h-8 w-16 rounded-md" /> : summary?.suspended_contractors ?? 0,
      description: summaryLoading ? <Skeleton className="h-4 w-40 rounded-full" /> : 'Paused and awaiting next steps.',
      href: '/contractors?status=suspended',
      icon: AlertTriangle,
      tone: 'violet',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {workspaceName}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {firstName}
        </h1>
      </section>

      <div className="space-y-10">
        <section className="grid gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((card) => (
            <KpiCard key={card.label} {...card} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
        <DashboardSurface
          title="Expiring soon"
          description="Contractors whose access is about to expire and require action."
          action={
            <Link href="/dashboard/expiring" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              View queue
            </Link>
          }
        >
          {expiringPanelState === 'loading' ? (
            <DashboardListSkeleton rows={5} />
          ) : expiringPanelState === 'ready' ? (
            <div className="divide-y divide-border/60">
              {expiringContracts.map((item, index) => {
                const contractor = item.contractor_id as Record<string, unknown> | undefined;
                const contractorId = contractor ? String(contractor._id ?? '') : '';
                const endDate = item.end_date ? new Date(String(item.end_date)) : null;
                const daysLeft = endDate ? differenceInCalendarDays(endDate, new Date()) : null;
                const dueLabel =
                  daysLeft === null
                    ? 'Scheduled'
                    : daysLeft < 0
                      ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`
                      : daysLeft === 0
                        ? 'Due today'
                        : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

                return (
                  <Link
                    key={String(item._id)}
                    href={contractorId ? `/contractors/${contractorId}` : '/contractors'}
                    className={cn(
                      'flex items-center justify-between gap-4 py-4 transition-colors hover:text-foreground',
                      index === 0 && 'pt-0',
                      index === expiringContracts.length - 1 && 'pb-0',
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {contractor ? String(contractor.name ?? '') : 'Unknown contractor'}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {contractor ? String(contractor.department ?? 'No department') : 'No department'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {endDate ? format(endDate, 'MMM d, yyyy') : 'No date'}
                        </p>
                        <p className={cn('text-xs', daysLeft !== null && daysLeft <= 3 ? 'text-destructive' : 'text-muted-foreground')}>
                          {dueLabel}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-1 flex-col items-center justify-center px-6 py-4 text-center">
              <span className="block dark:hidden">
                <Image src={expiringEmptyLight} alt="" width={266} height={102} className="w-full max-w-60" />
              </span>
              <span className="hidden dark:block">
                <Image src={expiringEmptyDark} alt="" width={266} height={102} className="w-full max-w-60" />
              </span>
              <p className="mt-5 text-sm font-semibold text-foreground">No contracts are nearing expiry</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Contracts with upcoming end dates will appear here first.
              </p>
            </div>
          )}
        </DashboardSurface>

        <DashboardSurface
          title="Activity"
          description="View recent updates and actions in your workspace."
          action={
            <Link href="/events" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              View activity
            </Link>
          }
        >
          {activityPanelState === 'loading' ? (
            <DashboardListSkeleton rows={5} showTrailingValue={false} timeline />
          ) : activityPanelState === 'ready' ? (
            <div className="space-y-3">
              {allEvents.slice(0, 5).map((event, index, items) => {
                const contractor = event.contractor_id as Record<string, unknown> | undefined;
                const eventType = String(event.event_type ?? '');
                const isHighPriority = HIGH_PRIORITY_EVENTS.has(eventType);
                const color = eventColors[eventType] ?? 'bg-muted-foreground/40';
                const isLast = index === items.length - 1;

                return (
                  <div key={String(event._id)} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn('mt-1 size-2 shrink-0 rounded-full', color)} />
                      {!isLast ? <div className="mt-1 w-px flex-1 bg-border/60" /> : null}
                    </div>
                    <div className={cn('flex min-w-0 flex-1 items-start justify-between gap-4', !isLast && 'pb-3')}>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium', isHighPriority ? 'text-foreground' : 'text-muted-foreground')}>
                          {getEventLabel(eventType)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {contractor ? String(contractor.name ?? '') : 'Tenurio'}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {event.created_at
                          ? formatDistanceToNow(new Date(String(event.created_at)), { addSuffix: true })
                          : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-1 flex-col items-center justify-center px-6 py-4 text-center">
              <span className="block dark:hidden">
                <Image src={activityEmptyLight} alt="" width={266} height={102} className="w-full max-w-60" />
              </span>
              <span className="hidden dark:block">
                <Image src={activityEmptyDark} alt="" width={266} height={102} className="w-full max-w-60" />
              </span>
              <p className="mt-5 text-sm font-semibold text-foreground">No recent activity</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Contractor updates, approvals, and access changes will appear here.
              </p>
            </div>
          )}
        </DashboardSurface>

        </section>
      </div>
    </div>
  );
}

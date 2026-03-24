'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { dashboardApi, eventsApi, integrationApi, sponsorApi, tenantApi } from '@/lib/api';
import activityEmptyLight from '@/assets/activity-empty-light.svg';
import activityEmptyDark from '@/assets/activity-empty-dark.svg';
import expiringEmptyLight from '@/assets/expiring-light.svg';
import expiringEmptyDark from '@/assets/expiring-dark.svg';
import { AlertTriangle, CalendarClock4, CalendarRemove4, ChevronRight, Clock, ShieldOff, Users } from '@/components/icons';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type KpiTone = 'emerald' | 'blue' | 'violet' | 'cyan' | 'danger';

type KpiCardConfig = {
  label: string;
  value: number | string;
  description: string;
  href?: string;
  icon: React.ElementType;
  tone: KpiTone;
};

type PanelState = 'loading' | 'empty' | 'ready';

type SyncHealthState = {
  label: 'Healthy' | 'Needs attention' | 'Not connected';
  description: string;
  badgeVariant: 'emerald' | 'danger' | 'neutral';
  accentClass: string;
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
  danger: 'overflow-visible rounded-lg border-transparent bg-sidebar text-foreground ring-0 shadow-none [box-shadow:none]',
};

const KPI_WRAPPER_HOVER_STYLES: Record<KpiTone, string> = {
  emerald: 'group-hover:bg-emerald-50 group-focus-visible:bg-emerald-50 dark:group-hover:bg-emerald-950/50 dark:group-focus-visible:bg-emerald-950/50',
  blue: 'group-hover:bg-blue-50 group-focus-visible:bg-blue-50 dark:group-hover:bg-blue-950/50 dark:group-focus-visible:bg-blue-950/50',
  violet: 'group-hover:bg-violet-50 group-focus-visible:bg-violet-50 dark:group-hover:bg-violet-950/50 dark:group-focus-visible:bg-violet-950/50',
  cyan: 'group-hover:bg-cyan-50 group-focus-visible:bg-cyan-50 dark:group-hover:bg-cyan-950/50 dark:group-focus-visible:bg-cyan-950/50',
  danger: 'group-hover:bg-destructive/6 group-focus-visible:bg-destructive/6 dark:group-hover:bg-destructive/15 dark:group-focus-visible:bg-destructive/15',
};

const KPI_ICON_STYLES: Record<KpiTone, string> = {
  emerald: 'text-muted-foreground',
  blue: 'text-muted-foreground',
  violet: 'text-muted-foreground',
  cyan: 'text-muted-foreground',
  danger: 'text-muted-foreground',
};

const KPI_TEXT_HOVER_STYLES: Record<KpiTone, string> = {
  emerald: 'group-hover:text-emerald-700 group-focus-visible:text-emerald-700 dark:group-hover:text-emerald-200 dark:group-focus-visible:text-emerald-200',
  blue: 'group-hover:text-blue-700 group-focus-visible:text-blue-700 dark:group-hover:text-blue-200 dark:group-focus-visible:text-blue-200',
  violet: 'group-hover:text-violet-700 group-focus-visible:text-violet-700 dark:group-hover:text-violet-200 dark:group-focus-visible:text-violet-200',
  cyan: 'group-hover:text-cyan-700 group-focus-visible:text-cyan-700 dark:group-hover:text-cyan-200 dark:group-focus-visible:text-cyan-200',
  danger: 'group-hover:text-destructive group-focus-visible:text-destructive',
};

const KPI_INNER_STYLES: Record<KpiTone, string> = {
  emerald: 'card-surface-soft bg-background text-foreground',
  blue: 'card-surface-soft bg-background text-foreground',
  violet: 'card-surface-soft bg-background text-foreground',
  cyan: 'card-surface-soft bg-background text-foreground',
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

function getSyncHealthState(googleWorkspace: Record<string, unknown> | undefined): SyncHealthState {
  const isConnected = googleWorkspace?.connected === true;
  const syncFailed = googleWorkspace?.sync_failed === true;

  if (isConnected && syncFailed) {
    return {
      label: 'Needs attention',
      description: 'The latest directory sync failed. Last sync time is unavailable.',
      badgeVariant: 'danger',
      accentClass: 'bg-destructive',
    };
  }

  if (isConnected) {
    return {
      label: 'Healthy',
      description: 'Directory sync is connected and running. Last sync time is unavailable.',
      badgeVariant: 'emerald',
      accentClass: 'bg-emerald-500',
    };
  }

  return {
    label: 'Not connected',
    description: 'Connect your directory to monitor sync health here.',
    badgeVariant: 'neutral',
    accentClass: 'bg-muted-foreground/50',
  };
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
    <Card className="card-surface bg-card ring-0">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
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
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">{description}</p>
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

  const { data: integrationStatus } = useQuery({
    queryKey: ['integration-status'],
    queryFn: async () => {
      try {
        return (await integrationApi.getStatus()).data as Record<string, unknown>;
      } catch {
        return null;
      }
    },
  });

  const expiringContracts = (expiring?.data ?? []) as Record<string, unknown>[];
  const allEvents = (events?.data ?? []) as Record<string, unknown>[];
  const pendingApprovals = pendingLoading
    ? '—'
    : pendingRequests?.pagination?.total ?? pendingRequests?.data?.length ?? 0;
  const firstName = getUserFirstName(user);
  const greeting = getGreetingForHour(new Date().getHours());
  const workspaceName = deriveWorkspaceName(tenantProfile, user?.email);
  const googleWorkspace = integrationStatus?.google_workspace as Record<string, unknown> | undefined;
  const syncHealth = getSyncHealthState(googleWorkspace);
  const expiringPanelState = getPanelState(expiringLoading, expiringContracts.length);
  const activityPanelState = getPanelState(eventsLoading, allEvents.length);

  const kpiCards: KpiCardConfig[] = [
    {
      label: 'Active Contractors',
      value: summaryLoading ? '—' : summary?.active_contractors ?? 0,
      description: 'Currently under active contract.',
      href: '/contractors?status=active',
      icon: Users,
      tone: 'emerald',
    },
    {
      label: 'Expiring Soon',
      value: summaryLoading ? '—' : summary?.expiring_soon ?? 0,
      description: `Ending in the next ${summary?.expiring_within_days ?? 30} days.`,
      href: '/dashboard/expiring',
      icon: CalendarClock4,
      tone: 'cyan',
    },
    {
      label: 'Overdue',
      value: summaryLoading ? '—' : summary?.overdue_access ?? 0,
      description: 'Ended contracts with access still open.',
      href: '/dashboard/overdue',
      icon: ShieldOff,
      tone: 'danger',
    },
    {
      label: 'Suspended',
      value: summaryLoading ? '—' : summary?.suspended_contractors ?? 0,
      description: 'Paused and awaiting next steps.',
      href: '/contractors?status=suspended',
      icon: AlertTriangle,
      tone: 'violet',
    },
    {
      label: 'Pending Approval',
      value: pendingApprovals,
      description: 'Requests waiting for review.',
      href: '/sponsor?status=pending',
      icon: Clock,
      tone: 'blue',
    },
    {
      label: 'Missing Expiry',
      value: '—',
      description: 'Contractors missing an end date.',
      icon: CalendarRemove4,
      tone: 'cyan',
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
          description="Contracts that need attention next."
          action={
            <Link href="/dashboard/expiring" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              View queue
            </Link>
          }
        >
          {expiringPanelState === 'loading' ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between py-4',
                    index !== 4 && 'border-b border-border/60',
                    index === 0 && 'pt-0',
                    index === 4 && 'pb-0',
                  )}
                >
                  <div className="space-y-2">
                    <div className="h-4 w-36 rounded-full bg-muted" />
                    <div className="h-3 w-24 rounded-full bg-muted/70" />
                  </div>
                  <div className="h-8 w-28 rounded-full bg-muted" />
                </div>
              ))}
            </div>
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
            <div className="flex flex-col items-center rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
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
          description="Recent contractor and access events."
          action={
            <Link href="/events" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              View activity
            </Link>
          }
        >
          {activityPanelState === 'loading' ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <div className="mt-1 size-2 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded-full bg-muted" />
                    <div className="h-3 w-24 rounded-full bg-muted/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : activityPanelState === 'ready' ? (
            <div className="space-y-4">
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
                    <div className={cn('flex min-w-0 flex-1 items-start justify-between gap-4', !isLast && 'pb-4')}>
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
            <div className="flex flex-col items-center rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
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

        <section className="grid gap-6 xl:grid-cols-2">
          <DashboardSurface
            title="Sync health"
            description="Directory connection status and sync state."
          >
          <div className="divide-y divide-border/60">
            <div className="flex items-center justify-between gap-4 py-4 first:pt-0">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Health</p>
                <p className="text-sm text-muted-foreground">Current sync status.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={syncHealth.badgeVariant} className="gap-2">
                  <span className={cn('size-1.5 rounded-full', syncHealth.accentClass)} />
                  {syncHealth.label}
                </Badge>
              </div>
            </div>

            <div className="py-4 last:pb-0">
              <p className="text-sm font-medium text-foreground">Last sync</p>
              <p className="mt-1 text-sm text-muted-foreground">Not available yet. The current API does not expose a sync timestamp.</p>
            </div>
          </div>
        </DashboardSurface>

        <DashboardSurface
          title="Missing expiry"
          description="Contractors without an end date will appear here once the API supports it."
        >
          <div className="divide-y divide-border/60">
            <div className="py-4 first:pt-0">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                  <CalendarRemove4 size={16} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Coverage status</p>
                  <p className="text-sm text-muted-foreground">Waiting for API support.</p>
                </div>
              </div>
            </div>

            <div className="py-4 last:pb-0">
              <p className="text-sm font-medium text-foreground">What will appear here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Contractors without an end date, so teams can review and complete expiry coverage in one place.
              </p>
            </div>
          </div>
        </DashboardSurface>
        </section>
      </div>
    </div>
  );
}

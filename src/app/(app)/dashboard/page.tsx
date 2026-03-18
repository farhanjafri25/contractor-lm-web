'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { dashboardApi, eventsApi, integrationApi, tenantApi } from '@/lib/api';
import activityEmptyLight from '@/assets/activity-empty-light.svg';
import activityEmptyDark from '@/assets/activity-empty-dark.svg';
import expiringEmptyLight from '@/assets/expiring-light.svg';
import expiringEmptyDark from '@/assets/expiring-dark.svg';
import { AlertTriangle, CheckCircle, ChevronRight, Clock, IconCrossLarge, IconGoogle, IconPlusLarge, IconSlack, RefreshCw, Settings, ShieldOff, Users } from '@/components/icons';
import { PageHeader, StatusBadge } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getEventLabel } from '@/lib/event-labels';


const toneIconClasses = {
  success: 'text-primary',
  warning: 'text-accent-foreground',
  danger: 'text-destructive',
  info: 'text-muted-foreground',
  neutral: 'text-muted-foreground',
};

// Events that need immediate attention — keep full color
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


function buildDynamicDescription(summary: Record<string, number> | undefined): string {
  if (!summary) return '';
  const active = summary.active_contractors ?? 0;
  const label = `${active} active contractor${active !== 1 ? 's' : ''}`;
  const issues: string[] = [];
  if ((summary.expiring_soon ?? 0) > 0) issues.push(`${summary.expiring_soon} expiring soon`);
  if ((summary.overdue_access ?? 0) > 0) issues.push(`${summary.overdue_access} access overdue`);
  if ((summary.failed_revocations ?? 0) > 0) {
    const n = summary.failed_revocations;
    issues.push(`${n} failed removal${n !== 1 ? 's' : ''}`);
  }
  return issues.length > 0 ? `${label} · ${issues.join(' · ')}` : `${label} · nothing needs attention`;
}

export default function DashboardPage() {
  const [setupChecklistDismissed, setSetupChecklistDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('setup-checklist-dismissed') === 'true';
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await dashboardApi.getSummary()).data,
  });

  const { data: expiring, isLoading: expiringLoading } = useQuery({
    queryKey: ['dashboard-expiring'],
    queryFn: async () => (await dashboardApi.getExpiring({ limit: 5 })).data,
  });

  const { data: events } = useQuery({
    queryKey: ['events-recent'],
    queryFn: async () => (await eventsApi.list({ limit: 5 })).data,
  });

  // Integration status — gracefully degrades if endpoint not yet available
  const { data: integrationStatus } = useQuery({
    queryKey: ['integration-status'],
    queryFn: async () => {
      try {
        return (await integrationApi.getStatus()).data;
      } catch {
        return null;
      }
    },
  });

  // Team members — used to count sponsors for checklist and quick actions
  const { data: teamData } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      try {
        return (await tenantApi.listUsers()).data;
      } catch {
        return null;
      }
    },
  });

  // Derived connection state
  const googleWorkspace = (integrationStatus as Record<string, unknown> | null)?.google_workspace as Record<string, unknown> | undefined;
  const slack = (integrationStatus as Record<string, unknown> | null)?.slack as Record<string, unknown> | undefined;
  const isGoogleConnected = googleWorkspace?.connected === true;
  const googleSyncFailed = googleWorkspace?.sync_failed === true;
  const isSlackConnected = slack?.connected === true;

  const teamMembers = (teamData as Record<string, unknown> | null)?.data as Record<string, unknown>[] | undefined ?? [];
  const sponsorCount = teamMembers.filter((m) => m.role === 'sponsor').length;

  // Setup checklist items
  const hasAnyContractor = (summary?.active_contractors ?? 0) + (summary?.suspended_contractors ?? 0) > 0;
  const checklistItems = [
    {
      label: 'Add your first contractor',
      href: '/contractors/new',
      done: hasAnyContractor,
    },
    {
      label: 'Connect Google Workspace',
      href: '/settings/directory',
      done: isGoogleConnected,
    },
    {
      label: 'Invite a sponsor',
      href: '/settings/team?invite=sponsor',
      done: sponsorCount > 0,
    },
    {
      label: 'Configure Slack notifications',
      href: '/settings/slack',
      done: isSlackConnected,
    },
  ];
  const completedCount = checklistItems.filter((i) => i.done).length;
  const allChecklistDone = completedCount === checklistItems.length;
  const showSetupChecklist = !setupChecklistDismissed && !allChecklistDone && !summaryLoading;

  const contractorMetrics = summary
    ? [
        {
          label: 'Active contractors',
          secondaryLabel: `${summary.expiring_soon} ending in ${summary.expiring_within_days} days`,
          value: summary.active_contractors,
          icon: Users,
          tone: 'success' as const,
          href: '/contractors?status=active',
        },
        {
          label: 'Suspended',
          secondaryLabel: 'Paused until reviewed',
          value: summary.suspended_contractors,
          icon: AlertTriangle,
          tone: 'warning' as const,
          href: '/contractors?status=suspended',
        },
        {
          label: 'Expiring soon',
          secondaryLabel: `Ending in the next ${summary.expiring_within_days} days`,
          value: summary.expiring_soon,
          icon: Clock,
          tone: 'warning' as const,
          href: '/contractors?status=expiring',
        },
      ]
    : [];

  // NOTE: pending_decisions requires a new backend field in /dashboard/summary response.
  // Until that field is added, it will always be 0 and the row won't appear.
  const allAttentionMetrics = summary
    ? [
        {
          label: 'Access overdue',
          secondaryLabel: 'Contracts ended, access still active',
          value: summary.overdue_access,
          icon: ShieldOff,
          tone: 'danger' as const,
          href: '/contractors?status=overdue',
        },
        {
          label: 'Failed removals',
          secondaryLabel: 'Access changes needing manual work',
          value: summary.failed_revocations,
          icon: RefreshCw,
          tone: 'danger' as const,
          href: '/contractors?status=failed',
        },
        {
          label: 'Pending decisions',
          secondaryLabel: "Sponsors haven't responded.",
          value: ((summary as unknown as Record<string, number>).pending_decisions ?? 0),
          icon: Clock,
          tone: 'danger' as const,
          href: '/contractors?filter=pending_decisions',
        },
      ]
    : [];

  // Only show non-zero attention rows — zeros are not problems
  const attentionMetrics = allAttentionMetrics.filter((m) => m.value > 0);
  const hasAttention = attentionMetrics.length > 0;
  const dynamicDescription = buildDynamicDescription(summary);

  // Contextual quick actions — hide items that are no longer relevant
  const quickActions = [
    !hasAnyContractor && { label: 'Import CSV', href: '/contractors/import' },
    !isGoogleConnected && { label: 'Connect directory', href: '/settings/directory' },
    sponsorCount === 0 && { label: 'Invite sponsor', href: '/settings/team?invite=sponsor' },
  ].filter((x): x is { label: string; href: string } => Boolean(x));
  const showQuickActions = !summaryLoading && quickActions.length > 0;

  const allEvents = (events?.data ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-12">
      <PageHeader
        title="Overview"
        description={dynamicDescription || 'See what needs attention across contractors, access, and requests.'}
      />

      <div className="grid gap-16 md:grid-cols-[3fr_7fr]">
        {/* Left: Key numbers */}
        <div>
          {/* Get started checklist */}
          {showSetupChecklist && (
            <div className="-mx-4 mb-6 rounded-xl bg-muted/40 px-4 pb-1.5 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground">Get started</p>
                  <span className="text-xs text-muted-foreground">{completedCount} of {checklistItems.length}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton
                  onClick={() => {
                    localStorage.setItem('setup-checklist-dismissed', 'true');
                    setSetupChecklistDismissed(true);
                  }}
                  className="text-muted-foreground"
                >
                  Dismiss <IconCrossLarge size={13} />
                </Button>
              </div>
              <div className="mt-1 space-y-0">
                {checklistItems.map((item) =>
                  item.done ? (
                    <div key={item.label} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <CheckCircle size={15} />
                      </div>
                      <p className="text-sm text-muted-foreground line-through">{item.label}</p>
                    </div>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background">
                        <div className="size-3 rounded-full bg-muted-foreground/25" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                    </Link>
                  )
                )}
              </div>
            </div>
          )}


          {/* Contractors group */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-foreground">Contractors</p>
              <Button variant="ghost" size="sm" render={<Link href="/contractors/new" />} nativeButton={false} className="text-muted-foreground">
                Add <IconPlusLarge size={13} />
              </Button>
            </div>
            <div className="mt-3 border-t border-border/50" />
            <div className="mt-2 space-y-0">
              {summaryLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <div className="size-8 shrink-0 rounded-md bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-muted" />
                        <div className="h-3 w-24 rounded bg-muted/60" />
                      </div>
                    </div>
                  ))
                : contractorMetrics.map((metric) => (
                    <Link
                      key={metric.label}
                      href={metric.href}
                      className="-mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50"
                    >
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-md',
                          metric.value === 0 ? 'bg-muted/40 text-muted-foreground/50' : cn('bg-muted/60', toneIconClasses[metric.tone]),
                        )}
                      >
                        <metric.icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium', metric.value === 0 ? 'text-muted-foreground' : 'text-foreground')}>
                          {metric.value} {metric.label}
                        </p>
                        {metric.value > 0 && (
                          <p className="text-xs text-muted-foreground">{metric.secondaryLabel}</p>
                        )}
                      </div>
                    </Link>
                  ))}
            </div>
          </div>

          {/* Separator */}
          <div className="mb-6 border-t border-border/30" />

          {/* Attention group — only non-zero rows, only when at least one */}
          {!summaryLoading && hasAttention && (
            <>
              <div className="mb-6">
                <p className="text-base font-semibold text-foreground">Attention</p>
                <div className="mt-3 border-t border-border/50" />
                <div className="mt-2 space-y-0">
                  {attentionMetrics.map((metric) => (
                    <Link
                      key={metric.label}
                      href={metric.href}
                      className="-mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50"
                    >
                      <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60', toneIconClasses[metric.tone])}>
                        <metric.icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {metric.value} {metric.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{metric.secondaryLabel}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mb-6 border-t border-border/30" />
            </>
          )}

          {/* Directory group — always visible once loaded */}
          {!summaryLoading && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-foreground">Directory</p>
                  <Button variant="ghost" size="sm" render={<Link href="/settings/directory" />} nativeButton={false} className="text-muted-foreground">
                    Manage <Settings size={13} />
                  </Button>
                </div>
                <div className="mt-3 border-t border-border/50" />
                <div className="mt-2 space-y-0">
                  {/* Google Workspace */}
                  <Link
                    href="/settings/directory"
                    className="-mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/40">
                      <IconGoogle size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Google Workspace</p>
                      <p className={cn(
                        'text-xs',
                        isGoogleConnected && googleSyncFailed ? 'text-destructive' : 'text-muted-foreground',
                      )}>
                        {isGoogleConnected && !googleSyncFailed && 'Connected'}
                        {isGoogleConnected && googleSyncFailed && 'Sync failed'}
                        {!isGoogleConnected && 'Not connected'}
                      </p>
                    </div>
                  </Link>

                  {/* Slack */}
                  <Link
                    href="/settings/slack"
                    className="-mx-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/40">
                      <IconSlack size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Slack</p>
                      <p className="text-xs text-muted-foreground">
                        {isSlackConnected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Separator + Quick actions — only show relevant actions */}
              {showQuickActions && (
                <>
                  <div className="mb-6 border-t border-border/30" />
                  <div className="space-y-1.5">
                    {quickActions.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Right: Expiring soon + Activity */}
        <div className="space-y-10">
          {/* Expiring soon */}
          <div>
            {expiringLoading ? (
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Expiring soon</h2>
              </div>
            ) : expiring?.data?.length ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Expiring soon</h2>
                  <Button variant="ghost" size="sm" render={<Link href="/dashboard/expiring" />} nativeButton={false} className="text-muted-foreground">
                    View queue
                  </Button>
                </div>
                <div className="mt-3 border-t border-border/50" />
                <div className="divide-y divide-border/50">
                  {expiring.data.map((item: Record<string, unknown>) => {
                    const contractor = item.contractor_id as Record<string, unknown> | undefined;
                    return (
                      <Link
                        key={String(item._id)}
                        href={`/contractors/${contractor ? String(contractor._id ?? '') : ''}`}
                        className="flex items-center justify-between py-4 transition-colors hover:opacity-75"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {contractor ? String(contractor.name ?? '') : 'Unknown contractor'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contractor ? String(contractor.department ?? '') : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge
                            status={item.end_date ? new Date(String(item.end_date)).toLocaleDateString() : 'Scheduled'}
                          />
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Expiring soon</h2>
                  <Button variant="ghost" size="sm" render={<Link href="/dashboard/expiring" />} nativeButton={false} className="text-muted-foreground">
                    View queue
                  </Button>
                </div>
                <div className="mt-3 flex flex-col items-center rounded-xl py-8" style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23D4D4D8' stroke-width='1.5' stroke-dasharray='6%2c10' stroke-linecap='square'/%3e%3c/svg%3e\")" }}>
                  <span className="block dark:hidden">
                    <Image src={expiringEmptyLight} alt="" width={266} height={102} className="w-full max-w-60" />
                  </span>
                  <span className="hidden dark:block">
                    <Image src={expiringEmptyDark} alt="" width={266} height={102} className="w-full max-w-60" />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-foreground">Nothing expiring soon</p>
                  <p className="mt-1 text-sm text-muted-foreground">No contracts ending in the next 30 days.</p>
                </div>
              </>
            )}
          </div>

          {/* Activity */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Activity</h2>
              <Button variant="ghost" size="sm" render={<Link href="/events" />} nativeButton={false} className="text-muted-foreground">
                View activity
              </Button>
            </div>
            {allEvents.length ? (
              <>
                <div className="mt-3 border-t border-border/50" />
                <div className="mt-4" />
                <div>
                  {allEvents.slice(0, 5).map((event: Record<string, unknown>, index: number, arr: Record<string, unknown>[]) => {
                    const contractor = event.contractor_id as Record<string, unknown> | undefined;
                    const eventType = String(event.event_type ?? '');
                    const isHighPriority = HIGH_PRIORITY_EVENTS.has(eventType);
                    const color = eventColors[eventType] ?? 'bg-muted-foreground/40';
                    const isLast = index === arr.length - 1;
                    return (
                      <div key={String(event._id)} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`mt-1 size-2 shrink-0 rounded-full ${color}`} />
                          {!isLast && <div className="mt-1 w-px flex-1 bg-border/60" />}
                        </div>
                        <div className={cn('flex min-w-0 flex-1 items-start justify-between gap-4', !isLast && 'pb-4')}>
                          <div className="min-w-0">
                            <p className={cn('text-sm font-medium', isHighPriority ? 'text-foreground' : 'text-muted-foreground')}>
                              {getEventLabel(eventType)}
                            </p>
                            <p className="text-xs text-muted-foreground">
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
                  <Link
                    href="/events"
                    className="mt-4 block text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View all activity
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-3 flex flex-col items-center rounded-xl py-8" style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23D4D4D8' stroke-width='1.5' stroke-dasharray='6%2c10' stroke-linecap='square'/%3e%3c/svg%3e\")" }}>
                <span className="block dark:hidden">
                  <Image src={activityEmptyLight} alt="" width={266} height={102} className="w-full max-w-60" />
                </span>
                <span className="hidden dark:block">
                  <Image src={activityEmptyDark} alt="" width={266} height={102} className="w-full max-w-60" />
                </span>
                <p className="mt-4 text-sm font-semibold text-foreground">No activity yet</p>
                <p className="mt-1 text-sm text-muted-foreground">New activity will show here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
import { AlertTriangle, CheckCircle, ChevronBottom, ChevronRight, Clock, IconGoogle, IconPlusLarge, IconSlack, RefreshCw, Settings, ShieldOff, Users } from '@/components/icons';
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
  const [setupChecklistCollapsed, setSetupChecklistCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('setup-checklist-collapsed') === 'true';
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
      description: 'Import or add contractors to start managing their access and documents.',
      href: '/contractors/new',
      done: hasAnyContractor,
    },
    {
      label: 'Connect Google Workspace',
      description: 'Sync your directory to automatically discover and manage contractors.',
      href: '/settings/directory',
      done: isGoogleConnected,
    },
    {
      label: 'Invite a sponsor',
      description: 'Sponsors approve contractor requests and are notified about expiring agreements.',
      href: '/settings/team?invite=sponsor',
      done: sponsorCount > 0,
    },
    {
      label: 'Configure Slack notifications',
      description: 'Get notified in Slack when contracts are expiring or need attention.',
      href: '/settings/slack',
      done: isSlackConnected,
    },
  ];
  const completedCount = checklistItems.filter((i) => i.done).length;
  const allChecklistDone = completedCount === checklistItems.length;
  const showSetupChecklist = !allChecklistDone && !summaryLoading;

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

  const activeItem = checklistItems.find((item) => !item.done) ?? checklistItems[checklistItems.length - 1];

  return (
    <div className="space-y-12">
      <div className={cn('space-y-6', showSetupChecklist && 'pb-1')}>
      {/* Get started checklist */}
      {showSetupChecklist && (
        <>
          {/* Blue strip — adapts to collapsed state */}
          <div
            className="absolute inset-x-0 top-0 transition-[height] duration-300 ease-in-out"
            style={{
              height: setupChecklistCollapsed ? '192px' : '390px',
              backgroundColor: '#0071F9',
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />

          {/* Card — in normal flow, sits on top of the strip */}
          <div className="relative z-10 rounded-xl border bg-card px-6 pt-4 pb-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-foreground">Get started</p>
              <Button
                variant="ghost"
                size="sm"
                nativeButton
                onClick={() => {
                  const next = !setupChecklistCollapsed;
                  localStorage.setItem('setup-checklist-collapsed', String(next));
                  setSetupChecklistCollapsed(next);
                }}
                className="text-muted-foreground"
              >
                {setupChecklistCollapsed ? 'Show' : 'Hide'} <ChevronBottom size={13} className={cn('transition-transform duration-300', !setupChecklistCollapsed && 'rotate-180')} />
              </Button>
            </div>

            {/* Animated body wrapper */}
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: setupChecklistCollapsed ? '0fr' : '1fr' }}
            >
              <div className="overflow-hidden">
                {/* Two-column body */}
                <div className="grid grid-cols-[auto_1fr] gap-8 pt-4 pb-2">
                  {/* Left: step list */}
                  <div className="flex min-w-44 flex-col gap-1">
                    {checklistItems.map((item, i) => {
                      const isActive = item === activeItem;
                      return (
                        <div
                          key={item.label}
                          className={cn('flex items-center gap-3 rounded-lg px-3 py-2', isActive && 'bg-muted/60')}
                        >
                          <div className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            item.done
                              ? 'bg-primary/10 text-primary'
                              : isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                          )}>
                            {item.done ? <CheckCircle size={13} /> : i + 1}
                          </div>
                          <p className={cn(
                            'text-sm',
                            item.done
                              ? 'text-muted-foreground line-through'
                              : isActive
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground'
                          )}>
                            {item.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: active step detail */}
                  <div className="flex flex-col justify-center rounded-lg bg-muted/50 px-6 py-5">
                    <p className="text-base font-semibold text-foreground">{activeItem.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{activeItem.description}</p>
                    <Button className="mt-4 self-start" size="sm" render={<Link href={activeItem.href} />} nativeButton={false}>
                      Get started →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className={cn('relative z-10', showSetupChecklist && '[&_h1]:text-white [&_p]:text-white/80')}>
        <PageHeader
          title="Overview"
          description={dynamicDescription || 'See what needs attention across contractors, access, and requests.'}
        />
      </div>
      </div>

      <div className="grid gap-16 md:grid-cols-[3fr_7fr]">
        {/* Left: Key numbers */}
        <div>
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
                <div className="mt-3 flex flex-col items-center rounded-xl border border-dashed py-8">
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
              <div className="mt-3 flex flex-col items-center rounded-xl border border-dashed py-8">
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

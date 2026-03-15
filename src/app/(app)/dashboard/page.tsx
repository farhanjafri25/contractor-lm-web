'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { dashboardApi, eventsApi } from '@/lib/api';
import { AlertTriangle, Clock, RefreshCw, ShieldOff, TrendingUp, Users } from '@/components/icons';
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusBadge } from '@/components/app-ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DashboardPage() {
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
    queryFn: async () => (await eventsApi.list({ limit: 6 })).data,
  });

  const { data: atRisk } = useQuery({
    queryKey: ['dashboard-at-risk'],
    queryFn: async () => (await dashboardApi.getAtRisk({ limit: 5 })).data,
  });

  const metrics = summary
    ? [
        {
          label: 'Active contractors',
          value: summary.active_contractors,
          icon: Users,
          tone: 'success' as const,
          subtext: 'Currently engaged and provisioned',
        },
        {
          label: 'Suspended',
          value: summary.suspended_contractors,
          icon: AlertTriangle,
          tone: 'warning' as const,
          subtext: 'Paused pending a decision',
        },
        {
          label: 'Expiring soon',
          value: summary.expiring_soon,
          icon: Clock,
          tone: 'warning' as const,
          subtext: `Within ${summary.expiring_within_days} days`,
        },
        {
          label: 'Overdue access',
          value: summary.overdue_access,
          icon: ShieldOff,
          tone: 'danger' as const,
          subtext: 'Expired contracts with live access',
        },
        {
          label: 'Failed revocations',
          value: summary.failed_revocations,
          icon: RefreshCw,
          tone: 'danger' as const,
          subtext: 'Needs manual remediation',
        },
        {
          label: 'Total active',
          value: summary.active_contractors + summary.suspended_contractors,
          icon: TrendingUp,
          tone: 'info' as const,
          subtext: 'All non-terminated contractors',
        },
      ]
    : [];

  const eventColors: Record<string, string> = {
    'contractor.created': 'bg-primary',
    'contract.suspended': 'bg-muted-foreground/50',
    'contract.expired': 'bg-destructive',
    'contract.terminated': 'bg-destructive',
    'access.revoked': 'bg-foreground/60',
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operations dashboard"
        description="A live view of contractor exposure, access drift, and the next set of actions your team should take."
        actions={
          <Link href="/contractors/new" className={buttonVariants({ variant: 'default' })}>
            New contractor
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-48 rounded-[28px] border border-border/70 bg-secondary/40" />
            ))
          : metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Expiring contracts"
          description="Prioritize renewals before they cascade into sponsor requests or access exposure."
          actions={
            <Link href="/dashboard/expiring" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              View all
            </Link>
          }
        >
          {expiringLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 rounded-[22px] bg-secondary/50" />
              ))}
            </div>
          ) : expiring?.data?.length ? (
            <div className="space-y-3">
              {expiring.data.map((item: Record<string, unknown>) => {
                const contractor = item.contractor_id as Record<string, unknown> | undefined;
                return (
                  <Link
                    key={String(item._id)}
                    href={`/contractors/${contractor ? String(contractor._id ?? '') : ''}`}
                    className="flex items-center justify-between rounded-[24px] border border-border/60 bg-secondary/35 px-4 py-4 transition-colors hover:bg-accent/45"
                  >
                    <div>
                      <p className="font-medium text-foreground">{contractor ? String(contractor.name ?? '') : 'Unknown contractor'}</p>
                      <p className="text-sm text-muted-foreground">{contractor ? String(contractor.department ?? '') : ''}</p>
                    </div>
                    <StatusBadge status={item.end_date ? new Date(String(item.end_date)).toLocaleDateString() : 'Scheduled'} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No contracts expiring soon"
              description="Nothing in the current expiring window needs attention."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Recent activity"
          description="A quick pulse on the events that are shaping risk across the workspace."
          actions={
            <Link href="/events" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              Open audit log
            </Link>
          }
        >
          {events?.data?.length ? (
            <div className="space-y-4">
              {events.data.map((event: Record<string, unknown>) => {
                const contractor = event.contractor_id as Record<string, unknown> | undefined;
                const color = eventColors[String(event.event_type)] ?? 'bg-primary';
                return (
                  <div key={String(event._id)} className="flex gap-4 rounded-[24px] border border-border/60 bg-secondary/35 px-4 py-4">
                    <div className={`mt-1 size-2.5 shrink-0 rounded-full ${color}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {String(event.event_type ?? '').replace(/\./g, ' › ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contractor ? String(contractor.name ?? '') : 'System event'} ·{' '}
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
            <EmptyState title="No events yet" description="The audit trail will appear here as actions happen." />
          )}
        </SectionCard>
      </div>

      {atRisk?.data?.length ? (
        <SectionCard
          title="At-risk contractors"
          description="These records need action before contracts or access states drift further."
          actions={
            <Link href="/dashboard/at-risk" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              Review risk queue
            </Link>
          }
          className="border-destructive/15"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRisk.data.map((item: Record<string, unknown>) => {
                const contractor = item.contractor_id as Record<string, unknown> | undefined;
                return (
                  <TableRow key={String(item._id)}>
                    <TableCell>
                      <p className="font-medium text-foreground">{contractor ? String(contractor.name ?? '') : '—'}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contractor ? String(contractor.department ?? '') : '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={String(item.status ?? 'unknown')} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/contractors/${contractor ? String(contractor._id ?? '') : ''}`}>
                        <Button variant="ghost" size="sm">Open record</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>
      ) : null}
    </div>
  );
}

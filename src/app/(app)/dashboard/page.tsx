'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { dashboardApi, eventsApi } from '@/lib/api';
import { AlertTriangle, ChevronRight, Clock, RefreshCw, ShieldOff, TrendingUp, Users } from '@/components/icons';
import { EmptyState, MetricCard, PageHeader, SectionCard, StatusBadge } from '@/components/app-ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getEventLabel } from '@/lib/event-labels';

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
          subtext: 'Contractors with active work and access',
        },
        {
          label: 'Suspended',
          value: summary.suspended_contractors,
          icon: AlertTriangle,
          tone: 'warning' as const,
          subtext: 'Contracts paused until someone reviews them',
        },
        {
          label: 'Expiring soon',
          value: summary.expiring_soon,
          icon: Clock,
          tone: 'warning' as const,
          subtext: `Ending in the next ${summary.expiring_within_days} days`,
        },
        {
          label: 'Access overdue',
          value: summary.overdue_access,
          icon: ShieldOff,
          tone: 'danger' as const,
          subtext: 'Contracts ended, but access is still active',
        },
        {
          label: 'Failed removals',
          value: summary.failed_revocations,
          icon: RefreshCw,
          tone: 'danger' as const,
          subtext: 'Access changes that need manual work',
        },
        {
          label: 'Open contracts',
          value: summary.active_contractors + summary.suspended_contractors,
          icon: TrendingUp,
          tone: 'info' as const,
          subtext: 'Active and suspended contractors',
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
        title="Dashboard"
        description="See what needs attention across contractors, access, and requests."
        actions={
          <Link href="/contractors/new" className={buttonVariants({ variant: 'default' })}>
            Add contractor
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-48 rounded-[28px] border border-border/70 bg-background" />
            ))
          : metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Expiring soon"
          actions={
            <Button
              variant="secondary"
              size="sm"
              render={<Link href="/dashboard/expiring" />}
              nativeButton={false}
            >
              View queue
            </Button>
          }
        >
          {expiringLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 rounded-[16px] border border-border/60 bg-background" />
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
                    className="flex items-center justify-between rounded-[16px] border border-border/60 bg-background px-4 py-4 transition-colors hover:bg-accent/45"
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
              title="Nothing expires soon"
              description="Contracts ending in this window will show here."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Activity"
          actions={
            <Button
              variant="secondary"
              size="sm"
              render={<Link href="/events" />}
              nativeButton={false}
            >
              View activity
            </Button>
          }
        >
          {events?.data?.length ? (
            <div className="space-y-4">
              {events.data.map((event: Record<string, unknown>) => {
                const contractor = event.contractor_id as Record<string, unknown> | undefined;
                const color = eventColors[String(event.event_type)] ?? 'bg-primary';
                return (
                  <div key={String(event._id)} className="flex gap-4 rounded-[16px] border border-border/60 bg-background px-4 py-4">
                    <div className={`mt-1 size-2.5 shrink-0 rounded-full ${color}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {getEventLabel(String(event.event_type ?? ''))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contractor ? String(contractor.name ?? '') : 'Tenurio'} ·{' '}
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
            <EmptyState title="No activity yet" description="New activity will show here." />
          )}
        </SectionCard>
      </div>

      {atRisk?.data?.length ? (
        <SectionCard
          title="Needs review"
          description="These records need a decision or manual cleanup."
          actions={
            <Button
              variant="secondary"
              size="sm"
              render={<Link href="/dashboard/at-risk" />}
              nativeButton={false}
            >
              View queue
            </Button>
          }
          className="border-destructive/15"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"><span className="sr-only">Action</span></TableHead>
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
                        <Button variant="ghost" size="icon-sm" aria-label="View contractor" title="View contractor">
                          <ChevronRight size={14} />
                          <span className="sr-only">View contractor</span>
                        </Button>
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

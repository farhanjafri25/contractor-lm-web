'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accessApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { CheckCheck, RotateCcw, IconGoogle, IconSlack } from '@/components/icons';
import { DataTableShell, FieldBlock, FiltersPopover, FilterSelect, PageHeader, StatusBadge, SummaryPill } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';

const statuses = ['', 'active', 'pending', 'revoked', 'failed'];

function formatStatusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown';
}

export default function AccessPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const statusFilter = searchParams.get('status') ?? '';
  const appFilter = searchParams.get('app') ?? '';
  const sourceFilter = searchParams.get('source') ?? '';
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState<{ id: string; type: 'retry' | 'resolve' } | null>(null);

  const updateFilterParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['access-all'],
    queryFn: async () => (await accessApi.list()).data,
  });

  const records: Record<string, unknown>[] = data?.data ?? [];
  const total = data?.total ?? records.length;

  const runAccessAction = async (
    id: string,
    type: 'retry' | 'resolve',
    request: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionError('');
    setActionLoading({ id, type });
    try {
      await request();
      await queryClient.invalidateQueries({ queryKey: ['access-all'] });
      toast.success(successMessage);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Action failed. Try again.');
      setActionError(message);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (id: string) => {
    await runAccessAction(id, 'retry', () => accessApi.retryRevocation(id), 'Access retry started.');
  };

  const handleMarkResolved = async (id: string) => {
    await runAccessAction(id, 'resolve', () => accessApi.markResolved(id), 'Access issue marked as resolved.');
  };

  const applicationOptions = [
    { label: 'All applications', value: '' },
    ...Array.from<string>(
      new Set<string>(
        records
          .map((record) => {
            const app = record.tenant_application_id as Record<string, unknown> | undefined;
            return String(app?.application_id ?? app?.display_name ?? app?.app_key ?? '').trim();
          })
          .filter(Boolean),
      ),
    )
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ label: value, value })),
  ];
  const sourceOptions = [
    { label: 'All sources', value: '' },
    { label: 'Tenurio', value: 'tenurio' },
    { label: 'Team member', value: 'member' },
  ];

  const filteredRecords = records.filter((record) => {
    const app = record.tenant_application_id as Record<string, unknown> | undefined;
    const applicationName = String(app?.application_id ?? app?.display_name ?? app?.app_key ?? '').trim();
    const grantedBy = record.granted_by as Record<string, unknown> | undefined;
    const source = grantedBy ? 'member' : 'tenurio';
    const status = String(record.provisioning_status ?? record.status ?? '');
    const statusMatches = !statusFilter || status === statusFilter;
    const appMatches = !appFilter || applicationName === appFilter;
    const sourceMatches = !sourceFilter || source === sourceFilter;
    return statusMatches && appMatches && sourceMatches;
  });

  const activeFilterCount = [statusFilter, appFilter, sourceFilter].filter(Boolean).length;
  const hasFilters = Boolean(statusFilter || appFilter || sourceFilter);

  const counts = records.reduce<Record<string, number>>((accumulator, record) => {
    const status = String(record.provisioning_status ?? record.status ?? '');
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});

  const groupedByContractor = filteredRecords.reduce<Record<string, {
    contractor: any;
    apps: any[];
    grantedBy: any;
    status: string;
    failureReasons: string[];
  }>>((acc, record) => {
    const contractor = record.contractor_id as any;
    const contractorId = String(contractor?._id || 'unknown');
    
    if (!acc[contractorId]) {
      acc[contractorId] = {
        contractor,
        apps: [],
        grantedBy: record.granted_by,
        status: 'active',
        failureReasons: [],
      };
    }

    const app = record.tenant_application_id as any;
    const application = app?.application_id as any;
    const appSlug = application?.slug || String(app?.display_name ?? app?.app_key ?? '').trim();

    // Only add unique application slugs to the list
    const existingApp = acc[contractorId].apps.find(a => a.application_slug === appSlug);
    if (!existingApp) {
      acc[contractorId].apps.push({
        ...app,
        application_slug: appSlug,
        access_id: record._id,
        status: record.provisioning_status ?? record.status,
        failure_reason: record.failure_reason,
        access_role: record.access_role,
      });
    } else {
      // If we encounter a 'failed' record for the same app, prioritize it for the aggregate view
      const currentStatus = record.provisioning_status ?? record.status;
      if (currentStatus === 'failed') {
        existingApp.status = 'failed';
        existingApp.failure_reason = record.failure_reason;
        existingApp.access_id = record._id;
      }
    }

    // Aggregate Status Priority: failed > pending > active > revoked
    const currentStatus = record.provisioning_status ?? record.status;
    const priority: Record<string, number> = { failed: 4, pending: 3, active: 2, revoked: 1, '': 0 };
    if (priority[currentStatus] > priority[acc[contractorId].status]) {
      acc[contractorId].status = currentStatus;
    }

    if (record.failure_reason) {
      acc[contractorId].failureReasons.push(record.failure_reason);
    }

    return acc;
  }, {});

  const groupedRecords = Object.values(groupedByContractor);

  const renderAppIcon = (slug: string, status: string) => {
    const isFailed = status === 'failed';
    const baseClass = "h-5 w-5 transition-opacity";
    const opacityClass = status === 'pending' ? "opacity-40 animate-pulse" : "opacity-100";
    
    if (slug === 'google-workspace') {
      return (
        <div key={slug} className="relative group" title="Google Workspace">
          <IconGoogle className={`${baseClass} ${opacityClass}`} />
          {isFailed && <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive border border-background" />}
        </div>
      );
    }
    if (slug === 'slack') {
      return (
        <div key={slug} className="relative group" title="Slack">
          <IconSlack className={`${baseClass} ${opacityClass}`} />
          {isFailed && <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive border border-background" />}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Access"
        description={`${total.toLocaleString()} access permissions across your team.`}
      />

      {actionError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {!isLoading && Object.keys(counts).length ? (
            <div className="flex flex-wrap gap-3">
              {Object.entries(counts).map(([status, count]) => (
                <SummaryPill
                  key={status}
                  label={formatStatusLabel(status)}
                  count={count}
                  active={statusFilter === status}
                  onClick={() => updateFilterParams({ status: statusFilter === status ? '' : status })}
                />
              ))}
            </div>
          ) : null}

          <div className="ml-auto">
            <FiltersPopover
              activeCount={activeFilterCount}
              onClear={() => updateFilterParams({ status: '', app: '', source: '' })}
            >
              <FieldBlock label="Status">
                <FilterSelect
                  value={statusFilter}
                  onValueChange={(value) => updateFilterParams({ status: value })}
                  options={statuses.map((status) => ({
                    label: status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'All statuses',
                    value: status,
                  }))}
                  placeholder="All statuses"
                  className="w-full"
                />
              </FieldBlock>
              <FieldBlock label="Application">
                <FilterSelect
                  value={appFilter}
                  onValueChange={(value) => updateFilterParams({ app: value })}
                  options={applicationOptions}
                  placeholder="All applications"
                  className="w-full"
                />
              </FieldBlock>
              <FieldBlock label="Assigned by">
                <FilterSelect
                  value={sourceFilter}
                  onValueChange={(value) => updateFilterParams({ source: value })}
                  options={sourceOptions}
                  placeholder="All sources"
                  className="w-full"
                />
              </FieldBlock>
            </FiltersPopover>
          </div>
        </div>

        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned by</TableHead>
                {isAdmin ? <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? <TableLoadingRows rows={5} columns={isAdmin ? 5 : 4} actionColumn={isAdmin} />
                : groupedRecords.map(({ contractor, apps, status, grantedBy, failureReasons }) => {
                    const contractorId = String(contractor?._id || Math.random());
                    
                    return (
                      <TableRow key={contractorId}>
                        <TableCell>
                          <p className="font-medium text-foreground">{contractor ? String(contractor.name ?? '—') : '—'}</p>
                          <p className="text-sm text-muted-foreground">{contractor ? String(contractor.department ?? '') : ''}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {apps.map((app) => renderAppIcon(app.application_slug, app.status))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={status} />
                          {failureReasons.length > 0 && (
                             <p className="mt-2 max-w-[16rem] text-xs text-destructive">
                                {failureReasons[0].slice(0, 70)}
                                {failureReasons.length > 1 && ` (+${failureReasons.length - 1} more)`}
                             </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{grantedBy ? String(grantedBy.email ?? '—') : 'Tenurio'}</TableCell>
                        {isAdmin ? (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                {apps.filter(a => a.status === 'failed').map((app) => {
                                    const appName = app.application_slug === 'google-workspace' ? 'Google' : 'Slack';
                                    const isActing = actionLoading?.id === app.access_id;
                                    return (
                                        <div key={app.access_id} className="flex gap-1.5 border-l border-border pl-2 first:border-0 first:pl-0">
                                            <Button
                                                variant="secondary"
                                                size="icon-sm"
                                                onClick={() => handleRetry(app.access_id)}
                                                disabled={!!actionLoading}
                                                title={`Retry ${appName} provisioning`}
                                            >
                                                <RotateCcw size={12} className={isActing && actionLoading?.type === 'retry' ? 'animate-spin' : undefined} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleMarkResolved(app.access_id)}
                                                disabled={!!actionLoading}
                                                title={`Mark ${appName} as resolved`}
                                            >
                                                <CheckCheck size={12} />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
              {!isLoading && groupedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="py-14 text-center text-muted-foreground">
                    {hasFilters ? 'No access matches this filter. Matching records will show here.' : 'No access records yet. Linked accounts will show here.'}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    </div>
  );
}

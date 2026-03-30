'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accessApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { CheckCheck, RotateCcw, IconGoogle, IconSlack } from '@/components/icons';
import { DataTableShell, FieldBlock, FiltersPopover, FilterSelect, PageHeader, StatusBadge, SummaryPill } from '@/components/app-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';

const statuses = ['', 'active', 'pending', 'revoked', 'failed'];

interface Contractor {
  _id: string;
  name?: string;
  department?: string;
}

interface Application {
  _id: string;
  display_name?: string;
  app_key?: string;
  application_id?: {
    _id: string;
    name: string;
    slug: string;
  };
}

interface GroupedApp extends Application {
  application_slug: string;
  access_id: string;
  status: string;
  failure_reason?: string;
  access_role?: string;
}

interface GroupedByContractor {
  contractorKey: string;
  contractor: Contractor;
  apps: GroupedApp[];
  grantedBy: { email?: string } | null;
  status: string;
}

function formatStatusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown';
}

function getApplicationLabel(slug: string) {
  if (slug === 'google-workspace') {
    return 'Google';
  }

  if (slug === 'slack') {
    return 'Slack';
  }

  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderAppIcon(slug: string, status: string) {
  const isFailed = status === 'failed';
  const baseClass = 'h-4 w-4 transition-opacity';
  const opacityClass = status === 'pending' ? 'opacity-40 animate-pulse' : 'opacity-100';

  if (slug === 'google-workspace') {
    return (
      <div key={slug} className="relative" title="Google Workspace">
        <IconGoogle className={`${baseClass} ${opacityClass}`} />
        {isFailed ? <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full border border-background bg-destructive" /> : null}
      </div>
    );
  }

  if (slug === 'slack') {
    return (
      <div key={slug} className="relative" title="Slack">
        <IconSlack className={`${baseClass} ${opacityClass}`} />
        {isFailed ? <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full border border-background bg-destructive" /> : null}
      </div>
    );
  }

  return null;
}

function ReviewIssuesDialog({
  row,
  open,
  onOpenChange,
}: {
  row: GroupedByContractor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<{ id: string; type: 'retry' | 'resolve' } | null>(null);
  const failedApps = row?.apps.filter((app) => app.status === 'failed') ?? [];
  const contractorName = row?.contractor ? String(row.contractor.name ?? '—') : '—';
  const contractorDepartment = row?.contractor ? String(row.contractor.department ?? '') : '';

  useEffect(() => {
    if (!open) {
      return;
    }

    setError('');
    setActionLoading(null);
  }, [open, row?.contractorKey]);

  const runAccessAction = async (
    id: string,
    type: 'retry' | 'resolve',
    request: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setError('');
    setActionLoading({ id, type });

    try {
      await request();
      await queryClient.invalidateQueries({ queryKey: ['access-all'] });
      toast.success(successMessage);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Action failed. Try again.');
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!row) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <div className="pr-10">
            <DialogTitle>Review access issues</DialogTitle>
            <DialogDescription>
              {contractorName}
              {contractorDepartment ? ` · ${contractorDepartment}` : ''}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-1">
          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {failedApps.map((app) => {
            const appName = getApplicationLabel(app.application_slug);
            const isRetrying = actionLoading?.id === app.access_id && actionLoading.type === 'retry';
            const isResolving = actionLoading?.id === app.access_id && actionLoading.type === 'resolve';
            const isBusy = actionLoading?.id === app.access_id;

            return (
              <div key={app.access_id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      {renderAppIcon(app.application_slug, app.status)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{appName}</p>
                      <Badge variant="danger">Failed</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  {app.failure_reason || 'No failure reason was provided.'}
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => runAccessAction(app.access_id, 'retry', () => accessApi.retryRevocation(app.access_id), 'Access retry started.')}
                    disabled={Boolean(isBusy)}
                  >
                    <RotateCcw size={14} className={isRetrying ? 'animate-spin' : undefined} />
                    {isRetrying ? 'Retrying…' : 'Retry'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => runAccessAction(app.access_id, 'resolve', () => accessApi.markResolved(app.access_id), 'Access issue marked as resolved.')}
                    disabled={Boolean(isBusy)}
                  >
                    <CheckCheck size={14} />
                    {isResolving ? 'Resolving…' : 'Mark resolved'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={Boolean(actionLoading)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AccessPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') ?? '';
  const appFilter = searchParams.get('app') ?? '';
  const sourceFilter = searchParams.get('source') ?? '';
  const [reviewingContractorKey, setReviewingContractorKey] = useState<string | null>(null);

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

  const groupedByContractor = filteredRecords.reduce<Record<string, GroupedByContractor>>((acc, record) => {
    const contractor = record.contractor_id as unknown as Contractor;
    const contractorId = String(contractor?._id || 'unknown');
    
    if (!acc[contractorId]) {
      acc[contractorId] = {
        contractorKey: contractorId,
        contractor,
        apps: [],
        grantedBy: record.granted_by as { email?: string } | null,
        status: 'active',
      };
    }

    const app = record.tenant_application_id as unknown as Application;
    const application = app?.application_id;
    const appSlug = application?.slug || String(app?.display_name ?? app?.app_key ?? '').trim();

    // Only add unique application slugs to the list
    const existingApp = acc[contractorId].apps.find(a => a.application_slug === appSlug);
    if (!existingApp) {
      acc[contractorId].apps.push({
        ...app,
        application_slug: appSlug,
        access_id: record._id as string,
        status: String(record.provisioning_status ?? record.status ?? ''),
        failure_reason: record.failure_reason as string,
        access_role: record.access_role as string,
      });
    } else {
      // If we encounter a 'failed' record for the same app, prioritize it for the aggregate view
      const currentStatus = String(record.provisioning_status ?? record.status ?? '');
      if (currentStatus === 'failed') {
        existingApp.status = 'failed';
        existingApp.failure_reason = record.failure_reason as string;
        existingApp.access_id = record._id as string;
      }
    }

    // Aggregate Status Priority: failed > pending > active > revoked
    const currentStatus = String(record.provisioning_status ?? record.status ?? '');
    const priority: Record<string, number> = { failed: 4, pending: 3, active: 2, revoked: 1, '': 0 };
    if (priority[currentStatus] > priority[acc[contractorId].status]) {
      acc[contractorId].status = currentStatus;
    }

    return acc;
  }, {});

  const groupedRecords = Object.values(groupedByContractor);
  const reviewingGroup = groupedRecords.find((group) => group.contractorKey === reviewingContractorKey) ?? null;
  const reviewDialogOpen = Boolean(
    reviewingContractorKey &&
    reviewingGroup &&
    reviewingGroup.apps.some((app) => app.status === 'failed'),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Access"
        description={`${total.toLocaleString()} access permissions across your team.`}
      />

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
                : groupedRecords.map(({ contractorKey, contractor, apps, status, grantedBy }) => {
                    const failedApps = apps.filter((app) => app.status === 'failed');
                    
                    return (
                      <TableRow key={contractorKey}>
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
                          {failedApps.length > 0 && (
                             <p className="mt-2 max-w-[16rem] text-xs text-muted-foreground">
                                {failedApps.length === 1 ? '1 app needs review.' : `${failedApps.length} apps need review.`}
                             </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{grantedBy ? String(grantedBy.email ?? '—') : 'Tenurio'}</TableCell>
                        {isAdmin ? (
                          <TableCell className="text-right">
                            {failedApps.length ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setReviewingContractorKey(contractorKey)}
                              >
                                Review issues
                              </Button>
                            ) : null}
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

      <ReviewIssuesDialog
        row={reviewingGroup}
        open={reviewDialogOpen}
        onOpenChange={(open) => !open && setReviewingContractorKey(null)}
      />
    </div>
  );
}

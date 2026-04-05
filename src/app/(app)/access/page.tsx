'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accessApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ContractorHoverPopover } from '@/components/contractor-hover-popover';
import { CheckCheck, RotateCcw, IconDotGrid1x3VerticalTight, IconGoogle, IconSlack } from '@/components/icons';
import { ClearFiltersButton, DataTableShell, FieldBlock, FiltersPopover, MultiFilterChecklist, MultiFilterDropdown, PageHeader, SearchField, StatusBadge } from '@/components/app-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';

const statuses = ['', 'active', 'pending', 'revoked', 'failed'];

interface Contractor {
  _id: string;
  name?: string;
  email?: string;
  department?: string;
  job_title?: string;
  avatar?: string;
  image?: string;
  photo?: string;
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
  grantedBy: {
    email?: string;
    name?: string;
    full_name?: string;
    display_name?: string;
  } | null;
  status: string;
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

function getApplicationDetails(app: Record<string, unknown> | Application | undefined) {
  const linkedApplication =
    app && typeof app.application_id === 'object' && app.application_id
      ? app.application_id as { _id?: string; name?: string; slug?: string }
      : undefined;
  const value = String(linkedApplication?.slug ?? linkedApplication?._id ?? app?.app_key ?? app?.display_name ?? '').trim();
  const label = String(linkedApplication?.name ?? app?.display_name ?? app?.app_key ?? (value ? getApplicationLabel(value) : '')).trim();

  return { label, value };
}

function getSourceDetails(grantedBy: Record<string, unknown> | undefined | null) {
  if (!grantedBy) {
    return { label: 'Tenurio', value: 'tenurio' };
  }

  const label = String(grantedBy.name ?? grantedBy.full_name ?? grantedBy.display_name ?? grantedBy.email ?? 'Unknown source').trim();
  const value = String(grantedBy.email ?? grantedBy._id ?? label).trim();

  return { label, value };
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
                    </div>
                  </div>
                  <Badge variant="danger">Failed</Badge>
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
  const queryClient = useQueryClient();
  const statusFilters = searchParams.getAll('status').filter(Boolean);
  const appFilters = searchParams.getAll('app').filter(Boolean);
  const sourceFilters = searchParams.getAll('source').filter(Boolean);
  const [search, setSearch] = useState('');
  const [reviewingContractorKey, setReviewingContractorKey] = useState<string | null>(null);
  const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);

  const updateFilterParams = (updates: Record<string, string | string[]>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      params.delete(key);

      const values = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
      values.forEach((nextValue) => params.append(key, nextValue));
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
    ...Array.from(
      records.reduce((options, record) => {
        const app = record.tenant_application_id as Record<string, unknown> | undefined;
        const details = getApplicationDetails(app);

        if (details.value && details.label) {
          options.set(details.value, details.label);
        }

        return options;
      }, new Map<string, string>()),
    )
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([value, label]) => ({ label, value })),
  ];
  const sourceOptions = [
    { label: 'All sources', value: '' },
    ...Array.from(
      records.reduce((options, record) => {
        const grantedBy = record.granted_by as Record<string, unknown> | undefined;
        const details = getSourceDetails(grantedBy);
        options.set(details.value, details.label);
        return options;
      }, new Map<string, string>()),
    )
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([value, label]) => ({ label, value })),
  ];

  const filteredRecords = records.filter((record) => {
    const contractor = record.contractor_id as Record<string, unknown> | undefined;
    const app = record.tenant_application_id as Record<string, unknown> | undefined;
    const grantedBy = record.granted_by as Record<string, unknown> | undefined;
    const application = getApplicationDetails(app);
    const source = getSourceDetails(grantedBy);
    const status = String(record.provisioning_status ?? record.status ?? '');
    const searchNeedle = search.trim().toLowerCase();
    const searchMatches =
      !searchNeedle ||
      [
        contractor?.name,
        contractor?.department,
        application.label,
        application.value,
        app?.app_key,
        app?.display_name,
        typeof app?.application_id === 'object' ? (app.application_id as { name?: string }).name : app?.application_id,
        grantedBy?.name,
        grantedBy?.full_name,
        grantedBy?.display_name,
        grantedBy?.email,
        source.label,
        status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchNeedle));
    const statusMatches = statusFilters.length === 0 || statusFilters.includes(status);
    const appMatches = appFilters.length === 0 || appFilters.includes(application.value);
    const sourceMatches = sourceFilters.length === 0 || sourceFilters.includes(source.value);
    return searchMatches && statusMatches && appMatches && sourceMatches;
  });

  const activeFilterCount = statusFilters.length + appFilters.length + sourceFilters.length;
  const hasSearchOrFilters = Boolean(search || activeFilterCount);
  const clearFilters = () => updateFilterParams({ status: [], app: [], source: [] });

  const groupedByContractor = filteredRecords.reduce<Record<string, GroupedByContractor>>((acc, record) => {
    const contractor = record.contractor_id as unknown as Contractor;
    const contractorId = String(contractor?._id || 'unknown');
    
    if (!acc[contractorId]) {
      acc[contractorId] = {
        contractorKey: contractorId,
        contractor,
        apps: [],
        grantedBy: record.granted_by as GroupedByContractor['grantedBy'],
        status: 'active',
      };
    }

    const app = record.tenant_application_id as unknown as Application;
    const application = getApplicationDetails(app);
    const appSlug = application.value;

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
  const handleRevoke = async (id: string) => {
    setRevokeLoadingId(id);

    try {
      await accessApi.revoke(id);
      await queryClient.invalidateQueries({ queryKey: ['access-all'] });
      toast.success('Access revocation started.');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not revoke access. Try again.'));
    } finally {
      setRevokeLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Access"
        description={`${total.toLocaleString()} access permissions across your team.`}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2 md:hidden">
          <SearchField value={search} onChange={setSearch} placeholder="Search access" className="flex-1" />
          <FiltersPopover
            activeCount={activeFilterCount}
            onClear={clearFilters}
          >
            <FieldBlock label="Status">
              <MultiFilterChecklist
                values={statusFilters}
                onValuesChange={(values) => updateFilterParams({ status: values })}
                options={statuses.map((status) => ({
                  label: status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'All statuses',
                  value: status,
                }))}
              />
            </FieldBlock>
            <FieldBlock label="Application">
              <MultiFilterChecklist
                values={appFilters}
                onValuesChange={(values) => updateFilterParams({ app: values })}
                options={applicationOptions}
              />
            </FieldBlock>
            <FieldBlock label="Assigned by">
              <MultiFilterChecklist
                values={sourceFilters}
                onValuesChange={(values) => updateFilterParams({ source: values })}
                options={sourceOptions}
              />
            </FieldBlock>
          </FiltersPopover>
          <ClearFiltersButton activeCount={activeFilterCount} onClear={clearFilters} />
        </div>

        <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <MultiFilterDropdown
              title="Status"
              values={statusFilters}
              onValuesChange={(values) => updateFilterParams({ status: values })}
              options={statuses.map((status) => ({
                label: status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'All statuses',
                value: status,
              }))}
              placeholder="All statuses"
              className="min-w-40"
            />
            <MultiFilterDropdown
              title="Application"
              values={appFilters}
              onValuesChange={(values) => updateFilterParams({ app: values })}
              options={applicationOptions}
              placeholder="All applications"
              className="min-w-48"
            />
            <MultiFilterDropdown
              title="Assigned by"
              values={sourceFilters}
              onValuesChange={(values) => updateFilterParams({ source: values })}
              options={sourceOptions}
              placeholder="All sources"
              className="min-w-40"
            />
            <ClearFiltersButton activeCount={activeFilterCount} onClear={clearFilters} />
          </div>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search access"
            className="ml-auto w-80"
          />
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
                    const revocableApps = apps.filter((app) => app.status === 'active');
                    
                    return (
                      <TableRow key={contractorKey}>
                        <TableCell>
                          <ContractorHoverPopover
                            contractorId={contractor ? String(contractor._id ?? '') : undefined}
                            name={contractor ? String(contractor.name ?? '') : undefined}
                            email={contractor ? String(contractor.email ?? '') : undefined}
                            department={contractor ? String(contractor.department ?? '') : undefined}
                            jobTitle={contractor ? String(contractor.job_title ?? '') : undefined}
                            avatar={contractor ? String(contractor.avatar ?? '') : undefined}
                            image={contractor ? String(contractor.image ?? '') : undefined}
                            photo={contractor ? String(contractor.photo ?? '') : undefined}
                            subtitle={contractor ? String(contractor.department ?? '') : ''}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {apps.map((app) => renderAppIcon(app.application_slug, app.status))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={status} />
                        </TableCell>
                        <TableCell>
                          {grantedBy ? (
                            (() => {
                              const displayName = String(
                                grantedBy.name ?? grantedBy.full_name ?? grantedBy.display_name ?? grantedBy.email ?? '—',
                              );
                              const email = grantedBy.email ? String(grantedBy.email) : '';

                              return (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-foreground">{displayName}</p>
                                  {email && email !== displayName ? (
                                    <p className="text-sm text-muted-foreground">{email}</p>
                                  ) : null}
                                </div>
                              );
                            })()
                          ) : (
                            <p className="text-muted-foreground">Tenurio</p>
                          )}
                        </TableCell>
                        {isAdmin ? (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
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
                              {revocableApps.length ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Open actions for ${String(contractor?.name ?? 'contractor access')}`}
                                        title="Access actions"
                                      />
                                    }
                                  >
                                    <IconDotGrid1x3VerticalTight size={14} />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-44">
                                    {revocableApps.map((app) => {
                                      const appName = getApplicationLabel(app.application_slug);
                                      const isRevoking = revokeLoadingId === app.access_id;

                                      return (
                                        <DropdownMenuItem
                                          key={app.access_id}
                                          variant="destructive"
                                          disabled={Boolean(revokeLoadingId)}
                                          onClick={() => handleRevoke(app.access_id)}
                                        >
                                          {isRevoking ? `Revoking ${appName}…` : `Revoke ${appName} access`}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : null}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
              {!isLoading && groupedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="py-14 text-center text-muted-foreground">
                    {hasSearchOrFilters ? 'No access matches this search or filter. Matching records will show here.' : 'No access records yet. Linked accounts will show here.'}
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

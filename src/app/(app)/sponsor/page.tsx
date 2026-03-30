'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sponsorApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/auth-context';
import { CheckCircle, Checkmark2, Clock, IconCrossLarge, XCircle } from '@/components/icons';
import { InitialAvatar, getAvatarSeed } from '@/components/initial-avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { DataTableShell, FieldBlock, FiltersPopover, FilterSelect, PageHeader, SearchField, StatusBadge } from '@/components/app-ui';

const requestStatusOptions = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const recencyOptions = [
  { label: 'Any time', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
];

const actionTypeLabels: Record<string, string> = {
  extend: 'Extension',
  reactivate: 'Reactivation',
  access_change: 'Access change',
  deactivate: 'Deactivation',
};

function getActionTypeLabel(value: string) {
  return actionTypeLabels[value] ?? value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getRecencyMatch(dateValue: unknown, range: string) {
  if (!range || !dateValue) {
    return !range;
  }

  const createdAt = new Date(String(dateValue));

  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  const now = new Date();

  if (range === 'today') {
    return createdAt.toDateString() === now.toDateString();
  }

  const elapsedDays = (now.getTime() - createdAt.getTime()) / 86_400_000;

  if (range === '7d') {
    return elapsedDays >= 0 && elapsedDays <= 7;
  }

  if (range === '30d') {
    return elapsedDays >= 0 && elapsedDays <= 30;
  }

  return true;
}

export default function SponsorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeAction, setActiveAction] = useState<{ requestId: string; decision: 'approved' | 'rejected' } | null>(null);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const statusFilter = searchParams.get('status') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const rangeFilter = searchParams.get('range') ?? '';
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sponsor-actions', statusFilter],
    queryFn: async () => (await sponsorApi.list({ status: statusFilter || undefined })).data,
  });

  const requests = Array.isArray(data?.data) ? data.data : [];
  const requestTypeOptions = [
    { label: 'All request types', value: '' },
    ...Array.from<string>(
      new Set<string>(
        requests
          .map((request: Record<string, unknown>) => String(request.action_type ?? '').trim())
          .filter(Boolean),
      ),
    )
      .sort((left, right) => getActionTypeLabel(left).localeCompare(getActionTypeLabel(right)))
      .map((value) => ({ label: getActionTypeLabel(value), value })),
  ];
  const query = search.trim().toLowerCase();
  const filteredRequests = requests.filter((request: Record<string, unknown>) => {
      const requestType = String(request.action_type ?? '');
      const requestDate = request.createdAt || request.created_at;
      const typeMatches = !typeFilter || requestType === typeFilter;
      const rangeMatches = getRecencyMatch(requestDate, rangeFilter);

      if (!typeMatches || !rangeMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

        const contract = request.contract_id as Record<string, unknown> | undefined;
        const contractor = contract?.contractor_id as Record<string, unknown> | undefined;
        const submitter = request.sponsor_id as Record<string, unknown> | undefined;
        const values = [
          contractor ? String(contractor.name ?? '') : '',
          contractor ? String(contractor.department ?? '') : '',
          submitter ? String(submitter.email ?? '') : '',
          getActionTypeLabel(requestType),
          String(request.status ?? ''),
        ];

        return values.some((value) => value.toLowerCase().includes(query));
      });
  const activeFilterCount = [statusFilter, typeFilter, rangeFilter].filter(Boolean).length;
  const hasSearchOrFilters = Boolean(search || statusFilter || typeFilter || rangeFilter);

  const updateFilterParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const icons = {
    pending: <Clock size={12} />,
    approved: <CheckCircle size={12} />,
    rejected: <XCircle size={12} />,
  };

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['sponsor-actions'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-pending-requests'] }),
    ]);
  };

  const runRequestAction = async (requestId: string, decision: 'approved' | 'rejected') => {
    setActionError('');
    setActiveAction({ requestId, decision });

    try {
      await sponsorApi.review(requestId, decision);
      await refresh();
      toast.success(decision === 'approved' ? 'Request approved.' : 'Request rejected.');
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Review failed. Try again.');
      setActionError(message);
      toast.error(message);
    } finally {
      setActiveAction(null);
    }
  };

  const isBusy = (requestId: string) => activeAction?.requestId === requestId;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Requests"
        description="Review extension and change requests from sponsors."
      />

      <div className="space-y-4">
        {actionError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchField value={search} onChange={setSearch} placeholder="Search requests" className="md:w-80" />
          <FiltersPopover
            activeCount={activeFilterCount}
            onClear={() => updateFilterParams({ status: '', type: '', range: '' })}
          >
            <FieldBlock label="Status">
              <FilterSelect
                value={statusFilter}
                onValueChange={(value) => updateFilterParams({ status: value })}
                options={requestStatusOptions}
                placeholder="All statuses"
                className="w-full"
              />
            </FieldBlock>
            <FieldBlock label="Request type">
              <FilterSelect
                value={typeFilter}
                onValueChange={(value) => updateFilterParams({ type: value })}
                options={requestTypeOptions}
                placeholder="All request types"
                className="w-full"
              />
            </FieldBlock>
            <FieldBlock label="Recency">
              <FilterSelect
                value={rangeFilter}
                onValueChange={(value) => updateFilterParams({ range: value })}
                options={recencyOptions}
                placeholder="Any time"
                className="w-full"
              />
            </FieldBlock>
          </FiltersPopover>
        </div>

        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Submitted by</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin ? <TableHead className="text-right"><span className="sr-only">Action</span></TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? <TableLoadingRows rows={4} columns={isAdmin ? 6 : 5} actionColumn={isAdmin} />
                : filteredRequests.map((request: Record<string, unknown>) => {
                    const contract = request.contract_id as Record<string, unknown> | undefined;
                    const contractor = contract?.contractor_id as Record<string, unknown> | undefined;
                    const submitter = request.sponsor_id as Record<string, unknown> | undefined;
                    const status = String(request.status ?? 'pending');
                    const requestDate = request.createdAt || request.created_at;
                    const contractorName = contractor ? String(contractor.name ?? '') : '';
                    const contractorEmail = contractor ? String(contractor.email ?? '') : '';
                    const contractorSeed = getAvatarSeed(contractor?._id, contractorEmail, contractorName);
                    const submitterName = submitter ? String(submitter.name ?? submitter.full_name ?? submitter.display_name ?? '') : '';
                    const submitterEmail = submitter ? String(submitter.email ?? '') : '';
                    return (
                      <TableRow key={String(request._id)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <InitialAvatar seed={contractorSeed} label={contractorName || contractorEmail} />
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground">{contractorName || '—'}</p>
                              <p className="text-sm text-muted-foreground">{contractor ? String(contractor.department ?? '') : ''}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {getActionTypeLabel(String(request.action_type ?? ''))}
                        </TableCell>
                        <TableCell>
                          {submitter ? (
                            <div className="space-y-0.5">
                              {submitterName ? <p className="font-medium text-foreground">{submitterName}</p> : null}
                              <p className="text-sm text-muted-foreground">{submitterEmail || '—'}</p>
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {requestDate ? new Date(String(requestDate)).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={status} icon={icons[status as keyof typeof icons]} />
                        </TableCell>
                        {isAdmin ? (
                          <TableCell className="text-right">
                            {status === 'pending' ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  size="icon-sm"
                                  onClick={() => runRequestAction(String(request._id), 'rejected')}
                                  disabled={isBusy(String(request._id))}
                                  aria-label={activeAction?.decision === 'rejected' && isBusy(String(request._id)) ? 'Rejecting request' : 'Reject request'}
                                  title={activeAction?.decision === 'rejected' && isBusy(String(request._id)) ? 'Rejecting request' : 'Reject request'}
                                >
                                  <IconCrossLarge size={14} />
                                  <span className="sr-only">
                                    {activeAction?.decision === 'rejected' && isBusy(String(request._id)) ? 'Rejecting request' : 'Reject request'}
                                  </span>
                                </Button>
                                <Button
                                  size="icon-sm"
                                  onClick={() => runRequestAction(String(request._id), 'approved')}
                                  disabled={isBusy(String(request._id))}
                                  aria-label={activeAction?.decision === 'approved' && isBusy(String(request._id)) ? 'Approving request' : 'Approve request'}
                                  title={activeAction?.decision === 'approved' && isBusy(String(request._id)) ? 'Approving request' : 'Approve request'}
                                >
                                  <Checkmark2 className="size-[11px]" />
                                  <span className="sr-only">
                                    {activeAction?.decision === 'approved' && isBusy(String(request._id)) ? 'Approving request' : 'Approve request'}
                                  </span>
                                </Button>
                              </div>
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
              {!isLoading && !filteredRequests.length ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="py-14 text-center text-muted-foreground">
                    {hasSearchOrFilters ? 'No requests match this search or filter.' : 'No requests yet. New requests will show here.'}
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

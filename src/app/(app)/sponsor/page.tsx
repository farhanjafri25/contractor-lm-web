'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sponsorApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/auth-context';
import { CheckCircle, Clock, Eye, XCircle } from '@/components/icons';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { DataTableShell, FieldBlock, FiltersPopover, FilterSelect, PageHeader, SearchField, StatusBadge } from '@/components/app-ui';
import { Textarea } from '@/components/ui/textarea';

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

function getActionTypeLabel(value: string) {
  return value
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

function ReviewDialog({ id, open, onOpenChange }: { id: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await sponsorApi.review(id, decision, note || undefined);
      queryClient.invalidateQueries({ queryKey: ['sponsor-actions'] });
      toast.success(decision === 'approved' ? 'Request approved.' : 'Request rejected.');
      onOpenChange(false);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Review failed. Try again.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Review request</DialogTitle>
            <DialogDescription>Approve it or reject it with a note.</DialogDescription>
          </div>
        </DialogHeader>
        <div className="mt-6 space-y-5">
          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {(['approved', 'rejected'] as const).map((value) => (
              <Button
                key={value}
                type="button"
                variant={decision === value ? value === 'approved' ? 'default' : 'destructive' : 'secondary'}
                onClick={() => setDecision(value)}
                className="w-full"
              >
                {value === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            ))}
          </div>
          <FieldBlock label="Note">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain your decision" />
          </FieldBlock>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant={decision === 'approved' ? 'default' : 'destructive'} onClick={submit} disabled={loading}>
            {loading ? 'Saving…' : decision === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SponsorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const statusFilter = searchParams.get('status') ?? '';
  const typeFilter = searchParams.get('type') ?? '';
  const rangeFilter = searchParams.get('range') ?? '';

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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Requests"
        description="Review extension and change requests from sponsors."
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchField value={search} onChange={setSearch} placeholder="Search contractor, sponsor, or request type" className="md:w-80" />
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
                    return (
                      <TableRow key={String(request._id)}>
                        <TableCell>
                          <p className="font-medium text-foreground">{contractor ? String(contractor.name ?? '') : '—'}</p>
                          <p className="text-sm text-muted-foreground">{contractor ? String(contractor.department ?? '') : ''}</p>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {getActionTypeLabel(String(request.action_type ?? ''))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {submitter ? String(submitter.email ?? '—') : '—'}
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
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setReviewingId(String(request._id))}
                                aria-label="Review request"
                                title="Review request"
                              >
                                <Eye size={14} />
                                <span className="sr-only">Review request</span>
                              </Button>
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

      {reviewingId ? (
        <ReviewDialog id={reviewingId} open={Boolean(reviewingId)} onOpenChange={(open) => !open && setReviewingId(null)} />
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sponsorApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/auth-context';
import { CheckCircle, Clock, Eye, XCircle } from '@/components/icons';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { DataTableShell, FieldBlock, FilterSelect, PageHeader, StatusBadge } from '@/components/app-ui';
import { Textarea } from '@/components/ui/textarea';

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
  const searchParams = useSearchParams();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['sponsor-actions', statusFilter],
    queryFn: async () => (await sponsorApi.list({ status: statusFilter || undefined })).data,
  });

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
        actions={
          <FilterSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { label: 'All statuses', value: '' },
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
            ]}
            placeholder="All statuses"
          />
        }
      />

      <DataTableShell title="All requests" description="Review requests and record the decision.">
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
              : data?.data?.map((request: Record<string, unknown>) => {
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
                        {String(request.action_type ?? '').replace(/_/g, ' ')}
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
            {!isLoading && !data?.data?.length ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="py-14 text-center text-muted-foreground">
                  No requests yet. New requests will show here.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>

      {reviewingId ? (
        <ReviewDialog id={reviewingId} open={Boolean(reviewingId)} onOpenChange={(open) => !open && setReviewingId(null)} />
      ) : null}
    </div>
  );
}

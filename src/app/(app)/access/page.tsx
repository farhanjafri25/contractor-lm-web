'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accessApi } from '@/lib/api';
import { CheckCheck, RotateCcw } from '@/components/icons';
import { DataTableShell, FilterSelect, PageHeader, StatusBadge, SummaryPill } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';

const statuses = ['', 'active', 'pending', 'revoked', 'failed'];

function getErrorMessage(err: unknown) {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : String(message ?? 'Action failed. Try again.');
}

function formatStatusLabel(status: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown';
}

export default function AccessPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState<{ id: string; type: 'retry' | 'resolve' } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['access-all', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      return (await accessApi.list(params)).data;
    },
  });

  const records: Record<string, unknown>[] = data?.data ?? [];
  const total = data?.total ?? records.length;

  const counts = records.reduce<Record<string, number>>((accumulator, record) => {
    const status = String(record.provisioning_status ?? record.status ?? '');
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});

  const runAccessAction = async (id: string, type: 'retry' | 'resolve', request: () => Promise<unknown>) => {
    setActionError('');
    setActionLoading({ id, type });
    try {
      await request();
      queryClient.invalidateQueries({ queryKey: ['access-all'] });
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetry = async (id: string) => {
    await runAccessAction(id, 'retry', () => accessApi.retryRevocation(id));
  };

  const handleMarkResolved = async (id: string) => {
    await runAccessAction(id, 'resolve', () => accessApi.markResolved(id));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Access"
        description={`${total.toLocaleString()} access records across contractors and apps.`}
        actions={
          <FilterSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={statuses.map((status) => ({
              label: status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'All statuses',
              value: status,
            }))}
            placeholder="All statuses"
          />
        }
      />

      {actionError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {!isLoading && Object.keys(counts).length ? (
        <div className="flex flex-wrap gap-3">
          {Object.entries(counts).map(([status, count]) => (
            <SummaryPill
              key={status}
              label={formatStatusLabel(status)}
              count={count}
              active={statusFilter === status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            />
          ))}
        </div>
      ) : null}

      <DataTableShell title="All access" description="Track status, linked accounts, and manual fixes.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contractor</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>External account</TableHead>
              <TableHead>Assigned by</TableHead>
              {isAdmin ? <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? <TableLoadingRows rows={5} columns={isAdmin ? 6 : 5} actionColumn={isAdmin} />
              : records.map((record) => {
                  const contractor = record.contractor_id as Record<string, unknown> | undefined;
                  const app = record.tenant_application_id as Record<string, unknown> | undefined;
                  const grantedBy = record.granted_by as Record<string, unknown> | undefined;
                  const status = String(record.provisioning_status ?? record.status ?? '');
                  const recordId = String(record._id);
                  const isActing = actionLoading?.id === recordId;
                  return (
                    <TableRow key={recordId}>
                      <TableCell>
                        <p className="font-medium text-foreground">{contractor ? String(contractor.name ?? '—') : '—'}</p>
                        <p className="text-sm text-muted-foreground">{contractor ? String(contractor.department ?? '') : ''}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-foreground">{app ? String(app.application_id ?? app.display_name ?? app.app_key ?? '—') : '—'}</p>
                        {record.access_role ? <p className="text-sm text-muted-foreground">{String(record.access_role)}</p> : null}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                        {record.failure_reason ? <p className="mt-2 max-w-[16rem] text-xs text-destructive">{String(record.failure_reason).slice(0, 70)}</p> : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {record.external_account_id ? String(record.external_account_id) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{grantedBy ? String(grantedBy.email ?? '—') : 'Tenurio'}</TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          {status === 'failed' ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="icon-sm"
                                onClick={() => handleRetry(recordId)}
                                disabled={isActing}
                                aria-label={actionLoading?.type === 'retry' && isActing ? 'Retrying access update' : 'Retry access update'}
                                title={actionLoading?.type === 'retry' && isActing ? 'Retrying access update' : 'Retry access update'}
                              >
                                <RotateCcw size={12} className={actionLoading?.type === 'retry' && isActing ? 'animate-spin' : undefined} />
                                <span className="sr-only">{actionLoading?.type === 'retry' && isActing ? 'Retrying access update' : 'Retry access update'}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleMarkResolved(recordId)}
                                disabled={isActing}
                                aria-label={actionLoading?.type === 'resolve' && isActing ? 'Saving resolution' : 'Mark access issue done'}
                                title={actionLoading?.type === 'resolve' && isActing ? 'Saving resolution' : 'Mark access issue done'}
                              >
                                <CheckCheck size={12} />
                                <span className="sr-only">{actionLoading?.type === 'resolve' && isActing ? 'Saving resolution' : 'Mark access issue done'}</span>
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
            {!isLoading && records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="py-14 text-center text-muted-foreground">
                  No access matches this filter. Matching records will show here.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}

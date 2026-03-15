'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { DataTableShell, PageBackLink, PageHeader, StatusBadge, SurfaceAlert } from '@/components/app-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function OverduePage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overdue'],
    queryFn: async () => (await dashboardApi.getOverdue()).data,
  });

  const contracts: Record<string, unknown>[] = data?.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <PageBackLink href="/dashboard">Back to dashboard</PageBackLink>
        <div className="flex-1">
          <PageHeader
            title="Overdue access"
            description="Expired contracts that still have active access should move immediately into remediation."
          />
        </div>
      </div>

      {contracts.length ? (
        <SurfaceAlert
          tone="danger"
          title={`${contracts.length} contract${contracts.length === 1 ? '' : 's'} expired before access was fully revoked.`}
          description="Review each record and close the gap between contract state and application access."
        />
      ) : null}

      <DataTableShell title="Access drift queue" description="Expired contracts that still require revocation work.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contractor</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Expired</TableHead>
              <TableHead>Access records</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <div className="h-10 rounded-2xl bg-secondary/40" />
                    </TableCell>
                  </TableRow>
                ))
              : contracts.map((contract) => {
                  const contractor = contract.contractor_id as Record<string, unknown> | undefined;
                  const endDate = contract.end_date ? new Date(String(contract.end_date)) : null;
                  return (
                    <TableRow
                      key={String(contract._id)}
                      className="cursor-pointer"
                      onClick={() => contractor && router.push(`/contractors/${String(contractor._id ?? '')}`)}
                    >
                      <TableCell>
                        <p className="font-medium text-foreground">{contractor ? String(contractor.name ?? '—') : '—'}</p>
                        <p className="text-sm text-muted-foreground">{contractor ? String(contractor.job_title ?? '') : ''}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contractor ? String(contractor.department ?? '—') : '—'}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-destructive">
                          {endDate ? formatDistanceToNow(endDate, { addSuffix: true }) : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">{endDate ? format(endDate, 'MMM d, yyyy') : ''}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-destructive">
                          {String(contract.active_access_count ?? contract.access_count ?? '—')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={String(contract.status ?? 'expired')} />
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!isLoading && contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-muted-foreground">
                  No overdue access found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}

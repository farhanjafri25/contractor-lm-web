'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { DataTableShell, PageBackLink, PageHeader, StatusBadge } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AtRiskPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-at-risk'],
    queryFn: async () => (await dashboardApi.getAtRisk()).data,
  });

  const suspended: Record<string, unknown>[] = data?.suspended_contracts?.data ?? [];
  const failed: Record<string, unknown>[] = data?.failed_revocations?.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <PageBackLink href="/dashboard">Back to dashboard</PageBackLink>
        <div className="flex-1">
          <PageHeader
            title="At-risk queue"
            description="Focus the team on suspended contractors and failed revocations that still need a human decision."
          />
        </div>
      </div>

      <DataTableShell title="Suspended contracts" description="Records currently paused and awaiting action.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contractor</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Suspended on</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <div className="h-10 rounded-2xl bg-secondary/40" />
                    </TableCell>
                  </TableRow>
                ))
              : suspended.map((contract) => {
                  const contractor = contract.contractor_id as Record<string, unknown> | undefined;
                  const suspendedAt = contract.suspended_at ? new Date(String(contract.suspended_at)) : null;
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
                      <TableCell className="text-muted-foreground">
                        {suspendedAt ? format(suspendedAt, 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="max-w-[20rem] text-muted-foreground">
                        {Boolean(contract.suspension_reason) ? String(contract.suspension_reason).slice(0, 80) : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={String(contract.status ?? 'suspended')} />
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!isLoading && suspended.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No suspended contracts in the risk queue.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell title="Failed revocations" description="Access records that still need manual remediation.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contractor</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Failure reason</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 2 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <div className="h-10 rounded-2xl bg-secondary/40" />
                    </TableCell>
                  </TableRow>
                ))
              : failed.map((record) => {
                  const contractor = record.contractor_id as Record<string, unknown> | undefined;
                  const app = record.tenant_application_id as Record<string, unknown> | undefined;
                  return (
                    <TableRow key={String(record._id)}>
                      <TableCell>
                        <p className="font-medium text-foreground">{contractor ? String(contractor.name ?? '—') : '—'}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app ? String(app.application_id ?? '—') : '—'}
                      </TableCell>
                      <TableCell className="font-semibold text-destructive">
                        {String(record.revocation_attempts ?? '—')}
                      </TableCell>
                      <TableCell className="max-w-[20rem] text-muted-foreground">
                        {Boolean(record.failure_reason) ? String(record.failure_reason).slice(0, 100) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href="/access">
                          <Button variant="ghost" size="sm">Go to access</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!isLoading && failed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No failed revocations in the queue.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}

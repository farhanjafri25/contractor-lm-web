'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { ChevronRight } from '@/components/icons';
import { DataTableShell, PageBackLink, PageHeader, StatusBadge } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';

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
      <div className="space-y-3">
        <PageBackLink href="/dashboard">Back to dashboard</PageBackLink>
        <PageHeader
          title="Needs review"
          description="Review suspended contracts and failed access removals."
        />
      </div>

      <DataTableShell title="Suspended" description="These contractors are suspended and still need a decision.">
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
              ? <TableLoadingRows rows={3} columns={5} />
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
                  No suspended contracts. Suspended records will show here.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell title="Failed removals" description="These access removals still need manual work.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contractor</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Failure reason</TableHead>
              <TableHead className="text-right"><span className="sr-only">Action</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? <TableLoadingRows rows={2} columns={5} actionColumn />
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
                          <Button variant="ghost" size="icon-sm" aria-label="Open access" title="Open access">
                            <ChevronRight size={14} />
                            <span className="sr-only">Open access</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!isLoading && failed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No failed removals. Anything that needs manual work will show here.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}

'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { ContractorHoverPopover } from '@/components/contractor-hover-popover';
import { DataTableShell, PageBackLink, PageHeader, StatusBadge, SurfaceAlert } from '@/components/app-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';

export default function OverduePage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overdue'],
    queryFn: async () => (await dashboardApi.getOverdue()).data,
  });

  const contracts: Record<string, unknown>[] = data?.data ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <PageBackLink href="/dashboard">Back to dashboard</PageBackLink>
        <PageHeader
          title="Access overdue"
          description="These contracts ended, but access is still active."
        />
      </div>

      {contracts.length ? (
        <SurfaceAlert
          tone="danger"
          title={`${contracts.length} expired contract${contracts.length === 1 ? '' : 's'} still ${contracts.length === 1 ? 'has' : 'have'} active access.`}
          description="Review each record and remove the remaining access."
        />
      ) : null}

      <DataTableShell title="Review queue" description="Expired contracts that still need access removed.">
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
              ? <TableLoadingRows rows={4} columns={5} />
              : contracts.map((contract) => {
                  const contractor = contract.contractor_id as Record<string, unknown> | undefined;
                  const contractorId = contractor ? String(contractor._id ?? '') : '';
                  const endDate = contract.end_date ? new Date(String(contract.end_date)) : null;
                  return (
                    <TableRow
                      key={String(contract._id)}
                      className="cursor-pointer"
                      onClick={() => contractor && router.push(`/contractors/${String(contractor._id ?? '')}`)}
                    >
                      <TableCell>
                        <ContractorHoverPopover
                          contractorId={contractorId || undefined}
                          name={contractor ? String(contractor.name ?? '') : undefined}
                          email={contractor ? String(contractor.email ?? '') : undefined}
                          department={contractor ? String(contractor.department ?? '') : undefined}
                          jobTitle={contractor ? String(contractor.job_title ?? '') : undefined}
                          href={contractorId ? `/contractors/${contractorId}` : undefined}
                          contract={contract}
                          avatar={contractor ? String(contractor.avatar ?? '') : undefined}
                          image={contractor ? String(contractor.image ?? '') : undefined}
                          photo={contractor ? String(contractor.photo ?? '') : undefined}
                          subtitle={contractor ? String(contractor.job_title ?? '') : ''}
                        />
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
                  No overdue access. Records that need cleanup will show here.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}

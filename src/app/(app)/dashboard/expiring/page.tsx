'use client';

import { differenceInDays, format } from 'date-fns';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { Clock } from '@/components/icons';
import { DataTableShell, PageBackLink, PageHeader, StatusBadge } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';

export default function ExpiringPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-expiring-full', days],
    queryFn: async () => (await dashboardApi.getExpiring({ expiring_within_days: days })).data,
  });

  const contracts: Record<string, unknown>[] = data?.data ?? [];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <PageBackLink href="/dashboard">Back to dashboard</PageBackLink>
        <PageHeader
          title="Expiring soon"
          description="These contracts end within the selected window."
          actions={
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30, 60, 90].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={days === value ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setDays(value)}
                >
                  {value}d
                </Button>
              ))}
            </div>
          }
        />
      </div>

      <DataTableShell title="Contracts" description={`Showing contracts that end in the next ${days} days.`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contractor</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>End date</TableHead>
              <TableHead>Days left</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? <TableLoadingRows rows={5} columns={5} />
              : contracts.map((contract) => {
                  const contractor = contract.contractor_id as Record<string, unknown> | undefined;
                  const endDate = contract.end_date ? new Date(String(contract.end_date)) : null;
                  const daysLeft = endDate ? differenceInDays(endDate, new Date()) : null;
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
                        {endDate ? format(endDate, 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-foreground">
                          <Clock size={14} />
                          <span className="font-semibold">{daysLeft !== null ? `${daysLeft}d` : '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={String(contract.status ?? 'active')} />
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!isLoading && contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-muted-foreground">
                  Nothing expires in this window. Contracts that do will show here.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  );
}

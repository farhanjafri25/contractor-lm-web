'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contractorsApi } from '@/lib/api';
import { ChevronRight } from '@/components/icons';
import { DataTableShell, EmptyState, FilterSelect, PageHeader, SearchField, StatusBadge } from '@/components/app-ui';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';

const statusOptions = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Expired', value: 'expired' },
  { label: 'Terminated', value: 'terminated' },
];

export default function ContractorsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contractors', search, status],
    queryFn: async () =>
      (await contractorsApi.list({ search: search || undefined, status: status || undefined })).data,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contractors"
        description={`${data?.pagination?.total ?? '…'} contractor records across active, suspended, and ended work.`}
        actions={
          <Link href="/contractors/new" className={buttonVariants({ variant: 'default' })}>
            Add contractor
          </Link>
        }
      />

      <DataTableShell
        title="All contractors"
        description="Search by name or filter by status."
        actions={
          <>
            <SearchField value={search} onChange={setSearch} placeholder="Search name or email" className="md:w-72" />
            <FilterSelect value={status} onValueChange={setStatus} options={statusOptions} placeholder="All statuses" />
          </>
        }
      >
        {isLoading || data?.data?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Contract ends</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"><span className="sr-only">Action</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? <TableLoadingRows rows={5} columns={6} actionColumn />
                : data.data.map((contractor: Record<string, unknown>) => {
                    const activeContract = (contractor.contracts as Record<string, unknown>[] | undefined)?.[0];
                    const sponsor = contractor.sponsor_id as Record<string, unknown> | undefined;
                    return (
                      <TableRow key={String(contractor._id)}>
                        <TableCell>
                          <p className="font-medium text-foreground">{String(contractor.name ?? '')}</p>
                          <p className="text-sm text-muted-foreground">{String(contractor.email ?? '')}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{String(contractor.department ?? '—')}</TableCell>
                        <TableCell className="text-muted-foreground">{sponsor ? String(sponsor.email ?? '—') : '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {activeContract?.end_date ? new Date(String(activeContract.end_date)).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={String(activeContract?.status ?? 'no contract')} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/contractors/${String(contractor._id)}`}
                            className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                            aria-label="Open contractor"
                            title="Open contractor"
                          >
                            <ChevronRight size={14} />
                            <span className="sr-only">Open contractor</span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No matches" description="Matching contractors will show here when your filters return results." />
        )}
      </DataTableShell>
    </div>
  );
}

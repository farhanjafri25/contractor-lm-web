'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contractorsApi } from '@/lib/api';
import { ChevronRight } from '@/components/icons';
import { InitialAvatar, getAvatarSeed } from '@/components/initial-avatar';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['contractors', search, status],
    queryFn: async () =>
      (await contractorsApi.list({ search: search || undefined, status: status || undefined })).data,
  });

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, href: string) => {
    const target = event.target as HTMLElement;

    if (target.closest('a, button, input, select, textarea, [role="button"], [role="link"]')) {
      return;
    }

    router.push(href);
  };

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
                    const contractorId = String(contractor._id);
                    const contractorHref = `/contractors/${contractorId}`;
                    const activeContract = (contractor.contracts as Record<string, unknown>[] | undefined)?.[0];
                    const sponsor = contractor.sponsor_id as Record<string, unknown> | undefined;
                    const contractorName = String(contractor.name ?? '');
                    const contractorEmail = String(contractor.email ?? '');
                    const contractorSeed = getAvatarSeed(contractor._id, contractorEmail, contractorName);

                    return (
                      <TableRow
                        key={contractorId}
                        className="cursor-pointer"
                        onClick={(event) => handleRowClick(event, contractorHref)}
                      >
                        <TableCell>
                          <Link
                            href={contractorHref}
                            className="group flex w-fit items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            aria-label={`Open contractor ${contractorName || contractorEmail}`}
                          >
                            <InitialAvatar seed={contractorSeed} label={contractorName || contractorEmail} />
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground transition-colors group-hover:text-primary">
                                {contractorName}
                              </p>
                              <p className="text-sm text-muted-foreground">{contractorEmail}</p>
                            </div>
                          </Link>
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
                            href={contractorHref}
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

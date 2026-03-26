'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contractorsApi } from '@/lib/api';
import { ChevronRight } from '@/components/icons';
import { InitialAvatar, getAvatarSeed } from '@/components/initial-avatar';
import { DataTableShell, EmptyState, FieldBlock, FiltersPopover, FilterSelect, PageHeader, SearchField, StatusBadge } from '@/components/app-ui';
import { buttonVariants } from '@/components/ui/button';
import { CsvImporter } from '@/components/csv-importer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';

const statusOptions = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Expired', value: 'expired' },
  { label: 'Terminated', value: 'terminated' },
];

const timingOptions = [
  { label: 'Any contract date', value: '' },
  { label: 'Ending in 7 days', value: '7d' },
  { label: 'Ending in 30 days', value: '30d' },
  { label: 'Overdue', value: 'overdue' },
];

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getContractTimingMatch(endDateValue: unknown, timing: string) {
  if (!timing || !endDateValue) {
    return !timing;
  }

  const endDate = new Date(String(endDateValue));

  if (Number.isNaN(endDate.getTime())) {
    return false;
  }

  const today = getStartOfToday();
  const diffMs = endDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (timing === 'overdue') {
    return diffDays < 0;
  }

  if (timing === '7d') {
    return diffDays >= 0 && diffDays <= 7;
  }

  if (timing === '30d') {
    return diffDays >= 0 && diffDays <= 30;
  }

  return true;
}

export default function ContractorsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const status = searchParams.get('status') ?? '';
  const department = searchParams.get('department') ?? '';
  const timing = searchParams.get('timing') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['contractors', search, status],
    queryFn: async () =>
      (await contractorsApi.list({ search: search || undefined, status: status || undefined })).data,
  });

  const contractors = Array.isArray(data?.data) ? data.data : [];
  const departmentOptions = [
    { label: 'All departments', value: '' },
    ...Array.from<string>(
      new Set<string>(
        contractors
          .map((contractor: Record<string, unknown>) => String(contractor.department ?? '').trim())
          .filter(Boolean),
      ),
    )
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ label: value, value })),
  ];
  const filteredContractors = contractors.filter((contractor: Record<string, unknown>) => {
    const departmentMatches = !department || String(contractor.department ?? '') === department;
    const activeContract = (contractor.contracts as Record<string, unknown>[] | undefined)?.[0];
    const timingMatches = getContractTimingMatch(activeContract?.end_date, timing);
    return departmentMatches && timingMatches;
  });
  const activeFilterCount = [status, department, timing].filter(Boolean).length;
  const hasSearchOrFilters = Boolean(search || status || department || timing);

  const updateFilterParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

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
          <div className="flex items-center gap-3">
            <CsvImporter />
            <Link href="/contractors/new" className={buttonVariants({ variant: 'default' })}>
              Add contractor
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchField value={search} onChange={setSearch} placeholder="Search name or email" className="md:w-80" />
          <FiltersPopover
            activeCount={activeFilterCount}
            onClear={() => updateFilterParams({ status: '', department: '', timing: '' })}
          >
            <FieldBlock label="Status">
              <FilterSelect
                value={status}
                onValueChange={(value) => updateFilterParams({ status: value })}
                options={statusOptions}
                placeholder="All statuses"
                className="w-full"
              />
            </FieldBlock>
            <FieldBlock label="Department">
              <FilterSelect
                value={department}
                onValueChange={(value) => updateFilterParams({ department: value })}
                options={departmentOptions}
                placeholder="All departments"
                className="w-full"
              />
            </FieldBlock>
            <FieldBlock label="Contract timing">
              <FilterSelect
                value={timing}
                onValueChange={(value) => updateFilterParams({ timing: value })}
                options={timingOptions}
                placeholder="Any contract date"
                className="w-full"
              />
            </FieldBlock>
          </FiltersPopover>
        </div>

        <DataTableShell>
          {isLoading || filteredContractors.length ? (
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
                  : filteredContractors.map((contractor: Record<string, unknown>) => {
                      const contractorId = String(contractor._id);
                      const contractorHref = `/contractors/${contractorId}`;
                      const activeContract = (contractor.contracts as Record<string, unknown>[] | undefined)?.[0];
                      const sponsor = contractor.sponsor_id as Record<string, unknown> | undefined;
                      const sponsorName = sponsor ? String(sponsor.name ?? sponsor.full_name ?? sponsor.display_name ?? '') : '';
                      const sponsorEmail = sponsor ? String(sponsor.email ?? '') : '';
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
                          <TableCell>
                            {sponsor ? (
                              <div className="space-y-0.5">
                                {sponsorName ? <p className="font-medium text-foreground">{sponsorName}</p> : null}
                                <p className="text-sm text-muted-foreground">{sponsorEmail || '—'}</p>
                              </div>
                            ) : '—'}
                          </TableCell>
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
            <EmptyState
              title={hasSearchOrFilters ? 'No matches' : 'No contractors yet'}
              description={
                hasSearchOrFilters
                  ? 'Try adjusting your search or filters to see more contractors.'
                  : 'Contractor records will show here once your team adds them.'
              }
            />
          )}
        </DataTableShell>
      </div>
    </div>
  );
}

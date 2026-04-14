'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contractorsApi } from '@/lib/api';
import { ChevronRight, IconDotGrid1x3VerticalTight } from '@/components/icons';
import { useAuth } from '@/context/auth-context';
import { InitialAvatar, getAvatarSeed } from '@/components/initial-avatar';
import { ClearFiltersButton, DataTableShell, EmptyState, FieldBlock, FiltersPopover, MultiFilterChecklist, MultiFilterDropdown, PageHeader, SearchField, StatusBadge } from '@/components/app-ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { CsvImporter } from '@/components/csv-importer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const statusFilters = searchParams.getAll('status').filter(Boolean);
  const departmentFilters = searchParams.getAll('department').filter(Boolean);
  const timingFilters = searchParams.getAll('timing').filter(Boolean);

  const { data, isLoading } = useQuery({
    queryKey: ['contractors', search],
    queryFn: async () =>
      (await contractorsApi.list({ search: search || undefined })).data,
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
    const activeContract = (contractor.contracts as Record<string, unknown>[] | undefined)?.[0];
    const contractStatus = String(activeContract?.status ?? '');
    const departmentMatches = departmentFilters.length === 0 || departmentFilters.includes(String(contractor.department ?? ''));
    const statusMatches = statusFilters.length === 0 || statusFilters.includes(contractStatus);
    const timingMatches =
      timingFilters.length === 0 ||
      timingFilters.some((timing) => getContractTimingMatch(activeContract?.end_date, timing));
    return departmentMatches && statusMatches && timingMatches;
  });
  const activeFilterCount = statusFilters.length + departmentFilters.length + timingFilters.length;
  const hasSearchOrFilters = Boolean(search || activeFilterCount);
  const clearFilters = () => updateFilterParams({ status: [], department: [], timing: [] });

  const updateFilterParams = (updates: Record<string, string | string[]>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      params.delete(key);

      const values = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
      values.forEach((nextValue) => params.append(key, nextValue));
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
        <div className="flex items-center gap-2 md:hidden">
          <SearchField value={search} onChange={setSearch} placeholder="Search name or email" className="flex-1" />
          <FiltersPopover
            activeCount={activeFilterCount}
            onClear={clearFilters}
          >
            <FieldBlock label="Status">
              <MultiFilterChecklist
                values={statusFilters}
                onValuesChange={(values) => updateFilterParams({ status: values })}
                options={statusOptions}
              />
            </FieldBlock>
            <FieldBlock label="Department">
              <MultiFilterChecklist
                values={departmentFilters}
                onValuesChange={(values) => updateFilterParams({ department: values })}
                options={departmentOptions}
              />
            </FieldBlock>
            <FieldBlock label="Contract timing">
              <MultiFilterChecklist
                values={timingFilters}
                onValuesChange={(values) => updateFilterParams({ timing: values })}
                options={timingOptions}
              />
            </FieldBlock>
          </FiltersPopover>
          <ClearFiltersButton activeCount={activeFilterCount} onClear={clearFilters} />
        </div>

        <div className="hidden md:flex md:items-center md:gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <MultiFilterDropdown
              title="Status"
              values={statusFilters}
              onValuesChange={(values) => updateFilterParams({ status: values })}
              options={statusOptions}
              placeholder="All statuses"
              className="min-w-40"
            />
            <MultiFilterDropdown
              title="Department"
              values={departmentFilters}
              onValuesChange={(values) => updateFilterParams({ department: values })}
              options={departmentOptions}
              placeholder="All departments"
              className="min-w-44"
            />
            <MultiFilterDropdown
              title="Contract timing"
              values={timingFilters}
              onValuesChange={(values) => updateFilterParams({ timing: values })}
              options={timingOptions}
              placeholder="Any contract date"
              className="min-w-40"
            />
            <ClearFiltersButton activeCount={activeFilterCount} onClear={clearFilters} />
          </div>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search name or email"
            className="ml-auto w-80"
          />
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
                      const contractStatus = String(activeContract?.status ?? '');
                      const sponsor = contractor.sponsor_id as Record<string, unknown> | undefined;
                      const sponsorName = sponsor ? String(sponsor.name ?? sponsor.full_name ?? sponsor.display_name ?? '') : '';
                      const sponsorEmail = sponsor ? String(sponsor.email ?? '') : '';
                      const contractorName = String(contractor.name ?? '');
                      const contractorEmail = String(contractor.email ?? '');
                      const contractorSeed = getAvatarSeed(contractor._id, contractorEmail, contractorName);
                      const isAdmin = user?.role === 'admin';
                      const actions = [
                        ...(isAdmin && contractStatus === 'active'
                          ? [{ key: 'suspend', label: 'Suspend' as const }]
                          : []),
                        ...(contractStatus === 'active'
                          ? [{ key: 'extend', label: isAdmin ? 'Extend' : 'Request extension' }]
                          : []),
                      ];

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
                              <div className="space-y-0.5 transition-transform [transition-duration:var(--duration-overlay)] [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5">
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
                            <div className="flex items-center justify-end gap-1">
                              {actions.length ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Open actions for ${contractorName || contractorEmail}`}
                                        title="Contract actions"
                                      />
                                    }
                                  >
                                    <IconDotGrid1x3VerticalTight size={14} />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-36">
                                    {actions.map((action) => (
                                      <DropdownMenuItem
                                        key={action.key}
                                        onClick={() => router.push(`${contractorHref}?action=${action.key}`)}
                                      >
                                        {action.label}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : null}
                              <Link
                                href={contractorHref}
                                className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                                aria-label="Open contractor"
                                title="Open contractor"
                              >
                                <ChevronRight size={14} />
                                <span className="sr-only">Open contractor</span>
                              </Link>
                            </div>
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

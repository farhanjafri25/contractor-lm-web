'use client';

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { ContractorHoverPopover } from '@/components/contractor-hover-popover';
import { ChevronBottom } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { ClearFiltersButton, DataTableShell, FieldBlock, FiltersPopover, MultiFilterChecklist, MultiFilterDropdown, PageHeader, SearchField, SummaryPill } from '@/components/app-ui';
import { eventTypeOptions, getEventLabel } from '@/lib/event-labels';

const categories = ['', 'contractor', 'contract', 'access', 'sponsor'];
const pageSize = 25;

export default function AuditLogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventTypes = searchParams.getAll('event_type').filter(Boolean);
  const categoriesSelected = searchParams.getAll('category').filter(Boolean);
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const updateFilterParams = (updates: Record<string, string | string[]>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      params.delete(key);

      const values = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
      values.forEach((nextValue) => params.append(key, nextValue));
    });

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setPage(1);
  };

  const params: Record<string, unknown> = { page: 1, limit: 50 };
  if (search) params.search = search;
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['events', search, params],
    queryFn: async () => (await eventsApi.list(params)).data,
    placeholderData: (previous) => previous,
  });

  const { data: statsData } = useQuery({
    queryKey: ['event-stats'],
    queryFn: async () => (await eventsApi.getStats()).data,
    staleTime: 60_000,
  });

  const allEvents: Record<string, unknown>[] = data?.data ?? [];
  const filteredEvents = allEvents.filter((event) => {
    const type = String(event.event_type ?? '');
    const category = String(event.category ?? '');
    const eventTypeMatches = eventTypes.length === 0 || eventTypes.includes(type);
    const categoryMatches = categoriesSelected.length === 0 || categoriesSelected.includes(category);
    return eventTypeMatches && categoryMatches;
  });
  const total = filteredEvents.length;
  const totalPages = Math.ceil(total / pageSize);
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const pageStart = (safePage - 1) * pageSize;
  const events = filteredEvents.slice(pageStart, pageStart + pageSize);
  const hasFilters = Boolean(eventTypes.length || categoriesSelected.length || from || to);
  const activeFilterCount = eventTypes.length + categoriesSelected.length + (from ? 1 : 0) + (to ? 1 : 0);
  const fromDate = from ? parseISO(from) : undefined;
  const toDate = to ? parseISO(to) : undefined;
  const clearFilters = () => updateFilterParams({ event_type: [], category: [], from: '', to: '' });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Activity"
        description="Track contractor, contract, access, and sponsor events as work moves through the workspace."
      />

      {statsData?.by_type ? (
        <div className="flex flex-wrap gap-3">
          {Object.entries(statsData.by_type as Record<string, number>)
            .sort(([, left], [, right]) => right - left)
            .slice(0, 8)
            .map(([type, count]) => (
              <SummaryPill
                key={type}
                label={getEventLabel(type)}
                count={count}
                active={eventTypes.includes(type)}
                onClick={() => {
                  updateFilterParams({
                    event_type: eventTypes.includes(type)
                      ? eventTypes.filter((value) => value !== type)
                      : [...eventTypes, type],
                  });
                }}
              />
            ))}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center gap-2 md:hidden">
          <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search activity" className="flex-1" />
          <FiltersPopover
            activeCount={activeFilterCount}
            onClear={clearFilters}
          >
            <FieldBlock label="Category">
              <MultiFilterChecklist
                values={categoriesSelected}
                onValuesChange={(values) => updateFilterParams({ category: values })}
                options={categories.map((value) => ({
                  label: value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : 'All categories',
                  value,
                }))}
              />
            </FieldBlock>
            <FieldBlock label="Event type">
              <MultiFilterChecklist
                values={eventTypes}
                onValuesChange={(values) => updateFilterParams({ event_type: values })}
                options={[{ label: 'All event types', value: '' }, ...eventTypeOptions]}
              />
            </FieldBlock>
            <FieldBlock label="Start date">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      data-empty={!fromDate}
                      className="w-full justify-between border-transparent bg-background/90 text-left font-normal shadow-sm ring-1 ring-foreground/10 hover:bg-muted/50 hover:text-foreground focus-visible:border-foreground/35 focus-visible:ring-3 focus-visible:ring-ring/25 data-[empty=true]:text-muted-foreground/75 dark:bg-input/25 dark:hover:bg-input/50"
                    >
                      {fromDate ? format(fromDate, 'PPP') : <span>Start date</span>}
                      <ChevronBottom data-icon="inline-end" size={16} />
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(nextDate: Date | undefined) => {
                      updateFilterParams({ from: nextDate ? format(nextDate, 'yyyy-MM-dd') : '' });
                    }}
                    defaultMonth={fromDate}
                  />
                </PopoverContent>
              </Popover>
            </FieldBlock>
            <FieldBlock label="End date">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      data-empty={!toDate}
                      className="w-full justify-between border-transparent bg-background/90 text-left font-normal shadow-sm ring-1 ring-foreground/10 hover:bg-muted/50 hover:text-foreground focus-visible:border-foreground/35 focus-visible:ring-3 focus-visible:ring-ring/25 data-[empty=true]:text-muted-foreground/75 dark:bg-input/25 dark:hover:bg-input/50"
                    >
                      {toDate ? format(toDate, 'PPP') : <span>End date</span>}
                      <ChevronBottom data-icon="inline-end" size={16} />
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(nextDate: Date | undefined) => {
                      updateFilterParams({ to: nextDate ? format(nextDate, 'yyyy-MM-dd') : '' });
                    }}
                    defaultMonth={toDate}
                  />
                </PopoverContent>
              </Popover>
            </FieldBlock>
          </FiltersPopover>
          <ClearFiltersButton activeCount={activeFilterCount} onClear={clearFilters} />
        </div>

        <div className="hidden md:flex md:items-center md:gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <MultiFilterDropdown
              title="Category"
              values={categoriesSelected}
              onValuesChange={(values) => updateFilterParams({ category: values })}
              options={categories.map((value) => ({
                label: value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : 'All categories',
                value,
              }))}
              placeholder="All categories"
              className="min-w-44"
            />
            <MultiFilterDropdown
              title="Event type"
              values={eventTypes}
              onValuesChange={(values) => updateFilterParams({ event_type: values })}
              options={[{ label: 'All event types', value: '' }, ...eventTypeOptions]}
              placeholder="All event types"
              className="min-w-48"
            />
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    data-empty={!fromDate}
                    className="min-w-36 justify-between border-transparent bg-background/90 text-left font-normal shadow-sm ring-1 ring-foreground/10 hover:bg-muted/50 hover:text-foreground focus-visible:border-foreground/35 focus-visible:ring-3 focus-visible:ring-ring/25 data-[empty=true]:text-muted-foreground/75 dark:bg-input/25 dark:hover:bg-input/50"
                  >
                    {fromDate ? format(fromDate, 'PPP') : <span>Start date</span>}
                    <ChevronBottom data-icon="inline-end" size={16} />
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(nextDate: Date | undefined) => {
                    updateFilterParams({ from: nextDate ? format(nextDate, 'yyyy-MM-dd') : '' });
                  }}
                  defaultMonth={fromDate}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    data-empty={!toDate}
                    className="min-w-36 justify-between border-transparent bg-background/90 text-left font-normal shadow-sm ring-1 ring-foreground/10 hover:bg-muted/50 hover:text-foreground focus-visible:border-foreground/35 focus-visible:ring-3 focus-visible:ring-ring/25 data-[empty=true]:text-muted-foreground/75 dark:bg-input/25 dark:hover:bg-input/50"
                  >
                    {toDate ? format(toDate, 'PPP') : <span>End date</span>}
                    <ChevronBottom data-icon="inline-end" size={16} />
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(nextDate: Date | undefined) => {
                    updateFilterParams({ to: nextDate ? format(nextDate, 'yyyy-MM-dd') : '' });
                  }}
                  defaultMonth={toDate}
                />
              </PopoverContent>
            </Popover>
            <ClearFiltersButton activeCount={activeFilterCount} onClear={clearFilters} />
          </div>
          <SearchField
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder="Search activity"
            className="ml-auto w-80"
          />
        </div>

        <DataTableShell
        footer={
          totalPages > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {safePage} of {totalPages} · {total.toLocaleString()} events
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={safePage === 1} onClick={() => setPage((current) => current - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={safePage === totalPages} onClick={() => setPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null
        }
        >
          <div className={isFetching ? 'opacity-80 transition-opacity' : 'transition-opacity'}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? <TableLoadingRows rows={8} columns={4} />
                  : events.map((event) => {
                      const type = String(event.event_type ?? '');
                      const contractor = event.contractor_id as Record<string, unknown> | undefined;
                      const actor = event.actor_id as Record<string, unknown> | undefined;
                      const createdAt = event.created_at ? new Date(String(event.created_at)) : null;
                      const contractorId = contractor ? String(contractor._id ?? '') : '';
                      return (
                        <TableRow key={String(event._id)}>
                          <TableCell>
                            <p className="font-medium text-foreground">{getEventLabel(type)}</p>
                            {event.metadata && typeof event.metadata === 'object' && Object.keys(event.metadata as object).length > 0 ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {Object.entries(event.metadata as Record<string, unknown>)
                                  .slice(0, 2)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(' · ')}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {contractor ? (
                              <ContractorHoverPopover
                                contractorId={contractorId || undefined}
                                name={String(contractor.name ?? '') || undefined}
                                email={String(contractor.email ?? '') || undefined}
                                department={String(contractor.department ?? '') || undefined}
                                jobTitle={String(contractor.job_title ?? '') || undefined}
                                href={contractorId ? `/contractors/${contractorId}` : undefined}
                                avatar={String(contractor.avatar ?? '') || undefined}
                                image={String(contractor.image ?? '') || undefined}
                                photo={String(contractor.photo ?? '') || undefined}
                                subtitle={String(contractor.department ?? '')}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {actor ? (
                              <>
                                <p className="text-foreground">{String(actor.email ?? '—')}</p>
                                <p className="text-sm capitalize text-muted-foreground">{String(actor.role ?? '')}</p>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Tenurio</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {createdAt ? (
                              <>
                                <p className="text-foreground">{formatDistanceToNow(createdAt, { addSuffix: true })}</p>
                                <p className="text-xs text-muted-foreground">{format(createdAt, 'MMM d, yyyy · HH:mm')}</p>
                              </>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                {!isLoading && events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-14 text-center text-muted-foreground">
                      {hasFilters ? 'No activity matches this filter. Matching events will show here.' : 'No activity yet. Events will show here as work happens.'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </DataTableShell>
      </div>
    </div>
  );
}

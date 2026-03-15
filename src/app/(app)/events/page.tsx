'use client';

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { ChevronBottom } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { DataTableShell, FilterSelect, PageHeader, SummaryPill } from '@/components/app-ui';
import { eventTypeOptions, getEventLabel } from '@/lib/event-labels';

const categories = ['', 'contractor', 'contract', 'access', 'sponsor'];
const pageSize = 25;

export default function AuditLogPage() {
  const [eventType, setEventType] = useState('');
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params: Record<string, unknown> = { page, limit: pageSize };
  if (eventType) params.event_type = eventType;
  if (category) params.category = category;
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['events', params],
    queryFn: async () => (await eventsApi.list(params)).data,
    placeholderData: (previous) => previous,
  });

  const { data: statsData } = useQuery({
    queryKey: ['event-stats'],
    queryFn: async () => (await eventsApi.getStats()).data,
    staleTime: 60_000,
  });

  const events: Record<string, unknown>[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = Boolean(eventType || category || from || to);
  const fromDate = from ? parseISO(from) : undefined;
  const toDate = to ? parseISO(to) : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Activity"
        actions={
          hasFilters ? (
            <Button variant="secondary" onClick={() => { setEventType(''); setCategory(''); setFrom(''); setTo(''); setPage(1); }}>
              Clear filters
            </Button>
          ) : null
        }
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
                active={eventType === type}
                onClick={() => {
                  setEventType(eventType === type ? '' : type);
                  setPage(1);
                }}
              />
            ))}
        </div>
      ) : null}

      <DataTableShell
        title="All activity"
        actions={
          <>
            <FilterSelect
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
              options={categories.map((value) => ({
                label: value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : 'All categories',
                value,
              }))}
              placeholder="All categories"
            />
            <FilterSelect
              value={eventType}
              onValueChange={(value) => {
                setEventType(value);
                setPage(1);
              }}
              options={[{ label: 'All event types', value: '' }, ...eventTypeOptions]}
              placeholder="All event types"
            />
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    data-empty={!fromDate}
                    className="w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
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
                    setFrom(nextDate ? format(nextDate, 'yyyy-MM-dd') : '');
                    setPage(1);
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
                    className="w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
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
                    setTo(nextDate ? format(nextDate, 'yyyy-MM-dd') : '');
                    setPage(1);
                  }}
                  defaultMonth={toDate}
                />
              </PopoverContent>
            </Popover>
          </>
        }
        footer={
          totalPages > 1 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total.toLocaleString()} events
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>
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
                <TableHead>Timestamp</TableHead>
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
                            <>
                              <p className="text-foreground">{String(contractor.name ?? '—')}</p>
                              <p className="text-sm text-muted-foreground">{String(contractor.department ?? '')}</p>
                            </>
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
                    No activity matches this filter. Matching events will show here.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>
    </div>
  );
}

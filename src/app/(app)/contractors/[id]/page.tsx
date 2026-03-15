'use client';

import { use, useState } from 'react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accessApi, contractorsApi, contractsApi, eventsApi, sponsorApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { AlertTriangle, Calendar as CalendarIcon, ChevronBottom, RotateCcw, X } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FieldBlock, PageBackLink, PageHeader, SectionCard, StatusBadge } from '@/components/app-ui';
import { Textarea } from '@/components/ui/textarea';
import { FilterSelect } from '@/components/app-ui';
import { getEventLabel } from '@/lib/event-labels';

const suspendReasons = [
  { value: 'compliance', label: 'Compliance issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'security', label: 'Security concern' },
  { value: 'other', label: 'Other' },
];

function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  error,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </div>
        </DialogHeader>
        <div className="mt-6 space-y-5">
          {error ? (
            <div className="rounded-[24px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {children}
        </div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'security';

  const [modal, setModal] = useState<'suspend' | 'reactivate' | 'extend' | 'terminate' | null>(null);
  const [suspendReason, setSuspendReason] = useState('security');
  const [suspendNote, setSuspendNote] = useState('');
  const [reactivateNote, setReactivateNote] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [extendNote, setExtendNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const parsedExtendDate = extendDate ? parseISO(extendDate) : undefined;

  const { data: contractor, isLoading } = useQuery({
    queryKey: ['contractor', id],
    queryFn: async () => (await contractorsApi.get(id)).data,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', id],
    queryFn: async () => (await eventsApi.getContractorTimeline(id)).data,
  });

  const activeContract = contractor?.contracts?.[0];
  const contractorId = contractor?._id;
  const contractId = activeContract?._id;

  const { data: accessData } = useQuery({
    queryKey: ['access', contractId],
    queryFn: async () => (contractId ? (await accessApi.getByContract(contractId)).data : null),
    enabled: Boolean(contractId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contractor', id] });
    queryClient.invalidateQueries({ queryKey: ['timeline', id] });
  };

  const handleError = (err: unknown) => {
    const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    setActionError(Array.isArray(message) ? message.join(', ') : String(message ?? 'Action failed. Try again.'));
  };

  const closeDialog = () => {
    setModal(null);
    setActionError('');
    setActionLoading(false);
  };

  const doSuspend = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await contractsApi.suspend(contractorId, contractId, suspendReason, suspendNote || undefined);
      closeDialog();
      refresh();
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  };

  const doReactivate = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await contractsApi.reactivate(contractorId, contractId, reactivateNote || undefined);
      closeDialog();
      refresh();
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  };

  const doExtend = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      if (isAdmin) {
        await contractsApi.extend(contractorId, contractId, extendDate, extendNote || undefined);
      } else {
        await sponsorApi.submit({
          contract_id: contractId,
          action_type: 'extend',
          proposed_end_date: extendDate,
          justification: extendNote || 'Extension requested by sponsor',
        });
      }
      closeDialog();
      refresh();
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  };

  const doTerminate = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await contractsApi.terminate(contractorId, contractId);
      closeDialog();
      refresh();
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-[28px] bg-secondary/40" />
        <div className="h-64 rounded-[28px] bg-secondary/40" />
        <div className="h-80 rounded-[28px] bg-secondary/40" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <PageBackLink href="/contractors">Back to contractors</PageBackLink>
        <div className="flex-1">
          <PageHeader
            title={String(contractor?.name ?? 'Contractor')}
            description={`${String(contractor?.job_title ?? 'No title')} · ${String(contractor?.department ?? 'No department')}`}
            actions={activeContract ? <StatusBadge status={String(activeContract.status)} /> : null}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <SectionCard title="Details" description="Contact and role details for this contractor.">
            <div className="grid gap-5 md:grid-cols-2">
              {[
                ['Email', contractor?.email],
                ['Phone', contractor?.phone || '—'],
                ['Department', contractor?.department || '—'],
                ['Title', contractor?.job_title || '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[24px] border border-border/60 bg-secondary/35 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{String(value)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {activeContract ? (
            <SectionCard title="Contract" description="Current dates, status, and next actions.">
              <div className="grid gap-5 md:grid-cols-2">
                {[
                  ['Start', new Date(activeContract.start_date).toLocaleDateString()],
                  ['End', new Date(activeContract.end_date).toLocaleDateString()],
                  ['Status', activeContract.status],
                  ['Created', new Date(activeContract.createdAt || activeContract.created_at).toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[24px] border border-border/60 bg-secondary/35 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="mt-2 text-sm font-medium capitalize text-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {activeContract.status === 'active' ? (
                  <>
                    {isAdmin ? (
                      <Button variant="secondary" onClick={() => setModal('suspend')}>
                        <AlertTriangle size={14} />
                        Suspend
                      </Button>
                    ) : null}
                      <Button variant="secondary" onClick={() => setModal('extend')}>
                      <CalendarIcon size={14} />
                      {isAdmin ? 'Extend' : 'Request extension'}
                    </Button>
                    {isAdmin ? (
                      <Button variant="destructive" onClick={() => setModal('terminate')}>
                        <X size={14} />
                        End contract
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {isAdmin && activeContract.status === 'suspended' ? (
                  <Button onClick={() => setModal('reactivate')}>
                    <RotateCcw size={14} />
                    Reactivate
                  </Button>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {accessData?.length ? (
            <SectionCard title="Access" description="Current app access for this contract.">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessData.map((entry: Record<string, unknown>) => {
                    const app = entry.tenant_application_id as Record<string, unknown> | undefined;
                    return (
                      <TableRow key={String(entry._id)}>
                        <TableCell>{app ? String(app.display_name ?? app.app_key ?? '') : '—'}</TableCell>
                        <TableCell>
                          <StatusBadge status={String(entry.status)} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </SectionCard>
          ) : null}
        </div>

        <SectionCard title="Activity" description="Recent changes for this contractor.">
          <div className="space-y-4">
            {timeline?.data?.length ? (
              timeline.data.map((event: Record<string, unknown>, index: number) => {
                const actor = event.actor_id as Record<string, unknown> | undefined;
                const isLast = index === timeline.data.length - 1;
                return (
                  <div key={String(event._id)} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="size-3 rounded-full bg-primary" />
                      {!isLast ? <div className="mt-2 h-full w-px bg-border/80" /> : null}
                    </div>
                    <div className="pb-5">
                      <p className="font-medium text-foreground">{getEventLabel(String(event.event_type ?? ''))}</p>
                      <p className="text-sm text-muted-foreground">{actor ? String(actor.email ?? '') : 'Tenurio'}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.created_at ? formatDistanceToNow(new Date(String(event.created_at)), { addSuffix: true }) : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet. Changes for this contractor will show here.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <ActionDialog
        open={modal === 'suspend'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Suspend contract"
        description="This pauses the contract until you reactivate it."
        error={actionError}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={doSuspend} disabled={actionLoading}>
              {actionLoading ? 'Suspending…' : 'Suspend'}
            </Button>
          </>
        }
      >
        <FieldBlock label="Reason">
          <FilterSelect value={suspendReason} onValueChange={setSuspendReason} options={suspendReasons} placeholder="Select reason" />
        </FieldBlock>
        <FieldBlock label="Note">
          <Textarea value={suspendNote} onChange={(event) => setSuspendNote(event.target.value)} placeholder="Add context" />
        </FieldBlock>
      </ActionDialog>

      <ActionDialog
        open={modal === 'reactivate'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Reactivate contract"
        description="This returns the contractor to active status."
        error={actionError}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" onClick={doReactivate} disabled={actionLoading}>
              {actionLoading ? 'Reactivating…' : 'Reactivate'}
            </Button>
          </>
        }
      >
        <FieldBlock label="Note">
          <Textarea value={reactivateNote} onChange={(event) => setReactivateNote(event.target.value)} placeholder="Add context" />
        </FieldBlock>
      </ActionDialog>

      <ActionDialog
        open={modal === 'extend'}
        onOpenChange={(open) => !open && closeDialog()}
        title={isAdmin ? 'Extend contract' : 'Request extension'}
        description={isAdmin ? 'This updates the end date for this contract.' : 'This sends an extension request for review.'}
        error={actionError}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" onClick={doExtend} disabled={actionLoading || !extendDate}>
              {actionLoading ? 'Submitting…' : isAdmin ? 'Extend' : 'Submit request'}
            </Button>
          </>
        }
      >
        <FieldBlock label="New end date">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  data-empty={!parsedExtendDate}
                  className="w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {parsedExtendDate ? format(parsedExtendDate, 'PPP') : <span>Choose a new end date</span>}
                  <ChevronBottom data-icon="inline-end" size={16} />
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parsedExtendDate}
                onSelect={(nextDate) => setExtendDate(nextDate ? format(nextDate, 'yyyy-MM-dd') : '')}
                defaultMonth={parsedExtendDate}
              />
            </PopoverContent>
          </Popover>
        </FieldBlock>
        <FieldBlock label="Note">
          <Textarea value={extendNote} onChange={(event) => setExtendNote(event.target.value)} placeholder="Why this needs more time" />
        </FieldBlock>
      </ActionDialog>

      <ActionDialog
        open={modal === 'terminate'}
        onOpenChange={(open) => !open && closeDialog()}
        title="End contract"
        description="This ends the contract and starts access removal."
        error={actionError}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={doTerminate} disabled={actionLoading}>
              {actionLoading ? 'Ending…' : 'End contract'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          This can&apos;t be undone. Tenurio will start removing their access.
        </p>
      </ActionDialog>
    </div>
  );
}

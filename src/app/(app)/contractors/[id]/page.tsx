'use client';

import { use, useState } from 'react';
import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accessApi, contractorsApi, contractsApi, eventsApi, sponsorApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/auth-context';
import {
  Activity,
  Calendar as CalendarIcon,
  CalendarClock4,
  CalendarRemove4,
  ChevronBottom,
  RotateCcw,
  ShieldCheck,
} from '@/components/icons';
import { EmptyState, FieldBlock, FilterSelect, SectionCard, StatusBadge } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { getEventLabel } from '@/lib/event-labels';

const suspendReasons = [
  { value: 'compliance', label: 'Compliance issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'security', label: 'Security concern' },
  { value: 'other', label: 'Other' },
];

function formatDateLabel(value: unknown, pattern = 'MMM d, yyyy') {
  if (!value) {
    return '—';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return format(date, pattern);
}

function formatRelativeLabel(value: unknown) {
  if (!value) {
    return '—';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return 'C';
  }

  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getContractWindowCopy(endDate: unknown, status: string) {
  if (!endDate) {
    return 'No end date is set yet.';
  }

  const date = new Date(String(endDate));
  if (Number.isNaN(date.getTime())) {
    return 'Timeline unavailable.';
  }

  const days = differenceInCalendarDays(date, new Date());
  if (days > 1) {
    return `${days} days remaining`;
  }
  if (days === 1) {
    return 'Ends tomorrow';
  }
  if (days === 0) {
    return 'Ends today';
  }

  if (status.toLowerCase().includes('active')) {
    return `${Math.abs(days)} days overdue`;
  }

  return `Ended ${Math.abs(days)} days ago`;
}

function getContractGuidance(status: string, isAdmin: boolean) {
  const normalized = status.toLowerCase();

  if (normalized.includes('active')) {
    return isAdmin
      ? 'This contractor is active. Use suspend to pause work, extend to move the end date, or end contract to begin access removal.'
      : 'This contractor is active. You can submit an extension request when the contract needs more time.';
  }

  if (normalized.includes('suspend')) {
    return 'This contractor is suspended. Review recent activity, then reactivate once work is ready to resume.';
  }

  if (normalized.includes('expire')) {
    return 'This contract has expired. Review the timeline and connected systems to confirm follow-up actions are complete.';
  }

  if (normalized.includes('terminate')) {
    return 'This contract has ended. Keep the activity log and access list handy for audit and cleanup checks.';
  }

  return 'Review the contract timeline and details before taking the next action.';
}

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
            <div className="rounded-[16px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ActionItem({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-border/60 bg-background p-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

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
  const sponsor = contractor?.sponsor_id as Record<string, unknown> | undefined;
  const contractStatus = String(activeContract?.status ?? 'no contract');
  const timelineItems = timeline?.data ?? [];

  const { data: accessData } = useQuery({
    queryKey: ['access', contractId],
    queryFn: async () => (contractId ? (await accessApi.getByContract(contractId)).data : null),
    enabled: Boolean(contractId),
  });

  const accessEntries = accessData ?? [];
  const profileName = String(contractor?.name ?? 'Contractor');
  const profileRole = String(contractor?.job_title ?? 'No title');
  const profileDepartment = String(contractor?.department ?? 'No department');
  const profileEmail = String(contractor?.email ?? '—');
  const profilePhone = String(contractor?.phone ?? '—');
  const sponsorEmail = sponsor ? String(sponsor.email ?? '—') : '—';
  const contractWindowCopy = getContractWindowCopy(activeContract?.end_date, contractStatus);
  const contractGuidance = getContractGuidance(contractStatus, isAdmin);
  const contractStatusLabel = formatStatusLabel(contractStatus);
  const profileSubtitle =
    [profileRole !== 'No title' ? profileRole : null, profileDepartment !== 'No department' ? profileDepartment : null]
      .filter(Boolean)
      .join(' · ') || 'No title or department assigned';
  const accessSummary =
    accessEntries.length === 0
      ? 'No linked applications for this contract.'
      : `${accessEntries.length} connected ${accessEntries.length === 1 ? 'application' : 'applications'}`;
  const canSuspend = activeContract?.status === 'active' && isAdmin;
  const canExtend = activeContract?.status === 'active';
  const canTerminate = activeContract?.status === 'active' && isAdmin;
  const canReactivate = activeContract?.status === 'suspended' && isAdmin;
  const hasManageActions = Boolean(canSuspend || canExtend || canTerminate || canReactivate);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contractor', id] }),
      queryClient.invalidateQueries({ queryKey: ['timeline', id] }),
      queryClient.invalidateQueries({ queryKey: ['access', contractId] }),
    ]);
  }

  function handleError(err: unknown) {
    const message = getApiErrorMessage(err, 'Action failed. Try again.');
    setActionError(message);
    toast.error(message);
  }

  function closeDialog() {
    setModal(null);
    setActionError('');
    setActionLoading(false);
  }

  async function doSuspend() {
    setActionLoading(true);
    setActionError('');
    try {
      await contractsApi.suspend(contractorId, contractId, suspendReason, suspendNote || undefined);
      await refresh();
      closeDialog();
      toast.success('Contract suspended.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doReactivate() {
    setActionLoading(true);
    setActionError('');
    try {
      await contractsApi.reactivate(contractorId, contractId, reactivateNote || undefined);
      await refresh();
      closeDialog();
      toast.success('Contract reactivated.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doExtend() {
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
      await refresh();
      closeDialog();
      toast.success(isAdmin ? 'Contract extended.' : 'Extension request submitted.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doTerminate() {
    setActionLoading(true);
    setActionError('');
    try {
      await contractsApi.terminate(contractorId, contractId);
      await refresh();
      closeDialog();
      toast.success('Contract ended.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-12 rounded-[24px] bg-secondary/40" />
        <div className="h-72 rounded-[32px] bg-secondary/40" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="h-[32rem] rounded-[28px] bg-secondary/40" />
          <div className="h-[32rem] rounded-[28px] bg-secondary/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="py-1">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-[14px] bg-primary/10 text-lg font-semibold text-primary">
              {getInitials(profileName)}
            </div>
            <div className="min-w-0 space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">{profileName}</h1>
                  <StatusBadge status={contractStatus} className="shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground">{profileSubtitle}</p>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <CalendarIcon size={14} />
                  <span>{activeContract ? `Ends ${formatDateLabel(activeContract.end_date)}` : 'No active contract'}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <ShieldCheck size={14} />
                  <span>{accessEntries.length} {accessEntries.length === 1 ? 'app' : 'apps'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <SectionCard
            title="Contract summary"
          >
            {activeContract ? (
              <div className="space-y-6">
                <div className="grid gap-px overflow-hidden rounded-[12px] border border-border/60 bg-border/60 md:grid-cols-2">
                  {[
                    ['Start date', formatDateLabel(activeContract.start_date)],
                    ['End date', formatDateLabel(activeContract.end_date)],
                    ['Lifecycle state', contractStatusLabel],
                    ['Created', formatDateLabel(activeContract.createdAt || activeContract.created_at)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-background p-5">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className="mt-3 text-base font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[12px] border border-border/60 bg-background p-5">
                  <p className="text-xs font-medium text-muted-foreground">Current timing</p>
                  <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">{contractWindowCopy}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {contractGuidance} Status is currently {contractStatusLabel.toLowerCase()}. Review the activity feed below before making changes.
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No active contract"
                description="This contractor record does not currently include an active contract to manage."
              />
            )}
          </SectionCard>

          <SectionCard
            title="System access"
            actions={
              <div className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                {accessEntries.length} {accessEntries.length === 1 ? 'app' : 'apps'}
              </div>
            }
          >
            {accessEntries.length ? (
              <div className="overflow-hidden rounded-[12px] border border-border/60">
                {accessEntries.map((entry: Record<string, unknown>, index: number) => {
                  const app = entry.tenant_application_id as Record<string, unknown> | undefined;

                  return (
                    <div
                      key={String(entry._id)}
                      className="flex items-center justify-between gap-3 border-b border-border/60 bg-background px-4 py-4 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {app ? String(app.display_name ?? app.app_key ?? '') : 'Unknown application'}
                        </p>
                        <p className="text-xs text-muted-foreground">{index === 0 ? accessSummary : 'Provisioning record'}</p>
                      </div>
                      <StatusBadge status={String(entry.status ?? 'unknown')} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No linked applications"
                description="Provisioned apps will show here once this contract has system access attached."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Activity timeline"
            actions={
              <div className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                {timelineItems.length} {timelineItems.length === 1 ? 'event' : 'events'}
              </div>
            }
          >
            {timelineItems.length ? (
              <div className="space-y-0">
                {timelineItems.map((event: Record<string, unknown>) => {
                  const actor = event.actor_id as Record<string, unknown> | undefined;
                  const eventDate = event.created_at || event.createdAt;

                  return (
                    <div
                      key={String(event._id)}
                      className="grid gap-4 border-b border-border/60 py-5 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
                    >
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Activity size={16} />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <p className="text-sm font-semibold text-foreground">{getEventLabel(String(event.event_type ?? ''))}</p>
                        <p className="text-sm text-muted-foreground">
                          {actor ? String(actor.email ?? '') : 'Tenurio'} · {formatDateLabel(eventDate)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground sm:pt-1 sm:text-right">{formatRelativeLabel(eventDate)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No activity yet"
                description="Lifecycle changes, access updates, and sponsor requests will appear here once work starts moving."
              />
            )}
          </SectionCard>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <SectionCard title="Profile details">
            <div>
              <DetailRow label="Email" value={profileEmail} />
              <DetailRow label="Phone" value={profilePhone} />
              <DetailRow label="Department" value={profileDepartment} />
              <DetailRow label="Title" value={profileRole} />
              <DetailRow label="Sponsor" value={sponsorEmail} />
            </div>
          </SectionCard>

          {hasManageActions ? (
            <SectionCard title="Manage contract">
              <div className="space-y-3">
                {canSuspend ? (
                  <ActionItem title="Suspend contract" description="Pause work and capture the reason so the timeline stays clear.">
                    <Button type="button" variant="outline" onClick={() => setModal('suspend')}>
                      <CalendarClock4 size={14} />
                      Suspend
                    </Button>
                  </ActionItem>
                ) : null}

                {canExtend ? (
                  <ActionItem
                    title={isAdmin ? 'Extend contract' : 'Request extension'}
                    description={isAdmin ? 'Move the end date without leaving the detail page.' : 'Send an extension request for sponsor review.'}
                  >
                    <Button type="button" variant="outline" onClick={() => setModal('extend')}>
                      <CalendarIcon size={14} />
                      {isAdmin ? 'Extend' : 'Request extension'}
                    </Button>
                  </ActionItem>
                ) : null}

                {canTerminate ? (
                  <ActionItem title="End contract" description="End the engagement and kick off access removal for connected systems.">
                    <Button type="button" variant="destructive" onClick={() => setModal('terminate')}>
                      <CalendarRemove4 size={14} />
                      End contract
                    </Button>
                  </ActionItem>
                ) : null}

                {canReactivate ? (
                  <ActionItem title="Reactivate contract" description="Restore active status once the contractor is ready to resume work.">
                    <Button type="button" variant="outline" onClick={() => setModal('reactivate')}>
                      <RotateCcw size={14} />
                      Reactivate
                    </Button>
                  </ActionItem>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </div>
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
              <CalendarClock4 size={14} />
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
              <RotateCcw size={14} />
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
              <CalendarIcon size={14} />
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
                onSelect={(nextDate: Date | undefined) => setExtendDate(nextDate ? format(nextDate, 'yyyy-MM-dd') : '')}
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
              <CalendarRemove4 size={14} />
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

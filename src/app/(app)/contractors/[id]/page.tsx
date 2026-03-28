'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accessApi, applicationsApi, contractorsApi, contractsApi, eventsApi, sponsorApi, tenantApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/auth-context';
import {
  Activity,
  CheckCircle,
  Calendar as CalendarIcon,
  CalendarClock4,
  CalendarRemove4,
  ChevronBottom,
  Clock,
  FileText,
  History,
  IconTrashCanSimple,
  Pencil,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Users,
  XCircle,
} from '@/components/icons';
import { InitialAvatar, getAvatarSeed } from '@/components/initial-avatar';
import { EmptyState, FieldBlock, FilterSelect, SectionCard, StatusBadge } from '@/components/app-ui';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ContractorDetailSkeleton } from '@/components/page-skeletons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getEventLabel } from '@/lib/event-labels';

const suspendReasons = [
  { value: 'compliance', label: 'Compliance issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'security', label: 'Security concern' },
  { value: 'other', label: 'Other' },
];

const departments = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Legal', 'Operations', 'Other',
];

function getTimelineEventMeta(type: string) {
  if (type === 'contractor.created') {
    return {
      icon: UserPlus,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    };
  }

  if (type === 'contractor.updated') {
    return {
      icon: FileText,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    };
  }

  if (type === 'contract.extended') {
    return {
      icon: CalendarIcon,
      className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
    };
  }

  if (type === 'contract.reactivated') {
    return {
      icon: RotateCcw,
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    };
  }

  if (type === 'contract.suspended') {
    return {
      icon: CalendarClock4,
      className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    };
  }

  if (type === 'contract.expired') {
    return {
      icon: Clock,
      className: 'bg-muted/40 text-muted-foreground',
    };
  }

  if (type === 'contract.terminated') {
    return {
      icon: CalendarRemove4,
      className: 'bg-muted/40 text-muted-foreground',
    };
  }

  if (type === 'access.provisioned') {
    return {
      icon: ShieldCheck,
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    };
  }

  if (type === 'access.revoked') {
    return {
      icon: ShieldOff,
      className: 'bg-muted/40 text-muted-foreground',
    };
  }

  if (type === 'sponsor.action.submitted') {
    return {
      icon: FileText,
      className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
    };
  }

  if (type === 'sponsor.action.approved') {
    return {
      icon: CheckCircle,
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    };
  }

  if (type === 'sponsor.action.rejected') {
    return {
      icon: XCircle,
      className: 'bg-muted/40 text-muted-foreground',
    };
  }

  return {
    icon: Activity,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  };
}

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
      ? 'This contractor is active. Use suspend to pause work, extend to move the end date, or deactivate to begin access removal.'
      : 'This contractor is active. You can submit requests for extension, access changes, or deactivation.';
  }

  if (normalized.includes('suspend')) {
    return isAdmin
      ? 'This contractor is suspended. Review recent activity, then reactivate once work is ready to resume.'
      : 'This contractor is suspended. You can request reactivation once the issue is resolved.';
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
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(640px,85svh)] flex-col overflow-hidden">
        <DialogHeader>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">{children}</div>
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
    <div className="grid gap-4 border-b border-border/60 py-5 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="sm:justify-self-end">{children}</div>
    </div>
  );
}

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [modal, setModal] = useState<
    | 'suspend'
    | 'reactivate'
    | 'extend'
    | 'terminate'
    | 'edit'
    | 'delete'
    | 'change-sponsor'
    | 'assign-access'
    | 'request-reactivate'
    | 'request-access'
    | 'request-deactivate'
    | null
  >(null);

  // Existing action state
  const [suspendReason, setSuspendReason] = useState('security');
  const [suspendNote, setSuspendNote] = useState('');
  const [reactivateNote, setReactivateNote] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [extendNote, setExtendNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Edit modal state
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', department: '', job_title: '' });

  // Change sponsor state
  const [newSponsorId, setNewSponsorId] = useState('');

  // Assign access state
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // Shared sponsor request note
  const [requestNote, setRequestNote] = useState('');

  const parsedExtendDate = extendDate ? parseISO(extendDate) : undefined;

  const { data: contractor, isLoading } = useQuery({
    queryKey: ['contractor', id],
    queryFn: async () => (await contractorsApi.get(id)).data,
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['timeline', id],
    queryFn: async () => (await eventsApi.getContractorTimeline(id)).data,
  });

  const activeContract = contractor?.contracts?.[0];
  const contractorId = contractor?._id;
  const contractId = activeContract?._id;
  const sponsor = contractor?.sponsor_id as Record<string, unknown> | undefined;
  const contractStatus = String(activeContract?.status ?? 'no contract');
  const timelineItems = timeline?.data ?? [];

  const { data: accessData, isLoading: accessLoading } = useQuery({
    queryKey: ['access', contractId],
    queryFn: async () => (contractId ? (await accessApi.getByContract(contractId)).data : null),
    enabled: Boolean(contractId),
  });

  const { data: usersData } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: async () => (await tenantApi.listUsers()).data,
    enabled: modal === 'change-sponsor',
  });

  const { data: appsData } = useQuery({
    queryKey: ['applications-list'],
    queryFn: async () => (await applicationsApi.list()).data,
    enabled: modal === 'assign-access',
  });

  const accessEntries = Array.isArray(accessData) ? accessData : [];
  const tenantUsers = (Array.isArray(usersData?.data) ? usersData.data : []) as Record<string, unknown>[];
  const availableApps = (Array.isArray(appsData) ? appsData : []) as Record<string, unknown>[];
  const assignedAppIds = new Set(
    accessEntries.map((e: Record<string, unknown>) => {
      const app = e.tenant_application_id as Record<string, unknown> | undefined;
      return String(app?._id ?? '');
    }),
  );

  const profileName = String(contractor?.name ?? 'Contractor');
  const profileRole = String(contractor?.job_title ?? 'No title');
  const profileDepartment = String(contractor?.department ?? 'No department');
  const profileEmail = String(contractor?.email ?? '—');
  const profilePhone = String(contractor?.phone ?? '—');
  const profileSeed = getAvatarSeed(contractor?._id, contractor?.email, contractor?.name);
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

  // Admin action conditions
  const canSuspend = activeContract?.status === 'active' && isAdmin;
  const canExtend = activeContract?.status === 'active';
  const canTerminate = activeContract?.status === 'active' && isAdmin;
  const canReactivate = activeContract?.status === 'suspended' && isAdmin;
  const canEdit = isAdmin;
  const canDelete = isAdmin;
  const canChangeSponsor = isAdmin;
  const canAssignAccess = activeContract?.status === 'active' && isAdmin;

  // Sponsor action conditions
  const canRequestReactivate = !isAdmin && activeContract?.status === 'suspended';
  const canRequestAccess = !isAdmin && activeContract?.status === 'active';
  const canRequestDeactivate = !isAdmin && activeContract?.status === 'active';
  const canEditBasic = !isAdmin && Boolean(activeContract);

  const hasManageActions = Boolean(
    canSuspend || canExtend || canTerminate || canReactivate ||
    canEdit || canDelete || canChangeSponsor || canAssignAccess ||
    canRequestReactivate || canRequestAccess || canRequestDeactivate || canEditBasic,
  );

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contractor', id] }),
      queryClient.invalidateQueries({ queryKey: ['timeline', id] }),
      queryClient.invalidateQueries({ queryKey: ['access', contractId] }),
    ]);
  }

  function handleError(err: unknown) {
    toast.error(getApiErrorMessage(err, 'Action failed. Try again.'));
  }

  function closeDialog() {
    setModal(null);
    setActionLoading(false);
    setRequestNote('');
    setNewSponsorId('');
    setSelectedAppIds([]);
  }

  function openEditModal() {
    setEditForm({
      name: String(contractor?.name ?? ''),
      email: String(contractor?.email ?? ''),
      phone: String(contractor?.phone ?? ''),
      department: String(contractor?.department ?? ''),
      job_title: String(contractor?.job_title ?? ''),
    });
    setModal('edit');
  }

  function openAssignAccessModal() {
    setSelectedAppIds(Array.from(assignedAppIds).filter(Boolean));
    setModal('assign-access');
  }

  async function doSuspend() {
    setActionLoading(true);
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
    try {
      await contractsApi.terminate(contractorId, contractId);
      await refresh();
      closeDialog();
      toast.success('Contractor deactivated.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doEdit() {
    setActionLoading(true);
    try {
      const payload: Record<string, string> = isAdmin
        ? {
            name: editForm.name,
            email: editForm.email,
            phone: editForm.phone,
            department: editForm.department,
            job_title: editForm.job_title,
          }
        : { name: editForm.name, phone: editForm.phone };
      await contractorsApi.update(contractorId, payload);
      await refresh();
      closeDialog();
      toast.success('Contractor details updated.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doDelete() {
    setActionLoading(true);
    try {
      await contractorsApi.delete(contractorId);
      toast.success('Contractor deleted.');
      router.push('/contractors');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doChangeSponsor() {
    setActionLoading(true);
    try {
      await contractorsApi.update(contractorId, { sponsor_id: newSponsorId });
      await refresh();
      closeDialog();
      toast.success('Sponsor updated.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doAssignAccess() {
    setActionLoading(true);
    try {
      await accessApi.assign(contractId, selectedAppIds);
      await refresh();
      closeDialog();
      toast.success('Access updated.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doRequestReactivate() {
    setActionLoading(true);
    try {
      await sponsorApi.submit({
        contract_id: contractId,
        action_type: 'reactivate',
        justification: requestNote || 'Reactivation requested by sponsor',
      });
      await refresh();
      closeDialog();
      toast.success('Reactivation request submitted.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doRequestAccess() {
    setActionLoading(true);
    try {
      await sponsorApi.submit({
        contract_id: contractId,
        action_type: 'access_change',
        justification: requestNote || 'Access change requested by sponsor',
      });
      await refresh();
      closeDialog();
      toast.success('Access change request submitted.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  async function doRequestDeactivate() {
    setActionLoading(true);
    try {
      await sponsorApi.submit({
        contract_id: contractId,
        action_type: 'deactivate',
        justification: requestNote || 'Deactivation requested by sponsor',
      });
      await refresh();
      closeDialog();
      toast.success('Deactivation request submitted.');
    } catch (err) {
      handleError(err);
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return <ContractorDetailSkeleton />;
  }

  return (
    <div className="space-y-8">
      <section className="py-1">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <InitialAvatar
              seed={profileSeed}
              label={profileName === 'Contractor' ? profileEmail : profileName}
              size="lg"
              shape="rounded"
            />
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

      <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1fr)_24rem]">
        <SectionCard
          title="Contract summary"
          className="xl:self-start"
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
        <SectionCard title="Profile details" className="xl:self-start">
          <div>
            <DetailRow label="Email" value={profileEmail} />
            <DetailRow label="Phone" value={profilePhone} />
            <DetailRow label="Department" value={profileDepartment} />
            <DetailRow label="Title" value={profileRole} />
            <DetailRow label="Sponsor" value={sponsorEmail} />
          </div>
        </SectionCard>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start xl:col-start-2 xl:row-span-12 xl:row-start-1">

          {hasManageActions ? (
            <SectionCard title="Manage contract">
              <div className="space-y-0">
                {/* ── Admin: contract lifecycle ── */}
                {canReactivate ? (
                  <ActionItem title="Reactivate contractor" description="Restore active status once the contractor is ready to resume work.">
                    <Button type="button" variant="outline" onClick={() => setModal('reactivate')}>
                      <RotateCcw size={14} />
                      Reactivate
                    </Button>
                  </ActionItem>
                ) : null}

                {canSuspend ? (
                  <ActionItem title="Suspend contractor" description="Pause work and capture the reason so the timeline stays clear.">
                    <Button type="button" variant="outline" onClick={() => setModal('suspend')}>
                      <CalendarClock4 size={14} />
                      Suspend
                    </Button>
                  </ActionItem>
                ) : null}


                {canExtend ? (
                  <ActionItem
                    title={isAdmin ? 'Extend tenure' : 'Request extension'}
                    description={isAdmin ? 'Move the end date without leaving the detail page.' : 'Send an extension request for admin review.'}
                  >
                    <Button type="button" variant="outline" onClick={() => setModal('extend')}>
                      <CalendarIcon size={14} />
                      {isAdmin ? 'Extend' : 'Request extension'}
                    </Button>
                  </ActionItem>
                ) : null}

                {/* ── Admin: contractor management ── */}
                {canEdit ? (
                  <ActionItem title="Edit contractor details" description="Update the contractor's name, email, contact, department, or title.">
                    <Button type="button" variant="outline" onClick={openEditModal}>
                      <Pencil size={14} />
                      Edit details
                    </Button>
                  </ActionItem>
                ) : null}

                {canChangeSponsor ? (
                  <ActionItem title="Change sponsor" description="Reassign this contractor to a different team member as their sponsor.">
                    <Button type="button" variant="outline" onClick={() => setModal('change-sponsor')}>
                      <Users size={14} />
                      Change sponsor
                    </Button>
                  </ActionItem>
                ) : null}

                {canAssignAccess ? (
                  <ActionItem title="Assign / Modify access" description="Add or change which applications this contractor can access.">
                    <Button type="button" variant="outline" onClick={openAssignAccessModal}>
                      <ShieldCheck size={14} />
                      Manage access
                    </Button>
                  </ActionItem>
                ) : null}


                {/* ── Sponsor actions ── */}
                {canRequestReactivate ? (
                  <ActionItem title="Request reactivation" description="Submit a reactivation request for admin review.">
                    <Button type="button" variant="outline" onClick={() => setModal('request-reactivate')}>
                      <RotateCcw size={14} />
                      Request reactivation
                    </Button>
                  </ActionItem>
                ) : null}

                {canRequestAccess ? (
                  <ActionItem title="Request access changes" description="Ask the admin to add, change, or remove application access.">
                    <Button type="button" variant="outline" onClick={() => setModal('request-access')}>
                      <ShieldAlert size={14} />
                      Request access changes
                    </Button>
                  </ActionItem>
                ) : null}


                {canEditBasic ? (
                  <ActionItem title="Edit basic details" description="Update the contractor's name or phone number.">
                    <Button type="button" variant="outline" onClick={openEditModal}>
                      <Pencil size={14} />
                      Edit details
                    </Button>
                  </ActionItem>
                ) : null}

                {/* ── Audit logs (all roles) ── */}
                <ActionItem title="View audit logs" description="See the full activity history for this contractor across all events.">
                  <Link href="/events" className={buttonVariants({ variant: 'outline' })}>
                    <History size={14} />
                    View audit logs
                  </Link>
                </ActionItem>

                {/* ── Destructive actions ── */}
                {canRequestDeactivate ? (
                  <ActionItem title="Initiate deactivation" description="Submit a deactivation request to end this contractor's engagement.">
                    <Button type="button" variant="outline" onClick={() => setModal('request-deactivate')}>
                      <CalendarRemove4 size={14} />
                      Initiate deactivation
                    </Button>
                  </ActionItem>
                ) : null}

                {canTerminate ? (
                  <ActionItem title="Deactivate contractor" description="End the engagement and kick off access removal for connected systems.">
                    <Button type="button" variant="destructive" onClick={() => setModal('terminate')}>
                      <CalendarRemove4 size={14} />
                      Deactivate
                    </Button>
                  </ActionItem>
                ) : null}

                {canDelete ? (
                  <ActionItem title="Delete contractor" description="Permanently remove this contractor record. This cannot be undone.">
                    <Button type="button" variant="destructive" onClick={() => setModal('delete')}>
                      <IconTrashCanSimple size={14} />
                      Delete
                    </Button>
                  </ActionItem>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </div>

        <SectionCard
          title="System access"
          className="xl:self-start"
          actions={
            accessLoading ? (
              <Skeleton className="h-7 w-16 rounded-full" />
            ) : (
              <Badge variant="neutral">
                {accessEntries.length} {accessEntries.length === 1 ? 'app' : 'apps'}
              </Badge>
            )
          }
        >
          {accessLoading ? (
            <div className="overflow-hidden rounded-[12px] border border-border/60">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 border-b border-border/60 bg-background px-4 py-4 last:border-b-0"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40 rounded-full" />
                    <Skeleton className="h-3.5 w-28 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : accessEntries.length ? (
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
          className="xl:self-start"
          actions={
            timelineLoading ? (
              <Skeleton className="h-7 w-20 rounded-full" />
            ) : (
              <Badge variant="neutral">
                {timelineItems.length} {timelineItems.length === 1 ? 'event' : 'events'}
              </Badge>
            )
          }
        >
          {timelineLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="grid gap-4 border-b border-border/60 py-5 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
                >
                  <Skeleton className="size-8 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40 rounded-full" />
                    <Skeleton className="h-3.5 w-32 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-20 rounded-full sm:mt-1" />
                </div>
              ))}
            </div>
          ) : timelineItems.length ? (
            <div className="space-y-0">
              {timelineItems.map((event: Record<string, unknown>) => {
                const actor = event.actor_id as Record<string, unknown> | undefined;
                const eventDate = event.created_at || event.createdAt;
                const eventType = String(event.event_type ?? '');
                const eventMeta = getTimelineEventMeta(eventType);
                const EventIcon = eventMeta.icon;

                return (
                  <div
                    key={String(event._id)}
                    className="grid gap-4 border-b border-border/60 py-5 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
                  >
                    <div className={`flex size-8 items-center justify-center rounded-md ${eventMeta.className}`}>
                      <EventIcon size={16} />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">{getEventLabel(eventType)}</p>
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

      {/* ── Dialogs ── */}

      <ActionDialog
        open={modal === 'suspend'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Suspend contractor"
        description="This pauses the contract until you reactivate it."
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
        title="Reactivate contractor"
        description="This returns the contractor to active status."
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
        title={isAdmin ? 'Extend tenure' : 'Request extension'}
        description={isAdmin ? 'This updates the end date for this contract.' : 'This sends an extension request for review.'}
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
                  className="w-53 justify-between border-transparent bg-card text-left font-normal shadow-sm ring-1 ring-foreground/10 hover:bg-card hover:text-foreground focus-visible:border-foreground/35 data-[empty=true]:text-muted-foreground/75"
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
        title="Deactivate contractor"
        description="This ends the contract and starts access removal."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={doTerminate} disabled={actionLoading}>
              <CalendarRemove4 size={14} />
              {actionLoading ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          This can&apos;t be undone. Tenurio will start removing their access.
        </p>
      </ActionDialog>

      <ActionDialog
        open={modal === 'edit'}
        onOpenChange={(open) => !open && closeDialog()}
        title={isAdmin ? 'Edit contractor details' : 'Edit basic details'}
        description={isAdmin ? 'Update the contractor profile information.' : 'Update the contractor\'s name or phone number.'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" onClick={doEdit} disabled={actionLoading}>
              <Pencil size={14} />
              {actionLoading ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      >
        <FieldBlock label="Name">
          <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
        </FieldBlock>
        {isAdmin ? (
          <FieldBlock label="Email">
            <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email address" />
          </FieldBlock>
        ) : null}
        <FieldBlock label="Phone">
          <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
        </FieldBlock>
        {isAdmin ? (
          <>
            <FieldBlock label="Department">
              <FilterSelect
                value={editForm.department}
                onValueChange={(value) => setEditForm((f) => ({ ...f, department: value }))}
                options={[{ label: 'Select department', value: '' }, ...departments.map((d) => ({ label: d, value: d }))]}
                placeholder="Select department"
              />
            </FieldBlock>
            <FieldBlock label="Title">
              <Input value={editForm.job_title} onChange={(e) => setEditForm((f) => ({ ...f, job_title: e.target.value }))} placeholder="Job title" />
            </FieldBlock>
          </>
        ) : null}
      </ActionDialog>

      <ActionDialog
        open={modal === 'delete'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Delete contractor"
        description="This permanently removes this contractor record."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={doDelete} disabled={actionLoading}>
              <IconTrashCanSimple size={14} />
              {actionLoading ? 'Deleting…' : 'Delete contractor'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          This can&apos;t be undone. All contract history, access records, and audit logs for <strong>{profileName}</strong> will be permanently deleted.
        </p>
      </ActionDialog>

      <ActionDialog
        open={modal === 'change-sponsor'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Change sponsor"
        description="Reassign this contractor to a different team member."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" onClick={doChangeSponsor} disabled={actionLoading || !newSponsorId}>
              <Users size={14} />
              {actionLoading ? 'Updating…' : 'Update sponsor'}
            </Button>
          </>
        }
      >
        {sponsor && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground">Current sponsor</p>
            <p className="text-sm font-medium text-foreground">{String(sponsor.name ?? sponsor.full_name ?? '—')}</p>
            <p className="text-xs text-muted-foreground">{String(sponsor.email ?? '—')}</p>
          </div>
        )}
        <FieldBlock label="New sponsor">
          <FilterSelect
            value={newSponsorId}
            onValueChange={setNewSponsorId}
            options={[
              { label: 'Select a team member', value: '' },
              ...tenantUsers.map((u) => {
                const uName = String(u.name ?? u.full_name ?? '');
                const uEmail = String(u.email ?? '');
                const label = uName && uEmail ? `${uName} — ${uEmail}` : uName || uEmail || String(u._id);
                return { label, value: String(u._id) };
              }),
            ]}
            placeholder="Select a team member"
          />
        </FieldBlock>
      </ActionDialog>

      <ActionDialog
        open={modal === 'assign-access'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Assign / Modify access"
        description="Select the applications this contractor should have access to."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" onClick={doAssignAccess} disabled={actionLoading}>
              {actionLoading ? 'Updating…' : 'Update access'}
            </Button>
          </>
        }
      >
        {availableApps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No applications available to assign.</p>
        ) : (
          <div className="space-y-2">
            {availableApps.map((app) => {
              const appId = String(app._id);
              const appId2 = app.application_id as Record<string, unknown> | undefined;
              const appName = String(app.display_name ?? appId2?.name ?? app.app_key ?? 'Unnamed app');
              const isChecked = selectedAppIds.includes(appId);
              return (
                <label
                  key={appId}
                  className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-border/60 bg-background px-4 py-3 hover:bg-muted/30"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() =>
                      setSelectedAppIds((prev) =>
                        isChecked ? prev.filter((id) => id !== appId) : [...prev, appId],
                      )
                    }
                  />
                  <span className="text-sm font-medium text-foreground">{appName}</span>
                </label>
              );
            })}
          </div>
        )}
      </ActionDialog>

      <ActionDialog
        open={modal === 'request-reactivate'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Request reactivation"
        description="Explain why this contractor should be reactivated."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" onClick={doRequestReactivate} disabled={actionLoading}>
              <RotateCcw size={14} />
              {actionLoading ? 'Submitting…' : 'Submit request'}
            </Button>
          </>
        }
      >
        <FieldBlock label="Justification">
          <Textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="Reason for reactivation" />
        </FieldBlock>
      </ActionDialog>

      <ActionDialog
        open={modal === 'request-access'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Request access changes"
        description="Describe the access changes needed for this contractor."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" onClick={doRequestAccess} disabled={actionLoading}>
              <ShieldAlert size={14} />
              {actionLoading ? 'Submitting…' : 'Submit request'}
            </Button>
          </>
        }
      >
        <FieldBlock label="Details">
          <Textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="What access should be added, changed, or removed?" />
        </FieldBlock>
      </ActionDialog>

      <ActionDialog
        open={modal === 'request-deactivate'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Initiate deactivation"
        description="Submit a request to end this contractor's engagement."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={doRequestDeactivate} disabled={actionLoading}>
              <CalendarRemove4 size={14} />
              {actionLoading ? 'Submitting…' : 'Submit request'}
            </Button>
          </>
        }
      >
        <FieldBlock label="Reason">
          <Textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="Why should this contractor be deactivated?" />
        </FieldBlock>
      </ActionDialog>
    </div>
  );
}

'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DataTableShell, EmptyState, FieldBlock, FilterSelect, PageHeader, SearchField, StatusBadge } from '@/components/app-ui';
import { Checkmark2, IconCrossLarge, ShieldCheck, UserPlus, XCircle } from '@/components/icons';
import { InitialAvatar, getAvatarSeed } from '@/components/initial-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { tenantApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';



const memberStatusOptions = [
  { label: 'All members', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Invited', value: 'invited' },
  { label: 'Inactive', value: 'inactive' },
];

type TeamMember = Record<string, unknown>;
type ActionType = 'role' | 'deactivate' | 'reactivate' | 'approve' | 'reject';

function getTextValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getMemberName(member: TeamMember) {
  const candidates = [member.name, member.full_name, member.display_name];
  const named = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return named ? String(named) : '';
}

function getMemberEmail(member: TeamMember) {
  return getTextValue(member.email);
}

function getMemberLabel(member: TeamMember) {
  return getMemberName(member) || getMemberEmail(member) || 'User';
}

function normalizeStatus(status: string) {
  if (status === 'pending_approval') {
    return 'pending';
  }

  if (status === 'deactivated') {
    return 'inactive';
  }

  return status || 'unknown';
}

function statusMeta(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized === 'active') {
    return {
      badge: 'active',
      description: 'Can access the workspace now.',
    };
  }

  if (normalized === 'invited') {
    return {
      badge: 'invited',
      description: 'Invite sent and waiting for account setup.',
    };
  }

  if (normalized === 'inactive') {
    return {
      badge: 'inactive',
      description: 'Access removed. You can reactivate this member.',
    };
  }

  if (normalized === 'pending') {
    return {
      badge: 'pending',
      description: 'Waiting for an admin decision.',
    };
  }

  return {
    badge: normalized,
    description: 'Status reported by the workspace.',
  };
}

function countByStatus(members: TeamMember[], status: string) {
  return members.filter((member) => normalizeStatus(getTextValue(member.status)) === status).length;
}

function matchesMember(member: TeamMember, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [getMemberName(member), getMemberEmail(member)]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function SummaryStatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card size="sm">
      <CardContent className="pt-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkspaceContextBanner({
  plan,
  billing,
  contractorLimit,
}: {
  plan: string;
  billing: string;
  contractorLimit: string;
}) {
  const contractorLimitLabel =
    contractorLimit === '∞' ? 'Contractors: Unlimited seats' : `Contractors: ${contractorLimit} seat${contractorLimit === '1' ? '' : 's'}`;

  return (
    <Card size="sm" className="border-border/70 bg-muted/20">
      <CardContent className="flex flex-col gap-4 pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-medium text-foreground">Workspace</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={`Plan: ${plan}`} />
          <StatusBadge status={`Billing: ${billing}`} />
          <StatusBadge status={contractorLimitLabel} />
        </div>
      </CardContent>
    </Card>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Role is hardcoded to sponsor on the backend now.
      await tenantApi.inviteUser(email.toLowerCase());
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success('Invite sent.');
      setEmail('');
      onOpenChange(false);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Invite failed. Try again.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div>
            <DialogTitle>Invite team member</DialogTitle>
          </div>
        </DialogHeader>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <FieldBlock label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@company.io"
              required
            />
          </FieldBlock>



          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Inviting…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PendingApprovalsCard({
  members,
  isAdmin,
  isBusy,
  activeAction,
  onApprove,
  onReject,
}: {
  members: TeamMember[];
  isAdmin: boolean;
  isBusy: (memberId: string) => boolean;
  activeAction: { type: ActionType; memberId: string } | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  if (!isAdmin) {
    return null;
  }

  if (!members.length) {
    return (
      <Card size="sm" className="border-border/70 bg-muted/15">
        <CardContent className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Pending approvals</p>
            <p className="text-sm text-muted-foreground">No join requests are waiting on an admin right now.</p>
          </div>
          <StatusBadge status="all clear" />
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTableShell
      title={`Pending approvals (${members.length})`}
      className="border-primary/15"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Requested role</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const memberId = String(member._id ?? '');
            const memberLabel = getMemberLabel(member);
            const memberSeed = getAvatarSeed(member._id, getMemberEmail(member), getMemberName(member));

            return (
              <TableRow key={memberId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <InitialAvatar seed={memberSeed} label={memberLabel} />
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{getMemberName(member) || '—'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-muted-foreground">{getMemberEmail(member)}</p>
                  <p className="text-sm text-muted-foreground">Joined with your company domain.</p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={getTextValue(member.role)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={() => onReject(memberId)}
                      disabled={isBusy(memberId)}
                      aria-label={activeAction?.type === 'reject' && isBusy(memberId) ? 'Rejecting member request' : 'Reject member request'}
                      title={activeAction?.type === 'reject' && isBusy(memberId) ? 'Rejecting member request' : 'Reject member request'}
                    >
                      <IconCrossLarge size={14} />
                      <span className="sr-only">
                        {activeAction?.type === 'reject' && isBusy(memberId) ? 'Rejecting member request' : 'Reject member request'}
                      </span>
                    </Button>
                    <Button
                      size="icon-sm"
                      onClick={() => onApprove(memberId)}
                      disabled={isBusy(memberId)}
                      aria-label={activeAction?.type === 'approve' && isBusy(memberId) ? 'Approving member request' : 'Approve member request'}
                      title={activeAction?.type === 'approve' && isBusy(memberId) ? 'Approving member request' : 'Approve member request'}
                    >
                      <Checkmark2 className="size-[11px]" />
                      <span className="sr-only">
                        {activeAction?.type === 'approve' && isBusy(memberId) ? 'Approving member request' : 'Approve member request'}
                      </span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

function MembersTable({
  members,
  isAdmin,
  isLoading,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onDeactivate,
  onReactivate,
  isBusy,
  activeAction,
  currentUserId,
}: {
  members: TeamMember[];
  isAdmin: boolean;
  isLoading: boolean;
  search: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onDeactivate: (id: string) => Promise<void>;
  onReactivate: (id: string) => Promise<void>;
  isBusy: (memberId: string) => boolean;
  activeAction: { type: ActionType; memberId: string } | null;
  currentUserId?: string;
}) {
  return (
    <DataTableShell
      title="Members"
      actions={
        <>
          <SearchField
            value={search}
            onChange={onSearchChange}
            placeholder="Search by name or email"
            className="md:min-w-[18rem]"
          />
          <FilterSelect
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            options={memberStatusOptions}
            placeholder="Filter by status"
            className="md:min-w-[10rem]"
          />
        </>
      }
    >
      {isLoading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin ? (
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoadingRows rows={4} columns={isAdmin ? 5 : 4} actionColumn={isAdmin} />
          </TableBody>
        </Table>
      ) : members.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin ? (
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const memberId = String(member._id ?? '');
              const memberName = getMemberName(member);
              const memberEmail = getMemberEmail(member);
              const memberLabel = getMemberLabel(member);
              const memberSeed = getAvatarSeed(member._id, memberEmail, memberName);
              const normalizedStatus = normalizeStatus(getTextValue(member.status));
              const isSelf = currentUserId === memberId;

              return (
                <TableRow key={memberId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <InitialAvatar seed={memberSeed} label={memberLabel} />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{memberLabel}</p>
                          {isSelf ? <StatusBadge status="you" /> : null}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-muted-foreground">{memberEmail}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={getTextValue(member.role)} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={statusMeta(normalizedStatus).badge} />
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      {isSelf ? (
                        <span className="text-sm text-muted-foreground">Current user</span>
                      ) : normalizedStatus === 'active' ? (
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="rounded-[min(var(--radius-md),12px)] outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                              <span className="flex size-7 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-border bg-background text-base leading-none text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                                ⋯
                              </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-40">
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => onDeactivate(memberId)}
                                disabled={isBusy(memberId)}
                              >
                                <XCircle size={14} />
                                {activeAction?.type === 'deactivate' && isBusy(memberId) ? 'Deactivating…' : 'Deactivate'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : normalizedStatus === 'inactive' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onReactivate(memberId)}
                          disabled={isBusy(memberId)}
                        >
                          <Checkmark2 className="size-[11px]" />
                          {activeAction?.type === 'reactivate' && isBusy(memberId) ? 'Reactivating…' : 'Reactivate'}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {normalizedStatus === 'invited' ? 'Awaiting acceptance' : 'No action'}
                        </span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          title="No members match this view"
          description={
            search || statusFilter !== 'all'
              ? 'Try clearing your search or status filter to see more people.'
              : 'Invited and active workspace members will appear here.'
          }
        />
      )}
    </DataTableShell>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionError, setActionError] = useState('');
  const [activeAction, setActiveAction] = useState<{ type: ActionType; memberId: string } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => (await tenantApi.listUsers()).data,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => (await tenantApi.getPendingUsers()).data,
    enabled: isAdmin,
  });

  const { data: stats } = useQuery({
    queryKey: ['tenant-stats'],
    queryFn: async () => (await tenantApi.getProfile()).data,
  });

  const members = useMemo(() => (Array.isArray(data?.data) ? (data.data as TeamMember[]) : []), [data]);
  const pendingMembers = useMemo(
    () => (Array.isArray(pendingData?.data) ? (pendingData.data as TeamMember[]) : []),
    [pendingData],
  );

  const managedMembers = useMemo(
    () => members.filter((member) => normalizeStatus(getTextValue(member.status)) !== 'pending'),
    [members],
  );

  const filteredMembers = useMemo(() => {
    return managedMembers.filter((member) => {
      const normalizedStatus = normalizeStatus(getTextValue(member.status));
      const statusMatches = statusFilter === 'all' || normalizedStatus === statusFilter;
      return statusMatches && matchesMember(member, search);
    });
  }, [managedMembers, search, statusFilter]);

  const totalMembers = managedMembers.length;
  const invitedMembers = countByStatus(managedMembers, 'invited');
  const inactiveMembers = countByStatus(managedMembers, 'inactive');

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['team-users'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-users'] }),
    ]);
  };

  const runMemberAction = async (
    action: { type: ActionType; memberId: string },
    request: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionError('');
    setActiveAction(action);

    try {
      await request();
      await refresh();
      toast.success(successMessage);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Action failed. Try again.');
      setActionError(message);
      toast.error(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleDeactivate = async (id: string) => {
    await runMemberAction({ type: 'deactivate', memberId: id }, () => tenantApi.deactivateUser(id), 'Member deactivated.');
  };

  const handleReactivate = async (id: string) => {
    await runMemberAction({ type: 'reactivate', memberId: id }, () => tenantApi.reactivateUser(id), 'Member reactivated.');
  };

  const handleApprove = async (id: string) => {
    await runMemberAction({ type: 'approve', memberId: id }, () => tenantApi.approveUser(id), 'Member approved.');
  };

  const handleReject = async (id: string) => {
    await runMemberAction({ type: 'reject', memberId: id }, () => tenantApi.rejectUser(id), 'Member request rejected.');
  };



  const isBusy = (memberId: string) => activeAction?.memberId === memberId;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Manage workspace members, approvals, and roles."
        actions={
          isAdmin ? (
            <Button onClick={() => setShowInvite(true)}>
              <UserPlus size={15} />
              Invite member
            </Button>
          ) : null
        }
      />

      {actionError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {!isAdmin ? (
        <Card size="sm" className="border-border/70 bg-muted/15">
          <CardContent className="flex items-start gap-3 pt-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Read-only access</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard label="Total members" value={totalMembers} />
        <SummaryStatCard label="Pending approvals" value={pendingMembers.length} />
        <SummaryStatCard label="Invited" value={invitedMembers} />
        <SummaryStatCard label="Inactive" value={inactiveMembers} />
      </div>

      <WorkspaceContextBanner
        plan={String(stats?.plan ?? '—')}
        billing={String(stats?.billing_status ?? '—')}
        contractorLimit={String(stats?.contractor_seat_limit ?? '∞')}
      />

      <PendingApprovalsCard
        members={pendingMembers}
        isAdmin={isAdmin}
        isBusy={isBusy}
        activeAction={activeAction}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <MembersTable
        members={filteredMembers}
        isAdmin={isAdmin}
        isLoading={isLoading}
        search={search}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
        isBusy={isBusy}
        activeAction={activeAction}
        currentUserId={user?._id}
      />

      <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { CheckCheck, ShieldCheck, UserPlus, Users, X } from '@/components/icons';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLoadingRows, TableRow } from '@/components/ui/table';
import { DataTableShell, FieldBlock, FilterSelect, MetricCard, PageHeader, StatusBadge } from '@/components/app-ui';
import { Input } from '@/components/ui/input';

const roles = ['admin', 'security', 'sponsor', 'viewer'];

function getErrorMessage(err: unknown) {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : String(message ?? 'Action failed. Try again.');
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('sponsor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await tenantApi.inviteUser(email.toLowerCase(), role);
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      onOpenChange(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : String(message ?? 'Invite failed. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>Send an invite and choose their role.</DialogDescription>
          </div>
        </DialogHeader>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          {error ? (
            <div className="rounded-[24px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <FieldBlock label="Email">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@company.io" required />
          </FieldBlock>
          <FieldBlock label="Role" description="Admins manage everything. Security manages access. Sponsors manage their contractors.">
            <FilterSelect
              value={role}
              onValueChange={setRole}
              options={roles.map((value) => ({ label: value.charAt(0).toUpperCase() + value.slice(1), value }))}
              placeholder="Select role"
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

export default function TeamPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showInvite, setShowInvite] = useState(false);
  const [actionError, setActionError] = useState('');
  const [activeAction, setActiveAction] = useState<{ type: 'role' | 'deactivate' | 'reactivate' | 'approve' | 'reject'; memberId: string } | null>(null);
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

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['team-users'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-users'] }),
    ]);
  };

  const runMemberAction = async (
    action: { type: 'role' | 'deactivate' | 'reactivate' | 'approve' | 'reject'; memberId: string },
    request: () => Promise<unknown>,
  ) => {
    setActionError('');
    setActiveAction(action);
    try {
      await request();
      await refresh();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActiveAction(null);
    }
  };

  const handleDeactivate = async (id: string) => {
    await runMemberAction({ type: 'deactivate', memberId: id }, () => tenantApi.deactivateUser(id));
  };

  const handleReactivate = async (id: string) => {
    await runMemberAction({ type: 'reactivate', memberId: id }, () => tenantApi.reactivateUser(id));
  };

  const handleApprove = async (id: string) => {
    await runMemberAction({ type: 'approve', memberId: id }, () => tenantApi.approveUser(id));
  };

  const handleReject = async (id: string) => {
    await runMemberAction({ type: 'reject', memberId: id }, () => tenantApi.rejectUser(id));
  };

  const handleRoleChange = async (id: string, role: string) => {
    await runMemberAction({ type: 'role', memberId: id }, () => tenantApi.updateRole(id, role));
  };

  const isBusy = (memberId: string) => activeAction?.memberId === memberId;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Manage access for everyone in this workspace."
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
        <div className="rounded-[24px] border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      {stats ? (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Plan" value={String(stats.plan ?? '—')} icon={ShieldCheck} tone="info" subtext="Current plan" />
          <MetricCard label="Billing" value={String(stats.billing_status ?? '—')} icon={Users} tone="success" subtext="Current billing status" />
          <MetricCard label="Contractor limit" value={String(stats.contractor_seat_limit ?? '∞')} icon={Users} tone="warning" subtext="Max contractor records" />
        </div>
      ) : null}

      {isAdmin && pendingData?.data?.length ? (
        <DataTableShell title="Pending approvals" description="Review people who joined with your company domain.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Requested role</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingData.data.map((member: Record<string, unknown>) => (
                <TableRow key={String(member._id)}>
                  <TableCell>
                    <p className="font-medium text-foreground">{String(member.email ?? '')}</p>
                    <p className="text-sm text-muted-foreground">Joined with your company domain</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={String(member.role ?? '')} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => handleReject(String(member._id))}
                        disabled={isBusy(String(member._id))}
                        aria-label={activeAction?.type === 'reject' && isBusy(String(member._id)) ? 'Rejecting member request' : 'Reject member request'}
                        title={activeAction?.type === 'reject' && isBusy(String(member._id)) ? 'Rejecting member request' : 'Reject member request'}
                      >
                        <X size={14} />
                        <span className="sr-only">{activeAction?.type === 'reject' && isBusy(String(member._id)) ? 'Rejecting member request' : 'Reject member request'}</span>
                      </Button>
                      <Button
                        size="icon-sm"
                        onClick={() => handleApprove(String(member._id))}
                        disabled={isBusy(String(member._id))}
                        aria-label={activeAction?.type === 'approve' && isBusy(String(member._id)) ? 'Approving member request' : 'Approve member request'}
                        title={activeAction?.type === 'approve' && isBusy(String(member._id)) ? 'Approving member request' : 'Approve member request'}
                      >
                        <CheckCheck size={14} />
                        <span className="sr-only">{activeAction?.type === 'approve' && isBusy(String(member._id)) ? 'Approving member request' : 'Approve member request'}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      ) : null}

      <DataTableShell title="Members" description="View active, invited, and inactive members.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin ? <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? <TableLoadingRows rows={4} columns={isAdmin ? 4 : 3} actionColumn={isAdmin} />
              : data?.data?.map((member: Record<string, unknown>) => {
                  const isSelf = member._id === user?._id;
                  const isActive = member.status === 'active';
                  const isPending = member.status === 'pending_approval';
                  const isInvited = member.status === 'invited';
                  return (
                    <TableRow key={String(member._id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{String(member.email ?? '')}</p>
                          {isSelf ? <StatusBadge status="you" /> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAdmin && !isSelf ? (
                          <FilterSelect
                            value={String(member.role ?? '')}
                            onValueChange={(value) => handleRoleChange(String(member._id), value)}
                            options={roles.map((value) => ({ label: value.charAt(0).toUpperCase() + value.slice(1), value }))}
                            placeholder="Select role"
                            className="w-[10rem]"
                            disabled={isBusy(String(member._id))}
                          />
                        ) : (
                          <StatusBadge status={String(member.role ?? '')} />
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={isActive ? 'active' : isPending ? 'pending' : isInvited ? 'invited' : 'inactive'} />
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          {!isSelf ? (
                            isActive ? (
                              <Button
                                variant="destructive"
                                size="icon-sm"
                                onClick={() => handleDeactivate(String(member._id))}
                                disabled={isBusy(String(member._id))}
                                aria-label={activeAction?.type === 'deactivate' && isBusy(String(member._id)) ? 'Deactivating member' : 'Deactivate member'}
                                title={activeAction?.type === 'deactivate' && isBusy(String(member._id)) ? 'Deactivating member' : 'Deactivate member'}
                              >
                                <X size={14} />
                                <span className="sr-only">{activeAction?.type === 'deactivate' && isBusy(String(member._id)) ? 'Deactivating member' : 'Deactivate member'}</span>
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="icon-sm"
                                onClick={() => handleReactivate(String(member._id))}
                                disabled={isBusy(String(member._id))}
                                aria-label={activeAction?.type === 'reactivate' && isBusy(String(member._id)) ? 'Reactivating member' : 'Reactivate member'}
                                title={activeAction?.type === 'reactivate' && isBusy(String(member._id)) ? 'Reactivating member' : 'Reactivate member'}
                              >
                                <CheckCheck size={14} />
                                <span className="sr-only">{activeAction?.type === 'reactivate' && isBusy(String(member._id)) ? 'Reactivating member' : 'Reactivate member'}</span>
                              </Button>
                            )
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </DataTableShell>

      <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}

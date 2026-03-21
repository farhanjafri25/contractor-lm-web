'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, integrationApi, tenantApi } from '@/lib/api';

interface DashboardSummary {
  active_contractors: number;
  suspended_contractors: number;
  expiring_soon: number;
  expiring_within_days: number;
  overdue_access: number;
  failed_revocations: number;
  pending_decisions?: number;
}

interface SetupChecklistItem {
  label: string;
  description: string;
  href: string;
  done: boolean;
}

interface QuickAction {
  label: string;
  href: string;
}

export function useGettingStarted() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await dashboardApi.getSummary()).data as DashboardSummary,
  });

  const { data: integrationStatus, isLoading: integrationLoading } = useQuery({
    queryKey: ['integration-status'],
    queryFn: async () => {
      try {
        return (await integrationApi.getStatus()).data as Record<string, unknown>;
      } catch {
        return null;
      }
    },
  });

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      try {
        return (await tenantApi.listUsers()).data as Record<string, unknown>;
      } catch {
        return null;
      }
    },
  });

  const googleWorkspace = integrationStatus?.google_workspace as Record<string, unknown> | undefined;
  const slack = integrationStatus?.slack as Record<string, unknown> | undefined;
  const isGoogleConnected = googleWorkspace?.connected === true;
  const googleSyncFailed = googleWorkspace?.sync_failed === true;
  const isSlackConnected = slack?.connected === true;

  const teamMembers = ((teamData?.data as Record<string, unknown>[] | undefined) ?? []);
  const sponsorCount = teamMembers.filter((member) => member.role === 'sponsor').length;

  const hasAnyContractor = (summary?.active_contractors ?? 0) + (summary?.suspended_contractors ?? 0) > 0;
  const checklistItems: SetupChecklistItem[] = [
    {
      label: 'Add your first contractor',
      description: 'Import or add contractors to start managing their access and documents.',
      href: '/contractors/new',
      done: hasAnyContractor,
    },
    {
      label: 'Connect Google Workspace',
      description: 'Sync your directory to automatically discover and manage contractors.',
      href: '/settings/directory',
      done: isGoogleConnected,
    },
    {
      label: 'Invite a sponsor',
      description: 'Sponsors approve contractor requests and are notified about expiring agreements.',
      href: '/settings/team?invite=sponsor',
      done: sponsorCount > 0,
    },
    {
      label: 'Configure Slack notifications',
      description: 'Get notified in Slack when contracts are expiring or need attention.',
      href: '/settings/slack',
      done: isSlackConnected,
    },
  ];

  const completedCount = checklistItems.filter((item) => item.done).length;
  const allChecklistDone = completedCount === checklistItems.length;
  const nextItem = checklistItems.find((item) => !item.done) ?? checklistItems[checklistItems.length - 1];
  const progressValue = checklistItems.length > 0 ? (completedCount / checklistItems.length) * 100 : 0;
  const gettingStartedLoading = summaryLoading || integrationLoading || teamLoading;

  const quickActions: QuickAction[] = [
    !hasAnyContractor ? { label: 'Import CSV', href: '/contractors/import' } : null,
    !isGoogleConnected ? { label: 'Connect directory', href: '/settings/directory' } : null,
    sponsorCount === 0 ? { label: 'Invite sponsor', href: '/settings/team?invite=sponsor' } : null,
  ].filter((action): action is QuickAction => Boolean(action));

  return {
    summary,
    summaryLoading,
    gettingStartedLoading,
    checklistItems,
    completedCount,
    allChecklistDone,
    nextItem,
    progressValue,
    hasAnyContractor,
    isGoogleConnected,
    googleSyncFailed,
    isSlackConnected,
    sponsorCount,
    quickActions,
    showQuickActions: !gettingStartedLoading && quickActions.length > 0,
  };
}

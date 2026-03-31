'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, tenantApi } from '@/lib/api';

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

type ManualChecklistState = Record<string, boolean>;

function getManualChecklistStorageKey() {
  if (typeof window === 'undefined') {
    return 'getting-started:manual-done';
  }

  const tenantId = window.localStorage.getItem('tenant_id');
  return tenantId ? `getting-started:manual-done:${tenantId}` : 'getting-started:manual-done';
}

function readManualChecklistState(storageKey: string): ManualChecklistState {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as ManualChecklistState) : {};
  } catch {
    return {};
  }
}

export function useGettingStarted() {
  const storageKey = getManualChecklistStorageKey();
  const [manualDoneItems, setManualDoneItems] = useState<ManualChecklistState>(() => readManualChecklistState(storageKey));

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await dashboardApi.getSummary()).data as DashboardSummary,
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

  const { data: tenantProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: async () => {
      try {
        return (await tenantApi.getProfile()).data as Record<string, unknown>;
      } catch {
        return null;
      }
    },
  });

  const isGoogleConnected = Boolean(tenantProfile?.is_google_connected);
  const googleSyncFailed = Boolean(tenantProfile?.google_workspace_sync_failed);
  const isSlackConnected = Boolean(tenantProfile?.is_slack_connected);

  const teamMembers = ((teamData?.data as Record<string, unknown>[] | undefined) ?? []);
  const sponsorCount = teamMembers.filter((member) => member.role === 'sponsor').length;

  const hasAnyContractor = (summary?.active_contractors ?? 0) + (summary?.suspended_contractors ?? 0) > 0;
  const checklistItems: SetupChecklistItem[] = [
    {
      label: 'Add your first contractor',
      description: 'Import from CSV or add contractor manually—start controlling access quickly.',
      href: '/contractors/new',
      done: hasAnyContractor || Boolean(manualDoneItems['Add your first contractor']),
    },
    {
      label: 'Connect Google Workspace',
      description: 'Bring your users into Tenurio and manage contractor access with real-time sync.',
      href: '/settings/directory',
      done: isGoogleConnected || Boolean(manualDoneItems['Connect Google Workspace']),
    },
    {
      label: 'Invite sponsor',
      description: 'Assign ownership by inviting team members to manage contractor access and lifecycle.',
      href: '/settings/team?invite=sponsor',
      done: sponsorCount > 0 || Boolean(manualDoneItems['Invite sponsor']),
    },
    {
      label: 'Connect Slack',
      description: 'Get expiry reminders and approve contractor actions directly from Slack.',
      href: '/settings/slack',
      done: isSlackConnected || Boolean(manualDoneItems['Connect Slack']),
    },
  ];

  function markChecklistItemDone(label: string) {
    setManualDoneItems((current) => {
      const next = { ...current, [label]: true };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }

      return next;
    });
  }

  const completedCount = checklistItems.filter((item) => item.done).length;
  const allChecklistDone = completedCount === checklistItems.length;
  const nextItem = checklistItems.find((item) => !item.done) ?? checklistItems[checklistItems.length - 1];
  const progressValue = checklistItems.length > 0 ? (completedCount / checklistItems.length) * 100 : 0;
  const gettingStartedLoading = summaryLoading || teamLoading || profileLoading;
  const showGettingStarted = !gettingStartedLoading && !allChecklistDone;

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
    showGettingStarted,
    nextItem,
    progressValue,
    hasAnyContractor,
    isGoogleConnected,
    googleSyncFailed,
    isSlackConnected,
    sponsorCount,
    markChecklistItemDone,
    quickActions,
    showQuickActions: !gettingStartedLoading && quickActions.length > 0,
  };
}

'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { tenantApi } from '@/lib/api';
import { ChevronGrabberVertical, Users } from '@/components/icons';
import { InitialAvatar, getAvatarSeed } from '@/components/initial-avatar';
import { cn } from '@/lib/utils';
import { deriveWorkspaceName } from '@/lib/workspace';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function TeamSwitcher({
  className,
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  const { user, tenantId } = useAuth();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: async () => (await tenantApi.getProfile()).data,
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const workspaceName = deriveWorkspaceName(data, user?.email);
  const initials = workspaceName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'W';
  const workspaceSeed = getAvatarSeed(tenantId, data?._id, data?.tenant_name, workspaceName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-transparent bg-background px-2 text-left text-sidebar-foreground shadow-[0_2px_4px_0_rgba(0,0,0,0.04)] outline-none transition-colors hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-sidebar-ring/40 dark:border-sidebar-border dark:shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_0_1.07px_0_rgba(0,0,0,0.40)]',
          collapsed && 'mx-auto size-9 justify-center px-0',
          className,
        )}
      >
        <InitialAvatar
          seed={workspaceSeed}
          label={workspaceName || initials}
          size="sm"
          shape="rounded"
          className="size-5 rounded-sm border-0 text-[8px]"
        />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5">{workspaceName}</span>
            </span>
            <ChevronGrabberVertical size={16} className="shrink-0 text-muted-foreground" />
          </>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[var(--anchor-width)] min-w-[var(--anchor-width)]">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium leading-5">{workspaceName}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings/team')}>
          <Users size={14} />
          Team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

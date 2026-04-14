'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { tenantApi } from '@/lib/api';
import { ChevronGrabberVertical, Group2, SettingsGear1 } from '@/components/icons';
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
  const workspaceSlug =
    typeof data?.slug === 'string' && data.slug.trim().length > 0
      ? data.slug.trim()
      : typeof data?.workspace_slug === 'string' && data.workspace_slug.trim().length > 0
        ? data.workspace_slug.trim()
        : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border bg-background px-2 text-left text-sidebar-foreground outline-none transition-[transform,background-color,color] [transition-duration:var(--duration-overlay)] [transition-timing-function:var(--ease-out)] hover:bg-sidebar-accent/70 hover:translate-x-px focus-visible:ring-2 focus-visible:ring-sidebar-ring/40 [border-color:var(--card-surface-stroke)] [box-shadow:var(--shadow-card-surface)]',
          collapsed && 'mx-auto size-9 justify-center px-0',
          className,
        )}
      >
        {data?.logo ? (
          <div className="relative size-5 shrink-0 overflow-hidden rounded-[4px] border-0">
            <Image src={data.logo} alt={`${workspaceName} logo`} fill unoptimized sizes="20px" className="object-cover" />
          </div>
        ) : (
          <InitialAvatar
            seed={workspaceSeed}
            label={workspaceName || initials}
            size="sm"
            shape="rounded"
            className="size-5 rounded-sm border-0 text-[8px]"
          />
        )}
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5">{workspaceName}</span>
            </span>
            <ChevronGrabberVertical size={16} className="shrink-0 text-muted-foreground" />
          </>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[max(var(--anchor-width),13rem)] min-w-[max(var(--anchor-width),13rem)] border bg-background/98 p-1.5 backdrop-blur-xl [border-color:var(--card-surface-stroke)] [box-shadow:var(--shadow-card-surface)]">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium leading-5">{workspaceName}</p>
          <p className="text-xs text-muted-foreground">{workspaceSlug ?? user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        {user?.role === 'admin' ? (
          <>
            <DropdownMenuItem onClick={() => router.push('/settings/organization')}>
              <SettingsGear1 size={14} />
              Organization settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings/team')}>
              <Group2 size={14} />
              Team
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

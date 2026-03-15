'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { tenantApi } from '@/lib/api';
import { ChevronGrabberVertical, Users } from '@/components/icons';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function deriveWorkspaceName(profile: Record<string, unknown> | undefined, email: string | undefined) {
  const candidates = [
    profile?.tenant_name,
    profile?.name,
    profile?.display_name,
    profile?.company_name,
    profile?.organization_name,
  ];

  const named = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  if (named) {
    return String(named);
  }

  if (email?.includes('@')) {
    const domain = email.split('@')[1] ?? '';
    const company = domain.split('.')[0] ?? '';
    if (company) {
      return company.charAt(0).toUpperCase() + company.slice(1);
    }
  }

  return 'Workspace';
}

export function TeamSwitcher({
  className,
  collapsed = false,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  const { user } = useAuth();
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-sidebar-border bg-background px-2 text-left text-sidebar-foreground shadow-[0_2px_4px_0_rgba(0,0,0,0.04),0_0_1.07px_0_rgba(0,0,0,0.40)] outline-none transition-colors hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-sidebar-ring/40',
          collapsed && 'mx-auto size-9 justify-center px-0',
          className,
        )}
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-[8px] font-semibold text-sidebar-primary-foreground">
          {initials}
        </span>
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

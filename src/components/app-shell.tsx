'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  SidebarHiddenLeftWide,
  Sun,
  Users,
} from '@/components/icons';
import { useAuth } from '@/context/auth-context';
import { tenantApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Logo, LogoMark } from '@/components/logo';
import { TeamSwitcher } from '@/components/team-switcher';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contractors', label: 'Contractors', icon: Users },
  { href: '/sponsor', label: 'Sponsor Requests', icon: FileText, roles: ['admin', 'security', 'sponsor'] },
  { href: '/access', label: 'Access', icon: ShieldCheck, roles: ['admin', 'security'] },
  { href: '/events', label: 'Audit Log', icon: Activity, roles: ['admin', 'security'] },
  { href: '/settings/team', label: 'Team', icon: Settings, roles: ['admin'] },
];

const NAV_GROUPS = [
  { label: 'Overview', items: ['/dashboard', '/contractors', '/sponsor'] },
  { label: 'Operations', items: ['/access', '/events'] },
  { label: 'Settings', items: ['/settings/team'] },
];

function MenuIcon() {
  return (
    <span className="flex flex-col gap-1" aria-hidden="true">
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
    </span>
  );
}

function routeLabels(pathname: string) {
  if (pathname === '/dashboard') {
    return ['Dashboard'];
  }

  if (pathname === '/contractors') {
    return ['Contractors'];
  }

  if (pathname === '/contractors/new') {
    return ['Contractors', 'New Contractor'];
  }

  if (pathname.startsWith('/contractors/')) {
    return ['Contractors', 'Contractor Details'];
  }

  if (pathname === '/sponsor') {
    return ['Sponsor Requests'];
  }

  if (pathname === '/access') {
    return ['Access'];
  }

  if (pathname === '/events') {
    return ['Audit Log'];
  }

  if (pathname === '/settings/team') {
    return ['Settings', 'Team'];
  }

  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? 'dashboard';
  return [last.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())];
}

function SidebarNav({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: pendingData } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => (await tenantApi.getPendingUsers()).data,
    enabled: isAdmin,
  });
  const pendingCount = pendingData?.data?.length || 0;

  const visible = useMemo(
    () => NAV.filter((item) => !item.roles || item.roles.includes(user?.role ?? '')),
    [user?.role],
  );

  return (
    <nav className={cn('grid gap-6 px-2', collapsed && 'justify-items-center')}>
      {NAV_GROUPS.map((group) => {
        const items = group.items
          .map((href) => visible.find((item) => item.href === href))
          .filter((item): item is (typeof NAV)[number] => Boolean(item));

        if (!items.length) {
          return null;
        }

        return (
          <div key={group.label} className={cn('space-y-1', collapsed && 'flex flex-col items-center')}>
            {!collapsed && group.label !== 'Overview' ? (
              <p className="px-2 pb-1 text-sm font-medium leading-5 text-sidebar-foreground/45">
                {group.label}
              </p>
            ) : null}
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors',
                    collapsed && 'size-8 justify-center px-0 mx-auto',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} />
                  {!collapsed ? <span className="flex-1">{label}</span> : null}
                  {!collapsed && href === '/settings/team' && pendingCount > 0 ? (
                    <span
                      className={cn(
                        'rounded-sm px-1.5 py-0.5 text-[10px] font-medium',
                        active ? 'bg-sidebar-primary-foreground/10 text-sidebar-primary-foreground' : 'bg-sidebar-accent text-sidebar-accent-foreground',
                      )}
                    >
                      {pendingCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-14 items-center', collapsed ? 'justify-center px-2' : 'px-4')}>
        {collapsed ? <LogoMark priority /> : <Logo priority />}
      </div>
      <div className={cn(collapsed ? 'px-2 pt-2 pb-3' : 'px-2 pt-2 pb-4')}>
        <TeamSwitcher collapsed={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} collapsed={collapsed} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const breadcrumbLabels = routeLabels(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem('sidebar:collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('sidebar:collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear md:block',
            collapsed ? 'w-16' : 'w-64',
          )}
        >
          <SidebarContent collapsed={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur md:px-4">
            <div className="flex items-center gap-1.5">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'md:hidden')}>
                  <MenuIcon />
                </SheetTrigger>
                <SheetContent className="md:hidden" showCloseButton={false}>
                  <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
                </SheetContent>
              </Sheet>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                className="hidden size-8 shrink-0 text-muted-foreground hover:text-foreground md:inline-flex"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <SidebarHiddenLeftWide size={20} />
              </Button>
              <Separator orientation="vertical" className="hidden !h-4 md:block" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {breadcrumbLabels.map((label, index) => {
                  const isCurrent = index === breadcrumbLabels.length - 1;
                  return (
                    <Fragment key={`${label}-${index}`}>
                      {index > 0 ? <span aria-hidden="true">›</span> : null}
                      <span className={cn(isCurrent && 'font-medium text-foreground')}>{label}</span>
                    </Fragment>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  <span className="flex size-8 items-center justify-center rounded-full border bg-background text-xs font-medium text-foreground transition-colors hover:bg-accent">
                    {(user?.email?.[0] ?? 'U').toUpperCase()}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-64">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                    {resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut size={14} />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
          <div className="flex h-14 items-center border-b px-4">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="p-3">
            <Skeleton className="mb-6 h-10 w-full" />
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, groupIndex) => (
                <div key={groupIndex} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  {Array.from({ length: groupIndex === 0 ? 3 : 2 }).map((__, itemIndex) => (
                    <Skeleton key={itemIndex} className="h-9 w-full" />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-6 border-t pt-3">
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 md:hidden" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-28" />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-[32rem]" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 w-full rounded-xl" />
                ))}
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <Skeleton className="h-80 w-full rounded-xl" />
                <Skeleton className="h-80 w-full rounded-xl" />
              </div>
              <div className="rounded-xl border">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                  <Skeleton className="h-9 w-28" />
                </div>
                <div className="p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="mb-3 h-12 w-full last:mb-0" />
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

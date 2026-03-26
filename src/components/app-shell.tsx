'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell,
  CheckCircle,
  ChevronGrabberVertical,
  Group2,
  History,
  HomeCircle,
  LogOut,
  Moon,
  PeopleAdd,
  SettingsGear1,
  ShieldCheck,
  SidebarHiddenLeftWide,
  Users,
  User,
  Sun,
} from '@/components/icons';
import { useAuth } from '@/context/auth-context';
import { useGettingStarted } from '@/hooks/use-getting-started';
import { tenantApi } from '@/lib/api';
import { InitialAvatar, getAvatarSeed, getAvatarTone } from '@/components/initial-avatar';
import { cn } from '@/lib/utils';
import { Logo, LogoMark } from '@/components/logo';
import { TeamSwitcher } from '@/components/team-switcher';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/page-transition';

function GettingStartedProgressIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const { gettingStartedLoading, completedCount, checklistItems, allChecklistDone } = useGettingStarted();
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = checklistItems.length > 0 ? completedCount / checklistItems.length : 0;
  const dashOffset = circumference * (1 - progress);
  const stateColorClass = allChecklistDone && !gettingStartedLoading ? 'text-emerald-500' : 'text-blue-500';

  if (allChecklistDone && !gettingStartedLoading) {
    return <CheckCircle size={size} className={cn(stateColorClass, className)} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex items-center justify-center', stateColorClass, className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={gettingStartedLoading ? circumference * 0.65 : dashOffset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center rounded-full"
        style={{
          boxShadow: 'inset 0 0 0 1px currentColor',
          opacity: gettingStartedLoading ? 0.12 : progress > 0 ? 0.16 : 0.1,
        }}
      />
    </span>
  );
}

const NAV = [
  { href: '/getting-started', label: 'Getting Started', icon: GettingStartedProgressIcon },
  { href: '/dashboard', label: 'Dashboard', icon: HomeCircle },
  { href: '/contractors', label: 'Contractors', icon: Users },
  { href: '/sponsor', label: 'Requests', icon: PeopleAdd, roles: ['admin', 'sponsor'] },
  { href: '/access', label: 'Access', icon: ShieldCheck, roles: ['admin'] },
  { href: '/events', label: 'Activity', icon: History, roles: ['admin', 'sponsor'] },
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/organization', label: 'Organization', icon: SettingsGear1, roles: ['admin'] },
  { href: '/settings/team', label: 'Team', icon: Group2, roles: ['admin'] },
];

const NAV_GROUPS = [
  { label: 'Overview', items: ['/getting-started', '/dashboard', '/contractors', '/sponsor'] },
  { label: 'Operations', items: ['/access', '/events'] },
  { label: 'Settings', items: ['/settings/profile', '/settings/organization', '/settings/team'] },
];

const AVATAR_MENU_GRADIENTS = {
  neutral: 'from-neutral-400/18 via-neutral-300/8 dark:from-neutral-500/18 dark:via-neutral-400/10',
  emerald: 'from-emerald-400/22 via-emerald-300/10 dark:from-emerald-500/20 dark:via-emerald-400/10',
  blue: 'from-blue-400/22 via-blue-300/10 dark:from-blue-500/20 dark:via-blue-400/10',
  violet: 'from-violet-400/22 via-violet-300/10 dark:from-violet-500/20 dark:via-violet-400/10',
  cyan: 'from-cyan-400/22 via-cyan-300/10 dark:from-cyan-500/20 dark:via-cyan-400/10',
} as const;

function getAvatarImageSrc(avatar: string | undefined, version: number | undefined) {
  if (!avatar) {
    return null;
  }

  if (!version || avatar.startsWith('data:')) {
    return avatar;
  }

  return `${avatar}${avatar.includes('?') ? '&' : '?'}v=${version}`;
}

function MenuIcon() {
  return (
    <span className="flex flex-col gap-1" aria-hidden="true">
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
      <span className="h-0.5 w-4 rounded-full bg-current" />
    </span>
  );
}

function routeBreadcrumbs(pathname: string) {
  if (pathname === '/getting-started') {
    return [{ label: 'Getting Started' }];
  }

  if (pathname === '/dashboard') {
    return [{ label: 'Dashboard' }];
  }

  if (pathname === '/contractors') {
    return [{ label: 'Contractors' }];
  }

  if (pathname === '/contractors/new') {
    return [
      { label: 'Contractors', href: '/contractors' },
      { label: 'Add contractor' },
    ];
  }

  if (pathname.startsWith('/contractors/')) {
    return [
      { label: 'Contractors', href: '/contractors' },
      { label: 'Contractor' },
    ];
  }

  if (pathname === '/sponsor') {
    return [{ label: 'Requests' }];
  }

  if (pathname === '/access') {
    return [{ label: 'Access' }];
  }

  if (pathname === '/events') {
    return [{ label: 'Activity' }];
  }

  if (pathname === '/settings/team') {
    return [
      { label: 'Settings' },
      { label: 'Team' },
    ];
  }

  if (pathname === '/settings/profile') {
    return [
      { label: 'Settings' },
      { label: 'Profile' },
    ];
  }

  if (pathname === '/settings/organization') {
    return [
      { label: 'Settings' },
      { label: 'Organization' },
    ];
  }

  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? 'dashboard';
  return [{ label: last.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) }];
}

function FeedbackPopover() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const trimmedMessage = message.trim();

  const handleSubmit = async () => {
    if (!trimmedMessage) {
      return;
    }

    try {
      await navigator.clipboard.writeText(trimmedMessage);
      toast.info("Feedback submission isn't connected yet, so your note was copied to the clipboard.");
    } catch {
      toast.info("Feedback submission isn't connected yet in this environment.");
    }
    setMessage('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="secondary" size="sm" className="hidden sm:inline-flex" type="button">
            Feedback
          </Button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(24rem,calc(100vw-1rem))] gap-3 rounded-[0.8rem] border bg-background/98 p-3.5 [border-color:var(--card-surface-stroke)] [box-shadow:var(--shadow-card-surface)] backdrop-blur-xl"
      >
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What’s working, what’s confusing, or what should we build next?"
          aria-label="Feedback"
          autoFocus
          rows={5}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={!trimmedMessage}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SidebarProfileMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user, logout } = useAuth();
  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => (await tenantApi.getUserProfile()).data,
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const personalAvatarSeed = getAvatarSeed(user?._id, user?.email);
  const avatarTone = getAvatarTone(personalAvatarSeed);
  const resolvedAvatar = profileData?.avatar ?? user?.avatar;
  const personalAvatarSrc = getAvatarImageSrc(resolvedAvatar, user?.avatarVersion);
  const fullName = profileData?.name?.trim() || user?.name?.trim() || '';
  const displayName = fullName || user?.email || 'User';
  const menuName = fullName || 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-sidebar-ring/40',
          collapsed && 'mx-auto size-9 justify-center px-0',
        )}
      >
        {personalAvatarSrc ? (
          <div className="relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full border-[0.5px] border-black/10 bg-muted dark:border-white/10">
            <Image src={personalAvatarSrc} alt="Avatar" fill unoptimized sizes="20px" className="object-cover" />
          </div>
        ) : (
          <InitialAvatar
            seed={personalAvatarSeed}
            label={displayName}
            size="sm"
            className="size-5 border-0 text-[8px]"
          />
        )}
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5">{displayName}</span>
            </span>
            <ChevronGrabberVertical size={16} className="shrink-0 text-muted-foreground" />
          </>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="relative w-[max(var(--anchor-width),13rem)] min-w-[max(var(--anchor-width),13rem)] overflow-hidden">
        {personalAvatarSrc ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.9)_30%,rgba(0,0,0,0.45)_62%,transparent_100%)]"
          >
            <Image
              src={personalAvatarSrc}
              alt=""
              fill
              unoptimized
              sizes="220px"
              className="scale-[1.9] object-cover object-top opacity-55 blur-3xl saturate-150"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/35 to-background/85" />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.9)_30%,rgba(0,0,0,0.45)_62%,transparent_100%)]',
              AVATAR_MENU_GRADIENTS[avatarTone],
            )}
          />
        )}
        <div className="relative z-10 px-2 py-2">
          {personalAvatarSrc ? (
            <div className="relative mb-2 flex size-11 items-center justify-center overflow-hidden rounded-full border-[0.5px] border-black/10 bg-muted dark:border-white/10">
              <Image src={personalAvatarSrc} alt="Avatar" fill unoptimized sizes="44px" className="object-cover" />
            </div>
          ) : (
            <InitialAvatar
              seed={personalAvatarSeed}
              label={displayName}
              size="md"
              className="mb-2 border-0"
            />
          )}
          <p className="truncate text-sm font-medium">{menuName}</p>
          {user?.email ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
          {user?.role ? <p className="mt-1 text-xs capitalize text-muted-foreground">{user.role}</p> : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
                  <span className="flex size-[18px] shrink-0 items-center justify-center">
                    <Icon size={href === '/getting-started' ? 16 : 18} />
                  </span>
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
        {collapsed ? (
          <LogoMark priority />
        ) : (
          <div className="flex items-center gap-2">
            <Logo priority />
            <Badge
              variant="secondary"
              className="min-h-0 rounded-sm border-sidebar-border bg-sidebar-accent px-1 py-px text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/75"
            >
              Beta
            </Badge>
          </div>
        )}
      </div>
      <div className={cn(collapsed ? 'px-2 pt-2 pb-3' : 'px-2 pt-2 pb-4')}>
        <TeamSwitcher collapsed={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} collapsed={collapsed} />
      </div>
      <div className="px-2 pb-4">
        <div className={cn('py-3', collapsed && 'py-2')}>
          <Separator className="bg-sidebar-border" />
        </div>
        <SidebarProfileMenu collapsed={collapsed} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const breadcrumbs = routeBreadcrumbs(pathname);
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
            'hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear md:sticky md:top-0 md:block md:h-screen',
            collapsed ? 'w-16' : 'w-56',
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
                {breadcrumbs.map((item, index) => {
                  const isCurrent = index === breadcrumbs.length - 1;
                  return (
                    <Fragment key={`${item.label}-${index}`}>
                      {index > 0 ? <span aria-hidden="true">›</span> : null}
                      {item.href && !isCurrent ? (
                        <Link
                          href={item.href}
                          className="transition-colors hover:text-foreground"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className={cn(isCurrent && 'font-medium text-foreground')}>{item.label}</span>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FeedbackPopover />
              <Button variant="secondary" size="sm" className="hidden sm:inline-flex" type="button">
                Docs
              </Button>
              <Button variant="secondary" size="icon-sm" aria-label="Notifications" title="Notifications">
                <Bell size={16} />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={resolvedTheme === 'dark' ? 'Light theme' : 'Dark theme'}
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
            </div>
          </header>

          <main className="relative flex-1 p-4 md:p-6">
            <PageTransition transitionKey={pathname} className="mx-auto w-full max-w-7xl space-y-6">
              {children}
            </PageTransition>
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
        <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
          <div className="flex h-14 items-center border-b px-4">
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <div className="p-3">
            <Skeleton className="mb-6 h-10 w-full rounded-lg" />
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, groupIndex) => (
                <div key={groupIndex} className="space-y-2">
                  <Skeleton className="h-3 w-20 rounded-full" />
                  {Array.from({ length: groupIndex === 0 ? 3 : 2 }).map((__, itemIndex) => (
                    <Skeleton key={itemIndex} className="h-9 w-full rounded-lg" />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-6 border-t pt-3">
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg md:hidden" />
              <Skeleton className="h-4 w-44 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="hidden h-8 w-14 rounded-lg sm:block" />
              <Skeleton className="hidden h-8 w-20 rounded-lg sm:block" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-56 rounded-md" />
                <Skeleton className="h-4 w-[32rem] max-w-full rounded-full" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-xl border bg-card p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-28 rounded-full" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                      </div>
                      <Skeleton className="size-10 rounded-lg" />
                    </div>
                    <Skeleton className="mt-5 h-4 w-40 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="rounded-xl border bg-card">
                    <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-28 rounded-md" />
                        <Skeleton className="h-4 w-56 rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                    <div className="space-y-3 p-6">
                      {Array.from({ length: 4 }).map((__, rowIndex) => (
                        <div key={rowIndex} className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-background px-4 py-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-36 rounded-full" />
                            <Skeleton className="h-3.5 w-24 rounded-full" />
                          </div>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36 rounded-md" />
                    <Skeleton className="h-4 w-72 rounded-full" />
                  </div>
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
                <div className="p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="mb-3 flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-background px-4 py-3 last:mb-0">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40 rounded-full" />
                        <Skeleton className="h-3.5 w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-7 w-7 rounded-lg" />
                    </div>
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

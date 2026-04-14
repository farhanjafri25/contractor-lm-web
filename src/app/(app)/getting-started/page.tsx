'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { CheckCircle } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UI_DURATIONS, UI_EASINGS } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useGettingStarted } from '@/hooks/use-getting-started';

/* ─────────────────────────────────────────────────────────
 * GETTING STARTED STORYBOARD
 *
 * Read top-to-bottom. Each `at` value is ms after item change.
 *
 *    0ms   active checklist row settles into its selected state
 *   40ms   detail panel starts fading and lifting into place
 *  180ms   title, description, and actions fully settle
 * ───────────────────────────────────────────────────────── */

const PANEL_TRANSITION = {
  offsetY: 12,
  scale: 0.985,
};

function LoadingState() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-md" />
          <Skeleton className="h-4 w-72 max-w-full rounded-full" />
        </div>
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 rounded-xl px-4 py-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-6 w-48 rounded-full" />
            </div>
          ))}
        </div>

        <div className="rounded-[28px] bg-muted/35 px-8 py-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56 rounded-md" />
              <Skeleton className="h-4 w-80 max-w-full rounded-full" />
              <Skeleton className="h-4 w-72 max-w-full rounded-full" />
            </div>
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GettingStartedContent() {
  const {
    gettingStartedLoading,
    checklistItems,
    completedCount,
    allChecklistDone,
    showGettingStarted,
    nextItem,
    markChecklistItemDone,
  } = useGettingStarted();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const success = searchParams?.get('success');
    const error = searchParams?.get('error');

    if (success === 'google_connected') {
      toast.success('Successfully connected to Google Workspace Admin!');
      window.history.replaceState(null, '', window.location.pathname);
    } else if (success === 'slack_connected') {
      toast.success('Successfully connected to Slack Workspace!');
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (error) {
      toast.error(error === 'oauth_failed' ? 'Failed to authorize integration. Please try again.' : 'Integration setup interrupted.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!gettingStartedLoading && !showGettingStarted) {
      router.replace('/dashboard');
    }
  }, [gettingStartedLoading, router, showGettingStarted]);

  async function handleConnectGoogle() {
    setConnecting(true);
    try {
      const response = await api.get('/integrations/google/auth');
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to initialize Google OAuth connection'));
      console.error(e);
      setConnecting(false);
    }
  }

  async function handleConnectSlack() {
    setConnecting(true);
    try {
      const response = await api.get('/integrations/slack/auth');
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to initialize Slack OAuth connection'));
      console.error(e);
      setConnecting(false);
    }
  }

  if (gettingStartedLoading) {
    return (
      <div className="space-y-8">
        <LoadingState />
      </div>
    );
  }

  if (!showGettingStarted) {
    return null;
  }

  const activeItem =
    checklistItems.find((item) => item.label === selectedLabel) ??
    nextItem ??
    checklistItems[0];
  const activeItemCtaLabel =
    activeItem?.label === 'Add your first contractor' ? 'Add contractor' : activeItem?.label ?? 'Get started';
  const activePanelKey = allChecklistDone ? 'workspace-ready' : activeItem?.label ?? 'getting-started';

  function handleMarkAsDone() {
    if (!activeItem || activeItem.done) {
      return;
    }

    markChecklistItemDone(activeItem.label);
    toast.success(`Marked "${activeItem.label}" as done.`);
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to Tenurio</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Secure contractor access with automated lifecycle management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="neutral">
            {completedCount} of {checklistItems.length} complete
          </Badge>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-3">
          {checklistItems.map((item, index) => {
            const isActive = activeItem?.label === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setSelectedLabel(item.label)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-[transform,background-color,color,box-shadow] [transition-duration:var(--duration-overlay)] [transition-timing-function:var(--ease-out)] active:scale-[0.97]',
                  isActive && !item.done ? 'scale-[1.01] bg-muted/70 shadow-sm' : 'hover:bg-muted/35',
                )}
              >
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-[transform,background-color,color,box-shadow] [transition-duration:var(--duration-overlay)] [transition-timing-function:var(--ease-out)]',
                    item.done
                      ? 'scale-[1.01] bg-emerald-500/12 text-emerald-600'
                      : isActive
                        ? 'scale-[1.03] bg-blue-500 text-white shadow-sm'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {item.done ? <CheckCircle size={14} /> : index + 1}
                </div>
                <p
                  className={cn(
                    'text-sm',
                    item.done
                      ? 'text-muted-foreground line-through'
                      : isActive
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </p>
              </button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-[28px] bg-muted/30 px-8 py-8 lg:min-h-[280px] lg:px-10 lg:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activePanelKey}
              className="max-w-xl space-y-4"
              initial={prefersReducedMotion ? false : { opacity: 0, y: PANEL_TRANSITION.offsetY, scale: PANEL_TRANSITION.scale }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, scale: PANEL_TRANSITION.scale }}
              transition={{
                opacity: { duration: UI_DURATIONS.page, ease: UI_EASINGS.out },
                y: { duration: UI_DURATIONS.page, ease: UI_EASINGS.out },
                scale: { duration: UI_DURATIONS.page, ease: UI_EASINGS.out },
              }}
            >
              <div className="space-y-1.5">
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {allChecklistDone ? 'Your workspace is ready' : activeItem?.label}
                </p>
                <p className="text-sm leading-7 text-muted-foreground">
                  {allChecklistDone
                    ? 'Everything essential is connected. You can revisit any setup area when your process changes.'
                    : activeItem?.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {activeItem?.label === 'Connect Google Workspace' ? (
                  <Button
                    size="sm"
                    onClick={handleConnectGoogle}
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting...' : activeItem.done ? 'Reauthorize Google' : 'Connect Workspace'}
                  </Button>
                ) : activeItem?.label === 'Connect Slack' ? (
                  <Button
                    size="sm"
                    onClick={handleConnectSlack}
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting...' : activeItem.done ? 'Reauthorize Slack' : 'Connect Slack'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    render={<Link href={activeItem?.href ?? '/dashboard'} />}
                    nativeButton={false}
                  >
                    {activeItemCtaLabel}
                  </Button>
                )}

                {!allChecklistDone && activeItem && !activeItem.done ? (
                  <Button size="sm" variant="secondary" type="button" onClick={handleMarkAsDone}>
                    Mark as done
                  </Button>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function GettingStartedPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading setup guide...</div>}>
      <GettingStartedContent />
    </Suspense>
  );
}

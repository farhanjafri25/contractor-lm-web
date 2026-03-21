'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGettingStarted } from '@/hooks/use-getting-started';

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

export default function GettingStartedPage() {
  const {
    gettingStartedLoading,
    checklistItems,
    completedCount,
    allChecklistDone,
    nextItem,
  } = useGettingStarted();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  if (gettingStartedLoading) {
    return (
      <div className="space-y-8">
        <LoadingState />
      </div>
    );
  }

  const activeItem =
    checklistItems.find((item) => item.label === selectedLabel) ??
    nextItem ??
    checklistItems[0];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to Tenurio</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Follow these steps to get the most out of Tenurio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="neutral">
            {completedCount} of {checklistItems.length} complete
          </Badge>
          <Button variant="secondary" size="sm" type="button">
            Read the docs
          </Button>
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
                  'flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors',
                  isActive && !item.done ? 'bg-muted/70' : 'hover:bg-muted/35',
                )}
              >
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    item.done
                      ? 'bg-emerald-500/12 text-emerald-600'
                      : isActive
                        ? 'bg-blue-500 text-white'
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

        <div className="rounded-[28px] bg-muted/30 px-8 py-8 lg:min-h-[280px] lg:px-10 lg:py-10">
          <div className="max-w-xl space-y-4">
            <div className="space-y-2">
              <p className="text-[28px] font-semibold tracking-tight text-foreground">
                {allChecklistDone ? 'Your workspace is ready' : activeItem?.label}
              </p>
              <p className="text-sm leading-7 text-muted-foreground">
                {allChecklistDone
                  ? 'Everything essential is connected. You can revisit any setup area when your process changes.'
                  : activeItem?.description}
              </p>
            </div>
            <Button
              size="sm"
              render={<Link href={allChecklistDone ? '/dashboard' : (activeItem?.href ?? '/dashboard')} />}
              nativeButton={false}
            >
              {allChecklistDone ? 'Open dashboard' : 'Get Started'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

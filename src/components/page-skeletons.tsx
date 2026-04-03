import { Skeleton } from '@/components/ui/skeleton';

export function SettingsPageSkeleton({
  topCardRows = 4,
  bottomCardRows = 1,
}: {
  topCardRows?: number;
  bottomCardRows?: number;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pt-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-4 w-72 max-w-full rounded-full" />
      </div>

      <div className="space-y-16">
        <div>
          {Array.from({ length: topCardRows }).map((_, index) => (
            <div
              key={index}
              className={`grid gap-4 py-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-8 md:items-center${index < topCardRows - 1 ? ' border-b border-border/70' : ''}`}
            >
              <div className="space-y-1">
                <Skeleton className="h-4 w-28 rounded-full" />
                {index > 1 ? <Skeleton className="h-4 w-44 rounded-full" /> : null}
              </div>
              <div className="min-w-0">
                {index === 0 ? (
                  <div className="flex justify-start md:justify-end">
                    <Skeleton className="size-16 rounded-full" />
                  </div>
                ) : (
                  <div className="w-full md:ml-auto md:max-w-sm">
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <Skeleton className="h-7 w-28 rounded-md" />
          <div>
            {Array.from({ length: bottomCardRows }).map((_, index) => (
              <div
                key={index}
                className={`grid gap-4 py-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-8 md:items-center${index < bottomCardRows - 1 ? ' border-b border-border/70' : ''}`}
              >
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 rounded-full" />
                </div>
                <div className="flex justify-start md:justify-end">
                  <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContractorDetailSkeleton() {
  return (
    <div className="space-y-8">
      <section className="py-1">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="size-[60px] rounded-full" />
            <div className="min-w-0 space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Skeleton className="h-8 w-52 rounded-md" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <Skeleton className="h-4 w-56 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="size-9 rounded-xl" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-6 xl:col-start-1 xl:row-start-1 xl:self-start">
          {/* Contract summary */}
          <div className="overflow-hidden rounded-xl bg-card shadow ring-1 ring-foreground/[0.065]">
            <div className="flex min-h-16 items-center border-b px-6 py-4">
              <Skeleton className="h-5 w-40 rounded-md" />
            </div>
            <div className="px-6 py-5">
              <div>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
                    <Skeleton className="h-3.5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-28 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="overflow-hidden rounded-xl bg-card shadow ring-1 ring-foreground/[0.065]">
            <div className="flex min-h-16 items-center justify-between border-b px-6 py-4">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <div className="px-6 py-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="grid gap-4 border-b border-border/60 py-5 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                  <Skeleton className="size-8 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40 rounded-full" />
                    <Skeleton className="h-3.5 w-32 rounded-full" />
                  </div>
                  <Skeleton className="h-3.5 w-20 rounded-full sm:mt-1" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-start-2 xl:row-start-1 xl:self-start">
          {/* Profile details */}
          <div className="overflow-hidden rounded-xl bg-card shadow ring-1 ring-foreground/[0.065]">
            <div className="flex min-h-16 items-center justify-between border-b px-6 py-4">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
            <div className="px-6 py-5">
              <div>
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
                    <Skeleton className="h-3.5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-28 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System access */}
          <div className="overflow-hidden rounded-xl bg-card shadow ring-1 ring-foreground/[0.065]">
            <div className="flex min-h-16 items-center justify-between border-b px-6 py-4">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
            <div className="px-6 py-5">
              <div>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-5 rounded" />
                      <Skeleton className="h-4 w-36 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SummaryCardsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl bg-card shadow ring-1 ring-foreground/[0.065] px-4 pb-4 pt-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </>
  );
}

export function WorkspaceBannerSkeleton() {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-4 w-24 rounded-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function PendingApprovalsSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-card shadow ring-1 ring-foreground/[0.065] border-border/70 dark:border-primary/15">
      <div className="flex min-h-14 items-center border-b px-6 py-4">
        <Skeleton className="h-5 w-40 rounded-md" />
      </div>
      <div className="p-0">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="grid gap-4 border-b px-6 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:items-center">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-3.5 w-32 rounded-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <div className="flex justify-end gap-2">
              <Skeleton className="size-8 rounded-[12px]" />
              <Skeleton className="size-8 rounded-[12px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

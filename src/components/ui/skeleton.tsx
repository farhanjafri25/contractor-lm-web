import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative isolate overflow-hidden rounded-lg border border-border/50 bg-muted/70",
        "after:absolute after:inset-0 after:-translate-x-full after:bg-[linear-gradient(90deg,transparent_0%,color-mix(in_srgb,var(--background)_70%,transparent)_45%,transparent_100%)] after:animate-[skeleton-shimmer_1.8s_ease-in-out_infinite]",
        "dark:bg-muted/45",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

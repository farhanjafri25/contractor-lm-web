"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex min-h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border px-1.5 py-1 text-[11px] leading-none font-semibold whitespace-nowrap transition-[background-color,border-color,color] duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary:
          "border-border bg-background text-foreground [a]:hover:bg-muted/70",
        destructive:
          "border-destructive/15 bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/15",
        outline:
          "border-border bg-background text-foreground [a]:hover:bg-muted/70 [a]:hover:text-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        neutral: "border-border/80 bg-muted/70 text-foreground/80",
        emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        blue: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
        violet: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
        cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
        danger: "border-destructive/15 bg-destructive/10 text-destructive",
        info: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
export type { BadgeVariant };

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:bg-card", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0 [&_tr]:bg-background", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-[background-color,color] [transition-duration:var(--duration-press)] [transition-timing-function:var(--ease-out)] hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-6 text-left align-middle text-xs font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-6 py-3.5 align-middle [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function TableLoadingRows({
  rows = 5,
  columns,
  actionColumn = false,
}: {
  rows?: number;
  columns: number;
  actionColumn?: boolean;
}) {
  return Array.from({ length: rows }).map((_, rowIndex) => (
    <TableRow key={`loading-row-${rowIndex}`} aria-hidden="true">
      {Array.from({ length: columns }).map((__, columnIndex) => {
        const isActionCell = actionColumn && columnIndex === columns - 1;
        const primaryWidths = ["w-[72%]", "w-[64%]", "w-[58%]", "w-[70%]"];
        const secondaryWidths = ["w-[46%]", "w-[38%]", "w-[42%]", "w-[34%]"];
        const showSecondaryLine = !isActionCell && (columnIndex === 0 || (rowIndex + columnIndex) % 3 === 0);

        return (
          <TableCell key={`loading-cell-${rowIndex}-${columnIndex}`} className={cn(isActionCell && "text-right")}>
            {isActionCell ? (
              <div className="flex justify-end">
                <Skeleton className="size-7 rounded-[min(var(--radius-md),12px)]" />
              </div>
            ) : (
              <div className="space-y-2 py-0.5">
                <Skeleton className={cn("h-3.5 rounded-full", primaryWidths[(rowIndex + columnIndex) % primaryWidths.length])} />
                {showSecondaryLine ? (
                  <Skeleton className={cn("h-3 rounded-full", secondaryWidths[(rowIndex + columnIndex) % secondaryWidths.length])} />
                ) : null}
              </div>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  ));
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableLoadingRows,
};

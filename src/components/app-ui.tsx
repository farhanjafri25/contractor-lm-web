'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronBottom, IconCrossLarge, Search } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { BadgeVariant } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export interface SelectOption {
  label: string;
  value: string;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function PageBackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-fit gap-1.5 text-muted-foreground hover:text-foreground px-0 hover:bg-transparent')}>
      <ArrowLeft size={14} />
      {children}
    </Link>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  subtext,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  subtext?: string;
}) {
  const toneClasses = {
    neutral: 'bg-secondary text-secondary-foreground',
    success: 'bg-primary/10 text-primary',
    warning: 'bg-accent text-accent-foreground',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-muted text-muted-foreground',
  }[tone];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className={cn('flex size-10 items-center justify-center rounded-md', toneClasses)}>
            <Icon size={18} />
          </div>
        </div>
        {subtext ? <p className="text-sm text-muted-foreground">{subtext}</p> : <div className="flex-1" />}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({
  status,
  icon,
  className,
}: {
  status: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  const variant: BadgeVariant =
    normalized.includes('active') ||
    normalized.includes('approved') ||
    normalized.includes('provisioned') ||
    normalized.includes('complete') ||
    normalized.includes('completed') ||
    normalized.includes('resolved') ||
    normalized.includes('done')
      ? 'emerald'
      : normalized.includes('pending') ||
          normalized.includes('review') ||
          normalized.includes('invited')
        ? 'blue'
        : normalized.includes('scheduled') ||
            normalized.includes('progress') ||
            normalized.includes('sync') ||
            normalized.includes('queued')
          ? 'cyan'
        : normalized.includes('suspend') ||
            normalized.includes('paused') ||
            normalized.includes('hold') ||
            normalized.includes('warning')
          ? 'violet'
          : normalized.includes('reject') ||
              normalized.includes('expire') ||
              normalized.includes('terminate') ||
              normalized.includes('revoked') ||
              normalized.includes('deactivate') ||
              normalized.includes('failed') ||
              normalized.includes('error') ||
              normalized.includes('danger')
            ? 'danger'
            : 'neutral';
  const label = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <Badge variant={variant} className={className}>
      {icon}
      {label}
    </Badge>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      {(title || description || actions) ? (
        <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="px-6 py-5">{children}</div>
    </Card>
  );
}

export function SettingsCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('rounded-xl border-transparent bg-card/95 dark:border-border/70', className)}>
      {(title || description || actions) ? (
        <div className="flex flex-col gap-4 border-b border-border/70 px-6 py-6 sm:px-8 sm:py-7 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            {title ? <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2> : null}
            {description ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="px-6 sm:px-8">{children}</div>
      {footer ? (
        <CardFooter className="justify-end border-border/70 bg-transparent px-6 py-5 sm:px-8 sm:py-6">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function SettingsRow({
  label,
  description,
  children,
  className,
  align = 'start',
  noBorder = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center';
  noBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid gap-4 py-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-8',
        align === 'center' ? 'md:items-center' : 'md:items-start',
        !noBorder && 'border-b border-border/70',
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground sm:text-[15px]">{label}</p>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function DataTableShell({
  title,
  description,
  actions,
  children,
  footer,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      {(title || description || actions) ? (
        <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">{actions}</div> : null}
        </div>
      ) : null}
      <div>{children}</div>
      {footer ? <div className="border-t px-6 py-4">{footer}</div> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/40 px-6 py-14 text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function FiltersPopover({
  activeCount,
  onClear,
  title = 'Filters',
  children,
}: {
  activeCount: number;
  onClear: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className="justify-between shadow-xs">
            <span>{activeCount ? `${title} (${activeCount})` : title}</span>
            <ChevronBottom data-icon="inline-end" size={16} />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-4 p-4">
        <PopoverHeader className="flex-row items-center justify-between gap-4">
          <PopoverTitle>{title}</PopoverTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={activeCount === 0}>
            Clear all
          </Button>
        </PopoverHeader>
        <div className="space-y-4">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('group relative w-full', className)}>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="rounded-lg bg-background/90 pl-10 pr-10 placeholder:text-muted-foreground/90 dark:bg-input/25"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
          aria-label="Clear search"
        >
          <IconCrossLarge size={12} />
        </button>
      ) : null}
    </div>
  );
}

export function FieldBlock({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  className?: string;
  disabled?: boolean;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={cn('min-w-40 shrink-0', className)}>
      <Select
        value={value || null}
        onValueChange={(next: string | null) => onValueChange(next ?? '')}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue>{selectedOption?.label ?? placeholder}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TableSkeleton({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-border/50">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <td key={columnIndex} className="px-6 py-4">
              <Skeleton className={cn('h-4', columnIndex === 0 ? 'w-40' : 'w-24')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SummaryPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary/25 bg-primary/10 text-primary'
          : 'border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground',
      )}
    >
      <span>{label}</span>
      <span className="rounded-sm bg-background/80 px-1.5 py-0.5 text-[10px] tracking-normal">{count}</span>
    </button>
  );
}

export function InlineActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function SurfaceAlert({
  tone = 'info',
  title,
  description,
}: {
  tone?: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  description?: string;
}) {
  const classes = {
    info: 'border bg-muted/70 text-foreground',
    warning: 'border bg-accent text-accent-foreground',
    success: 'border border-primary/15 bg-primary/10 text-primary',
    danger: 'border border-destructive/15 bg-destructive/10 text-destructive',
  }[tone];

  return (
    <div className={cn('rounded-lg px-5 py-4', classes)}>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-1 text-sm opacity-90">{description}</p> : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { contractorsApi } from '@/lib/api';
import { StatusBadge } from '@/components/app-ui';
import { InitialAvatar, getAvatarSeed } from '@/components/initial-avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useCanHoverPopover } from '@/hooks/use-can-hover-popover';
import { cn } from '@/lib/utils';

type ContractorRecord = Record<string, unknown>;
type ContractorSummaryContract = Record<string, unknown>;

function getStringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function formatDateLabel(value: unknown) {
  if (!value) {
    return '—';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return format(date, 'MMM d, yyyy');
}

function getContractWindowCopy(endDate: unknown, status: string) {
  if (!endDate) {
    return 'No end date is set yet.';
  }

  const date = new Date(String(endDate));
  if (Number.isNaN(date.getTime())) {
    return 'Timeline unavailable.';
  }

  const days = differenceInCalendarDays(date, new Date());
  if (days > 1) {
    return `${days} days remaining`;
  }
  if (days === 1) {
    return 'Ends tomorrow';
  }
  if (days === 0) {
    return 'Ends today';
  }
  if (status.toLowerCase().includes('active')) {
    return `${Math.abs(days)} days overdue`;
  }

  return `Ended ${Math.abs(days)} days ago`;
}

function getActiveContract(contractor: ContractorRecord | undefined) {
  const contracts = contractor?.contracts;
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return undefined;
  }

  return (contracts[0] ?? undefined) as ContractorSummaryContract | undefined;
}

function hasContractSummary(contract: ContractorSummaryContract | null | undefined) {
  if (!contract) {
    return false;
  }

  return Boolean(contract.start_date || contract.end_date || contract.status);
}

function resolveImageSource(
  contractor: ContractorRecord | undefined,
  fallback: { avatar?: string | null; image?: string | null; photo?: string | null },
) {
  const candidates = [
    contractor?.avatar,
    contractor?.image,
    contractor?.photo,
    fallback.avatar,
    fallback.image,
    fallback.photo,
  ];

  return candidates
    .map((candidate) => getStringValue(candidate))
    .find(Boolean) ?? null;
}

function ContractorAvatar({
  imageSrc,
  seed,
  label,
  className,
}: {
  imageSrc: string | null;
  seed: string;
  label: string;
  className?: string;
}) {
  if (imageSrc) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[0.5px] border-black/10 bg-muted dark:border-white/10',
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }

  return (
    <InitialAvatar
      seed={seed}
      label={label}
      size="md"
      className={className}
    />
  );
}

function SummaryRow({
  label,
  value,
  rowClassName,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  rowClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-border/60 py-2 last:border-b-0 last:pb-0', rowClassName)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className={cn('text-right text-xs font-medium text-foreground', valueClassName)}>{value}</div>
    </div>
  );
}

export function ContractorHoverPopover({
  contractorId,
  name,
  email,
  department,
  jobTitle,
  href,
  contract,
  avatar,
  image,
  photo,
  subtitle,
  className,
  nameClassName,
  subtitleClassName,
  showAvatar = false,
}: {
  contractorId?: string;
  name?: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  href?: string;
  contract?: ContractorSummaryContract | null;
  avatar?: string | null;
  image?: string | null;
  photo?: string | null;
  subtitle?: string;
  className?: string;
  nameClassName?: string;
  subtitleClassName?: string;
  showAvatar?: boolean;
}) {
  const canHoverPopover = useCanHoverPopover();
  const [open, setOpen] = useState(false);

  const localName = getStringValue(name);
  const localEmail = getStringValue(email);
  const localDepartment = getStringValue(department);
  const localJobTitle = getStringValue(jobTitle);
  const localSubtitle = subtitle ?? localDepartment ?? '';
  const resolvedHref = href ?? (contractorId ? `/contractors/${contractorId}` : undefined);
  const localContract = hasContractSummary(contract) ? contract : undefined;
  const shouldFetchDetails = Boolean(
    contractorId && (
      !localContract ||
      !localEmail ||
      !localJobTitle ||
      !resolveImageSource(undefined, { avatar, image, photo }) ||
      !localName
    ),
  );

  const { data: fetchedContractor, isFetching } = useQuery({
    queryKey: ['contractor', contractorId],
    queryFn: async () => (await contractorsApi.get(String(contractorId))).data as ContractorRecord,
    enabled: Boolean(open && shouldFetchDetails && contractorId),
    staleTime: 60_000,
  });

  const resolvedContractor = fetchedContractor;
  const resolvedName = getStringValue(resolvedContractor?.name) || localName || localEmail || '—';
  const resolvedEmail = getStringValue(resolvedContractor?.email) || localEmail;
  const resolvedDepartment = getStringValue(resolvedContractor?.department) || localDepartment;
  const resolvedJobTitle = getStringValue(resolvedContractor?.job_title) || localJobTitle;
  const resolvedSubtitle =
    [resolvedJobTitle, resolvedDepartment].filter(Boolean).join(' · ') ||
    resolvedDepartment ||
    resolvedEmail ||
    'No contractor details available';
  const resolvedContract = getActiveContract(resolvedContractor) ?? localContract;
  const resolvedStatus = getStringValue(resolvedContract?.status) || 'no contract';
  const resolvedImage = resolveImageSource(resolvedContractor, { avatar, image, photo });
  const avatarSeed = getAvatarSeed(contractorId, resolvedEmail, resolvedName);
  const showLoadingSummary = Boolean(open && isFetching && !resolvedContract);

  const triggerName = resolvedHref ? (
    <Link
      href={resolvedHref}
      onClick={(event) => {
        event.stopPropagation();
      }}
      className={cn(
        'block w-fit max-w-full rounded-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        nameClassName,
      )}
    >
      <span className="block truncate">{resolvedName}</span>
    </Link>
  ) : (
    <p className={cn('font-medium text-foreground', nameClassName)}>{resolvedName}</p>
  );

  const triggerContent = (
    <div className={cn(showAvatar ? 'flex items-center gap-3' : 'space-y-0.5', className)}>
      {showAvatar ? (
        <ContractorAvatar
          imageSrc={resolvedImage}
          seed={avatarSeed}
          label={resolvedName}
          className="size-9 border-0 text-sm"
        />
      ) : null}
      <div className="min-w-0 space-y-0.5">
        {triggerName}
        {localSubtitle ? (
          <p className={cn('text-sm text-muted-foreground', subtitleClassName)}>
            {localSubtitle}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!canHoverPopover) {
    return triggerContent;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={false}
        openOnHover
        delay={150}
        closeDelay={120}
        render={<div className="w-fit max-w-full" />}
      >
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-4 border-border/70 p-4 dark:bg-[#202022]">
        <div className="flex items-start gap-3">
          <ContractorAvatar
            imageSrc={resolvedImage}
            seed={avatarSeed}
            label={resolvedName}
            className="size-9 border-0 text-sm"
          />
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium text-foreground">{resolvedName}</p>
            <p className="text-xs text-muted-foreground">{resolvedSubtitle}</p>
          </div>
        </div>

        {showLoadingSummary ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-[88%] rounded-full" />
            <Skeleton className="h-4 w-[72%] rounded-full" />
          </div>
        ) : resolvedContract ? (
          <div className="space-y-0">
            <SummaryRow
              label="Status"
              value={<StatusBadge status={resolvedStatus} className="w-fit shrink-0" />}
            />
            <SummaryRow
              label="Start date"
              value={(
                <span className="inline-flex min-h-6 items-center text-xs font-medium text-foreground">
                  {formatDateLabel(resolvedContract.start_date)}
                </span>
              )}
            />
            <SummaryRow
              label="End date"
              rowClassName="border-b-0 pb-0"
              valueClassName="ml-auto flex w-[9.5rem] justify-end"
              value={(
                <span className="inline-flex min-h-6 w-full items-center justify-end text-right text-xs font-medium text-foreground">
                  {formatDateLabel(resolvedContract.end_date)}
                </span>
              )}
            />
            <div className="flex items-center gap-2 pt-1">
              <span className="h-px flex-1 border-b border-dotted border-border/80" />
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                {getContractWindowCopy(resolvedContract.end_date, resolvedStatus)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This contractor record does not currently include an active contract to manage.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

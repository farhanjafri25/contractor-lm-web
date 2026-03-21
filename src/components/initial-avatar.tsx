'use client';

import { cn } from '@/lib/utils';

const AVATAR_TONES = ['neutral', 'emerald', 'blue', 'violet', 'cyan'] as const;

type AvatarTone = (typeof AVATAR_TONES)[number];

const toneClasses: Record<AvatarTone, string> = {
  neutral: 'border-neutral-300/45 bg-neutral-100 text-neutral-700 dark:border-neutral-600/30 dark:bg-neutral-800 dark:text-neutral-100',
  emerald: 'border-emerald-300/35 bg-emerald-100 text-emerald-700 dark:border-emerald-700/25 dark:bg-emerald-950/70 dark:text-emerald-200',
  blue: 'border-blue-300/35 bg-blue-100 text-blue-700 dark:border-blue-700/25 dark:bg-blue-950/70 dark:text-blue-200',
  violet: 'border-violet-300/35 bg-violet-100 text-violet-700 dark:border-violet-700/25 dark:bg-violet-950/70 dark:text-violet-200',
  cyan: 'border-cyan-300/35 bg-cyan-100 text-cyan-700 dark:border-cyan-700/25 dark:bg-cyan-950/70 dark:text-cyan-200',
};

const sizeClasses = {
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-16 text-lg',
} as const;

const shapeClasses = {
  circle: 'rounded-full',
  rounded: 'rounded-[14px]',
} as const;

function hashSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function getAvatarSeed(...values: Array<unknown>) {
  const candidate = values.find((value) => typeof value === 'string' && value.trim().length > 0);
  return candidate ? String(candidate).trim() : 'default';
}

export function getAvatarTone(seed: string): AvatarTone {
  const normalized = seed.trim().toLowerCase() || 'default';
  return AVATAR_TONES[hashSeed(normalized) % AVATAR_TONES.length];
}

export function getAvatarInitials(label: string) {
  const trimmed = label.trim();

  if (!trimmed) {
    return 'U';
  }

  const seedLabel = trimmed.includes('@') && !trimmed.includes(' ')
    ? trimmed.split('@')[0] ?? trimmed
    : trimmed;

  const parts = seedLabel
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (parts) {
    return parts;
  }

  const fallback = seedLabel.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
  return fallback || 'U';
}

export function InitialAvatar({
  seed,
  label,
  size = 'md',
  shape = 'circle',
  className,
}: {
  seed: string;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'rounded';
  className?: string;
}) {
  const tone = getAvatarTone(seed);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center border font-semibold tracking-tight',
        sizeClasses[size],
        shapeClasses[shape],
        toneClasses[tone],
        className,
      )}
    >
      {getAvatarInitials(label)}
    </span>
  );
}

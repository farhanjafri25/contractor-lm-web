import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn('relative inline-flex h-5 w-20 items-center', className)}>
      <Image
        src="/tenurio-logo-black.svg"
        alt="Tenurio"
        width={80}
        height={20}
        priority={priority}
        className="block h-auto w-full dark:hidden"
      />
      <Image
        src="/tenurio-logo-white.svg"
        alt="Tenurio"
        width={80}
        height={20}
        priority={priority}
        className="hidden h-auto w-full dark:block"
      />
    </span>
  );
}

export function LogoMark({
  className,
  priority,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn('relative inline-flex size-5 items-center justify-center', className)}>
      <Image
        src="/logomark-light.svg"
        alt="Tenurio"
        width={20}
        height={20}
        priority={priority}
        className="block h-auto w-full dark:hidden"
      />
      <Image
        src="/logomark-dark.svg"
        alt="Tenurio"
        width={20}
        height={20}
        priority={priority}
        className="hidden h-auto w-full dark:block"
      />
    </span>
  );
}

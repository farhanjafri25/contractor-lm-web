import Link from 'next/link';
import { Logo } from '@/components/logo';
import { PageTransition } from '@/components/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AuthPageLayout({
  children,
  aside,
  footer,
  cardClassName,
  gridClassName,
  contentClassName,
  asideClassName,
  hideHeader,
}: {
  children: React.ReactNode;
  aside: React.ReactNode;
  footer?: React.ReactNode;
  cardClassName?: string;
  gridClassName?: string;
  contentClassName?: string;
  asideClassName?: string;
  hideHeader?: boolean;
}) {
  return (
    <div className={cn('flex flex-col bg-background px-3 sm:px-4', hideHeader ? 'h-screen overflow-hidden py-2 sm:py-3' : 'min-h-screen py-6 sm:py-8')}>
      <div className={cn('mx-auto flex w-full max-w-6xl flex-1 flex-col', hideHeader ? 'min-h-0' : 'min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-4rem)]')}>
        {!hideHeader && (
          <header className="flex justify-center pt-3 sm:pt-6">
            <Link href="/" aria-label="Tenurio home">
              <Logo className="h-7 w-28 sm:h-8 sm:w-32" priority />
            </Link>
          </header>
        )}

        <main className={cn('flex flex-1 items-center', hideHeader ? 'min-h-0 py-2' : 'py-8 sm:py-12 lg:py-16')}>
          <PageTransition className="mx-auto w-full max-w-[1250px]">
            <Card className={cn('bg-card shadow-none [box-shadow:none]', cardClassName)}>
              <CardContent className="p-0">
                <div
                  className={cn(
                    'grid gap-12 px-12 py-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-36 lg:px-24 lg:py-24',
                    gridClassName,
                  )}
                >
                  <section className="flex items-start">
                    <div className={cn('w-full max-w-md space-y-6', contentClassName)}>{children}</div>
                  </section>

                  <section className="hidden items-start lg:flex">
                    <div className={cn('max-w-xl space-y-6', asideClassName)}>{aside}</div>
                  </section>
                </div>
              </CardContent>
            </Card>
          </PageTransition>
        </main>
      </div>

      <footer className="flex items-center justify-between px-1 pb-2 pt-1 text-xs text-muted-foreground/70">
        {footer ?? (
          <>
            <span>&copy; {new Date().getFullYear()} Tenurio</span>
            <div className="flex gap-6">
              <span>Privacy Policy</span>
              <span>Support</span>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}

export function AuthWelcomeAside() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Welcome to Tenurio.</h1>
      <div className="space-y-4 text-sm leading-6 text-muted-foreground">
        <p>
          Tenurio helps organizations manage contractor and external workforce access with clear ownership and
          automatic expiry enforcement.
        </p>
        <p>Every external identity has a sponsor, a defined tenure, and controlled access across your systems.</p>
        <p className="text-foreground">Let&apos;s begin.</p>
      </div>
    </>
  );
}

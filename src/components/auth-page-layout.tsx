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
  aside?: React.ReactNode;
  footer?: React.ReactNode;
  cardClassName?: string;
  gridClassName?: string;
  contentClassName?: string;
  asideClassName?: string;
  hideHeader?: boolean;
}) {
  const hasAside = aside !== undefined && aside !== null;

  return (
    <div className={cn('flex min-h-screen h-[100dvh] flex-col overflow-hidden bg-background px-3 sm:px-4', hideHeader ? 'py-2 sm:py-3' : 'py-3 sm:py-4')}>
      <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col">
        {!hideHeader && (
          <header className="flex justify-center pt-2 sm:pt-4">
            <Link href="/" aria-label="Tenurio home">
              <Logo className="h-7 w-28 sm:h-8 sm:w-32" priority />
            </Link>
          </header>
        )}

        <main className={cn('flex min-h-0 flex-1 items-center', hideHeader ? 'py-2' : 'py-5 sm:py-6 lg:py-8')}>
          <PageTransition className="mx-auto min-h-0 w-full max-w-[1250px]">
            <Card className={cn('max-h-full overflow-y-auto bg-card shadow-none [box-shadow:none]', cardClassName)}>
              <CardContent className="p-0">
                <div
                  className={cn(
                    'grid gap-12 px-12 py-12 lg:px-24 lg:py-24',
                    hasAside ? 'lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-36' : 'lg:grid-cols-1',
                    gridClassName,
                  )}
                >
                  <section className="flex items-start">
                    <div className={cn('w-full max-w-md space-y-6', contentClassName)}>{children}</div>
                  </section>

                  {hasAside ? (
                    <section className="hidden items-start lg:flex">
                      <div className={cn('max-w-xl space-y-6', asideClassName)}>{aside}</div>
                    </section>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </PageTransition>
        </main>
      </div>

      <footer className="flex shrink-0 items-center justify-between px-1 pb-1 pt-1 text-xs text-muted-foreground/70">
        {footer ?? (
          <>
            <span>&copy; {new Date().getFullYear()} Tenurio</span>
            <div className="flex gap-6">
              <Link href="https://www.tenurio.com/privacy-policy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>
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
          Tenurio ensures every contractor has a clear sponsor, hard end date, and automatic access expiry across
          your directory and SaaS tools. No more forgotten access, orphan accounts, or manual cleanup.
        </p>
        <p>Eliminate spreadsheet chaos and audit nightmares. See the value in your first 2 minutes.</p>
        <p className="text-foreground">Let&apos;s begin.</p>
      </div>
    </>
  );
}

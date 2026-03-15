import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AuthPageLayout({
  children,
  aside,
  footer,
  gridClassName,
  contentClassName,
  asideClassName,
}: {
  children: React.ReactNode;
  aside: React.ReactNode;
  footer?: React.ReactNode;
  gridClassName?: string;
  contentClassName?: string;
  asideClassName?: string;
}) {
  return (
    <div className="min-h-screen bg-background px-3 py-6 sm:px-4 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col sm:min-h-[calc(100vh-4rem)]">
        <header className="flex justify-center pt-3 sm:pt-6">
          <Link href="/" aria-label="Tenurio home">
            <Logo className="h-7 w-28 sm:h-8 sm:w-32" priority />
          </Link>
        </header>

        <main className="flex flex-1 items-center py-8 sm:py-12 lg:py-16">
          <Card className="mx-auto w-full max-w-[1250px] bg-card">
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

                <section className="flex items-start">
                  <div className={cn('max-w-xl space-y-6', asideClassName)}>{aside}</div>
                </section>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="flex flex-col items-center justify-center gap-3 pb-4 pt-2 text-sm text-muted-foreground sm:flex-row sm:gap-10">
          {footer ?? (
            <>
              <span>@{new Date().getFullYear()} Tenurio Limited</span>
              <span>Privacy Policy</span>
              <span>Support</span>
            </>
          )}
        </footer>
      </div>
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

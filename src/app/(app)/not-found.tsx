import Link from 'next/link';

const primaryActionClassName =
  'inline-flex h-7 w-full shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-white/10 bg-primary px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-primary-foreground shadow-md shadow-black/15 ring-[0.5px] ring-(--button-ring) [--button-ring:color-mix(in_oklab,black_15%,var(--color-primary))] transition-all outline-none select-none hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] active:translate-y-px dark:border-transparent dark:[--button-ring:color-mix(in_oklab,white_15%,var(--color-primary))] sm:w-auto';

const secondaryActionClassName =
  'inline-flex h-7 w-full shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-transparent bg-card px-2.5 text-[0.8rem] font-medium whitespace-nowrap text-secondary-foreground ring-1 ring-foreground/10 transition-all outline-none select-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] active:translate-y-px dark:bg-background dark:hover:bg-muted sm:w-auto';

function NotFoundMark() {
  return (
    <svg
      width="108"
      height="105"
      viewBox="0 0 108 105"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-[148px] sm:w-[176px]"
      aria-hidden="true"
    >
      <path
        d="M19.6364 0H32.7273V52.3636H26.1818V39.2727H0V19.6364H6.54545V32.7273H26.1818V6.54546H19.6364V0ZM13.0909 6.54546H19.6364V13.0909H13.0909V6.54546ZM6.54545 13.0909H13.0909V19.6364H6.54545V13.0909Z"
        fill="currentColor"
        className="text-foreground/48 dark:text-foreground/42"
      />
      <path
        d="M94.9005 0H107.991V52.3636H101.446V39.2727H75.2642V19.6364H81.8096V32.7273H101.446V6.54546H94.9005V0ZM88.3551 6.54546H94.9005V13.0909H88.3551V6.54546ZM81.8096 13.0909H88.3551V19.6364H81.8096V13.0909Z"
        fill="currentColor"
        className="text-foreground/48 dark:text-foreground/42"
      />
      <path
        d="M42.5369 58.9091H49.0823V78.5455H55.6278V85.0909H49.0823V98.1818H42.5369V58.9091ZM49.0823 98.1818H68.7187V104.727H49.0823V98.1818ZM49.0823 52.3636H68.7187V58.9091H49.0823V52.3636ZM68.7187 58.9091H75.2641V98.1818H68.7187V72H62.1732V65.4545H68.7187V58.9091ZM55.6278 72H62.1732V78.5455H55.6278V72Z"
        fill="currentColor"
        className="text-destructive/72 dark:text-destructive/62"
      />
    </svg>
  );
}

export default function AppNotFound() {
  return (
    <section className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <div className="relative flex w-full max-w-xl flex-col items-center px-6 py-10 text-center">
        <div className="relative">
          <NotFoundMark />
        </div>

        <div className="relative mt-10 space-y-2">
          <h1 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This route doesn&apos;t exist in your Tenurio workspace.
          </p>
        </div>

        <div className="relative mt-7 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/dashboard" className={primaryActionClassName}>
            Back to dashboard
          </Link>
          <Link href="/contractors" className={secondaryActionClassName}>
            Open contractors
          </Link>
        </div>
      </div>
    </section>
  );
}

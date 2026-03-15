import { Logo } from '@/components/logo';
import { Card, CardContent } from '@/components/ui/card';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden rounded-xl border bg-card p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-8">
            <div className="space-y-4">
              <Logo priority />
              <h1 className="max-w-lg text-2xl font-semibold tracking-tight text-foreground">
                Contractor lifecycle control with less chaos.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Centralize sponsor requests, access remediation, and contract risk in one calm, auditable workspace.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { stat: '24h', label: 'faster remediation workflows' },
                { stat: '100%', label: 'role-aware approval trails' },
                { stat: '1 view', label: 'for contracts, access, and events' },
                { stat: 'Fewer gaps', label: 'between expiry and revocation' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-background p-5">
                  <p className="text-3xl font-semibold tracking-tight text-foreground">{item.stat}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
            Built for admin, security, and sponsor teams that need cleaner handoffs and fewer access blind spots.
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b border-border/60 px-8 py-8">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Secure workspace</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
              <p className="mt-3 max-w-lg text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="px-8 py-8">{children}</div>
            {footer ? <div className="border-t border-border/60 px-8 py-6 text-sm text-muted-foreground">{footer}</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

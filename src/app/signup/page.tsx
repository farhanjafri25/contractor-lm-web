'use client';

import Image from 'next/image';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { AuthPageLayout, AuthWelcomeAside } from '@/components/auth-page-layout';
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  ChevronBottom,
  Eye,
  EyeOff,
  FileText,
  Group2,
  Plus,
  Search,
  Settings,
  Users,
} from '@/components/icons';
import { FieldBlock } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { authApi, tenantApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type SignupStep = 'account' | 'verify' | 'workspace' | 'approval';

const LOGO_SIZE_LIMIT = 10 * 1024 * 1024;
const BILLING_COUNTRIES = [
  { label: 'United States of America', value: 'United States of America' },
  { label: 'United Arab Emirates', value: 'United Arab Emirates' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'Canada', value: 'Canada' },
  { label: 'Germany', value: 'Germany' },
  { label: 'India', value: 'India' },
];

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getErrorMessage(err: unknown, fallback: string) {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return typeof message === 'string' ? message : fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function deriveWorkspaceName(email: string) {
  const domain = email.split('@')[1] ?? '';
  const company = domain.split('.')[0] ?? '';

  if (!company) {
    return '';
  }

  return company
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return parts || 'TW';
}

function PreviewBar({ className }: { className?: string }) {
  return <div className={cn('h-2 rounded-full bg-muted', className)} />;
}

function WorkspacePreview({ workspaceName }: { workspaceName: string }) {
  const title = workspaceName.trim() || 'Workspace title';
  const initials = getInitials(title);

  const navigationItems = [
    { icon: Activity, width: 'w-[72px]' },
    { icon: Users, width: 'w-14' },
    { icon: FileText, width: 'w-16' },
    { icon: Settings, width: 'w-20' },
    { icon: Group2, width: 'w-24' },
  ];

  return (
    <div className="h-full w-full overflow-hidden rounded-l-[20px] rounded-r-none border border-border/70 bg-background shadow-sm">
      <div className="grid min-h-[560px] grid-cols-[minmax(0,1fr)_190px]">
        <div className="border-r border-border/60">
          <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">Overview</p>
              </div>
            </div>
            <ChevronBottom size={16} className="shrink-0 text-muted-foreground" />
          </div>

          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex h-9 items-center gap-3 rounded-lg border border-input bg-background px-3">
              <Search size={16} className="text-muted-foreground" />
              <PreviewBar className="w-24" />
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="space-y-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.width} className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-3">
                    <Icon size={15} className="text-muted-foreground" />
                    <PreviewBar className={item.width} />
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-background text-muted-foreground">
                    <Plus size={12} />
                  </div>
                  <PreviewBar className="w-20" />
                </div>
                <ChevronBottom size={14} className="text-muted-foreground" />
              </div>

              <div className="mt-4 space-y-3">
                <PreviewBar className="w-28" />
                <PreviewBar className="w-20" />
                <PreviewBar className="w-24" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/20">
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-background text-muted-foreground">
              <Group2 size={14} />
            </div>
            <PreviewBar className="w-24" />
          </div>

          <div className="divide-y divide-border/60">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[18px_18px_minmax(0,1fr)] items-center gap-3 px-4 py-3">
                <div className="size-[18px] rounded-[6px] border border-border/70 bg-background" />
                <div className="size-[18px] rounded-full bg-muted" />
                <PreviewBar className={cn(index % 2 === 0 ? 'w-20' : 'w-16')} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>('account');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceHandle, setWorkspaceHandle] = useState('');
  const [workspaceHandleEdited, setWorkspaceHandleEdited] = useState(false);
  const [billingCountry, setBillingCountry] = useState(BILLING_COUNTRIES[0]?.value ?? 'United States of America');
  const [heardAboutUs, setHeardAboutUs] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState('');
  const [logoError, setLogoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isWorkspaceStep = step === 'workspace';

  const seedWorkspaceDetails = (seedEmail: string) => {
    const derivedName = deriveWorkspaceName(seedEmail);

    setWorkspaceName((current) => current || derivedName);
    setWorkspaceHandle((current) => current || slugify(derivedName));
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.signup(email.trim(), name.trim(), password);
      setStep('verify');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Sign-up failed. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.verifyOtp(email.trim(), otp.trim());

      if (response.data.status === 'pending_approval') {
        setSuccessMessage(response.data.message);
        setTenantName(response.data.tenant_name);
        setStep('approval');
        return;
      }

      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      let tenantId = response.data.user?.tenant_id;
      if (!tenantId && response.data.access_token) {
        const decoded = parseJwt(response.data.access_token);
        if (decoded?.tenant_id) {
          tenantId = decoded.tenant_id;
        }
      }

      if (tenantId) {
        localStorage.setItem('tenant_id', tenantId);
      }

      seedWorkspaceDetails(email);
      setStep('workspace');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Code did not match. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceNameChange = (value: string) => {
    setWorkspaceName(value);

    if (!workspaceHandleEdited) {
      setWorkspaceHandle(slugify(value));
    }
  };

  const handleWorkspaceHandleChange = (value: string) => {
    setWorkspaceHandleEdited(true);
    setWorkspaceHandle(slugify(value));
  };

  const clearLogo = () => {
    setLogoPreview(null);
    setLogoFileName('');
    setLogoError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLogoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validType = file.type === 'image/png' || file.type === 'image/jpeg' || /\.(png|jpe?g)$/i.test(file.name);

    if (!validType) {
      setLogoError('Upload a PNG or JPG image.');
      event.target.value = '';
      return;
    }

    if (file.size > LOGO_SIZE_LIMIT) {
      setLogoError('Images must be 10MB or smaller.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(typeof reader.result === 'string' ? reader.result : null);
      setLogoFileName(file.name);
      setLogoError('');
    };
    reader.readAsDataURL(file);
  };

  const handleWorkspaceSetup = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!workspaceName.trim()) {
      setError('Enter your company name to continue.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await tenantApi.updateProfile({ tenant_name: workspaceName.trim() });
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'We couldn’t save your workspace details. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      aside={isWorkspaceStep ? <WorkspacePreview workspaceName={workspaceName} /> : <AuthWelcomeAside />}
      gridClassName={isWorkspaceStep ? 'pr-0 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:gap-20 lg:pr-0' : undefined}
      contentClassName={isWorkspaceStep ? 'max-w-[430px]' : undefined}
      asideClassName={isWorkspaceStep ? 'w-full max-w-none' : undefined}
    >
      {step === 'account' ? (
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create an account</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Use your work email to create an account and get your workspace set up.
          </p>
        </div>
      ) : null}

      {step === 'verify' ? (
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h1>
          <p className="text-sm leading-6 text-muted-foreground">Enter the 6-digit code we sent to {email}.</p>
        </div>
      ) : null}

      {step === 'workspace' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('verify');
              }}
              className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Back to verification"
            >
              <ArrowLeft size={14} />
            </button>
            <span>2 / 2</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your workspace</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Add a few details so your team lands in the right place from day one.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {step === 'account' ? (
        <form className="space-y-5" onSubmit={handleSignup}>
          <FieldBlock label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jane Doe" required />
          </FieldBlock>

          <FieldBlock label="Work email" description="Your email domain decides whether you create or join a workspace.">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="jane@company.com"
              required
            />
          </FieldBlock>

          <FieldBlock label="Password">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                className="pr-12"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </FieldBlock>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : null}

      {step === 'verify' ? (
        <form className="space-y-5" onSubmit={handleVerifyOtp}>
          <FieldBlock label="Code" description="Use the 6-digit code from your inbox.">
            <InputOTP
              value={otp}
              onChange={(value) => setOtp(value)}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              required
            >
              <InputOTPGroup className="gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </FieldBlock>

          <div className="space-y-3">
            <Button type="submit" className="w-full" size="lg" disabled={loading || otp.length !== 6}>
              {loading ? 'Checking…' : 'Verify code'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setError('');
                setStep('account');
              }}
            >
              Back
            </Button>
          </div>
        </form>
      ) : null}

      {step === 'workspace' ? (
        <form className="space-y-5" onSubmit={handleWorkspaceSetup}>
          <FieldBlock label="Company logo">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="hidden"
              onChange={handleLogoSelection}
            />

            <div className="flex items-start gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4">
              <div className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-base font-semibold text-foreground">
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Company logo preview"
                    fill
                    unoptimized
                    sizes="72px"
                    className="object-cover"
                  />
                ) : (
                  getInitials(workspaceName || 'Tenurio')
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    {logoPreview ? 'Replace image' : 'Upload image'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={clearLogo} disabled={!logoPreview}>
                    Remove
                  </Button>
                </div>

                <p className="text-xs leading-5 text-muted-foreground">PNG or JPG up to 10MB. Preview only for now.</p>

                {logoFileName ? <p className="truncate text-xs text-foreground">{logoFileName}</p> : null}
                {logoError ? <p className="text-xs text-destructive">{logoError}</p> : null}
              </div>
            </div>
          </FieldBlock>

          <FieldBlock label="Company name">
            <Input
              value={workspaceName}
              onChange={(event) => handleWorkspaceNameChange(event.target.value)}
              placeholder="Enter your company name"
              required
            />
          </FieldBlock>

          <FieldBlock label="Workspace handle" description="A friendly internal handle for your workspace.">
            <Input
              value={workspaceHandle}
              onChange={(event) => handleWorkspaceHandleChange(event.target.value)}
              placeholder="your-workspace"
            />
          </FieldBlock>

          <FieldBlock label="Country">
            <Select value={billingCountry} onValueChange={setBillingCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {BILLING_COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>

          <FieldBlock label="How did you hear about us?">
            <Textarea
              value={heardAboutUs}
              onChange={(event) => setHeardAboutUs(event.target.value)}
              placeholder="Share how you heard about Tenurio..."
              className="min-h-20"
            />
          </FieldBlock>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      ) : null}

      {step === 'approval' ? (
        <div className="space-y-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Approval needed</h3>
            <p className="text-sm leading-6 text-muted-foreground">{successMessage}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/40 px-5 py-4">
            <p className="text-xs font-medium text-muted-foreground">Workspace</p>
            <p className="mt-2 text-base font-semibold text-foreground">{tenantName}</p>
          </div>
          <Link href="/login" className="block">
            <Button className="w-full" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      ) : null}

      {step !== 'workspace' ? (
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-foreground transition-colors hover:text-primary/70">
            Sign in
          </Link>
        </p>
      ) : null}
    </AuthPageLayout>
  );
}

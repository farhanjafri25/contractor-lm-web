'use client';

import Image from 'next/image';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AuthPageLayout, AuthWelcomeAside } from '@/components/auth-page-layout';
import {
  CheckCircle,
  ChevronGrabberVertical,
  Eye,
  EyeOff,
  HomeCircle,
  Users,
  ShieldCheck,
  History,
  SettingsGear1,
  User,
  Group2,
  Connectors,
} from '@/components/icons';
import { Logo } from '@/components/logo';
import { FieldBlock } from '@/components/app-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { authApi, tenantApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { prepareImageForUpload } from '@/lib/image-upload';
import { cn } from '@/lib/utils';

type SignupStep = 'account' | 'verify' | 'profile' | 'workspace' | 'tracking' | 'volume' | 'directory' | 'success' | 'approval';

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

const SIDEBAR_NAV = [
  { label: 'Dashboard', icon: HomeCircle, active: true },
  { label: 'Contractors', icon: Users },
  { label: 'Access', icon: ShieldCheck },
  { label: 'Activity', icon: History },
  { label: 'Integrations', icon: Connectors },
];

const SIDEBAR_SETTINGS_NAV = [
  { label: 'Profile', icon: User },
  { label: 'Organization', icon: SettingsGear1 },
  { label: 'Team', icon: Group2 },
];

function AppPreview({
  workspaceName,
  logoPreview,
  avatarPreview,
  displayName,
}: {
  workspaceName: string;
  logoPreview: string | null;
  avatarPreview: string | null;
  displayName: string;
}) {
  return (
    <div className="flex h-160 w-full overflow-hidden rounded-2xl border border-border/60 bg-sidebar text-sidebar-foreground">
      {/* Sidebar */}
      <div className="flex w-56 shrink-0 flex-col border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex h-14 items-center px-4">
          <div className="flex items-center gap-2">
            <Logo priority />
            <Badge
              variant="secondary"
              className="min-h-0 border-sidebar-border bg-sidebar-accent px-1 py-px text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/75"
            >
              Beta
            </Badge>
          </div>
        </div>

        {/* Org switcher */}
        <div className="px-2 pt-2 pb-4">
          <div className="flex h-9 w-full items-center gap-2 rounded-lg border bg-background px-2 [border-color:var(--card-surface-stroke)] [box-shadow:var(--shadow-card-surface)]">
            <div className="relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-primary text-[8px] font-bold text-primary-foreground">
              {logoPreview ? (
                <Image src={logoPreview} alt="Logo" fill unoptimized sizes="20px" className="object-cover" />
              ) : (
                getInitials(workspaceName || 'T')
              )}
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5">{workspaceName || 'Your Workspace'}</span>
            </span>
            <ChevronGrabberVertical size={16} className="shrink-0 text-muted-foreground" />
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto">
          <nav className="grid gap-6 px-2">
            <div className="space-y-1">
              {SIDEBAR_NAV.map(({ label, icon: Icon, active }) => (
                <div
                  key={label}
                  className={cn(
                    'flex h-8 items-center gap-2 rounded-md px-2',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70',
                  )}
                >
                  <span className="flex size-[18px] shrink-0 items-center justify-center">
                    <Icon size={18} />
                  </span>
                  <div className={cn('h-3 rounded-sm', active ? 'w-20 bg-sidebar-primary-foreground/15' : 'w-16 bg-sidebar-foreground/6')} />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="px-2 pb-1">
                <div className="h-3 w-14 rounded-sm bg-sidebar-foreground/6" />
              </div>
              {SIDEBAR_SETTINGS_NAV.map(({ icon: Icon }, i) => (
                <div
                  key={i}
                  className="flex h-8 items-center gap-2 rounded-md px-2 text-sidebar-foreground/70"
                >
                  <span className="flex size-[18px] shrink-0 items-center justify-center">
                    <Icon size={18} />
                  </span>
                  <div className={cn('h-3 rounded-sm bg-sidebar-foreground/6', i === 0 ? 'w-12' : i === 1 ? 'w-20' : 'w-10')} />
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* Profile */}
        <div className="px-2 pb-4">
          <div className="py-3">
            <Separator className="bg-sidebar-border" />
          </div>
          <div className="flex h-9 w-full items-center gap-2 rounded-lg px-2">
            <div className="relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[8px] font-semibold text-primary/80">
              {avatarPreview ? (
                <Image src={avatarPreview} alt="Avatar" fill unoptimized sizes="20px" className="object-cover" />
              ) : (
                getInitials(displayName || 'U')
              )}
            </div>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5">{displayName || 'Your Name'}</span>
            </span>
            <ChevronGrabberVertical size={16} className="shrink-0 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Main content — dashboard skeleton */}
      <div className="min-w-0 flex-1 overflow-hidden bg-background p-4">
        <div className="space-y-4">
          {/* Header skeleton: workspace name + greeting */}
          <div className="space-y-1.5">
            <div className="h-2.5 w-16 rounded-full bg-muted/40" />
            <div className="h-5 w-36 rounded-full bg-muted/40" />
          </div>

          {/* KPI cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border/40 bg-card p-3">
                <div className="size-3.5 rounded bg-muted/30" />
                <div className={cn('h-2.5 rounded-full bg-muted/30', i % 2 === 0 ? 'w-16' : 'w-12')} />
                <div className="h-5 w-8 rounded bg-muted/25" />
              </div>
            ))}
          </div>

          {/* Bottom panel — expiring soon */}
          <div className="rounded-lg border border-border/40 bg-card">
            <div className="border-b border-border/40 px-3.5 py-3 space-y-1">
              <div className="h-3.5 w-20 rounded-full bg-muted/30" />
              <div className="h-2 w-32 rounded-full bg-muted/20" />
            </div>
            <div className="px-3.5 py-3 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-5 rounded-full bg-muted/20" />
                    <div className="space-y-1">
                      <div className={cn('h-2.5 rounded-full bg-muted/25', i % 2 === 0 ? 'w-20' : 'w-16')} />
                      <div className="h-2 w-10 rounded-full bg-muted/15" />
                    </div>
                  </div>
                  <div className="h-2.5 w-12 rounded-full bg-muted/20" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom panel — activity */}
          <div className="rounded-lg border border-border/40 bg-card">
            <div className="border-b border-border/40 px-3.5 py-3 space-y-1">
              <div className="h-3.5 w-14 rounded-full bg-muted/30" />
              <div className="h-2 w-28 rounded-full bg-muted/20" />
            </div>
            <div className="px-3.5 py-3 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="relative flex flex-col items-center">
                    <div className="size-1.5 rounded-full bg-muted/30" />
                    {i < 2 && <div className="mt-0.5 h-6 w-px bg-border/40" />}
                  </div>
                  <div className="space-y-1 pt-px">
                    <div className={cn('h-2.5 rounded-full bg-muted/25', i % 2 === 0 ? 'w-24' : 'w-20')} />
                    <div className="h-2 w-12 rounded-full bg-muted/15" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({ value, label }: { value: string; label: string }) {
  return (
    <label
      className={cn(
        "flex w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all hover:bg-muted/50",
        "has-data-checked:border-primary has-data-checked:bg-primary/5 has-data-checked:ring-1 has-data-checked:ring-primary",
      )}
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <RadioGroupItem value={value} />
    </label>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>('account');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1/5 Profile specific
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // 2/5 Workspace specific
  const [tenantName, setTenantName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceHandle, setWorkspaceHandle] = useState('');
  const [workspaceHandleEdited, setWorkspaceHandleEdited] = useState(false);
  const [billingCountry, setBillingCountry] = useState(BILLING_COUNTRIES[0]?.value ?? 'United States of America');
  const [companySize, setCompanySize] = useState('11-50');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Surveys 3/5, 4/5, 5/5
  const [trackingMethod, setTrackingMethod] = useState('');
  const [contractorVolume, setContractorVolume] = useState('');
  const [directoryProvider, setDirectoryProvider] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // The step arrays control mapping to visual layouts (Workspace preview vs Welcome side)
  const isWorkspaceStep = ['workspace', 'tracking', 'volume', 'directory'].includes(step);
  const isProfileStep = step === 'profile';

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
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await authApi.signup(email.trim(), fullName, password);
      setStep('verify');
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Sign-up failed. Try again.');
      setError(message);
      toast.error(message);
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

      localStorage.setItem('access_token', response.data.access_token || '');
      localStorage.setItem('refresh_token', response.data.refresh_token || '');
      localStorage.setItem('user', JSON.stringify(response.data.user || {}));

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

      if (response.data.status === 'pending_approval') {
        setSuccessMessage(response.data.message);
        setTenantName(response.data.tenant_name);
        setStep('approval');
      } else {
        seedWorkspaceDetails(email);
        setStep('profile');
      }
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Code did not match. Try again.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await tenantApi.updateUserProfile({
         name: `${firstName.trim()} ${lastName.trim()}`.trim(),
         marketing_opt_in: marketingOptIn,
         avatar: avatarPreview ?? undefined, // Only pass if set
      });

      const userStr = localStorage.getItem('user');
      const isPending = userStr ? JSON.parse(userStr).status === 'pending_approval' : false;

      if (isPending) {
        setStep('approval');
      } else {
        setStep('workspace');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save profile.'));
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceName.trim()) {
      setError('Enter your organization name to continue.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await tenantApi.updateProfile({
        name: workspaceName.trim(),
        slug: slugify(workspaceHandle),
        billing_country: billingCountry,
        company_size: companySize,
        logo: logoPreview ?? undefined,
      });
      setStep('tracking');
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "We couldn't save your workspace details. Try again.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyStep = async (nextStep: SignupStep, payload: Record<string, string>) => {
    setError('');
    setLoading(true);
    try {
      await tenantApi.updateProfile(payload);
      setStep(nextStep);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save selection.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const preparedImage = await prepareImageForUpload(file, {
        label: 'Image',
        maxSourceBytes: LOGO_SIZE_LIMIT,
      });
      setPreview(preparedImage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to read image.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <AuthPageLayout
      hideHeader={isWorkspaceStep || isProfileStep}
      aside={isWorkspaceStep || isProfileStep ? <AppPreview workspaceName={workspaceName} logoPreview={logoPreview} avatarPreview={avatarPreview} displayName={`${firstName} ${lastName}`.trim()} /> : <AuthWelcomeAside />}
      gridClassName={(isWorkspaceStep || isProfileStep) ? 'pr-0 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:gap-20 lg:pr-0' : undefined}
      contentClassName={(isWorkspaceStep || isProfileStep) ? 'max-w-[430px] my-auto' : undefined}
      asideClassName={(isWorkspaceStep || isProfileStep) ? 'w-full max-w-none max-h-screen my-auto py-10 px-8' : undefined}
    >
      {error ? (
        <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {step === 'account' ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Create an account</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Use your work email to create an account
              <br />
              and get your workspace set up.
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleSignup}>
            <div className="grid grid-cols-2 gap-4">
              <FieldBlock label="First name">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" required />
              </FieldBlock>
              <FieldBlock label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" required />
              </FieldBlock>
            </div>

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
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FieldBlock>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Sending…' : 'Send code'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-foreground transition-colors hover:text-primary/70">
              Sign in
            </Link>
          </p>
        </div>
      ) : null}

      {step === 'verify' ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Check your email</h1>
            <p className="text-sm leading-6 text-muted-foreground">Enter the 6-digit code we sent to {email}.</p>
          </div>
          <form className="space-y-5" onSubmit={handleVerifyOtp}>
            <FieldBlock label="Code">
              <InputOTP value={otp} onChange={(value) => setOtp(value)} maxLength={6} pattern={REGEXP_ONLY_DIGITS} required>
                <InputOTPGroup className="gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </FieldBlock>
            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" size="lg" onClick={() => { setError(''); setStep('account'); }}>
                Back
              </Button>
              <Button type="submit" size="lg" disabled={loading || otp.length !== 6}>
                {loading ? 'Checking…' : 'Verify code'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {step === 'profile' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-3">Step 1 of 5</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Let&apos;s get to know you</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Add your profile details so your team can recognize you.
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleProfileSetup}>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelection(e, setAvatarPreview)} />
            
            <div className="flex items-center gap-5">
              <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-semibold text-primary/80">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar preview" fill unoptimized sizes="64px" className="object-cover" />
                ) : (
                  getInitials(`${firstName} ${lastName}`)
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                    {avatarPreview ? 'Replace' : 'Upload image'}
                  </Button>
                  {avatarPreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarPreview(null)}>Remove</Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldBlock label="First name">
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </FieldBlock>
              <FieldBlock label="Last name">
                <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
              </FieldBlock>
            </div>

            <FieldBlock label="Email">
              <Input value={email} readOnly className="bg-muted text-muted-foreground" />
            </FieldBlock>

            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={marketingOptIn}
                onCheckedChange={(checked) => setMarketingOptIn(Boolean(checked))}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground">
                Subscribe to product update emails and Tenurio newsletters.
              </span>
            </label>

            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" size="lg" onClick={() => { setError(''); setStep('verify'); }}>
                Back
              </Button>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? 'Saving…' : 'Continue'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {step === 'workspace' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-3">Step 2 of 5</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Create your workspace</h1>
          </div>
          <form className="space-y-5" onSubmit={handleWorkspaceSetup}>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelection(e, setLogoPreview)} />
            <div className="flex items-center gap-5">
              <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-xl font-semibold text-primary/80">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Logo" fill unoptimized sizes="64px" className="object-cover" />
                ) : (
                  getInitials(workspaceName || 'T')
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                    {logoPreview ? 'Replace' : 'Upload image'}
                  </Button>
                  {logoPreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogoPreview(null)}>Remove</Button>
                  )}
                </div>
              </div>
            </div>

            <FieldBlock label="Organization name">
              <Input value={workspaceName} onChange={e => { setWorkspaceName(e.target.value); if(!workspaceHandleEdited) setWorkspaceHandle(slugify(e.target.value)); }} placeholder="Enter organization name" required />
            </FieldBlock>

            <FieldBlock label="Workspace handle">
              <div className="flex rounded-md border border-input focus-within:ring-1 focus-within:ring-ring">
                <span className="flex items-center px-3 text-sm text-muted-foreground bg-muted/40 border-r border-input rounded-l-md select-none">
                  tenurio.com/
                </span>
                <Input 
                   value={workspaceHandle} 
                   onChange={e => { setWorkspaceHandleEdited(true); setWorkspaceHandle(slugify(e.target.value)); }} 
                   placeholder="your-workspace" 
                   className="border-0 focus-visible:ring-0 rounded-l-none"
                   required
                />
              </div>
            </FieldBlock>

            <div className="grid grid-cols-2 gap-4">
              <FieldBlock label="Billing country">
                <Select value={billingCountry} onValueChange={(val: string | null) => setBillingCountry(val ?? 'United States of America')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {BILLING_COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldBlock>
              <FieldBlock label="Company size">
                <Select value={companySize} onValueChange={(val: string | null) => setCompanySize(val ?? '11-50')}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-10">0 - 10</SelectItem>
                    <SelectItem value="11-50">11 - 50</SelectItem>
                    <SelectItem value="51-200">51 - 200</SelectItem>
                    <SelectItem value="201-1000">201 - 1000</SelectItem>
                    <SelectItem value="1000+">1000+</SelectItem>
                  </SelectContent>
                </Select>
              </FieldBlock>
            </div>

            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" size="lg" onClick={() => { setError(''); setStep('profile'); }}>
                Back
              </Button>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? 'Saving…' : 'Continue'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {step === 'tracking' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-3">Step 3 of 5</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">How do you currently track contractor access?</h1>
          </div>
          <RadioGroup value={trackingMethod} onValueChange={setTrackingMethod} className="gap-3">
            {['Spreadsheet (Google Sheets / Excel)', 'HR system', 'Identity provider (Okta, Entra ID, etc)', 'No structured process'].map((opt) => (
              <ChoiceCard key={opt} value={opt} label={opt} />
            ))}
          </RadioGroup>
          <div className="flex justify-between gap-3">
            <Button variant="outline" size="lg" onClick={() => { setError(''); setStep('workspace'); }}>
              Back
            </Button>
            <Button
              size="lg" disabled={!trackingMethod || loading}
              onClick={() => handleSurveyStep('volume', { tracking_method: trackingMethod })}
            >
              {loading ? '...' : 'Continue'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'volume' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-3">Step 4 of 5</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">How many contractors does your team manage?</h1>
          </div>
          <RadioGroup value={contractorVolume} onValueChange={setContractorVolume} className="gap-3">
            {['Less than 10', '10 - 50', '50 - 200', '200 - 500', '500+'].map((opt) => (
              <ChoiceCard key={opt} value={opt} label={opt} />
            ))}
          </RadioGroup>
          <div className="flex justify-between gap-3">
            <Button variant="outline" size="lg" onClick={() => { setError(''); setStep('tracking'); }}>
              Back
            </Button>
            <Button
              size="lg" disabled={!contractorVolume || loading}
              onClick={() => handleSurveyStep('directory', { contractor_volume: contractorVolume })}
            >
              {loading ? '...' : 'Continue'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'directory' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-3">Step 5 of 5</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Which directory does your company use?</h1>
          </div>
          <RadioGroup value={directoryProvider} onValueChange={setDirectoryProvider} className="gap-3">
            {['Google Workspace', 'Microsoft Entra (Azure AD)', 'Okta', 'Not sure'].map((opt) => (
              <ChoiceCard key={opt} value={opt} label={opt} />
            ))}
          </RadioGroup>
          <div className="flex justify-between gap-3">
            <Button variant="outline" size="lg" onClick={() => { setError(''); setStep('volume'); }}>
              Back
            </Button>
            <Button
              size="lg" disabled={!directoryProvider || loading}
              onClick={() => handleSurveyStep('success', { directory_provider: directoryProvider })}
            >
              {loading ? '...' : 'Go to dashboard'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'success' ? (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="flex size-16 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground text-pretty">You&apos;re ready to start securing contractor access</h3>
            <p className="text-sm leading-6 text-muted-foreground">
               Track identities, assign sponsors, prevent orphan accounts, and get clear visibility across your workforce.
            </p>
          </div>
          <Link href="/dashboard" className="block mt-6">
            <Button className="w-full" size="lg">Go to Dashboard</Button>
          </Link>
        </div>
      ) : null}

      {step === 'approval' ? (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="flex size-16 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary">
             <CheckCircle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Approval needed</h3>
            <p className="text-sm leading-6 text-muted-foreground">{successMessage}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/40 px-5 py-4 mt-6">
            <p className="text-xs font-medium text-muted-foreground">Workspace</p>
            <p className="mt-2 text-base font-semibold text-foreground">{tenantName}</p>
          </div>
          <Link href="/login" className="block mt-6">
            <Button className="w-full" size="lg">Return to Login</Button>
          </Link>
        </div>
      ) : null}
    </AuthPageLayout>
  );
}

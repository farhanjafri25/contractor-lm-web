'use client';

import Image from 'next/image';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AuthPageLayout, AuthWelcomeAside } from '@/components/auth-page-layout';
import {
  CheckCircle,
  Eye,
  EyeOff,
} from '@/components/icons';
import { FieldBlock } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authApi, tenantApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
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

function WorkspacePreview({ workspaceName }: { workspaceName: string }) {
  return (
    <div className="flex h-full min-h-[400px] w-full flex-col bg-muted/30 lg:rounded-2xl lg:border lg:border-border/60">
      <div className="px-6 py-6 border-b border-border/60 flex items-center gap-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {getInitials(workspaceName || 'Tenurio Workspace')}
        </div>
        <p className="text-sm font-semibold truncate capitalize max-w-[200px]">{workspaceName || 'Your Workspace'}</p>
      </div>
      <div className="flex flex-1">
        <div className="w-16 sm:w-56 shrink-0 border-r border-border/60 bg-muted/10 p-3 hidden sm:block">
          <div className="space-y-1">
            <div className="h-8 rounded-md bg-muted/60" />
            <div className="h-8 rounded-md bg-transparent" />
            <div className="h-8 rounded-md bg-transparent" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <div className="h-6 w-32 rounded-md bg-muted/50" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
             <div className="h-24 rounded-xl border border-border/50 bg-background" />
             <div className="h-24 rounded-xl border border-border/50 bg-background" />
             <div className="h-24 rounded-xl border border-border/50 bg-background hidden lg:block" />
          </div>
          <div className="h-48 rounded-xl border border-border/50 bg-background" />
        </div>
      </div>
    </div>
  );
}

function RadioOption({ 
  label, 
  selected, 
  onClick 
}: { 
  label: string; 
  selected: boolean; 
  onClick: () => void 
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all hover:bg-muted/50",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background"
      )}
    >
      <span className={cn("text-sm font-medium", selected ? "text-primary" : "text-foreground")}>{label}</span>
      <div className={cn(
        "flex size-5 items-center justify-center rounded-full border",
        selected ? "border-primary bg-primary" : "border-muted-foreground/30"
      )}>
        {selected && <div className="size-2 rounded-full bg-background" />}
      </div>
    </button>
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
      const message = getApiErrorMessage(err, 'We couldn’t save your workspace details. Try again.');
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

  const handleFileSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > LOGO_SIZE_LIMIT) {
      toast.error('Image must be 10MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AuthPageLayout
      aside={isWorkspaceStep || isProfileStep ? <WorkspacePreview workspaceName={workspaceName} /> : <AuthWelcomeAside />}
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
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create an account</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Use your work email to create an account and get your workspace set up.
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
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h1>
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
            <div className="space-y-3">
              <Button type="submit" className="w-full" size="lg" disabled={loading || otp.length !== 6}>
                {loading ? 'Checking…' : 'Verify code'}
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => { setError(''); setStep('account'); }}>
                Back
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {step === 'profile' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">1 / 5</span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Let&apos;s get to know you</h1>
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

            <label className="flex items-start gap-3 cursor-pointer">
              <div className="flex h-5 items-center">
                <input 
                  type="checkbox" 
                  checked={marketingOptIn} 
                  onChange={(e) => setMarketingOptIn(e.target.checked)} 
                  className="size-4 rounded-sm border-border accent-primary bg-background text-primary"
                />
              </div>
              <span className="text-sm text-foreground">
                Subscribe to product update emails and Tenurio newsletters.
              </span>
            </label>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        </div>
      ) : null}

      {step === 'workspace' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">2 / 5</span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your workspace</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Add a few details so your team lands in the right place from day one.
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleWorkspaceSetup}>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelection(e, setLogoPreview)} />
            <div className="flex items-start gap-4 rounded-xl border border-border/70 bg-secondary/20 p-4">
              <div className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-base font-semibold text-foreground">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Logo" fill unoptimized sizes="72px" className="object-cover" />
                ) : (
                  getInitials(workspaceName || 'T')
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>Upload image</Button>
                  {logoPreview && <Button type="button" variant="secondary" size="sm" onClick={() => setLogoPreview(null)}>Remove</Button>}
                </div>
                <p className="text-xs text-muted-foreground">PNG or JPG up to 10MB.</p>
              </div>
            </div>

            <FieldBlock label="Organization name">
              <Input value={workspaceName} onChange={e => { setWorkspaceName(e.target.value); if(!workspaceHandleEdited) setWorkspaceHandle(slugify(e.target.value)); }} placeholder="Enter organization name" required />
            </FieldBlock>

            <FieldBlock label="Workspace handle">
              <div className="flex rounded-md border border-input focus-within:ring-1 focus-within:ring-ring">
                <span className="flex items-center px-3 text-sm text-muted-foreground bg-muted/40 border-r border-input rounded-l-md font-mono select-none">
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

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        </div>
      ) : null}

      {step === 'tracking' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">3 / 5</span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">How do you currently track contractor access?</h1>
          </div>
          <div className="space-y-3 mt-8">
            {['Spreadsheet (Google Sheets / Excel)', 'HR system', 'Identity provider (Okta, Entra ID, etc)', 'No structured process'].map((opt) => (
              <RadioOption key={opt} label={opt} selected={trackingMethod === opt} onClick={() => setTrackingMethod(opt)} />
            ))}
          </div>
          <Button 
            className="w-full mt-8" size="lg" disabled={!trackingMethod || loading} 
            onClick={() => handleSurveyStep('volume', { tracking_method: trackingMethod })}
          >
            {loading ? '...' : 'Continue'}
          </Button>
        </div>
      ) : null}

      {step === 'volume' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">4 / 5</span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">How many contractors does your team manage?</h1>
          </div>
          <div className="space-y-3 mt-8">
            {['Less than 10', '10 - 50', '50 - 200', '200 - 500', '500+'].map((opt) => (
              <RadioOption key={opt} label={opt} selected={contractorVolume === opt} onClick={() => setContractorVolume(opt)} />
            ))}
          </div>
          <Button 
            className="w-full mt-8" size="lg" disabled={!contractorVolume || loading} 
            onClick={() => handleSurveyStep('directory', { contractor_volume: contractorVolume })}
          >
            {loading ? '...' : 'Continue'}
          </Button>
        </div>
      ) : null}

      {step === 'directory' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="space-y-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">5 / 5</span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Which directory does your company use?</h1>
          </div>
          <div className="space-y-3 mt-8">
            {['Google Workspace', 'Microsoft Entra (Azure AD)', 'Okta', 'Not sure'].map((opt) => (
              <RadioOption key={opt} label={opt} selected={directoryProvider === opt} onClick={() => setDirectoryProvider(opt)} />
            ))}
          </div>
          <Button 
            className="w-full mt-8" size="lg" disabled={!directoryProvider || loading} 
            onClick={() => handleSurveyStep('success', { directory_provider: directoryProvider })}
          >
            {loading ? '...' : 'Go to dashboard'}
          </Button>
        </div>
      ) : null}

      {step === 'success' ? (
        <div className="space-y-8 animate-in zoom-in-95 duration-700 text-center flex flex-col items-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <CheckCircle size={40} />
          </div>
          <div className="space-y-3 max-w-sm">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">You&apos;re ready to start securing contractor access</h1>
            <p className="text-sm leading-6 text-muted-foreground">
               Track identities, assign sponsors, prevent orphan accounts, and get clear visibility across your workforce.
            </p>
          </div>
          <div className="pt-4 w-full">
            <a href="/dashboard" className="block w-full">
              <Button className="w-full" size="lg">Go to Dashboard</Button>
            </a>
          </div>
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
          <a href="/login" className="block mt-6">
            <Button className="w-full" size="lg">Return to Login</Button>
          </a>
        </div>
      ) : null}
    </AuthPageLayout>
  );
}

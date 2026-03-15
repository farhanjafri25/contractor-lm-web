'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, CheckCircle } from '@/components/icons';
import { AuthShell } from '@/components/auth-shell';
import { FieldBlock } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';

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

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.signup(email.trim(), name.trim(), password);
      setStep(2);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'Sign-up failed. Try again.');
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
        setStep(3);
      } else {
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

        window.location.href = '/dashboard';
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'Code did not match. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <p>
      Already have an account?{' '}
      <Link href="/login" className="font-semibold text-primary transition-colors hover:text-primary/80">
        Sign in
      </Link>
    </p>
  );

  return (
    <AuthShell
      title={step === 2 ? 'Check your email' : step === 3 ? 'Request sent' : 'Create workspace'}
      subtitle={
        step === 2
          ? `Enter the 6-digit code we sent to ${email}.`
          : step === 3
            ? 'Your admin needs to approve your access.'
            : 'Use your work email to create a workspace or join an existing one.'
      }
      footer={footer}
    >
      {error ? (
        <div className="mb-5 rounded-[24px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
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

      {step === 2 ? (
        <form className="space-y-5" onSubmit={handleVerifyOtp}>
          <FieldBlock label="Code" description="Use the 6-digit code from your inbox.">
            <Input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              maxLength={6}
              className="text-center text-lg tracking-[0.4em]"
              required
            />
          </FieldBlock>

          <div className="space-y-3">
            <Button type="submit" className="w-full" size="lg" disabled={loading || otp.length !== 6}>
              {loading ? 'Checking…' : 'Verify code'}
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Approval needed</h3>
            <p className="text-sm leading-6 text-muted-foreground">{successMessage}</p>
          </div>
          <div className="rounded-[28px] border border-border/70 bg-secondary/40 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
            <p className="mt-2 text-base font-semibold text-foreground">{tenantName}</p>
          </div>
          <Link href="/login" className="block">
            <Button className="w-full" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      ) : null}
    </AuthShell>
  );
}

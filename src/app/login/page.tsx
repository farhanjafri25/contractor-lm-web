'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FieldBlock } from '@/components/app-ui';
import { AuthPageLayout, AuthWelcomeAside } from '@/components/auth-page-layout';
import { Eye, EyeOff } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'Sign-in failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout aside={<AuthWelcomeAside />}>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">Sign in</h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <FieldBlock label="Work email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            required
          />
        </FieldBlock>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Password</p>
            <Link href="/forgot-password" className="text-sm font-normal text-muted-foreground transition-colors hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full shadow-sm" size="lg" disabled={loading}>
          {loading ? 'Signing in…' : 'Continue'}
        </Button>
      </form>

      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        By signing in, you agree to receive product updates and onboarding communication from Tenurio.{' '}
        <Link
          href="https://www.tenurio.com/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          Privacy Policy
        </Link>
      </p>

      <p className="text-sm text-muted-foreground">
        Need an account?{' '}
        <Link href="/signup" className="font-semibold text-foreground transition-colors hover:text-primary/70">
          Create an account
        </Link>
      </p>
    </AuthPageLayout>
  );
}

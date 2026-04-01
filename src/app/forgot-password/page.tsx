'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthPageLayout, AuthWelcomeAside } from '@/components/auth-page-layout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

import { SurfaceAlert } from '@/components/app-ui';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to send reset email. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthPageLayout aside={<AuthWelcomeAside />}>
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
            <p className="text-muted-foreground">
              We&apos;ve sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>
          
          <SurfaceAlert 
            tone="success"
            title="Email sent"
            description="If an account exists for this email, you will receive instructions shortly."
          />

          <div className="pt-4">
            <Link 
              href={`/reset-password?email=${encodeURIComponent(email)}`}
              className={cn(buttonVariants({ size: 'lg' }), "w-full shadow-sm")}
            >
              Enter reset code
            </Link>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t receive an email?{' '}
            <button 
              onClick={() => setSuccess(false)}
              className="font-medium text-foreground hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout aside={<AuthWelcomeAside />}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Forgot password?</h2>
        <p className="text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="sr-only">
            Work email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            required
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="w-full shadow-sm" size="lg" disabled={loading}>
          {loading ? 'Sending link…' : 'Send reset link'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthPageLayout>
  );
}

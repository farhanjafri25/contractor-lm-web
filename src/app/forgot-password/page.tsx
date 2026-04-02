'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthPageLayout } from '@/components/auth-page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage } from '@/lib/api-errors';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim();
      await forgotPassword(normalizedEmail);
      toast.success('Reset code sent to your email.');
      router.push(`/reset-password?email=${encodeURIComponent(normalizedEmail)}&codeSent=1`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to send reset email. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout
      cardClassName="mx-auto w-full max-w-xl"
      gridClassName="px-8 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14"
      contentClassName="mx-auto max-w-md"
    >
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Forgot password.</h1>
        <p className="text-pretty text-muted-foreground">
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
          {loading ? 'Sending code…' : 'Send reset code'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthPageLayout>
  );
}

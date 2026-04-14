'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FieldBlock, SurfaceAlert } from '@/components/app-ui';
import { AuthPageLayout } from '@/components/auth-page-layout';
import { Eye, EyeOff } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { authApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const { forgotPassword, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoRequestAttempted = useRef(false);

  const emailParam = (searchParams.get('email') || '').trim();
  const codeSentParam = searchParams.get('codeSent') === '1';
  const hasPrefilledEmail = Boolean(emailParam);

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [codeRequested, setCodeRequested] = useState(hasPrefilledEmail && codeSentParam);
  const [codeVerified, setCodeVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(
    hasPrefilledEmail && codeSentParam
      ? `Enter the reset code already sent to ${emailParam}.`
      : '',
  );

  useEffect(() => {
    setEmail(emailParam);
    setCodeRequested(Boolean(emailParam && codeSentParam));
    setCodeVerified(false);
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(
      emailParam && codeSentParam
        ? `Enter the reset code already sent to ${emailParam}.`
        : '',
    );
    autoRequestAttempted.current = false;
  }, [emailParam, codeSentParam]);

  useEffect(() => {
    if (!emailParam || codeSentParam || autoRequestAttempted.current) {
      return;
    }

    autoRequestAttempted.current = true;

    const requestCode = async () => {
      setSendingCode(true);
      setError('');
      try {
        await forgotPassword(emailParam);
        setCodeRequested(true);
        setSuccess(`We sent a reset code to ${emailParam}.`);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to send reset code. Please try again.'));
      } finally {
        setSendingCode(false);
      }
    };

    void requestCode();
  }, [codeSentParam, emailParam, forgotPassword]);

  const handleSendCode = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }

    setSendingCode(true);
    setError('');
    setSuccess('');

    try {
      await forgotPassword(normalizedEmail);
      setCodeRequested(true);
      setCodeVerified(false);
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setSuccess(`We sent a reset code to ${normalizedEmail}.`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to send reset code. Please try again.'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (otp.trim().length !== 6) {
      setError('Enter the full six-digit reset code.');
      return;
    }

    setVerifyingCode(true);
    setError('');
    setSuccess('');

    try {
      await authApi.verifyOtp(email.trim(), otp.trim());
      setCodeVerified(true);
      setSuccess('Reset code verified. You can set a new password now.');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to verify reset code. Please try again.'));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!codeVerified) {
      setError('Verify your reset code before setting a new password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setResettingPassword(true);

    try {
      await resetPassword(email.trim(), otp.trim(), password);
      toast.success('Password reset successfully. You can now sign in.');
      router.push('/login');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to reset password. Please check your code and try again.'));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setEmail('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setCodeRequested(false);
    setCodeVerified(false);
    setError('');
    setSuccess('');
  };

  const emailLocked = hasPrefilledEmail || codeRequested || codeVerified || sendingCode;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Reset your password.</h1>
        <div className="space-y-4 text-sm leading-6 text-muted-foreground">
          <p className="text-pretty">
            Use your email and reset code to regain access, then choose a new password for your account.
          </p>
        </div>
      </div>

      {error ? <SurfaceAlert tone="danger" title={error} /> : null}
      {success ? <SurfaceAlert tone="success" title={success} /> : null}

      <form className="space-y-5" onSubmit={handleResetPassword}>
        <FieldBlock label="Email address">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={emailLocked}
            required
          />
        </FieldBlock>

        {!codeRequested ? (
          <Button
            type="button"
            className="w-full shadow-sm"
            size="lg"
            onClick={handleSendCode}
            disabled={sendingCode}
          >
            {sendingCode ? 'Sending reset code…' : 'Send reset code'}
          </Button>
        ) : null}

        {codeRequested && !codeVerified ? (
          <div className="space-y-5">
            <FieldBlock label="Reset code">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
                disabled={codeVerified}
              >
                <InputOTPGroup className="w-full justify-between gap-2 sm:justify-start">
                  <InputOTPSlot index={0} className="flex-1 sm:flex-none" />
                  <InputOTPSlot index={1} className="flex-1 sm:flex-none" />
                  <InputOTPSlot index={2} className="flex-1 sm:flex-none" />
                  <InputOTPSlot index={3} className="flex-1 sm:flex-none" />
                  <InputOTPSlot index={4} className="flex-1 sm:flex-none" />
                  <InputOTPSlot index={5} className="flex-1 sm:flex-none" />
                </InputOTPGroup>
              </InputOTP>

              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <p className="text-muted-foreground">Enter the six-digit code sent to your email.</p>
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="shrink-0 font-medium text-foreground transition-[color,transform] hover:text-primary/70 active:scale-[0.97]"
                  disabled={sendingCode}
                >
                  {sendingCode ? 'Sending…' : 'Resend code'}
                </button>
              </div>
            </FieldBlock>

            {!codeVerified ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full shadow-sm"
                  size="lg"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || otp.trim().length !== 6}
                >
                  {verifyingCode ? 'Verifying code…' : 'Verify reset code'}
                </Button>

                <div className="flex items-center justify-between gap-3 text-sm">
                  {!hasPrefilledEmail ? (
                    <button
                      type="button"
                      onClick={handleUseDifferentEmail}
                      className="font-medium text-muted-foreground transition-[color,transform] hover:text-foreground active:scale-[0.97]"
                    >
                      Use a different email
                    </button>
                  ) : (
                    <span className="text-muted-foreground" />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {codeVerified ? (
          <div className="space-y-5">
            <FieldBlock label="New password">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a secure password"
                  className="pr-12"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[color,transform] hover:bg-accent hover:text-foreground active:scale-[0.97]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FieldBlock>

            <FieldBlock label="Confirm new password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                required
              />
            </FieldBlock>

            <Button type="submit" className="w-full shadow-sm" size="lg" disabled={resettingPassword}>
              {resettingPassword ? 'Resetting password…' : 'Reset Password'}
            </Button>
          </div>
        ) : null}
      </form>

      <p className="text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="font-semibold text-foreground transition-colors hover:text-primary/70">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout
      cardClassName="mx-auto w-full max-w-xl"
      gridClassName="px-8 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14"
      contentClassName="mx-auto max-w-md"
    >
      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded-full" />
              <Skeleton className="h-4 w-full max-w-sm rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthPageLayout>
  );
}

'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from '@/components/icons';
import { AuthPageLayout } from '@/components/auth-page-layout';
import { FieldBlock } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { getApiErrorMessage } from '@/lib/api-errors';
import { toast } from 'sonner';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";

function ResetPasswordAside() {
    return (
        <>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Reset your password.</h1>
            <div className="space-y-4 text-sm leading-6 text-muted-foreground">
                <p>
                    Enter the six-digit code from your email and choose a new password to get back into your workspace.
                </p>
                <p>
                    Keep this tab open while you check your inbox so you can finish the reset in one step.
                </p>
            </div>
        </>
    );
}

function ResetPasswordForm() {
    const { resetPassword } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const emailParam = searchParams.get('email') || '';

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (emailParam) setEmail(emailParam);
    }, [emailParam]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            await resetPassword(email.trim(), otp.trim(), password);
            toast.success('Password reset successfully. You can now sign in.');
            router.push('/login');
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to reset password. Please check your code and try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Reset password</h2>
                <p className="text-muted-foreground">
                    Enter the code from your email and choose a new password for your account.
                </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
                {error ? (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                <FieldBlock label="Email address">
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                    />
                </FieldBlock>

                <FieldBlock label="Reset code" description="Enter the code sent to your email">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(val) => setOtp(val)}
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
                </FieldBlock>

                <FieldBlock label="New password">
                    <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Create a secure password"
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

                <FieldBlock label="Confirm new password">
                    <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        required
                    />
                </FieldBlock>

                <Button type="submit" className="w-full shadow-sm" size="lg" disabled={loading}>
                    {loading ? 'Resetting password…' : 'Reset Password'}
                </Button>
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
        <AuthPageLayout aside={<ResetPasswordAside />}>
            <Suspense fallback={
                <div className="space-y-5">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48 rounded-full" />
                        <Skeleton className="h-4 w-full max-w-sm rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20 rounded-full" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-28 rounded-full" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-11 w-full rounded-xl" />
                </div>
            }>
                <ResetPasswordForm />
            </Suspense>
        </AuthPageLayout>
    );
}

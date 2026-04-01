'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from '@/components/icons';
import { AuthShell } from '@/components/auth-shell';
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

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Resetting password…' : 'Reset Password'}
            </Button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <AuthShell
            title="Reset Password"
            subtitle="Enter the code from your email and your new password."
        >
            <Suspense fallback={
                <div className="space-y-5">
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
        </AuthShell>
    );
}

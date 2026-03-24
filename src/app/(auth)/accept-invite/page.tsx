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

function AcceptInviteForm() {
    const { acceptInvite } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Read secure magic link params from the URL (e.g. ?email=x&token=y)
    const emailParam = searchParams.get('email') || '';
    const tokenParam = searchParams.get('token') || '';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (emailParam) setEmail(emailParam);
    }, [emailParam]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            await acceptInvite(email.trim(), tokenParam, password);
            router.push('/dashboard');
        } catch (err: unknown) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(typeof message === 'string' ? message : 'Failed to accept invitation. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    if (!emailParam || !tokenParam) {
        return (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Invalid invite link. Please make sure you copied the full URL from your email.
            </div>
        );
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            {error ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <FieldBlock label="Work email">
                <Input
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted text-muted-foreground"
                    required
                />
            </FieldBlock>

            <FieldBlock label="Set a password">
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

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Activating account…' : 'Accept Invitation'}
            </Button>
        </form>
    );
}

export default function AcceptInvitePage() {
    return (
        <AuthShell
            title="Accept Invitation"
            subtitle="Set up your password to join the workspace."
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
                <AcceptInviteForm />
            </Suspense>
        </AuthShell>
    );
}

'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthPageLayout, AuthWelcomeAside } from '@/components/auth-page-layout';
import { Eye, EyeOff } from '@/components/icons';
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
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Accept your invitation</h1>
                <p className="text-sm leading-6 text-muted-foreground">
                    Set your password to activate your account and join the workspace.
                </p>
            </div>

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
                            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[color,transform] hover:bg-accent hover:text-foreground active:scale-[0.97]"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </FieldBlock>

                <Button type="submit" className="w-full shadow-sm" size="lg" disabled={loading}>
                    {loading ? 'Activating account…' : 'Accept invitation'}
                </Button>
            </form>
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <AuthPageLayout aside={<AuthWelcomeAside />}>
            <Suspense
                fallback={
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-52 rounded-xl" />
                            <Skeleton className="h-5 w-full max-w-sm rounded-xl" />
                        </div>
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
                    </div>
                }
            >
                <AcceptInviteForm />
            </Suspense>
        </AuthPageLayout>
    );
}

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AppShell, AppShellSkeleton } from '@/components/app-shell';

function subscribe() {
    return () => {};
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const mounted = useSyncExternalStore(subscribe, () => true, () => false);

    useEffect(() => {
        if (mounted && !isLoading && !user) router.push('/login');
    }, [mounted, user, isLoading, router]);

    if (!mounted || isLoading) {
        return <AppShellSkeleton />;
    }
    if (!user) return null;

    return (
        <AppShell>{children}</AppShell>
    );
}

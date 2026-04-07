'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '@/context/auth-context';
import { PostHogProvider } from '@/components/posthog-provider';
import { Toaster } from '@/components/ui/sonner';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: { staleTime: 30_000, retry: 1 },
                },
            }),
    );

    return (
        <PostHogProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>{children}</AuthProvider>
                <Toaster />
            </QueryClientProvider>
        </PostHogProvider>
    );
}

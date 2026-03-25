'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { tenantApi, api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

function IntegrationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState(false);

  // Fetch tenant profile to see if google_workspace_refresh_token exists
  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: async () => {
      const { data } = await tenantApi.getProfile();
      return data;
    },
    enabled: user?.role === 'admin',
  });

  useEffect(() => {
    if (searchParams?.get('success') === 'google_connected') {
      toast.success('Successfully connected to Google Workspace Admin!');
      // Clean up URL parameters cleanly
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (searchParams?.get('error')) {
      toast.error('Failed to authorize Google integration. Please try again.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [searchParams]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        You do not have permission to view integrations.
      </div>
    );
  }

  const isGoogleConnected = Boolean(profile?.google_workspace_refresh_token);

  async function handleConnectGoogle() {
    setConnecting(true);
    try {
      const response = await api.get('/integrations/google/auth');
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      toast.error('Failed to initialize Google OAuth connection');
      console.error(e);
      setConnecting(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
      </div>
      <p className="text-muted-foreground mb-8">
        Connect third-party domain providers and directory services.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">Google Workspace</CardTitle>
              <CardDescription>
                Zero-touch user directory provisioning
              </CardDescription>
            </div>
            {/* simple generic google icon */}
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mt-4 mb-6">
              Automatically create contractor accounts in Google Admin SDK directly upon workflow onboarding. Rehires and Terminations sync passively.
            </div>
            
            {isLoading ? (
              <Button disabled variant="outline" className="w-full">Loading...</Button>
            ) : isGoogleConnected ? (
              <div className="flex gap-3 items-center">
                <Button disabled variant="outline" className="w-full border-green-500/20 text-green-600 bg-green-500/10">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                  Synced
                </Button>
              </div>
            ) : (
               <Button onClick={handleConnectGoogle} disabled={connecting} className="w-full bg-[#4285F4] hover:bg-[#4285F4]/90 text-white">
                {connecting ? 'Connecting...' : 'Connect Workspace'}
               </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading integrations...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

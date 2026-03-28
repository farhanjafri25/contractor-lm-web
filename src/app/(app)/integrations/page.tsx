'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useGettingStarted } from '@/hooks/use-getting-started';
import { PageHeader, SectionCard, StatusBadge } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { IconGoogle, IconSlack } from '@/components/icons';
import { cn } from '@/lib/utils';

function IntegrationsContent() {
  const { isGoogleConnected, isSlackConnected, gettingStartedLoading } = useGettingStarted();
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    const success = searchParams?.get('success');
    const error = searchParams?.get('error');

    if (success === 'google_connected') {
      toast.success('Successfully connected to Google Workspace Admin!');
      window.history.replaceState(null, '', window.location.pathname);
    } else if (success === 'slack_connected') {
      toast.success('Successfully connected to Slack Workspace!');
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (error) {
      toast.error(error === 'oauth_failed' ? 'Failed to authorize integration. Please try again.' : 'Integration setup interrupted.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [searchParams]);

  async function handleConnectGoogle() {
    setConnecting('google');
    try {
      const response = await api.get('/integrations/google/auth');
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to initialize Google OAuth connection'));
      console.error(e);
      setConnecting(null);
    }
  }

  async function handleConnectSlack() {
    setConnecting('slack');
    try {
      const response = await api.get('/integrations/slack/auth');
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to initialize Slack OAuth connection'));
      console.error(e);
      setConnecting(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect and manage external services to automate provisioning and notifications."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Google Workspace Card */}
        <SectionCard
          title="Google Workspace"
          description="Sync your directory and provision Google accounts for contractors."
          actions={
            <StatusBadge 
              status={isGoogleConnected ? 'Connected' : 'Not Connected'} 
            />
          }
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/30">
                <IconGoogle size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Directory & Mail</p>
                <p className="text-xs text-muted-foreground">Admin API Access required</p>
              </div>
            </div>
            
            <Button
              onClick={handleConnectGoogle}
              disabled={!!connecting || gettingStartedLoading}
              variant={isGoogleConnected ? 'outline' : 'default'}
              className={cn(!isGoogleConnected && "bg-[#4285F4] hover:bg-[#4285F4]/90 text-white")}
            >
              {connecting === 'google' ? 'Connecting...' : isGoogleConnected ? 'Reauthorize Google' : 'Authorize Google'}
            </Button>
          </div>
        </SectionCard>

        {/* Slack Card */}
        <SectionCard
          title="Slack"
          description="Automate Slack invites and receive operational notifications."
          actions={
            <StatusBadge 
              status={isSlackConnected ? 'Connected' : 'Not Connected'} 
            />
          }
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/30">
                <IconSlack size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Chat & Notifications</p>
                <p className="text-xs text-muted-foreground">Bot and Admin scopes required</p>
              </div>
            </div>

            <Button
              onClick={handleConnectSlack}
              disabled={!!connecting || gettingStartedLoading}
              variant={isSlackConnected ? 'outline' : 'default'}
              className={cn(!isSlackConnected && "bg-[#4A154B] hover:bg-[#4A154B]/90 text-white")}
            >
              {connecting === 'slack' ? 'Connecting...' : isSlackConnected ? 'Reauthorize Slack' : 'Authorize Slack'}
            </Button>
          </div>
        </SectionCard>
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

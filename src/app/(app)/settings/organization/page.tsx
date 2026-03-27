'use client';

import * as React from 'react';
import Image from 'next/image';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { tenantApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { CirclePlus, Pencil, RefreshCw } from '@/components/icons';
import { SettingsPageSkeleton } from '@/components/page-skeletons';
import { useAuth } from '@/context/auth-context';
import { PageHeader, SettingsCard, SettingsRow } from '@/components/app-ui';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { prepareImageForUpload } from '@/lib/image-upload';
import { cn } from '@/lib/utils';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const CONTRACTOR_VOLUMES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const TRACKING_METHODS = ['Spreadsheets', 'Deel / Remote / Oyster', 'Workday / Oracle', 'Other'];
const DIRECTORY_PROVIDERS = ['Google Workspace', 'Microsoft Entra', 'Okta', 'None'];

function AvatarUploadButton({
  image,
  alt,
  onClick,
  loading = false,
}: {
  image?: string | null;
  alt: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={image ? 'Change organization picture' : 'Upload organization picture'}
      disabled={loading}
      className="group relative block size-16 overflow-hidden rounded-[16px] border border-border/80 bg-muted transition-colors hover:border-foreground/20"
    >
      {loading ? (
        <div className="flex size-full items-center justify-center bg-background/70 text-foreground">
          <RefreshCw size={18} className="animate-spin" />
        </div>
      ) : image ? (
        <>
          <Image src={image} alt={alt} fill unoptimized sizes="64px" className="object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-background/0 text-transparent transition-all duration-150 group-hover:bg-background/70 group-hover:text-foreground">
            <Pencil size={18} />
          </div>
        </>
      ) : (
        <div className={cn('flex size-full items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground')}>
          <CirclePlus size={24} />
        </div>
      )}
    </button>
  );
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const initializedRef = React.useRef(false);
  const lastAttemptedKeyRef = React.useRef<string | null>(null);
  const isAdmin = user?.role === 'admin';

  const { data: profileRaw, isLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: async () => (await tenantApi.getProfile()).data,
    enabled: isAdmin,
  });

  const profile = profileRaw;

  const [name, setName] = React.useState<string | undefined>(undefined);
  const [slug, setSlug] = React.useState<string | undefined>(undefined);
  const [companySize, setCompanySize] = React.useState<string | undefined>(undefined);
  const [contractorVolume, setContractorVolume] = React.useState<string | undefined>(undefined);
  const [trackingMethod, setTrackingMethod] = React.useState<string | undefined>(undefined);
  const [directoryProvider, setDirectoryProvider] = React.useState<string | undefined>(undefined);
  const [logo, setLogo] = React.useState<string | undefined>(undefined);
  const [logoUploading, setLogoUploading] = React.useState(false);

  const resolvedName = name ?? profile?.name ?? '';
  const resolvedSlug = slug ?? profile?.slug ?? '';
  const resolvedCompanySize = companySize ?? profile?.company_size ?? '';
  const resolvedContractorVolume = contractorVolume ?? profile?.contractor_volume ?? '';
  const resolvedTrackingMethod = trackingMethod ?? profile?.tracking_method ?? '';
  const resolvedDirectoryProvider = directoryProvider ?? profile?.directory_provider ?? '';
  const resolvedLogo = logo ?? profile?.logo ?? '';

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async (payload: {
      name: string;
      slug: string;
      company_size: string;
      contractor_volume: string;
      tracking_method: string;
      directory_provider: string;
      logo?: string;
    }) => await tenantApi.updateProfile(payload),
    onSuccess: (response, variables) => {
      lastAttemptedKeyRef.current = JSON.stringify({
        name: response.data.name ?? '',
        slug: response.data.slug ?? '',
        company_size: response.data.company_size ?? '',
        contractor_volume: response.data.contractor_volume ?? '',
        tracking_method: response.data.tracking_method ?? '',
        directory_provider: response.data.directory_provider ?? '',
        logo: response.data.logo ?? null,
      });
      setLogoUploading(false);
      queryClient.setQueryData(['tenant-profile'], response.data);
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });

      if (variables.logo && variables.logo !== profile?.logo) {
        toast.success('Workspace logo updated.', { id: 'org-update' });
      } else {
        toast.success('Workspace updated.', { id: 'org-update' });
      }
    },
    onError: (err) => {
      setLogoUploading(false);
      toast.error(getApiErrorMessage(err, 'Failed to update organization profile.'), {
        id: 'org-update',
      });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);

    try {
      const preparedImage = await prepareImageForUpload(file, {
        label: 'Organization logo',
      });
      setLogo(preparedImage);
    } catch (error) {
      setLogoUploading(false);
      toast.error(error instanceof Error ? error.message : 'Failed to read image.');
    } finally {
      e.target.value = '';
    }
  };

  React.useEffect(() => {
    if (!profile) {
      return;
    }

    const currentKey = JSON.stringify({
      name: profile.name ?? '',
      slug: profile.slug ?? '',
      company_size: profile.company_size ?? '',
      contractor_volume: profile.contractor_volume ?? '',
      tracking_method: profile.tracking_method ?? '',
      directory_provider: profile.directory_provider ?? '',
      logo: profile.logo ?? null,
    });

    if (!initializedRef.current) {
      initializedRef.current = true;
      lastAttemptedKeyRef.current = currentKey;
    }
  }, [profile]);

  React.useEffect(() => {
    if (!profile || !initializedRef.current || isPending) {
      return;
    }

    const nextPayload = {
      name: resolvedName,
      slug: resolvedSlug,
      company_size: resolvedCompanySize,
      contractor_volume: resolvedContractorVolume,
      tracking_method: resolvedTrackingMethod,
      directory_provider: resolvedDirectoryProvider,
      logo: resolvedLogo || undefined,
    };

    const nextKey = JSON.stringify({
      ...nextPayload,
      logo: resolvedLogo || null,
    });

    const currentKey = JSON.stringify({
      name: profile.name ?? '',
      slug: profile.slug ?? '',
      company_size: profile.company_size ?? '',
      contractor_volume: profile.contractor_volume ?? '',
      tracking_method: profile.tracking_method ?? '',
      directory_provider: profile.directory_provider ?? '',
      logo: profile.logo ?? null,
    });

    if (nextKey === currentKey || nextKey === lastAttemptedKeyRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastAttemptedKeyRef.current = nextKey;
      updateProfile(nextPayload);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [
    profile,
    isPending,
    resolvedName,
    resolvedSlug,
    resolvedCompanySize,
    resolvedContractorVolume,
    resolvedTrackingMethod,
    resolvedDirectoryProvider,
    resolvedLogo,
    updateProfile,
  ]);

  if (isLoading) {
    return <SettingsPageSkeleton topCardRows={3} bottomCardRows={5} />;
  }

  if (user && !isAdmin) {
    return (
      <div className="mx-auto flex h-[50vh] w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Access Denied</h2>
          <p className="text-sm text-muted-foreground">You must be a workspace administrator to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 pt-6">
      <PageHeader
        title="Organization"
        description="Manage your workspace identity, company settings, and deployment preferences. Changes save automatically."
      />

      <div className="space-y-12">
      <input
        ref={logoInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleLogoUpload}
      />

      <SettingsCard>
        <SettingsRow
          label="Organization logo"
          align="center"
        >
          <div className="flex justify-start md:justify-end">
            <AvatarUploadButton
              image={resolvedLogo || null}
              alt="Organization picture"
              loading={logoUploading}
              onClick={() => logoInputRef.current?.click()}
            />
          </div>
        </SettingsRow>

        <SettingsRow
          label="Organization name"
          align="center"
        >
          <div className="w-full md:ml-auto md:max-w-sm">
            <Input
              value={resolvedName}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
        </SettingsRow>

        <SettingsRow
          label="Workspace slug"
          noBorder
          align="center"
        >
          <div className="w-full md:ml-auto md:max-w-sm">
            <Input
              value={resolvedSlug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-corp"
            />
          </div>
        </SettingsRow>
      </SettingsCard>

      <div className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Configure</h2>
        <SettingsCard>
          <SettingsRow
            label="Company size"
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Select value={resolvedCompanySize} onValueChange={(val: string | null) => setCompanySize(val || undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Contractor volume"
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Select value={resolvedContractorVolume} onValueChange={(val: string | null) => setContractorVolume(val || undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select volume" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACTOR_VOLUMES.map((s) => <SelectItem key={s} value={s}>{s} active</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Tracking method"
            description="How your team currently manages contractor records today."
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Select value={resolvedTrackingMethod} onValueChange={(val: string | null) => setTrackingMethod(val || undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {TRACKING_METHODS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Central directory"
            description="The identity provider your company uses for workforce access."
            noBorder
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Select value={resolvedDirectoryProvider} onValueChange={(val: string | null) => setDirectoryProvider(val || undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTORY_PROVIDERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>
      </div>
    </div>
  );
}

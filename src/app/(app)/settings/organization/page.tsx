'use client';

import * as React from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { tenantApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/app-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const CONTRACTOR_VOLUMES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const TRACKING_METHODS = ['Spreadsheets', 'Deel / Remote / Oyster', 'Workday / Oracle', 'Other'];
const DIRECTORY_PROVIDERS = ['Google Workspace', 'Microsoft Entra', 'Okta', 'None'];

function SettingsSection({ title, description, children }: { title: string, description: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row border-b pb-8">
      <div className="md:w-1/3">
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="md:w-2/3 flex-1">
        {children}
      </div>
    </div>
  );
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Redirect or block rendering if purely not admin
  if (user && user.role !== 'admin') {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
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

  const { data: profileRaw, isLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: async () => (await tenantApi.getProfile()).data,
  });
  
  const profile = profileRaw;

  const [name, setName] = React.useState<string | undefined>(undefined);
  const [slug, setSlug] = React.useState<string | undefined>(undefined);
  const [billingCountry, setBillingCountry] = React.useState<string | undefined>(undefined);
  const [companySize, setCompanySize] = React.useState<string | undefined>(undefined);
  const [contractorVolume, setContractorVolume] = React.useState<string | undefined>(undefined);
  const [trackingMethod, setTrackingMethod] = React.useState<string | undefined>(undefined);
  const [directoryProvider, setDirectoryProvider] = React.useState<string | undefined>(undefined);
  const [logo, setLogo] = React.useState<string | undefined>(undefined);

  const resolvedName = name ?? profile?.name ?? '';
  const resolvedSlug = slug ?? profile?.slug ?? '';
  const resolvedBillingCountry = billingCountry ?? profile?.billing_country ?? '';
  const resolvedCompanySize = companySize ?? profile?.company_size ?? '';
  const resolvedContractorVolume = contractorVolume ?? profile?.contractor_volume ?? '';
  const resolvedTrackingMethod = trackingMethod ?? profile?.tracking_method ?? '';
  const resolvedDirectoryProvider = directoryProvider ?? profile?.directory_provider ?? '';
  const resolvedLogo = logo ?? profile?.logo ?? '';

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async () => await tenantApi.updateProfile({
      name: resolvedName,
      slug: resolvedSlug,
      billing_country: resolvedBillingCountry,
      company_size: resolvedCompanySize,
      contractor_volume: resolvedContractorVolume,
      tracking_method: resolvedTrackingMethod,
      directory_provider: resolvedDirectoryProvider,
      logo: resolvedLogo || undefined,
    }),
    onSuccess: () => {
      toast.success('Organization profile updated.');
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update organization profile.');
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(typeof event.target?.result === 'string' ? event.target.result : undefined);
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[100px] w-full max-w-2xl" />
        <Skeleton className="h-[400px] w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-2xl">
      <PageHeader
        title="Organization Profile"
        description="Manage your workspace identity, company settings, and deployment preferences."
      />

      <SettingsSection
        title="Workspace Identity"
        description="Public facing details about your organization."
      >
        <div className="space-y-4 pt-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Organization Logo</label>
            <div className="flex items-center gap-4">
              <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {resolvedLogo ? (
                  <img src={resolvedLogo} alt="Organization Logo" className="size-full object-cover" />
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">Logo</span>
                )}
              </div>
              <div className="relative">
                <Button type="button" variant="outline" size="sm">
                  Upload Logo
                </Button>
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <label className="text-sm font-medium">Company Name</label>
            <Input 
              value={resolvedName} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Acme Corp"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <label className="text-sm font-medium">Workspace Slug</label>
            <Input 
              value={resolvedSlug} 
              onChange={(e) => setSlug(e.target.value)} 
              placeholder="acme-corp"
            />
            <p className="text-xs text-muted-foreground">Used for generating direct links.</p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Operational Context"
        description="Help us customize your workspace configuration based on your needs."
      >
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Company Size</label>
            <Select value={resolvedCompanySize} onValueChange={(val: string | null) => setCompanySize(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Contractor Volume</label>
            <Select value={resolvedContractorVolume} onValueChange={(val: string | null) => setContractorVolume(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACTOR_VOLUMES.map(s => <SelectItem key={s} value={s}>{s} active</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <label className="text-sm font-medium">Current Tracking Method</label>
            <Select value={resolvedTrackingMethod} onValueChange={(val: string | null) => setTrackingMethod(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {TRACKING_METHODS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <label className="text-sm font-medium">Central Directory</label>
            <Select value={resolvedDirectoryProvider} onValueChange={(val: string | null) => setDirectoryProvider(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {DIRECTORY_PROVIDERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <label className="text-sm font-medium">Billing Country</label>
          <Input 
            value={resolvedBillingCountry} 
            onChange={(e) => setBillingCountry(e.target.value)} 
            placeholder="e.g. United States"
          />
        </div>
      </SettingsSection>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={() => updateProfile()} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

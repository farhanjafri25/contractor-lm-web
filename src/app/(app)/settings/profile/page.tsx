'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tenantApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { CirclePlus, IconTrashCanSimple, Pencil, RefreshCw } from '@/components/icons';
import { SettingsPageSkeleton } from '@/components/page-skeletons';
import { PageHeader, SettingsCard, SettingsRow } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { prepareImageForUpload } from '@/lib/image-upload';
import { cn } from '@/lib/utils';

function parseProfileDetails(info: unknown) {
  if (typeof info !== 'string' || !info.trim()) {
    return {
      jobTitle: '',
      department: '',
      phone: '',
    };
  }

  try {
    const parsed = JSON.parse(info) as {
      job_title?: unknown;
      department?: unknown;
      phone?: unknown;
    };

    return {
      jobTitle: typeof parsed.job_title === 'string' ? parsed.job_title : '',
      department: typeof parsed.department === 'string' ? parsed.department : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
    };
  } catch {
    return {
      jobTitle: '',
      department: '',
      phone: '',
    };
  }
}

function createProfileStateKey({
  name,
  jobTitle,
  department,
  phone,
  avatar,
}: {
  name: string;
  jobTitle: string;
  department: string;
  phone: string;
  avatar: string | null;
}) {
  return JSON.stringify({
    name,
    job_title: jobTitle,
    department,
    phone,
    avatar,
  });
}

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
      aria-label={image ? 'Change profile picture' : 'Upload profile picture'}
      disabled={loading}
      className="group relative block size-16 overflow-hidden rounded-full border border-transparent bg-muted shadow-sm ring-1 ring-foreground/10 transition-[border-color,box-shadow,color] hover:border-foreground/20"
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

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { updateUserSession } = useAuth();
  const [name, setName] = useState<string | undefined>(undefined);
  const [jobTitle, setJobTitle] = useState<string | undefined>(undefined);
  const [department, setDepartment] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null | undefined>(undefined);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const lastAttemptedKeyRef = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => (await tenantApi.getUserProfile()).data,
  });
  const persistedDetails = parseProfileDetails(data?.info);
  const persistedStateKey = createProfileStateKey({
    name: data?.name ?? '',
    jobTitle: persistedDetails.jobTitle,
    department: persistedDetails.department,
    phone: persistedDetails.phone,
    avatar: data?.avatar ?? null,
  });
  const resolvedName = name ?? data?.name ?? '';
  const resolvedJobTitle = jobTitle ?? persistedDetails.jobTitle;
  const resolvedDepartment = department ?? persistedDetails.department;
  const resolvedPhone = phone ?? persistedDetails.phone;
  const resolvedAvatarPreview = avatarPreview === undefined ? data?.avatar ?? null : avatarPreview;

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async (payload: {
      name: string;
      info: string;
      avatar?: string | null;
    }) => await tenantApi.updateUserProfile(payload),
    onSuccess: (response, variables) => {
      const previousAvatar = data?.avatar ?? null;
      const requestedAvatar = Object.prototype.hasOwnProperty.call(variables, 'avatar')
        ? variables.avatar ?? null
        : previousAvatar;
      const returnedAvatar = response.data.avatar;
      const nextAvatar = returnedAvatar === undefined
        ? requestedAvatar
        : returnedAvatar === previousAvatar && requestedAvatar !== previousAvatar
          ? requestedAvatar
          : returnedAvatar ?? null;

      const mergedProfile = {
        ...data,
        ...response.data,
        info: response.data.info ?? data?.info ?? '',
        avatar: nextAvatar,
      };
      const responseDetails = parseProfileDetails(mergedProfile.info);
      lastAttemptedKeyRef.current = createProfileStateKey({
        name: mergedProfile.name ?? '',
        jobTitle: responseDetails.jobTitle,
        department: responseDetails.department,
        phone: responseDetails.phone,
        avatar: mergedProfile.avatar,
      });
      setAvatarPreview(nextAvatar);
      setAvatarUploading(false);
      queryClient.setQueryData(['user-profile'], mergedProfile);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      updateUserSession({
        name: mergedProfile.name,
        info: mergedProfile.info,
        avatar: mergedProfile.avatar ?? undefined,
        avatarVersion: Date.now(),
      });

      if (requestedAvatar !== previousAvatar) {
        toast.success(requestedAvatar ? 'Profile photo updated.' : 'Profile photo removed.', {
          id: 'profile-update',
        });
      } else {
        toast.success('Profile updated.', {
          id: 'profile-update',
        });
      }
    },
    onError: (err) => {
      setAvatarUploading(false);
      toast.error(getApiErrorMessage(err, 'Failed to update profile.'), {
        id: 'profile-update',
      });
    },
  });

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);

    try {
      const preparedImage = await prepareImageForUpload(file, {
        label: 'Profile picture',
      });
      setAvatarPreview(preparedImage);
    } catch (error) {
      setAvatarUploading(false);
      toast.error(error instanceof Error ? error.message : 'Failed to read image.');
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarUploading(false);
  };

  useEffect(() => {
    if (!data) {
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      lastAttemptedKeyRef.current = persistedStateKey;
    }
  }, [data, persistedStateKey]);

  useEffect(() => {
    if (!data || !initializedRef.current || isPending) {
      return;
    }

    const nextPayload = {
      name: resolvedName,
      info: JSON.stringify({
        job_title: resolvedJobTitle,
        department: resolvedDepartment,
        phone: resolvedPhone,
      }),
      avatar: resolvedAvatarPreview ?? null,
    };

    const nextKey = createProfileStateKey({
      name: resolvedName,
      jobTitle: resolvedJobTitle,
      department: resolvedDepartment,
      phone: resolvedPhone,
      avatar: resolvedAvatarPreview ?? null,
    });

    if (nextKey === persistedStateKey || nextKey === lastAttemptedKeyRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastAttemptedKeyRef.current = nextKey;
      updateProfile(nextPayload);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [
    data,
    isPending,
    resolvedName,
    resolvedJobTitle,
    resolvedDepartment,
    resolvedPhone,
    resolvedAvatarPreview,
    persistedStateKey,
    updateProfile,
  ]);

  if (isLoading) {
    return <SettingsPageSkeleton topCardRows={5} bottomCardRows={1} />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 pt-6">
      <PageHeader
        title="Profile"
        description="Manage your personal account settings. Changes save automatically."
      />

      <div className="space-y-12">
      <div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelection}
        />

        <SettingsCard>
          <SettingsRow
            label="Profile picture"
            align="center"
          >
            <div className="flex items-center justify-start gap-3 md:justify-end">
              {resolvedAvatarPreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={avatarUploading || isPending}
                  onClick={handleRemoveAvatar}
                  aria-label="Remove profile picture"
                  title="Remove profile picture"
                >
                  <IconTrashCanSimple />
                </Button>
              ) : null}
              <AvatarUploadButton
                image={resolvedAvatarPreview}
                alt="Profile picture"
                loading={avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Email address"
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Input
                id="email"
                value={data?.email || ''}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Full name"
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Input
                id="name"
                value={resolvedName}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Job title"
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Input
                id="job_title"
                value={resolvedJobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Operations Manager"
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Department"
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Input
                id="department"
                value={resolvedDepartment}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Operations"
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="Phone number"
            noBorder
            align="center"
          >
            <div className="w-full md:ml-auto md:max-w-sm">
              <Input
                id="phone"
                type="tel"
                value={resolvedPhone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>

      <div className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Security</h2>
        <SettingsCard>
          <SettingsRow
            label="Password"
            noBorder
            align="center"
          >
            <div className="flex justify-start md:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.info('Password changes are not available in-app yet.')}
              >
                Change password
              </Button>
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>
      </div>
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { tenantApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { PageHeader, FieldBlock } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import Image from 'next/image';
import { useRef } from 'react';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { updateUserSession } = useAuth();
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => (await tenantApi.getUserProfile()).data,
  });

  useEffect(() => {
    if (data) {
      if (data.name) setName(data.name);
      if (data.info) setInfo(data.info);
      if (data.avatar) setAvatarPreview(data.avatar);
    }
  }, [data]);

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async () => await tenantApi.updateUserProfile({ 
      name, 
      info, 
      avatar: avatarPreview ?? undefined 
    }),
    onSuccess: (response) => {
      toast.success('Profile updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      updateUserSession({ name: response.data.name, info: response.data.info, avatar: response.data.avatar });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update profile.'));
    },
  });

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be 10MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateProfile();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <PageHeader title="Profile" description="Manage your personal account settings." />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader 
        title="Profile" 
        description="Manage your personal account settings." 
      />

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            This information will be visible to other members of your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input 
              ref={avatarInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileSelection} 
            />
            
            <div className="flex items-center gap-5 pb-2">
              <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-semibold text-primary/80 border">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar preview" fill unoptimized sizes="64px" className="object-cover" />
                ) : (
                  (name?.[0] || data?.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                    {avatarPreview ? 'Replace Image' : 'Upload Image'}
                  </Button>
                  {avatarPreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarPreview(null)}>Remove</Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG or JPG up to 10MB.</p>
              </div>
            </div>

            <FieldBlock label="Email Address" description="Your email address is managed exclusively via magic link auth.">
              <Input
                id="email"
                value={data?.email || ''}
                readOnly
                className="bg-muted text-muted-foreground w-full sm:w-[300px]"
              />
            </FieldBlock>

            <FieldBlock label="Full Name">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full sm:w-[300px]"
              />
            </FieldBlock>

            <FieldBlock label="Bio / Info" description="A short description of your role or responsibilities.">
              <Textarea
                id="info"
                value={info}
                onChange={(e) => setInfo(e.target.value)}
                placeholder="I am a project manager focused on..."
                rows={4}
              />
            </FieldBlock>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

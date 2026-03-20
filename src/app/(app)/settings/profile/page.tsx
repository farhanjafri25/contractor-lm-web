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

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { updateUserSession } = useAuth();
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => (await tenantApi.getUserProfile()).data,
  });

  useEffect(() => {
    if (data) {
      if (data.name) setName(data.name);
      if (data.info) setInfo(data.info);
    }
  }, [data]);

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async () => await tenantApi.updateUserProfile({ name, info }),
    onSuccess: (response) => {
      toast.success('Profile updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      updateUserSession({ name: response.data.name, info: response.data.info });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update profile.'));
    },
  });

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

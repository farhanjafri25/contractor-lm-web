'use client';

import { format, isValid, parseISO } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { applicationsApi, contractorsApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ChevronBottom } from '@/components/icons';
import { FieldBlock, PageBackLink, PageHeader, SectionCard, SurfaceAlert } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useGettingStarted } from '@/hooks/use-getting-started';

const departments = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Legal', 'Operations', 'Other'];

type FormField = 'name' | 'email' | 'phone' | 'job_title' | 'department' | 'start_date' | 'end_date';
type ValidationErrors = Partial<Record<FormField, string>>;

interface TenantApplication {
  _id: string;
  display_name?: string;
  app_key?: string;
  application_id?: {
    _id: string;
    name: string;
    slug: string;
    auth_type: string;
  };
}

export default function NewContractorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    job_title: '',
  });
  const [contract, setContract] = useState({
    start_date: '',
    end_date: '',
    notes: '',
    create_google_account: false,
    create_slack_account: false,
  });

  const { data: appsData } = useQuery({
    queryKey: ['applications-list'],
    queryFn: async () => (await applicationsApi.list()).data as TenantApplication[],
  });

  const availableApps = (appsData ?? []).filter((app: TenantApplication) => {
    const slug = app.application_id?.slug;
    return slug !== 'google-workspace' && slug !== 'slack';
  });

  const { isGoogleConnected, isSlackConnected } = useGettingStarted();

  const startDate = contract.start_date ? parseISO(contract.start_date) : undefined;
  const endDate = contract.end_date ? parseISO(contract.end_date) : undefined;

  const updateFormField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  };

  const updateContractField = (field: keyof typeof contract, value: string | boolean | string[]) => {
    setContract((prev) => ({ ...prev, [field]: value }));
    if (field !== 'notes' && field !== 'create_google_account' && field !== 'create_slack_account') {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setError('');
  };


  const validateForm = () => {
    const nextErrors: ValidationErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Enter a name.';
    if (!form.email.trim()) nextErrors.email = 'Enter an email.';
    if (!form.job_title.trim()) nextErrors.job_title = 'Enter a title.';
    if (!form.department) nextErrors.department = 'Select a department.';
    if (!contract.start_date) nextErrors.start_date = 'Choose a start date.';
    if (!contract.end_date) nextErrors.end_date = 'Choose an end date.';

    const parsedStartDate = contract.start_date ? parseISO(contract.start_date) : null;
    const parsedEndDate = contract.end_date ? parseISO(contract.end_date) : null;

    if (parsedStartDate && !isValid(parsedStartDate)) {
      nextErrors.start_date = 'Enter a valid start date.';
    }

    if (parsedEndDate && !isValid(parsedEndDate)) {
      nextErrors.end_date = 'Enter a valid end date.';
    }

    if (
      parsedStartDate &&
      parsedEndDate &&
      isValid(parsedStartDate) &&
      isValid(parsedEndDate) &&
      parsedEndDate < parsedStartDate
    ) {
      nextErrors.end_date = 'End date must be on or after the start date.';
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError('Complete the required fields.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    try {
      // Find the Google and Slack IDs from the fetched apps data
      const googleApp = appsData?.find((a: TenantApplication) => a.application_id?.slug === 'google-workspace');
      const slackApp = appsData?.find((a: TenantApplication) => a.application_id?.slug === 'slack');

      const finalAppAccess = [];

      if (contract.create_google_account && googleApp) {
        finalAppAccess.push({ tenant_application_id: googleApp._id });
      }
      if (contract.create_slack_account && slackApp) {
        finalAppAccess.push({ tenant_application_id: slackApp._id });
      }

      await contractorsApi.create({
        ...form,
        notes: contract.notes,
        contract: {
          start_date: contract.start_date,
          end_date: contract.end_date,
          create_google_account: contract.create_google_account,
          create_slack_account: contract.create_slack_account,
          application_access: finalAppAccess,
        },
      });
      toast.success('Contractor added.');
      router.push('/contractors');
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Could not add contractor. Try again.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <PageBackLink href="/contractors">Back to contractors</PageBackLink>
        <PageHeader
          title="Add contractor"
          description="Add their details and contract dates."
        />
      </div>

      {error ? <SurfaceAlert tone="danger" title={error} /> : null}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <SectionCard title="Details" description="Basic details for this contractor.">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldBlock label="Name">
              <Input
                value={form.name}
                onChange={(event) => updateFormField('name', event.target.value)}
                required
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
            </FieldBlock>
            <FieldBlock label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => updateFormField('email', event.target.value)}
                required
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
            </FieldBlock>
            <FieldBlock label="Phone">
              <Input value={form.phone} onChange={(event) => updateFormField('phone', event.target.value)} />
            </FieldBlock>
            <FieldBlock label="Department">
              <Select
                value={form.department || null}
                onValueChange={(value: string | null) => updateFormField('department', value ?? '')}
              >
                <SelectTrigger className="w-full" aria-invalid={Boolean(fieldErrors.department)}>
                  <SelectValue>
                    {form.department || <span className="text-muted-foreground">Select department</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.department ? <p className="text-xs text-destructive">{fieldErrors.department}</p> : null}
            </FieldBlock>
            <div className="md:col-span-2">
              <FieldBlock label="Title">
                <Input
                  value={form.job_title}
                  onChange={(event) => updateFormField('job_title', event.target.value)}
                  placeholder="Senior engineer"
                  required
                  aria-invalid={Boolean(fieldErrors.job_title)}
                />
                {fieldErrors.job_title ? <p className="text-xs text-destructive">{fieldErrors.job_title}</p> : null}
              </FieldBlock>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Contract" description="Set the contract dates and access for this contractor.">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldBlock label="Start date">
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      data-empty={!startDate}
                      className="h-8 w-full min-w-0 rounded-lg border border-transparent bg-card px-2.5 py-1 text-left text-base font-normal shadow-sm ring-1 ring-foreground/10 transition-[color,box-shadow] outline-none hover:bg-card focus-visible:border-foreground/35 focus-visible:ring-3 focus-visible:ring-ring/25 data-[empty=true]:text-muted-foreground/75 md:text-sm"
                    >
                      <span className="flex items-center justify-between gap-1.5">
                        <span>{startDate ? format(startDate, 'PPP') : 'Choose a start date'}</span>
                        <ChevronBottom size={16} className="shrink-0 text-muted-foreground" />
                      </span>
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(nextDate: Date | undefined) =>
                      updateContractField('start_date', nextDate ? format(nextDate, 'yyyy-MM-dd') : '')
                    }
                    defaultMonth={startDate}
                  />
                </PopoverContent>
              </Popover>
              {fieldErrors.start_date ? <p className="text-xs text-destructive">{fieldErrors.start_date}</p> : null}
            </FieldBlock>
            <FieldBlock label="End date">
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      data-empty={!endDate}
                      className="h-8 w-full min-w-0 rounded-lg border border-transparent bg-card px-2.5 py-1 text-left text-base font-normal shadow-sm ring-1 ring-foreground/10 transition-[color,box-shadow] outline-none hover:bg-card focus-visible:border-foreground/35 focus-visible:ring-3 focus-visible:ring-ring/25 data-[empty=true]:text-muted-foreground/75 md:text-sm"
                    >
                      <span className="flex items-center justify-between gap-1.5">
                        <span>{endDate ? format(endDate, 'PPP') : 'Choose an end date'}</span>
                        <ChevronBottom size={16} className="shrink-0 text-muted-foreground" />
                      </span>
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(nextDate: Date | undefined) =>
                      updateContractField('end_date', nextDate ? format(nextDate, 'yyyy-MM-dd') : '')
                    }
                    defaultMonth={endDate}
                  />
                </PopoverContent>
              </Popover>
              {fieldErrors.end_date ? <p className="text-xs text-destructive">{fieldErrors.end_date}</p> : null}
            </FieldBlock>
            <div className="md:col-span-2">
              <FieldBlock label="Notes">
                <Textarea
                  value={contract.notes}
                  onChange={(event) => updateContractField('notes', event.target.value)}
                  placeholder="Add context for the sponsor or IT team"
                />
              </FieldBlock>
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className={cn('flex cursor-pointer flex-row items-center justify-between rounded-lg border border-transparent bg-card p-4 shadow-sm ring-1 ring-foreground/10 transition-colors', isGoogleConnected ? 'hover:bg-muted/30' : 'cursor-default opacity-60 bg-muted/20')}>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Provision Google Workspace</p>
                  <p className="text-sm text-muted-foreground">
                    {isGoogleConnected
                      ? 'Automatically generate a Google account for this contractor.'
                      : 'Connect Google Workspace in settings to enable this feature.'}
                  </p>
                </div>
                <Switch
                  checked={contract.create_google_account}
                  onCheckedChange={(checked) => updateContractField('create_google_account', checked)}
                  disabled={!isGoogleConnected}
                />
              </label>

              <label className={cn('flex cursor-pointer flex-row items-center justify-between rounded-lg border border-transparent bg-card p-4 shadow-sm ring-1 ring-foreground/10 transition-colors', isSlackConnected ? 'hover:bg-muted/30' : 'cursor-default opacity-60 bg-muted/20')}>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Provision Slack</p>
                  <p className="text-sm text-muted-foreground">
                    {isSlackConnected
                      ? 'Automatically invite to Slack or notify admins to add manually.'
                      : 'Connect Slack in settings to enable this feature.'}
                  </p>
                </div>
                <Switch
                  checked={contract.create_slack_account}
                  onCheckedChange={(checked) => updateContractField('create_slack_account', checked)}
                  disabled={!isSlackConnected}
                />
              </label>

            </div>
          </div>
        </SectionCard>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link href="/contractors">
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            {loading ? 'Adding…' : 'Add contractor'}
          </Button>
        </div>
      </form>
    </div>
  );
}

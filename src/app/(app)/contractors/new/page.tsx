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
import { FieldBlock, FilterSelect, PageBackLink, PageHeader, SectionCard } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useGettingStarted } from '@/hooks/use-getting-started';

const departments = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Legal', 'Operations', 'Other'];

type FormField = 'name' | 'email' | 'phone' | 'job_title' | 'department' | 'start_date' | 'end_date';
type ValidationErrors = Partial<Record<FormField, string>>;

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
    application_access: [] as string[],
  });

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['applications-list'],
    queryFn: async () => (await applicationsApi.list()).data,
  });

  const availableApps = (appsData ?? []).filter((app: any) => {
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

  const updateContractField = (field: keyof typeof contract, value: any) => {
    setContract((prev) => ({ ...prev, [field]: value }));
    if (field !== 'notes' && field !== 'create_google_account' && field !== 'create_slack_account' && field !== 'application_access') {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setError('');
  };

  const toggleAppAccess = (appId: string) => {
    const current = contract.application_access;
    if (current.includes(appId)) {
      updateContractField('application_access', current.filter(id => id !== appId));
    } else {
      updateContractField('application_access', [...current, appId]);
    }
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
      const googleApp = appsData?.find((a: any) => a.application_id?.slug === 'google-workspace');
      const slackApp = appsData?.find((a: any) => a.application_id?.slug === 'slack');

      const finalAppAccess = contract.application_access.map(id => ({ tenant_application_id: id }));

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

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

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
              <FilterSelect
                value={form.department}
                onValueChange={(value) => updateFormField('department', value)}
                options={[{ label: 'Select department', value: '' }, ...departments.map((value) => ({ label: value, value }))]}
                placeholder="Select department"
              />
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

        <SectionCard title="Contract" description="Set the contract dates for this contractor.">
          <div className="grid gap-5 md:grid-cols-2">
            <FieldBlock label="Start date">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      data-empty={!startDate}
                      className="w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {startDate ? format(startDate, 'PPP') : <span>Choose a start date</span>}
                      <ChevronBottom data-icon="inline-end" size={16} />
                    </Button>
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
                    <Button
                      variant="outline"
                      data-empty={!endDate}
                      className="w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                    >
                      {endDate ? format(endDate, 'PPP') : <span>Choose an end date</span>}
                      <ChevronBottom data-icon="inline-end" size={16} />
                    </Button>
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
            <div className="md:col-span-2">
              <div className={cn("flex flex-row items-center justify-between rounded-lg border p-4 transition-colors", !isGoogleConnected && "opacity-60 bg-muted/20")}>
                <div className="space-y-0.5">
                  <span className="text-base font-medium">Provision Google Workspace</span>
                  <p className="text-sm text-muted-foreground">
                    {isGoogleConnected 
                      ? "Automatically generate a Google account for this contractor."
                      : "Connect Google Workspace in settings to enable this feature."}
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer disabled:cursor-not-allowed"
                  checked={contract.create_google_account}
                  onChange={(e) => updateContractField('create_google_account', e.target.checked)}
                  disabled={!isGoogleConnected}
                />
              </div>

              <div className={cn("flex flex-row items-center justify-between rounded-lg border p-4 transition-colors", !isSlackConnected && "opacity-60 bg-muted/20")}>
                <div className="space-y-0.5">
                  <span className="text-base font-medium">Provision Slack</span>
                  <p className="text-sm text-muted-foreground">
                    {isSlackConnected 
                      ? "Automatically invite to Slack or notify admins to add manually."
                      : "Connect Slack in settings to enable this feature."}
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer disabled:cursor-not-allowed"
                  checked={contract.create_slack_account}
                  onChange={(e) => updateContractField('create_slack_account', e.target.checked)}
                  disabled={!isSlackConnected}
                />
              </div>

              {availableApps.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Other Applications</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableApps.map((app: any) => (
                      <div 
                        key={app._id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors",
                          contract.application_access.includes(app._id) && "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                        )}
                        onClick={() => toggleAppAccess(app._id)}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-sm font-medium truncate">{app.display_name || app.application_id?.name || 'Unnamed App'}</p>
                          <p className="text-xs text-muted-foreground truncate">{app.application_id?.auth_type || 'Custom'}</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                          checked={contract.application_access.includes(app._id)}
                          onChange={() => {}} // Controlled by parent div click
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

'use client';

import { format, isValid, parseISO } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contractorsApi, tenantApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ChevronBottom } from '@/components/icons';
import { FieldBlock, FilterSelect, PageBackLink, PageHeader, SectionCard } from '@/components/app-ui';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

const departments = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Legal', 'Operations', 'Other'];

type FormField = 'name' | 'email' | 'phone' | 'job_title' | 'department' | 'sponsor_id' | 'start_date' | 'end_date';
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
    sponsor_id: '',
    start_date: '',
    end_date: '',
    notes: '',
  });

  const { data: usersData } = useQuery({
    queryKey: ['team'],
    queryFn: async () => (await tenantApi.listUsers()).data,
  });

  const sponsors =
    usersData?.data?.filter((user: Record<string, unknown>) => user.role === 'sponsor' || user.role === 'admin') ?? [];
  const startDate = contract.start_date ? parseISO(contract.start_date) : undefined;
  const endDate = contract.end_date ? parseISO(contract.end_date) : undefined;

  const updateFormField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  };

  const updateContractField = (field: keyof typeof contract, value: string) => {
    setContract((prev) => ({ ...prev, [field]: value }));
    if (field !== 'notes') {
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
    if (!contract.sponsor_id) nextErrors.sponsor_id = 'Select a sponsor.';
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
      await contractorsApi.create({
        ...form,
        notes: contract.notes,
        contract: {
          sponsor_id: contract.sponsor_id,
          start_date: contract.start_date,
          end_date: contract.end_date,
          create_google_account: false,
          application_access: [],
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
      <div className="flex items-start gap-4">
        <PageBackLink href="/contractors">Back to contractors</PageBackLink>
        <div className="flex-1">
          <PageHeader
            title="Add contractor"
            description="Add their details, contract dates, and sponsor."
          />
        </div>
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

        <SectionCard title="Contract" description="Set dates and assign a sponsor.">
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
              <FieldBlock label="Sponsor">
                <FilterSelect
                  value={contract.sponsor_id}
                  onValueChange={(value) => updateContractField('sponsor_id', value)}
                  options={[
                    { label: 'Select sponsor', value: '' },
                    ...sponsors.map((sponsor: Record<string, unknown>) => ({
                      label: `${String(sponsor.email)} (${String(sponsor.role)})`,
                      value: String(sponsor._id),
                    })),
                  ]}
                  placeholder="Select sponsor"
                />
                {fieldErrors.sponsor_id ? <p className="text-xs text-destructive">{fieldErrors.sponsor_id}</p> : null}
              </FieldBlock>
            </div>
            <div className="md:col-span-2">
              <FieldBlock label="Notes">
                <Textarea
                  value={contract.notes}
                  onChange={(event) => updateContractField('notes', event.target.value)}
                  placeholder="Add context for the sponsor or IT team"
                />
              </FieldBlock>
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

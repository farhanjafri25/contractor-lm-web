'use client';

import * as React from 'react';
import Papa from 'papaparse';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import posthog from 'posthog-js';
import { applicationsApi, contractorsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { CloudUpload, FileText, AlertTriangle, CheckCircle, Checkmark1, ArrowRight, ChevronBottom, ChevronRight } from '@/components/icons';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useQuery } from '@tanstack/react-query';
import { useGettingStarted } from '@/hooks/use-getting-started';

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'start_date', label: 'Start Date (YYYY-MM-DD)' },
  { key: 'end_date', label: 'End Date (YYYY-MM-DD)' },
];

const OPTIONAL_FIELDS = [
  { key: 'job_title', label: 'Job Title' },
  { key: 'department', label: 'Department' },
  { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'Location' },
  { key: 'notes', label: 'Notes' },
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

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

const STEPS = [
  { key: 'UPLOAD', label: 'Upload' },
  { key: 'MAP', label: 'Map fields' },
  { key: 'REVIEW', label: 'Review' },
] as const;

type ImporterStep = 'UPLOAD' | 'MAP' | 'REVIEW';
type CsvRow = Record<string, string>;
type BulkCreateContractor = {
  name: string;
  email: string;
  job_title?: string;
  department?: string;
  phone?: string;
  location?: string;
  notes?: string;
  contract: {
    start_date: string;
    end_date: string;
    create_google_account?: boolean;
    create_slack_account?: boolean;
    application_access?: { tenant_application_id: string }[];
  };
};
type BulkCreateFailure = {
  index: number;
  reason: string;
};
type BulkCreateResponse = {
  successful: number;
  failed: number;
  results: {
    failed: BulkCreateFailure[];
  };
};

const sanitizeString = (str: string | undefined | null) => {
  if (!str) return '';
  return str.toString().replace(/<[^>]*>?/gm, '').trim();
};

const parseDateString = (dateStr: string) => {
  if (!dateStr) return '';

  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const year = parts[2];

      let month = p1;
      let day = p0;

      if (p0 <= 12 && p1 > 12) {
        month = p0;
        day = p1;
      }
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return dateStr;
};

function StepIndicator({ currentStep }: { currentStep: ImporterStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={cn('h-px flex-1', isComplete ? 'bg-foreground/30' : 'bg-border')} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isComplete
                    ? 'bg-muted text-muted-foreground'
                    : isCurrent
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {isComplete ? <Checkmark1 size={14} /> : i + 1}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:inline',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function CsvImporter() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<ImporterStep>('UPLOAD');
  const [isDragOver, setIsDragOver] = React.useState(false);

  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [csvData, setCsvData] = React.useState<CsvRow[]>([]);

  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  type ValidationError = { row: number; message: string };
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = React.useState(0);
  const [excludedRows, setExcludedRows] = React.useState<Set<number>>(new Set());

  // Access setup state
  const [selectedAppIds, setSelectedAppIds] = React.useState<string[]>([]);
  const [createGoogleAccount, setCreateGoogleAccount] = React.useState(false);
  const [createSlackAccount, setCreateSlackAccount] = React.useState(false);
  const [batchAccessOpen, setBatchAccessOpen] = React.useState(false);

  const { data: appsData } = useQuery({
    queryKey: ['applications-list'],
    queryFn: async () => (await applicationsApi.list()).data as TenantApplication[],
    enabled: open,
  });

  const { isGoogleConnected, isSlackConnected } = useGettingStarted();

  const modifiableApps = (appsData ?? []).filter((app) => {
    const slug = app.application_id?.slug || String(app.app_key ?? '').trim().toLowerCase();
    return slug !== 'google-workspace' && slug !== 'slack';
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('UPLOAD');
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({});
    setValidationErrors([]);
    setDuplicates(0);
    setExcludedRows(new Set());
    setSelectedAppIds([]);
    setCreateGoogleAccount(false);
    setCreateSlackAccount(false);
    setIsDragOver(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(resetState, 300);
    }
  };

  const processFile = (file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          toast.error('Could not detect any columns in the CSV file.');
          return;
        }
        setCsvHeaders(results.meta.fields);
        setCsvData(results.data);

        const autoMap: Record<string, string> = {};
        ALL_FIELDS.forEach(f => {
          const match = results.meta.fields?.find(header => header.toLowerCase().includes(f.key.replace('_', ' ')));
          if (match) autoMap[f.key] = match;
        });
        setMapping(autoMap);

        setStep('MAP');
      },
      error: (err) => {
        toast.error(`Failed to parse CSV: ${err.message}`);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    } else {
      toast.error('Please upload a .csv file.');
    }
  };

  const validateData = (data: CsvRow[]) => {
    const errors: ValidationError[] = [];
    let duplicatedCount = 0;
    const emailSet = new Set<string>();
    let validCount = 0;

    data.forEach((row, i) => {
      const rowNum = i + 2;
      const rawName = row[mapping['name']] || '';
      const rawEmail = row[mapping['email']] || '';
      const rawStartDate = row[mapping['start_date']] || '';
      const rawEndDate = row[mapping['end_date']] || '';

      let rowHasError = false;

      if (!rawName.trim()) {
        errors.push({ row: rowNum, message: 'Name is required' });
        rowHasError = true;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!rawEmail.trim()) {
        errors.push({ row: rowNum, message: 'Email is required' });
        rowHasError = true;
      } else if (!emailRegex.test(rawEmail.trim())) {
        errors.push({ row: rowNum, message: 'Invalid email format' });
        rowHasError = true;
      } else {
        if (emailSet.has(rawEmail.trim())) {
          duplicatedCount++;
        } else {
          emailSet.add(rawEmail.trim());
        }
      }

      const parsedStart = parseDateString(rawStartDate);
      let startD: Date | null = null;
      if (!rawStartDate.trim()) {
        errors.push({ row: rowNum, message: 'Start date is required' });
        rowHasError = true;
      } else if (!parsedStart || isNaN(new Date(parsedStart).getTime())) {
        errors.push({ row: rowNum, message: 'Invalid start date format' });
        rowHasError = true;
      } else {
        startD = new Date(parsedStart);
      }

      if (rawEndDate.trim()) {
        const parsedEnd = parseDateString(rawEndDate);
        if (!parsedEnd || isNaN(new Date(parsedEnd).getTime())) {
          errors.push({ row: rowNum, message: 'Invalid end date format' });
          rowHasError = true;
        } else if (startD) {
          const endD = new Date(parsedEnd);
          if (endD <= startD) {
            errors.push({ row: rowNum, message: 'End date must be after start date' });
            rowHasError = true;
          }
        }
      }

      if (!rowHasError) {
        validCount++;
      }
    });

    return { errors, duplicates: duplicatedCount, validCount };
  };

  const handleMapContinue = () => {
    const missingRequired = REQUIRED_FIELDS.find(f => !mapping[f.key]);
    if (missingRequired) {
      toast.error(`Please map the required field: ${missingRequired.label}`);
      return;
    }

    const { errors, duplicates } = validateData(csvData);
    setValidationErrors(errors);
    setDuplicates(duplicates);

    setStep('REVIEW');
  };

  const handleRemoveInvalidRows = () => {
    const validData = csvData.filter((row, i) => !validationErrors.some(err => err.row === i + 2));
    setCsvData(validData);

    const { errors, duplicates } = validateData(validData);
    setValidationErrors(errors);
    setDuplicates(duplicates);
  };

  const { mutate: bulkCreate, isPending } = useMutation({
    mutationFn: async (args: { payload: BulkCreateContractor[]; indexMap: number[] }) => {
      const res = await contractorsApi.bulkCreate({ contractors: args.payload });
      return { ...(res.data as BulkCreateResponse), indexMap: args.indexMap };
    },
    onSuccess: (data) => {
      posthog.capture('csv_import_completed', { successful: data.successful, failed: data.failed });
      if (data.successful > 0) {
        toast.success(`Successfully imported ${data.successful} contractors.`);
      }

      if (data.failed > 0) {
        toast.error(`Failed to import ${data.failed} rows. Check the errors below.`);
        data.results.failed.forEach((f) => {
          const originalRowNumber = data.indexMap[f.index] + 2;
          toast.error(`File Row ${originalRowNumber}: ${f.reason}`, { duration: 10000 });
        });
      } else {
        setOpen(false);
      }

      queryClient.invalidateQueries({ queryKey: ['contractors'] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to perform bulk upload.'));
    }
  });

  const toggleRow = (index: number) => {
    setExcludedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllRows = (checked: boolean) => {
    if (checked) {
      setExcludedRows(new Set());
    } else {
      setExcludedRows(new Set(csvData.map((_, i) => i)));
    }
  };

  const selectedCount = csvData.length - excludedRows.size;
  const allSelected = excludedRows.size === 0 && csvData.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < csvData.length;

  const handleImport = () => {
    const emailSet = new Set<string>();
    const uniquePayloadWithIndices: { row: CsvRow; originalIndex: number }[] = [];

    csvData.forEach((row, i) => {
      if (excludedRows.has(i)) return;
      const email = sanitizeString(row[mapping['email']]).toLowerCase();
      if (email && !emailSet.has(email)) {
        emailSet.add(email);
        uniquePayloadWithIndices.push({ row, originalIndex: i });
      }
    });

    const payload = uniquePayloadWithIndices.map(({ row }) => {
      return {
        name: sanitizeString(row[mapping['name']]),
        email: sanitizeString(row[mapping['email']]),
        job_title: mapping['job_title'] ? sanitizeString(row[mapping['job_title']]) : undefined,
        department: mapping['department'] ? sanitizeString(row[mapping['department']]) : undefined,
        phone: mapping['phone'] ? sanitizeString(row[mapping['phone']]) : undefined,
        location: mapping['location'] ? sanitizeString(row[mapping['location']]) : undefined,
        notes: mapping['notes'] ? sanitizeString(row[mapping['notes']]) : undefined,
        contract: {
          start_date: parseDateString(sanitizeString(row[mapping['start_date']])),
          end_date: parseDateString(sanitizeString(row[mapping['end_date']])),
          create_google_account: createGoogleAccount,
          create_slack_account: createSlackAccount,
          application_access: selectedAppIds.map(id => ({ tenant_application_id: id })),
        }
      };
    });

    const indexMap = uniquePayloadWithIndices.map(u => u.originalIndex);
    bulkCreate({ payload, indexMap });
  };

  const mappedRequiredCount = REQUIRED_FIELDS.filter(f => mapping[f.key]).length;
  const mappedOptionalCount = OPTIONAL_FIELDS.filter(f => mapping[f.key]).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="secondary" className="shrink-0">
            Import CSV
          </Button>
        }
      />
      <DialogContent className="flex w-auto flex-col resize overflow-auto sm:min-w-200" style={{ maxHeight: 'min(640px, 85svh)', maxWidth: 'calc(100% - 2rem)', minWidth: 480, minHeight: 280 }}>
        <DialogHeader>
          <DialogTitle>Import contractors</DialogTitle>
          <div className="pt-2">
            <StepIndicator currentStep={step} />
          </div>
        </DialogHeader>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1">
          {/* UPLOAD STEP */}
          {step === 'UPLOAD' && (
            <div
              className={cn(
                'group relative flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center transition-colors',
                isDragOver
                  ? 'border-foreground/30 bg-muted/60'
                  : 'border-border bg-muted/30 hover:border-foreground/20 hover:bg-muted/40',
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CloudUpload size={20} />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">
                Drag and drop your CSV file here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or click below to browse. Headers must be in the first row.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText size={14} />
                Choose file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* MAP STEP */}
          {step === 'MAP' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText size={14} />
                <span>{csvData.length} rows detected with {csvHeaders.length} columns</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Required fields</Label>
                  <Badge variant={mappedRequiredCount === REQUIRED_FIELDS.length ? 'emerald' : 'neutral'}>
                    {mappedRequiredCount}/{REQUIRED_FIELDS.length} mapped
                  </Badge>
                </div>
                <div className="rounded-lg border bg-card">
                  {REQUIRED_FIELDS.map((field, i) => (
                    <div
                      key={field.key}
                      className={cn(
                        'flex items-center gap-4 px-4 py-2.5',
                        i < REQUIRED_FIELDS.length - 1 && 'border-b border-border/60',
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{field.label}</span>
                        <span className="text-xs text-destructive">*</span>
                      </div>
                      <div className="w-[55%] shrink-0">
                        <Select
                          value={mapping[field.key] || ''}
                          onValueChange={(val: string | null) =>
                            setMapping(prev => ({ ...prev, [field.key]: !val || val === 'ignore' ? '' : val }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore" className="text-muted-foreground">
                              — None —
                            </SelectItem>
                            {csvHeaders.map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Optional fields</Label>
                  {mappedOptionalCount > 0 && (
                    <Badge variant="neutral">{mappedOptionalCount} mapped</Badge>
                  )}
                </div>
                <div className="rounded-lg border bg-card">
                  {OPTIONAL_FIELDS.map((field, i) => (
                    <div
                      key={field.key}
                      className={cn(
                        'flex items-center gap-4 px-4 py-2.5',
                        i < OPTIONAL_FIELDS.length - 1 && 'border-b border-border/60',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{field.label}</span>
                      <div className="w-[55%] shrink-0">
                        <Select
                          value={mapping[field.key] || ''}
                          onValueChange={(val: string | null) =>
                            setMapping(prev => ({ ...prev, [field.key]: !val || val === 'ignore' ? '' : val }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore" className="text-muted-foreground">
                              — None —
                            </SelectItem>
                            {csvHeaders.map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {validationErrors.length > 0 ? (
                <>
                  <div className="rounded-lg border border-destructive/15 bg-destructive/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0 text-destructive" />
                      <p className="text-sm font-medium text-destructive">
                        {validationErrors.length} {validationErrors.length === 1 ? 'error' : 'errors'} found
                      </p>
                    </div>
                    <p className="mt-1 pl-5.5 text-xs text-destructive/80">
                      Fix these in your CSV and re-upload, or remove invalid rows to continue.
                    </p>
                  </div>

                  <div className="max-h-60 space-y-1.5 overflow-y-auto">
                    {validationErrors.map((err, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2.5"
                      >
                        <Badge variant="neutral" className="mt-px shrink-0 tabular-nums">
                          Row {err.row}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[10px] border border-border">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-3 text-left transition-transform active:scale-[0.97]"
                      onClick={() => setBatchAccessOpen((v) => !v)}
                    >
                      {batchAccessOpen ? <ChevronBottom size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                      <h4 className="text-sm font-semibold text-foreground">
                        Batch Access Setup
                      </h4>
                      <Badge variant="neutral" className="font-normal">Optional</Badge>
                    </button>

                    {batchAccessOpen && (
                      <div className="border-t border-border px-4 pb-4 pt-3">
                        <p className="text-xs text-muted-foreground">
                          Selected settings will be applied to all imported contractors.
                        </p>

                        <div className="mt-4 grid gap-6 sm:grid-cols-2">
                          <div className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground">Account Provisioning</Label>
                            <div className="space-y-2">
                              <label className={cn(
                                "flex items-center justify-between gap-3 rounded-[10px] border border-border/60 bg-background px-4 py-3 transition-colors",
                                isGoogleConnected ? "cursor-pointer hover:bg-muted/30" : "opacity-50 cursor-not-allowed"
                              )}>
                                 <div className="min-w-0">
                                    <p className="text-sm font-medium">Google Workspace</p>
                                    <p className="text-[11px] text-muted-foreground truncate">Create @company account</p>
                                 </div>
                                 <Switch
                                   checked={createGoogleAccount}
                                   onCheckedChange={setCreateGoogleAccount}
                                   disabled={!isGoogleConnected}
                                 />
                              </label>

                              <label className={cn(
                                "flex items-center justify-between gap-3 rounded-[10px] border border-border/60 bg-background px-4 py-3 transition-colors",
                                isSlackConnected ? "cursor-pointer hover:bg-muted/30" : "opacity-50 cursor-not-allowed"
                              )}>
                                 <div className="min-w-0">
                                    <p className="text-sm font-medium">Slack</p>
                                    <p className="text-[11px] text-muted-foreground truncate">Invite to workspace</p>
                                 </div>
                                 <Switch
                                   checked={createSlackAccount}
                                   onCheckedChange={setCreateSlackAccount}
                                   disabled={!isSlackConnected}
                                 />
                              </label>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-xs font-medium text-muted-foreground">Available Apps</Label>
                            {modifiableApps.length === 0 ? (
                               <div className="flex h-[94px] items-center justify-center rounded-[10px] border border-dashed border-border bg-background text-center">
                                  <p className="px-4 text-[11px] text-muted-foreground italic">No other managed apps found</p>
                               </div>
                            ) : (
                              <div className="grid gap-2 max-h-[140px] overflow-y-auto pr-1">
                                {modifiableApps.map((app) => {
                                  const appId = app._id;
                                  const appSlug = app.application_id?.slug || String(app.app_key ?? '').trim();
                                  const isChecked = selectedAppIds.includes(appId);
                                  return (
                                    <label
                                      key={appId}
                                      className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-border/60 bg-background px-4 py-3 transition-colors hover:bg-muted/30"
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() =>
                                          setSelectedAppIds((prev) =>
                                            isChecked ? prev.filter((id) => id !== appId) : [...prev, appId],
                                          )
                                        }
                                      />
                                      <span className="truncate text-sm font-medium">{app.display_name || app.application_id?.name || app.app_key}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60">
                        <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-foreground">Validation Passed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="emerald">{selectedCount} contractors</Badge>
                      {duplicates > 0 && <Badge variant="warning">{duplicates} duplicates</Badge>}
                    </div>
                  </div>

                  {csvData.length > 0 && (
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 pr-0">
                              <Checkbox
                                checked={allSelected}
                                indeterminate={someSelected}
                                onCheckedChange={toggleAllRows}
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Job Title</TableHead>
                            <TableHead>Start Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvData.map((row, i) => (
                            <TableRow key={i} className={cn(excludedRows.has(i) && 'opacity-40')}>
                              <TableCell className="pr-0">
                                <Checkbox
                                  checked={!excludedRows.has(i)}
                                  onCheckedChange={() => toggleRow(i)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{row[mapping['name']] || '—'}</TableCell>
                              <TableCell>{row[mapping['email']] || '—'}</TableCell>
                              <TableCell>{mapping['job_title'] ? row[mapping['job_title']] : '—'}</TableCell>
                              <TableCell className="tabular-nums">{parseDateString(row[mapping['start_date']] || '') || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Importing cannot be undone. Duplicate emails will be skipped.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'UPLOAD' && (
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          )}
          {step === 'MAP' && (
            <>
              <Button variant="outline" className="sm:mr-auto" onClick={() => { resetState(); }}>
                Back
              </Button>
              <Button onClick={handleMapContinue}>
                Review data
                <ArrowRight size={14} />
              </Button>
            </>
          )}
          {step === 'REVIEW' && validationErrors.length > 0 && (
            <>
              <Button variant="outline" className="sm:mr-auto" onClick={() => setStep('MAP')}>
                Back
              </Button>
              <Button onClick={handleRemoveInvalidRows} variant="secondary">
                Remove invalid rows
              </Button>
            </>
          )}
          {step === 'REVIEW' && validationErrors.length === 0 && (
            <>
              <Button variant="outline" className="sm:mr-auto" onClick={() => setStep('MAP')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isPending || selectedCount === 0}>
                {isPending ? 'Importing…' : `Import ${selectedCount} records`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

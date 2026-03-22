'use client';

import * as React from 'react';
import Papa from 'papaparse';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { contractorsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, AlertTriangle, CheckCircle } from '@/components/icons';
import { getApiErrorMessage } from '@/lib/api-errors';

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

type ImporterStep = 'UPLOAD' | 'MAP' | 'REVIEW';

const sanitizeString = (str: string | undefined | null) => {
  if (!str) return '';
  // Strictly strip out all HTML tags, script nodes, and bracket expressions to prevent XSS payloads
  return str.toString().replace(/<[^>]*>?/gm, '').trim();
};

const parseDateString = (dateStr: string) => {
  if (!dateStr) return '';
  
  // Extract patterns like DD-MM-YYYY or MM/DD/YYYY
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) { // Year is explicitly at the end
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const year = parts[2];
      
      let month = p1;
      let day = p0;
      
      // Heuristic: If p0 > 12, it must be the day (DD-MM-YYYY).
      // If p1 > 12, it must be the day (MM-DD-YYYY).
      if (p0 <= 12 && p1 > 12) {
        month = p0;
        day = p1;
      }
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    if (parts[0].length === 4) { // Year is at the start (YYYY-MM-DD or YYYY/MM/DD)
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }

  // Fallback to JS standard instantiation
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return dateStr;
};

export function CsvImporter() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<ImporterStep>('UPLOAD');
  
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [csvData, setCsvData] = React.useState<Record<string, string>[]>([]);
  
  // Mapping: backendKey -> csvHeader
  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  type ValidationError = { row: number; message: string };
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
  const [validRows, setValidRows] = React.useState(0);
  const [duplicates, setDuplicates] = React.useState(0);

  const resetState = () => {
    setStep('UPLOAD');
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({});
    setValidationErrors([]);
    setValidRows(0);
    setDuplicates(0);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(resetState, 300);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          toast.error('Could not detect any columns in the CSV file.');
          return;
        }
        setCsvHeaders(results.meta.fields);
        setCsvData(results.data);
        
        // Auto-map where possible (simple lowercase match)
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

    // Reset input value so the same file can be uploaded again if needed
    e.target.value = '';
  };

  const validateData = (data: Record<string, string>[]) => {
    const errors: ValidationError[] = [];
    let duplicatedCount = 0;
    const emailSet = new Set<string>();
    let validCount = 0;

    data.forEach((row, i) => {
      const rowNum = i + 2; // +1 for 0-index, +1 for header
      const rawName = row[mapping['name']] || '';
      const rawEmail = row[mapping['email']] || '';
      const rawStartDate = row[mapping['start_date']] || '';
      const rawEndDate = row[mapping['end_date']] || '';

      let rowHasError = false;

      // Name validation
      if (!rawName.trim()) {
        errors.push({ row: rowNum, message: 'name: Name is required' });
        rowHasError = true;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!rawEmail.trim()) {
        errors.push({ row: rowNum, message: 'email: Email is required' });
        rowHasError = true;
      } else if (!emailRegex.test(rawEmail.trim())) {
        errors.push({ row: rowNum, message: 'email: Invalid email format' });
        rowHasError = true;
      } else {
        if (emailSet.has(rawEmail.trim())) {
          duplicatedCount++;
        } else {
          emailSet.add(rawEmail.trim());
        }
      }

      // Start Date validation
      const parsedStart = parseDateString(rawStartDate);
      let startD: Date | null = null;
      if (!rawStartDate.trim()) {
        errors.push({ row: rowNum, message: 'startDate: Start date is required' });
        rowHasError = true;
      } else if (!parsedStart || isNaN(new Date(parsedStart).getTime())) {
        errors.push({ row: rowNum, message: 'startDate: Invalid date format' });
        rowHasError = true;
      } else {
        startD = new Date(parsedStart);
      }

      // End Date validation (if provided)
      if (rawEndDate.trim()) {
        const parsedEnd = parseDateString(rawEndDate);
        if (!parsedEnd || isNaN(new Date(parsedEnd).getTime())) {
          errors.push({ row: rowNum, message: 'endDate: Invalid date format' });
          rowHasError = true;
        } else if (startD) {
          const endD = new Date(parsedEnd);
          if (endD <= startD) {
            errors.push({ row: rowNum, message: 'endDate: End date must be after start date' });
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

    const { errors, duplicates, validCount } = validateData(csvData);
    setValidationErrors(errors);
    setDuplicates(duplicates);
    setValidRows(validCount);
    
    setStep('REVIEW');
  };

  const handleRemoveInvalidRows = () => {
    const validData = csvData.filter((row, i) => !validationErrors.some(err => err.row === i + 2));
    setCsvData(validData);
    
    const { errors, duplicates, validCount } = validateData(validData);
    setValidationErrors(errors);
    setDuplicates(duplicates);
    setValidRows(validCount);
  };

  const { mutate: bulkCreate, isPending } = useMutation({
    mutationFn: async (args: { payload: any[]; indexMap: number[] }) => {
      const res = await contractorsApi.bulkCreate({ contractors: args.payload });
      return { ...res.data, indexMap: args.indexMap };
    },
    onSuccess: (data) => {
      if (data.successful > 0) {
        toast.success(`Successfully imported ${data.successful} contractors.`);
      }
      
      if (data.failed > 0) {
        toast.error(`Failed to import ${data.failed} rows. Check the errors below.`);
        data.results.failed.forEach((f: any) => {
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

  const handleImport = () => {
    // Prevent duplicate emails locally before triggering the backend batch
    const emailSet = new Set<string>();
    const uniquePayloadWithIndices: { row: any; originalIndex: number }[] = [];
    
    csvData.forEach((row, i) => {
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
          end_date: parseDateString(sanitizeString(row[mapping['end_date']]))
        }
      };
    });
    
    const indexMap = uniquePayloadWithIndices.map(u => u.originalIndex);
    bulkCreate({ payload, indexMap });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger 
        render={
          <Button variant="outline" className="gap-2 shrink-0">
            <FileText size={16} />
            Import CSV
          </Button>
        } 
      />
      <DialogContent className="sm:max-w-[700px] overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Import Contractors</DialogTitle>
          <DialogDescription>
            {step === 'UPLOAD' && 'Upload a CSV file containing contractor records.'}
            {step === 'MAP' && 'Map your CSV columns to the required system fields.'}
            {step === 'REVIEW' && `Review ${csvData.length} records before finalizing the import.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'UPLOAD' && (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/30">
              <FileText size={48} className="text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground mb-6">Headers must be present in the first row.</p>
              <div className="relative">
                <Button type="button">Browse Files</Button>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={handleFileUpload} 
                />
              </div>
            </div>
          )}

          {step === 'MAP' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">Required Fields</h4>
                {REQUIRED_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm w-1/3">{field.label} <span className="text-red-500">*</span></span>
                    <Select value={mapping[field.key] || ''} onValueChange={(val: string | null) => setMapping(prev => ({ ...prev, [field.key]: !val || val === 'ignore' ? '' : val }))}>
                      <SelectTrigger className="w-2/3">
                        <SelectValue placeholder="Select CSV Column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore" className="text-muted-foreground italic">-- Do Not Map --</SelectItem>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">Optional Fields</h4>
                {OPTIONAL_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm w-1/3 text-muted-foreground">{field.label}</span>
                    <Select value={mapping[field.key] || ''} onValueChange={(val: string | null) => setMapping(prev => ({ ...prev, [field.key]: !val || val === 'ignore' ? '' : val }))}>
                      <SelectTrigger className="w-2/3">
                        <SelectValue placeholder="Select CSV Column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore" className="text-muted-foreground italic">-- Do Not Map --</SelectItem>
                        {csvHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'REVIEW' && (
            <div className="space-y-6">
              {validationErrors.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-red-50 text-red-800 rounded-md p-4 text-sm font-medium border border-red-100">
                    Found {validationErrors.length} error(s) in your data. Please fix these issues before importing.
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {validationErrors.map((err, idx) => (
                      <div key={idx} className="border border-red-200 rounded-md p-4 bg-white relative">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="text-red-500 w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-foreground">Row {err.row}</div>
                            <div className="text-sm text-muted-foreground">{err.message}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50/50 text-blue-800 rounded-md p-4 text-sm border border-blue-100">
                    Please fix the errors in your CSV file and upload it again, or remove the invalid rows and continue.
                  </div>
                </div>
              ) : (
                <div className="border border-green-200 rounded-md p-6 bg-green-50/50 mb-6">
                  <div className="flex items-center gap-2 mb-6">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">All data validated successfully!</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-700">{validRows}</div>
                      <div className="text-sm font-medium text-green-600 mt-1">Valid Records</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{duplicates}</div>
                      <div className="text-sm text-muted-foreground mt-1">Duplicates</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{validationErrors.length}</div>
                      <div className="text-sm text-muted-foreground mt-1">Errors</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-8 text-left">
                    Click "Import" to add these contractors to your system. This action cannot be undone.
                  </p>
                </div>
              )}

              {validationErrors.length === 0 && csvData.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader className="bg-muted bg-muted/50">
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Start Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row[mapping['name']] || '—'}</TableCell>
                          <TableCell>{row[mapping['email']] || '—'}</TableCell>
                          <TableCell>{mapping['job_title'] ? row[mapping['job_title']] : '—'}</TableCell>
                          <TableCell>{parseDateString(row[mapping['start_date']] || '') || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {csvData.length > 10 && (
                    <div className="p-3 text-center text-xs text-muted-foreground border-t bg-muted/30">
                      Showing 10 of {csvData.length} total rows.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          {step === 'UPLOAD' && (
            <Button variant="ghost" className="mr-auto" onClick={() => setOpen(false)}>Cancel</Button>
          )}
          {step === 'MAP' && (
            <>
              <Button variant="ghost" className="mr-auto" onClick={() => setStep('UPLOAD')}>Back</Button>
              <Button onClick={handleMapContinue}>Review Data</Button>
            </>
          )}
          {step === 'REVIEW' && validationErrors.length > 0 && (
            <>
              <Button variant="ghost" className="mr-auto" onClick={() => setStep('MAP')}>Back</Button>
              <Button onClick={handleRemoveInvalidRows} variant="secondary">
                Remove Invalid Rows & Continue
              </Button>
            </>
          )}
          {step === 'REVIEW' && validationErrors.length === 0 && (
            <>
              <Button variant="outline" className="mr-auto" onClick={() => setStep('MAP')}>Back</Button>
              <Button onClick={handleImport} disabled={isPending || validRows === 0}>
                {isPending ? 'Importing...' : `Import ${validRows} Records`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

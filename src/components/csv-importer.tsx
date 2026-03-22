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
import { FileText, Plus } from '@/components/icons';
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

  const resetState = () => {
    setStep('UPLOAD');
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({});
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
  };

  const handleMapContinue = () => {
    const missingRequired = REQUIRED_FIELDS.find(f => !mapping[f.key]);
    if (missingRequired) {
      toast.error(`Please map the required field: ${missingRequired.label}`);
      return;
    }
    setStep('REVIEW');
  };

  const { mutate: bulkCreate, isPending } = useMutation({
    mutationFn: async (payload: any) => await contractorsApi.bulkCreate({ contractors: payload }),
    onSuccess: (res) => {
      toast.success(`Successfully imported ${res.data.successful} contractors.`);
      if (res.data.failed > 0) {
        toast.error(`Failed to import ${res.data.failed} rows. Check formatting.`);
      }
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to perform bulk upload.'));
    }
  });

  const handleImport = () => {
    const payload = csvData.map(row => {
      return {
        name: row[mapping['name']] || '',
        email: row[mapping['email']] || '',
        job_title: mapping['job_title'] ? row[mapping['job_title']] : undefined,
        department: mapping['department'] ? row[mapping['department']] : undefined,
        phone: mapping['phone'] ? row[mapping['phone']] : undefined,
        location: mapping['location'] ? row[mapping['location']] : undefined,
        notes: mapping['notes'] ? row[mapping['notes']] : undefined,
        contract: {
          start_date: parseDateString(row[mapping['start_date']] || ''),
          end_date: parseDateString(row[mapping['end_date']] || '')
        }
      };
    });
    
    bulkCreate(payload);
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
            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-muted">
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

        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          {step === 'MAP' && <Button onClick={handleMapContinue}>Review Data</Button>}
          {step === 'REVIEW' && (
            <Button onClick={handleImport} disabled={isPending}>
              {isPending ? 'Importing...' : `Import ${csvData.length} Records`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

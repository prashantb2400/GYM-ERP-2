'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Info,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/api-client';
import { useBranch } from '@/hooks/useBranch';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import {
  parseExcelFileBuffer,
  ParseResult,
  ParsedMemberRow,
} from '@/lib/members/excel-parser';
import { downloadMemberImportTemplate } from '@/lib/members/template-generator';

interface MemberImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  existingPlans?: { id: string; name: string }[];
}

type Step = 'upload' | 'preview' | 'importing' | 'complete';

export function MemberImportModal({
  isOpen,
  onClose,
  onSuccess,
  existingPlans = [],
}: MemberImportModalProps) {
  const { branches, selectedBranchId, isOwner } = useBranch();
  const { usage, maxMembers, planName } = usePlanLimits();

  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Settings
  const [targetBranchId, setTargetBranchId] = useState<string>(selectedBranchId || '');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');

  // Import Progress
  const [importProgress, setImportProgress] = useState(0);
  const [currentBatchText, setCurrentBatchText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Final Results
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: string[];
  }>({ imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setStep('upload');
    setSelectedFile(null);
    setIsParsing(false);
    setParseResult(null);
    setImportProgress(0);
    setCurrentBatchText('');
    setIsImporting(false);
    setImportSummary({ imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] });
  };

  const handleClose = () => {
    if (isImporting) {
      toast.warning('Import is currently in progress. Please wait for the current batch to complete.');
      return;
    }
    resetState();
    onClose();
  };

  // 1. File Upload & Parse
  const processFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelFileBuffer(buffer);

      if (result.totalRows === 0) {
        toast.error('The selected file appears to be empty or has no recognizable data rows.');
        setIsParsing(false);
        return;
      }

      setParseResult(result);
      setStep('preview');
      toast.success(`Processed ${result.totalRows} rows: ${result.validRows.length} valid ready to import.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse Excel file';
      toast.error(`Excel parse error: ${msg}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Quota calculation - Unlocked for testing
  const remainingQuota = useMemo(() => {
    return Math.max(0, maxMembers - (usage?.currentMembers || 0));
  }, [maxMembers, usage?.currentMembers]);

  const wouldExceedQuota = false;

  // 2. Batch Execution
  const executeBatchImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setStep('importing');
    setIsImporting(true);
    setImportProgress(0);

    const validRows = parseResult.validRows;
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(validRows.length / BATCH_SIZE);

    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const errorLogs: string[] = [];

    for (let b = 0; b < totalBatches; b++) {
      const startIdx = b * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, validRows.length);
      const batchChunk = validRows.slice(startIdx, endIdx);

      setCurrentBatchText(`Saving batch ${b + 1} of ${totalBatches} (rows ${startIdx + 1}–${endIdx})...`);
      setImportProgress(Math.round(((b) / totalBatches) * 100));

      try {
        const res = await fetchWithAuth('/api/members/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            members: batchChunk,
            targetBranchId: targetBranchId || undefined,
            duplicateStrategy,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          totalFailed += batchChunk.length;
          errorLogs.push(`Batch ${b + 1} failed: ${data.error || 'Unknown server error'}`);
        } else {
          totalImported += data.importedCount || 0;
          totalUpdated += data.updatedCount || 0;
          totalSkipped += data.skippedCount || 0;
        }
      } catch (err: unknown) {
        totalFailed += batchChunk.length;
        const msg = err instanceof Error ? err.message : 'Network error';
        errorLogs.push(`Batch ${b + 1} network failure: ${msg}`);
      }
    }

    setImportProgress(100);
    setCurrentBatchText('Import finished!');
    setIsImporting(false);

    setImportSummary({
      imported: totalImported,
      updated: totalUpdated,
      skipped: totalSkipped,
      failed: totalFailed,
      errors: errorLogs,
    });

    setStep('complete');
    if (totalImported > 0 || totalUpdated > 0) {
      onSuccess?.();
    }
  };

  const planNames = useMemo(() => existingPlans.map(p => p.name), [existingPlans]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-zinc-100 p-6 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileSpreadsheet className="h-5 w-5 text-purple-400" />
            Bulk Member Import from Excel / CSV
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Seamlessly migrate historical members from your previous software into GymERP with automated counter sync and deduplication.
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar my-3 space-y-4 pr-1">
          
          {/* STEP 1: UPLOAD & CONFIGURATION */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drag & Drop Area */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-purple-500/60 bg-zinc-900/40 hover:bg-zinc-900/70 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group text-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform mb-3">
                  {isParsing ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
                </div>
                <p className="text-sm font-semibold text-zinc-200">
                  {isParsing ? 'Reading spreadsheet data...' : 'Click to browse or drag & drop Excel spreadsheet'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Supports Microsoft Excel (.xlsx, .xls) and standard CSV files</p>
              </div>

              {/* Template Download Prompt */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <Info className="h-4 w-4 text-purple-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">Need the standard spreadsheet format?</p>
                    <p className="text-[11px] text-zinc-500">Download our pre-formatted sample sheet with instructions and example rows.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => downloadMemberImportTemplate(planNames)}
                  className="gap-1.5 text-xs border-zinc-800 bg-zinc-950 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" /> Download Template (.xlsx)
                </Button>
              </div>

              {/* Import Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Branch Assignment */}
                {branches.length > 0 && isOwner && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                    <Label className="text-xs text-zinc-300 flex items-center gap-1.5 font-semibold">
                      <Building2 className="h-3.5 w-3.5 text-purple-400" /> Target Physical Branch
                    </Label>
                    <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs h-8 text-zinc-200">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-zinc-500">Assigns imported members to this facility.</p>
                  </div>
                )}

                {/* Duplicate Strategy */}
                <div className="space-y-1.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                  <Label className="text-xs text-zinc-300 font-semibold">If Member Phone Already Exists:</Label>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label
                      onClick={() => setDuplicateStrategy('skip')}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        duplicateStrategy === 'skip'
                          ? 'bg-purple-950/40 border-purple-600/70 text-zinc-200'
                          : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dup_strategy"
                        checked={duplicateStrategy === 'skip'}
                        onChange={() => setDuplicateStrategy('skip')}
                        className="mt-0.5 text-purple-600"
                      />
                      <div>
                        <strong className="text-zinc-200">Skip Duplicates</strong>
                        <span className="text-[11px] text-zinc-500 block">Recommended — preserves existing member data</span>
                      </div>
                    </label>

                    <label
                      onClick={() => setDuplicateStrategy('update')}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        duplicateStrategy === 'update'
                          ? 'bg-purple-950/40 border-purple-600/70 text-zinc-200'
                          : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dup_strategy"
                        checked={duplicateStrategy === 'update'}
                        onChange={() => setDuplicateStrategy('update')}
                        className="mt-0.5 text-purple-600"
                      />
                      <div>
                        <strong className="text-zinc-200">Update Existing</strong>
                        <span className="text-[11px] text-zinc-500 block">Overwrites email, plan, status & address</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* SaaS Quota Summary */}
              <div className="flex items-center justify-between text-[11px] text-zinc-500 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                <span>Active Plan: <strong className="text-zinc-300">{planName}</strong></span>
                <span>Member Quota: <strong className="text-purple-400">Unlimited</strong> (Testing Mode)</span>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION TABLE */}
          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              {/* Badges Summary */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-green-950/60 text-green-300 border-green-800/60 text-xs py-1 px-2.5 gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {parseResult.validRows.length} Ready to Import
                </Badge>

                {parseResult.invalidRows.length > 0 && (
                  <Badge className="bg-red-950/60 text-red-300 border-red-800/60 text-xs py-1 px-2.5 gap-1.5">
                    <XCircle className="h-3.5 w-3.5" />
                    {parseResult.invalidRows.length} Rows with Errors (Will be skipped)
                  </Badge>
                )}

                {parseResult.duplicatePhonesInFile.length > 0 && (
                  <Badge className="bg-amber-950/60 text-amber-300 border-amber-800/60 text-xs py-1 px-2.5 gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {parseResult.duplicatePhonesInFile.length} Duplicates inside file
                  </Badge>
                )}
              </div>

              {/* Quota warning */}
              {wouldExceedQuota && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Plan Quota Warning:</strong> Your current plan permits{' '}
                    <strong>{maxMembers}</strong> members (<strong>{remainingQuota}</strong> available). This spreadsheet contains{' '}
                    <strong>{parseResult.validRows.length}</strong> members. Please upgrade your subscription tier or reduce the spreadsheet rows.
                  </div>
                </div>
              )}

              {/* Scrollable Preview Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 max-h-60 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 sticky top-0">
                    <tr>
                      <th className="p-2.5 font-medium">Row</th>
                      <th className="p-2.5 font-medium">Full Name</th>
                      <th className="p-2.5 font-medium">Phone Number</th>
                      <th className="p-2.5 font-medium">Plan</th>
                      <th className="p-2.5 font-medium">Status</th>
                      <th className="p-2.5 font-medium">Due (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {parseResult.validRows.slice(0, 15).map(m => (
                      <tr key={m.rowNumber} className="hover:bg-zinc-900/40">
                        <td className="p-2.5 text-zinc-500">{m.rowNumber}</td>
                        <td className="p-2.5 font-sans font-medium text-zinc-100">{m.name}</td>
                        <td className="p-2.5">{m.phone}</td>
                        <td className="p-2.5 font-sans text-purple-400">{m.plan_name || '-'}</td>
                        <td className="p-2.5 font-sans capitalize">
                          <span className={m.status === 'active' ? 'text-green-400' : 'text-amber-400'}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-2.5">{m.total_due ? `₹${m.total_due}` : '₹0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseResult.validRows.length > 15 && (
                <p className="text-[11px] text-zinc-500 text-right">
                  Showing first 15 of {parseResult.validRows.length} preview rows.
                </p>
              )}

              {/* Errors list preview */}
              {parseResult.invalidRows.length > 0 && (
                <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl space-y-1.5 text-xs text-red-300">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Sample Validation Errors (these rows will be skipped safely):
                  </p>
                  <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-red-400">
                    {parseResult.invalidRows.slice(0, 5).map((ir, idx) => (
                      <li key={idx}>
                        Row {ir.rowNumber}: {ir.errors.map(e => e.message).join('; ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: IMPORTING PROGRESS */}
          {step === 'importing' && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-200">Writing Member Records to Database...</h3>
                <p className="text-xs text-zinc-400 font-mono">{currentBatchText}</p>
              </div>
              <div className="w-full max-w-md space-y-1.5">
                <Progress value={importProgress} className="h-2.5" />
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Progress</span>
                  <span>{importProgress}%</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 max-w-sm">
                Records are being batch-inserted with synchronized member codes. Please do not refresh the browser.
              </p>
            </div>
          )}

          {/* STEP 4: COMPLETE */}
          {step === 'complete' && (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-950/60 border border-green-800/60 flex items-center justify-center text-green-400">
                <Check className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100">Member Import Completed!</h3>
                <p className="text-xs text-zinc-400">Your live member roster has been synchronized with zero counter collisions.</p>
              </div>

              {/* Tally Cards */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                  <p className="text-lg font-bold text-green-400 font-mono">{importSummary.imported}</p>
                  <p className="text-[11px] text-zinc-400">Imported</p>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                  <p className="text-lg font-bold text-purple-400 font-mono">{importSummary.updated}</p>
                  <p className="text-[11px] text-zinc-400">Updated</p>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                  <p className="text-lg font-bold text-amber-400 font-mono">{importSummary.skipped}</p>
                  <p className="text-[11px] text-zinc-400">Skipped (Dupes)</p>
                </div>
              </div>

              {importSummary.failed > 0 && (
                <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-300 max-w-md text-left">
                  <p className="font-semibold">{importSummary.failed} rows failed to save:</p>
                  <ul className="list-disc pl-4 text-[11px] text-red-400 mt-1 space-y-0.5 font-mono">
                    {importSummary.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="border-t border-zinc-900 pt-3 flex items-center justify-between">
          {step === 'upload' && (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>

              <Button
                size="sm"
                onClick={executeBatchImport}
                disabled={parseResult?.validRows.length === 0 || wouldExceedQuota}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                Confirm & Import {parseResult?.validRows.length} Members <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex justify-end w-full">
              <Button size="sm" onClick={handleClose} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                Done & Close
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

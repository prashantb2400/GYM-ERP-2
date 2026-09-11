'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fingerprint, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '@/lib/utils/api-client';
import { FingerprintScannerManager } from '@/lib/fingerprint/drivers';
import type { FingerType, ScannerDeviceInfo, FingerprintTemplate, ScannerDriverId } from '@/lib/fingerprint/types';

interface FingerprintEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    member_code: string;
    biometric_enrolled?: boolean;
    fingerprint_finger?: string | null;
    photo_url?: string | null;
  };
  onSuccess?: () => void;
}

const FINGER_OPTIONS: { id: FingerType; label: string }[] = [
  { id: 'left_thumb', label: 'Left Thumb (Default)' },
  { id: 'right_thumb', label: 'Right Thumb' },
  { id: 'left_index', label: 'Left Index Finger' },
  { id: 'right_index', label: 'Right Index Finger' },
  { id: 'left_middle', label: 'Left Middle Finger' },
  { id: 'right_middle', label: 'Right Middle Finger' },
];

export function FingerprintEnrollmentModal({
  isOpen,
  onClose,
  member,
  onSuccess,
}: FingerprintEnrollmentModalProps) {
  const [consentGiven, setConsentGiven] = useState(false);
  const [selectedFinger, setSelectedFinger] = useState<FingerType>(
    (member.fingerprint_finger as FingerType) || 'left_thumb'
  );
  const [deviceInfo, setDeviceInfo] = useState<ScannerDeviceInfo | null>(null);
  const [isDetectingDevice, setIsDetectingDevice] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedTemplate, setCapturedTemplate] = useState<FingerprintTemplate | null>(null);
  const [qualityScore, setQualityScore] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const manager = FingerprintScannerManager.getInstance();

  // Detect active scanner hardware on modal open
  const detectDevice = useCallback(async () => {
    setIsDetectingDevice(true);
    setErrorMessage(null);
    try {
      const info = await manager.detectActiveScanner();
      setDeviceInfo(info);
    } catch {
      setDeviceInfo({
        driverId: 'virtual',
        name: 'Virtual Optical Sensor (Simulator)',
        connected: true,
      });
    } finally {
      setIsDetectingDevice(false);
    }
  }, [manager]);

  useEffect(() => {
    if (isOpen) {
      detectDevice();
      setCapturedTemplate(null);
      setQualityScore(0);
      setConsentGiven(false);
      setErrorMessage(null);
    }
  }, [isOpen, detectDevice]);

  // Handle capture
  const handleCapture = async () => {
    if (!consentGiven) {
      toast.error('DPDP biometric consent agreement is required.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    try {
      const result = await manager.capture(selectedFinger);
      if (!result.success || !result.template) {
        throw new Error(result.error || 'Failed to capture clear fingerprint');
      }

      setCapturedTemplate(result.template);
      setQualityScore(result.quality);

      if (result.quality >= 70) {
        toast.success(`Fingerprint captured with ${result.quality}% quality!`);
      } else {
        toast.warning(`Fair scan (${result.quality}%). You may re-scan with firmer touch.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scanner error';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsScanning(false);
    }
  };

  // Save enrolled fingerprint
  const handleSave = async () => {
    if (!capturedTemplate) {
      toast.error('Please capture a fingerprint first');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetchWithAuth(`/api/members/${member.id}/fingerprint-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: capturedTemplate,
          finger: selectedFinger,
          quality: qualityScore,
          consentGiven: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save biometric enrollment');
      }

      toast.success(`Biometric fingerprint enrolled for ${member.name}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete enrolled fingerprint (DPDP right to erasure)
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this member\'s enrolled fingerprint template?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/members/${member.id}/fingerprint-enroll`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete template');

      toast.success('Biometric fingerprint data permanently erased.');
      setCapturedTemplate(null);
      setQualityScore(0);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Switch driver manually (e.g. user wants to toggle between Mantra and Virtual)
  const handleDriverChange = (driverId: ScannerDriverId) => {
    manager.setActiveDriver(driverId);
    detectDevice();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-purple-400" />
              Enroll Biometric Fingerprint
            </DialogTitle>
            <Badge
              variant="outline"
              className={
                member.biometric_enrolled
                  ? 'border-green-500/30 text-green-400 bg-green-500/10 text-[10px]'
                  : 'border-zinc-800 text-zinc-400 text-[10px]'
              }
            >
              {member.biometric_enrolled ? 'Enrolled ✓' : 'Not Enrolled'}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Enrolling biometric pass for <strong className="text-zinc-200">{member.name}</strong> ({member.member_code}).
          </DialogDescription>
        </DialogHeader>

        {/* Scanner Hardware Status Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-purple-400" />
            <div className="space-y-0.5">
              <span className="font-semibold text-zinc-200 block text-[11px]">
                {deviceInfo?.name || 'Probing Scanner...'}
              </span>
              <span className="text-[10px] text-zinc-400 block">
                {deviceInfo?.driverId === 'virtual' ? 'Simulator Active' : `Port ${deviceInfo?.port || 'USB'}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Select
              value={deviceInfo?.driverId || 'virtual'}
              onValueChange={(val) => handleDriverChange(val as ScannerDriverId)}
            >
              <SelectTrigger className="h-7 text-[10px] border-zinc-800 bg-zinc-950 text-zinc-300 w-28">
                <SelectValue placeholder="Driver" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectItem value="mantra">Mantra MFS100</SelectItem>
                <SelectItem value="secugen">SecuGen Pro 20</SelectItem>
                <SelectItem value="bridge">Hardware Bridge</SelectItem>
                <SelectItem value="virtual">Virtual Sensor</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="icon"
              variant="ghost"
              onClick={detectDevice}
              disabled={isDetectingDevice}
              className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
              title="Rescan hardware"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isDetectingDevice ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Finger Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Select Finger to Enroll</label>
          <Select
            value={selectedFinger}
            onValueChange={(val) => setSelectedFinger(val as FingerType)}
          >
            <SelectTrigger className="h-9 border-zinc-800 bg-zinc-900 text-zinc-200 text-xs">
              <SelectValue placeholder="Select Finger" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
              {FINGER_OPTIONS.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Optical Sensor Graphic / Visualizer */}
        <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 overflow-hidden">
          {/* Glowing scanner ring */}
          <div
            className={`relative h-28 w-28 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
              isScanning
                ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-105'
                : capturedTemplate
                ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                : 'border-zinc-700 hover:border-purple-500/50'
            }`}
          >
            <Fingerprint
              className={`h-16 w-16 transition-colors duration-300 ${
                isScanning
                  ? 'text-purple-400 animate-pulse'
                  : capturedTemplate
                  ? 'text-green-400'
                  : 'text-zinc-600'
              }`}
            />

            {/* Laser scanning line animation */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_10px_#a855f7] animate-bounce" />
            )}
          </div>

          {/* Status message */}
          <div className="text-center mt-3 space-y-1">
            <p className="text-xs font-semibold text-zinc-200">
              {isScanning
                ? 'Scanning... Place finger firmly on optical glass'
                : capturedTemplate
                ? `Capture Complete (${capturedTemplate.minutiae.length} Minutiae Points)`
                : 'Sensor Ready — Press "Start Scan"'}
            </p>
            {capturedTemplate && (
              <div className="flex items-center justify-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    qualityScore >= 75
                      ? 'text-green-400 border-green-500/30 bg-green-500/10'
                      : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                  }`}
                >
                  Quality: {qualityScore}%
                </Badge>
                <span className="text-[10px] text-zinc-500">
                  {FINGER_OPTIONS.find((f) => f.id === selectedFinger)?.label.split(' ')[0]}
                </span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-2 text-[11px] text-red-400 flex items-center gap-1.5 text-center">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* DPDP Consent Checkbox */}
        <div className="flex items-start space-x-2.5 p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <Checkbox
            id="dpdp-consent-fp"
            checked={consentGiven}
            onCheckedChange={(checked) => setConsentGiven(!!checked)}
            className="mt-0.5 border-zinc-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
          />
          <label
            htmlFor="dpdp-consent-fp"
            className="text-[11px] text-zinc-300 leading-snug cursor-pointer select-none"
          >
            <strong className="text-zinc-100 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400 inline" />
              DPDP Act Compliance:
            </strong>{' '}
            Member gives explicit consent to store encrypted minutiae mathematical templates for automated attendance. Raw images are never shared.
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCapture}
              disabled={isScanning || !consentGiven}
              className="flex-1 border-purple-600/40 text-purple-300 hover:bg-purple-950/30 text-xs h-9 font-semibold gap-1.5"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <Fingerprint className="h-3.5 w-3.5" />
                  {capturedTemplate ? 'Re-scan Finger' : 'Start Scan'}
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={!capturedTemplate || isSaving || isScanning}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 font-semibold gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save Biometrics
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-1">
            {member.biometric_enrolled ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs h-8 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? 'Deleting...' : 'Erase Biometrics'}
              </Button>
            ) : (
              <span />
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 text-xs h-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Printer,
  Activity,
  Fingerprint,
  ScanFace,
  QrCode,
} from 'lucide-react';
import { FingerprintEnrollmentModal } from '@/components/attendance/FingerprintEnrollmentModal';
import { FaceEnrollmentModal } from '@/components/attendance/FaceEnrollmentModal';
import { PrintIdCardModal } from '@/components/members/PrintIdCardModal';
import { toast } from 'sonner';

interface MemberRegistrationSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createdMember: any;
  createdInvoice: any;
  createdDietChart: any;
  createdExerciseChart: any;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  dietChoiceLabel: string;
  fitnessLevelLabel: string;
  gymName?: string;
  onResetForm: () => void;
}

export function MemberRegistrationSuccessModal({
  open,
  onOpenChange,
  createdMember,
  createdInvoice,
  createdDietChart,
  createdExerciseChart,
  totalAmount,
  amountPaid,
  amountDue,
  dietChoiceLabel,
  fitnessLevelLabel,
  gymName,
  onResetForm,
}: MemberRegistrationSuccessModalProps) {
  const router = useRouter();
  const [faceEnrollOpen, setFaceEnrollOpen] = React.useState(false);
  const [fingerprintEnrollOpen, setFingerprintEnrollOpen] = React.useState(false);
  const [printIdOpen, setPrintIdOpen] = React.useState(false);
  const [faceEnrolledSuccess, setFaceEnrolledSuccess] = React.useState(false);
  const [fingerprintEnrolledSuccess, setFingerprintEnrolledSuccess] = React.useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100 p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Member Enrolled Successfully!
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {createdMember?.name} ({createdMember?.member_code}) is officially registered.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Summary Grid */}
          <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Plan Assigned:</span>
              <span className="font-semibold text-zinc-200">{createdMember?.plan_name || 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Assigned Branch:</span>
              <span className="font-semibold text-zinc-200">{createdMember?.branch_name || 'Main Branch'}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800/60 pt-2">
              <span className="text-zinc-400">Total Invoice Amount:</span>
              <span className="font-semibold text-zinc-200">₹{createdInvoice?.total || totalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Amount Paid:</span>
              <span className="font-semibold text-green-400">₹{createdInvoice?.amount_paid || amountPaid}</span>
            </div>
            {Number(createdInvoice?.amount_due || amountDue) > 0 && (
              <div className="flex justify-between text-amber-400 font-semibold">
                <span>Balance Due:</span>
                <span>₹{createdInvoice?.amount_due || amountDue}</span>
              </div>
            )}
            {createdDietChart && (
              <div className="flex justify-between items-center text-xs border-t border-zinc-800/60 pt-2">
                <span className="text-zinc-400">Assigned Diet:</span>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                  {dietChoiceLabel} • {createdDietChart.target_calories} kcal
                </Badge>
              </div>
            )}
            {createdExerciseChart && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Assigned Workout:</span>
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                  {fitnessLevelLabel.split(' ')[0]} Split ({createdExerciseChart.days?.length || 3} Days)
                </Badge>
              </div>
            )}
          </div>

          {/* Counter Actions with Precautions */}
          <div className="space-y-2.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Immediate Counter Actions (With Precautions)
            </p>

            {/* Action 1: Print Invoice Receipt */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200">Print Invoice Receipt</span>
                  <Badge variant="outline" className="text-[9px] text-green-400 border-green-500/30">Tax Invoice</Badge>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Includes member's tailored nutrition &amp; workout blueprint.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (createdInvoice?.id) {
                    window.open(`/api/invoices/${createdInvoice.id}/pdf`, '_blank');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-8 font-semibold shrink-0 ml-3 active:scale-[0.97]"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </Button>
            </div>

            {/* Action 1b: View & Print Individual Blueprint PDFs */}
            {(createdDietChart || createdExerciseChart) && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-900/40 bg-indigo-950/20 hover:bg-indigo-950/30 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-200">Diet &amp; Workout Blueprint</span>
                    <Badge variant="outline" className="text-[9px] text-indigo-300 border-indigo-500/30">Generated</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Standalone printable meal chart and training schedule.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  {createdDietChart?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/diet/${createdDietChart.id}/pdf`, '_blank')}
                      className="border-indigo-700/60 hover:bg-indigo-900/40 text-indigo-300 text-xs h-8 px-2.5 active:scale-[0.97]"
                    >
                      Diet PDF
                    </Button>
                  )}
                  {createdExerciseChart?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/exercise/${createdExerciseChart.id}/pdf`, '_blank')}
                      className="border-indigo-700/60 hover:bg-indigo-900/40 text-indigo-300 text-xs h-8 px-2.5 active:scale-[0.97]"
                    >
                      Workout PDF
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Action 2: Biometric Fingerprint */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200">Enroll Fingerprint Biometrics</span>
                  {fingerprintEnrolledSuccess ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px]">Enrolled ✓</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] text-purple-400 border-purple-500/30">Primary</Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Instant optical touch check-in. <em>Mantra MFS100 / SecuGen / Virtual sensor.</em>
                </p>
              </div>
              <Button
                size="sm"
                variant={fingerprintEnrolledSuccess ? "outline" : "default"}
                onClick={() => setFingerprintEnrollOpen(true)}
                className={fingerprintEnrolledSuccess 
                  ? "border-green-700/50 text-green-400 text-xs h-8 shrink-0 ml-3 active:scale-[0.97]" 
                  : "bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-8 font-semibold shrink-0 ml-3 active:scale-[0.97]"
                }
              >
                <Fingerprint className="h-3.5 w-3.5" />
                {fingerprintEnrolledSuccess ? 'Re-enroll' : 'Enroll Finger'}
              </Button>
            </div>

            {/* Action 3: Face ID Biometrics */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ScanFace className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200">Enroll Face ID Biometrics</span>
                  {faceEnrolledSuccess ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px]">Enrolled ✓</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30">Optional</Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Contactless kiosk check-in. <em>Precaution: DPDP consent required; can be skipped.</em>
                </p>
              </div>
              <Button
                size="sm"
                variant={faceEnrolledSuccess ? "outline" : "default"}
                onClick={() => setFaceEnrollOpen(true)}
                className={faceEnrolledSuccess 
                  ? "border-green-700/50 text-green-400 text-xs h-8 shrink-0 ml-3 active:scale-[0.97]" 
                  : "bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-8 font-semibold shrink-0 ml-3 active:scale-[0.97]"
                }
              >
                <ScanFace className="h-3.5 w-3.5" />
                {faceEnrolledSuccess ? 'Re-enroll' : 'Enroll Face'}
              </Button>
            </div>

            {/* Action 4: Print Member ID Card */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200">Print Member ID Card</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Physical badge with QR attendance pass and gym branding.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPrintIdOpen(true)}
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5 h-8 shrink-0 ml-3 active:scale-[0.97]"
              >
                <Printer className="h-3.5 w-3.5" />
                Print ID Card
              </Button>
            </div>
          </div>

          {/* Navigation options */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-900 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetForm}
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs active:scale-[0.97]"
            >
              + Add Another Member
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/members')}
                className="text-zinc-400 text-xs"
              >
                Members List
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/members/${createdMember?.id}`)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold active:scale-[0.97]"
              >
                View Profile →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fingerprint Enrollment Modal */}
      {createdMember && (
        <FingerprintEnrollmentModal
          isOpen={fingerprintEnrollOpen}
          onClose={() => setFingerprintEnrollOpen(false)}
          member={{
            id: createdMember.id,
            name: createdMember.name,
            member_code: createdMember.member_code,
            biometric_enrolled: fingerprintEnrolledSuccess,
            photo_url: createdMember.photo_url,
          }}
          onSuccess={() => {
            setFingerprintEnrolledSuccess(true);
            toast.success(`Fingerprint biometric enrolled for ${createdMember.name}!`);
          }}
        />
      )}

      {/* Face Enrollment Modal */}
      {createdMember && (
        <FaceEnrollmentModal
          isOpen={faceEnrollOpen}
          onClose={() => setFaceEnrollOpen(false)}
          member={{
            id: createdMember.id,
            name: createdMember.name,
            member_code: createdMember.member_code,
            face_enrolled: faceEnrolledSuccess,
            photo_url: createdMember.photo_url,
          }}
          onSuccess={() => {
            setFaceEnrolledSuccess(true);
            toast.success(`Face ID enrolled for ${createdMember.name}!`);
          }}
        />
      )}

      {/* Print ID Card Modal */}
      {createdMember && (
        <PrintIdCardModal
          isOpen={printIdOpen}
          onClose={() => setPrintIdOpen(false)}
          gymName={gymName}
          member={{
            id: createdMember.id,
            name: createdMember.name,
            member_code: createdMember.member_code,
            photo_url: createdMember.photo_url,
            phone: createdMember.phone,
            blood_group: createdMember.blood_group,
            plan_name: createdMember.plan_name,
            plan_start_date: createdMember.plan_start_date,
            plan_end_date: createdMember.plan_end_date,
            branch_name: createdMember.branch_name,
            emergency_contact: createdMember.emergency_contact,
            qr_token: createdMember.qr_token,
            status: createdMember.status,
            admission_date: createdMember.admission_date,
          }}
        />
      )}
    </>
  );
}

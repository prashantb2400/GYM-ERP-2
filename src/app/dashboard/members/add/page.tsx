'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  User,
  CreditCard,
  UserCheck,
  FileCheck,
  ClipboardList,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Camera,
  Upload,
  Printer,
  ScanFace,
  Fingerprint,
  QrCode,
  CheckCircle2,
  Sparkles,
  Zap,
  Check,
  ArrowRight,
  Activity,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { INDIAN_STATES, BLOOD_GROUPS, GENDER_OPTIONS, FITNESS_LEVELS, PAYMENT_MODES, KYC_DOC_TYPES } from '@/lib/utils/constants';
import { calculateGST } from '@/lib/utils/format';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { useBranch } from '@/hooks/useBranch';
import { useGym } from '@/hooks/useGym';
import { CameraCaptureModal } from '@/components/shared/CameraCaptureModal';
import { FaceEnrollmentModal } from '@/components/attendance/FaceEnrollmentModal';
import { FingerprintEnrollmentModal } from '@/components/attendance/FingerprintEnrollmentModal';
import { PrintIdCardModal } from '@/components/members/PrintIdCardModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function AddMemberPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();
  const { gym } = useGym();
  const { canAddMember, maxMembers, usage, planName } = usePlanLimits();
  const { branches, selectedBranchId, isOwner } = useBranch();

  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberBranchId, setMemberBranchId] = useState('');

  // Post-Registration Action States
  const [createdMember, setCreatedMember] = useState<any | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [faceEnrollOpen, setFaceEnrollOpen] = useState(false);
  const [fingerprintEnrollOpen, setFingerprintEnrollOpen] = useState(false);
  const [printIdOpen, setPrintIdOpen] = useState(false);
  const [faceEnrolledSuccess, setFaceEnrolledSuccess] = useState(false);
  const [fingerprintEnrolledSuccess, setFingerprintEnrolledSuccess] = useState(false);

  const handleResetForm = () => {
    setName('');
    setPhone('');
    setWhatsappPhone('');
    setEmail('');
    setDob('');
    setGender('');
    setBloodGroup('');
    setAddress('');
    setCity('');
    setState('');
    setPin('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setEmergencyName('');
    setEmergencyRelation('');
    setEmergencyPhone('');
    setSelectedPlanId('');
    setAdmissionFee('0');
    setDiscountPercent('0');
    setAmountPaid('0');
    setPaymentMode('');
    setTransactionId('');
    setTrainerId('');
    setHasLocker(false);
    setLockerNumber('');
    setHeightCm('');
    setWeightKg('');
    setFitnessLevel('');
    setHealthGoals([]);
    setMedicalConditions('');
    setTimingSlot('');
    setKycType('');
    setKycFile(null);
    setKycPreview(null);
    setCreatedMember(null);
    setCreatedInvoice(null);
    setFaceEnrolledSuccess(false);
    setFingerprintEnrolledSuccess(false);
    setFingerprintEnrollOpen(false);
    setSuccessModalOpen(false);
    setStep(1);
  };

  useEffect(() => {
    if (selectedBranchId) {
      setMemberBranchId(selectedBranchId);
    } else if (branches.length > 0) {
      setMemberBranchId(user?.branchId || branches[0].id);
    }
  }, [selectedBranchId, branches, user?.branchId]);

  // --- Step 1: Personal Info ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pin, setPin] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  
  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // --- Step 2: Plan & Payment ---
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [admissionFee, setAdmissionFee] = useState('0');
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [amountPaid, setAmountPaid] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'bank_transfer' | 'online' | ''>('');
  const [transactionId, setTransactionId] = useState('');

  // Auto-calculated fields
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [planEndDate, setPlanEndDate] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountDue, setAmountDue] = useState(0);

  // --- Step 3: Extras & Fitness ---
  const [trainerId, setTrainerId] = useState('');
  const [hasLocker, setHasLocker] = useState(false);
  const [lockerNumber, setLockerNumber] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('');
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState('');
  const [timingSlot, setTimingSlot] = useState('');

  // --- Step 4: KYC ---
  const [kycType, setKycType] = useState<'aadhaar' | 'pan' | 'driving_license' | 'passport' | 'other' | ''>('');
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycPreview, setKycPreview] = useState<string | null>(null);

  // Load plans & trainers
  useEffect(() => {
    if (!user?.gymId) return;

    const loadFormData = async () => {
      // Load active plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('gym_id', user.gymId)
        .eq('is_active', true);
      setPlans(plansData || []);

      // Load active staff (trainers)
      const { data: trainersData } = await supabase
        .from('users')
        .select('id, name')
        .eq('gym_id', user.gymId)
        .eq('role', 'trainer')
        .eq('is_active', true);
      setTrainers(trainersData || []);
    };

    loadFormData();
  }, [user?.gymId, supabase]);

  // Recalculate plan dates & billing amounts
  useEffect(() => {
    if (!selectedPlanId) {
      setSelectedPlan(null);
      setPlanEndDate('');
      setSubtotal(0);
      setDiscountAmount(0);
      setCgst(0);
      setSgst(0);
      setTotalAmount(0);
      setAmountDue(0);
      return;
    }

    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    setSelectedPlan(plan);

    // End date calculation
    const start = new Date(planStartDate);
    start.setDate(start.getDate() + plan.duration_days);
    setPlanEndDate(start.toISOString().split('T')[0]);

    // Financial calculations
    const planPrice = Number(plan.price) || 0;
    const admFee = Number(admissionFee) || 0;
    const calcSubtotal = planPrice + admFee;
    const discPercent = Number(discountPercent) || 0;
    const discAmt = Math.round(((calcSubtotal * discPercent) / 100) * 100) / 100;
    const { cgst: cgstVal, sgst: sgstVal, total: totalVal } = calculateGST(calcSubtotal, discAmt);

    setSubtotal(calcSubtotal);
    setDiscountAmount(discAmt);
    setCgst(cgstVal);
    setSgst(sgstVal);
    setTotalAmount(totalVal);

    const paid = Number(amountPaid) || 0;
    setAmountDue(Math.max(0, totalVal - paid));
  }, [selectedPlanId, planStartDate, discountPercent, amountPaid, admissionFee, plans]);

  // Auto-copy phone to WhatsApp phone by default
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setPhone(clean);
    if (!whatsappPhone) {
      setWhatsappPhone(clean);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKycUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKycFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setKycPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGoalToggle = (goal: string) => {
    setHealthGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  // Real-time BMI calculation
  const heightM = Number(heightCm) ? Number(heightCm) / 100 : 0;
  const weightNum = Number(weightKg) || 0;
  const liveBmi = heightM > 0 && weightNum > 0 ? Math.round((weightNum / (heightM * heightM)) * 10) / 10 : null;

  const getBmiCategory = (bmiVal: number) => {
    if (bmiVal < 18.5) return { label: 'Underweight', color: 'text-sky-400', badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
    if (bmiVal < 25.0) return { label: 'Normal / Healthy', color: 'text-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    if (bmiVal < 30.0) return { label: 'Overweight', color: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    return { label: 'Obese', color: 'text-rose-400', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === step) return;
    if (targetStep > step) {
      if (step === 1 && (!name.trim() || !phone.trim() || phone.length !== 10)) {
        toast.error('Please enter name and a valid 10-digit phone number first');
        return;
      }
      if (step === 2 && targetStep > 2 && !selectedPlanId) {
        toast.error('Please select a membership plan first');
        return;
      }
    }
    setStep(targetStep);
  };

  const handleFastSkipToReview = () => {
    if (!name.trim() || !phone.trim() || phone.length !== 10) {
      toast.error('Please enter name and valid 10-digit phone first');
      setStep(1);
      return;
    }
    if (!selectedPlanId) {
      toast.error('Please select a membership plan');
      setStep(2);
      return;
    }
    setStep(5);
    toast.info('Skipped optional steps to final review');
  };

  const handleSetPaymentPreset = (preset: 'full' | 'half' | 'zero') => {
    if (preset === 'full') {
      setAmountPaid(String(totalAmount));
      if (!paymentMode) setPaymentMode('upi');
    } else if (preset === 'half') {
      setAmountPaid(String(Math.round(totalAmount / 2)));
      if (!paymentMode) setPaymentMode('upi');
    } else if (preset === 'zero') {
      setAmountPaid('0');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim() || !phone.trim() || phone.length !== 10) {
        toast.error('Please enter name and a valid 10-digit phone number');
        return;
      }
    }
    if (step === 2) {
      if (!selectedPlanId) {
        toast.error('Please select a membership plan');
        return;
      }
      if (!paymentMode && Number(amountPaid) > 0) {
        toast.error('Please select a payment mode');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleOnboardMember = async () => {
    if (!user?.gymId) return;

    try {
      setLoading(true);

      // 1. Generate member code GYM0001
      let memberCode = '';
      try {
        const { data: codeData, error: codeError } = await supabase.rpc('generate_member_code', {
          p_gym_id: user.gymId,
        });
        if (!codeError && codeData) {
          memberCode = codeData;
        }
      } catch (err) {
        console.warn('generate_member_code RPC call error, falling back:', err);
      }

      if (!memberCode) {
        // Fallback: Query current member count directly
        const { count } = await supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('gym_id', user.gymId);
        const nextNum = (count || 0) + 1;
        memberCode = `GYM${String(nextNum).padStart(4, '0')}`;
      }

      // 2. Upload Member Photo (if any)
      let photoUrl: string | null = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${memberCode}_profile.${fileExt}`;
        const filePath = `${user.gymId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('members')
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('members')
          .getPublicUrl(filePath);
        photoUrl = publicUrl;
      }

      // 3. Upload KYC Document (if any)
      let kycUrl: string | null = null;
      if (kycFile && kycType) {
        const fileExt = kycFile.name.split('.').pop();
        const fileName = `${memberCode}_kyc.${fileExt}`;
        const filePath = `${user.gymId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('kyc')
          .upload(filePath, kycFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('kyc')
          .getPublicUrl(filePath);
        kycUrl = publicUrl;
      }

      // 4. Calculate BMI
      let bmi: number | null = null;
      if (weightKg && heightCm) {
        const heightM = Number(heightCm) / 100;
        bmi = Math.round((Number(weightKg) / (heightM * heightM)) * 10) / 10;
      }

      // 5. Insert member record
      const branchToAssign = memberBranchId || user.branchId || branches[0]?.id || null;
      const admFeeNumber = Number(admissionFee) || 0;

      const memberPayload: any = {
        gym_id: user.gymId,
        branch_id: branchToAssign,
        member_code: memberCode,
        qr_token: crypto.randomUUID(),
        name: name.trim(),
        phone: phone,
        whatsapp_phone: whatsappPhone || phone,
        email: email.trim() || null,
        dob: dob || null,
        gender: gender || null,
        blood_group: bloodGroup || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pin: pin.trim() || null,
        photo_url: photoUrl,
        emergency_contact: { name: emergencyName, relation: emergencyRelation, phone: emergencyPhone },
        current_plan_id: selectedPlanId,
        plan_start_date: planStartDate,
        plan_end_date: planEndDate,
        admission_date: new Date().toISOString().split('T')[0],
        admission_fee: admFeeNumber,
        status: 'active',
        trainer_id: trainerId || null,
        bmi,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        health_goals: healthGoals,
        fitness_level: fitnessLevel || null,
        medical_conditions: medicalConditions.trim() || null,
        timing_slot: timingSlot || null,
        has_locker: hasLocker,
        locker_number: hasLocker ? lockerNumber.trim() : null,
        total_due: amountDue,
        total_paid_lifetime: Number(amountPaid) || 0,
        kyc_status: kycUrl ? 'pending' : 'pending',
        created_by: user.id,
      };

      let { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert(memberPayload)
        .select()
        .single();

      // Graceful fallback if admission_fee column has not been added to remote DB yet
      if (memberError && (memberError.message?.includes('admission_fee') || memberError.details?.includes('admission_fee'))) {
        delete memberPayload.admission_fee;
        const retryResult = await supabase
          .from('members')
          .insert(memberPayload)
          .select()
          .single();
        memberData = retryResult.data;
        memberError = retryResult.error;
      }

      if (memberError || !memberData) {
        throw new Error(memberError?.message || 'Failed to create member row');
      }

      // 6. Generate Invoice record
      const { data: invNumber } = await supabase.rpc('generate_invoice_number', {
        p_gym_id: user.gymId,
      });

      const lineItems: any[] = [
        {
          description: `Membership Plan: ${selectedPlan?.name}`,
          qty: 1,
          rate: Number(selectedPlan?.price) || 0,
          amount: Number(selectedPlan?.price) || 0,
        },
      ];

      if (admFeeNumber > 0) {
        lineItems.push({
          description: 'One-Time Admission / Registration Fee',
          qty: 1,
          rate: admFeeNumber,
          amount: admFeeNumber,
        });
      }

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          gym_id: user.gymId,
          branch_id: branchToAssign,
          invoice_number: invNumber || `INV-${new Date().getFullYear()}-0001`,
          member_id: memberData.id,
          member_name: memberData.name,
          line_items: lineItems,
          subtotal,
          discount_percent: Number(discountPercent) || 0,
          discount_amount: discountAmount,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total: totalAmount,
          amount_paid: Number(amountPaid) || 0,
          amount_due: amountDue,
          payment_mode: paymentMode || null,
          transaction_id: transactionId.trim() || null,
          status: amountDue === 0 ? 'paid' : (Number(amountPaid) > 0 ? 'partial' : 'pending'),
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 7. Write outstanding dues to due_records if amountDue > 0
      if (amountDue > 0) {
        await supabase.from('due_records').insert({
          gym_id: user.gymId,
          member_id: memberData.id,
          invoice_id: invoiceData.id,
          amount: amountDue,
          collected_amount: 0,
          status: 'pending',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days later default
        });
      }

      // 8. Write KYC document row
      if (kycUrl && kycType) {
        await supabase.from('kyc_documents').insert({
          gym_id: user.gymId,
          member_id: memberData.id,
          document_type: kycType,
          document_url: kycUrl,
          status: 'pending',
        });
      }
      toast.success(`🎉 ${memberData.name} onboarded successfully!`);
      setCreatedMember({
        ...memberData,
        plan_name: selectedPlan?.name,
        branch_name: branches.find(b => b.id === branchToAssign)?.name || 'Main Branch',
      });
      setCreatedInvoice(invoiceData);
      setSuccessModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!canAddMember) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <UpgradePrompt feature={`Adding more than ${maxMembers} members`} currentPlan={planName} />
        <p className="text-center text-zinc-400 text-sm mt-4">
          You have {usage.currentMembers}/{maxMembers} members on the {planName} plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Add New Member</h2>
            <Badge variant="outline" className="bg-purple-950/40 text-purple-300 border-purple-800/50 text-[10px] font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3 text-purple-400" /> Fast Onboarding
            </Badge>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Frictionless 5-step front-desk enrollment wizard. Click any completed step to jump directly.
          </p>
        </div>

        {step < 5 && selectedPlanId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFastSkipToReview}
            className="text-xs h-8 gap-1.5 border-purple-500/40 bg-purple-950/20 text-purple-300 hover:bg-purple-900/40 hover:text-white"
          >
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            <span>Fast Walk-in: Jump to Review</span>
            <ArrowRight className="h-3 w-3 ml-0.5" />
          </Button>
        )}
      </div>

      {/* Interactive Progress Indicators */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {[
            { label: 'Personal', icon: User, s: 1 },
            { label: 'Plan & Payment', icon: CreditCard, s: 2 },
            { label: 'Extras', icon: UserCheck, s: 3 },
            { label: 'KYC Docs', icon: FileCheck, s: 4 },
            { label: 'Confirm', icon: ClipboardList, s: 5 },
          ].map((x) => {
            const IconComp = x.icon;
            const isActive = step === x.s;
            const isDone = step > x.s;

            return (
              <button
                key={x.s}
                type="button"
                onClick={() => handleStepClick(x.s)}
                className={cn(
                  'flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all border text-center select-none relative group',
                  isActive
                    ? 'border-purple-500/80 bg-purple-950/30 text-purple-300 shadow-md shadow-purple-950/50 ring-1 ring-purple-500/30'
                    : isDone
                    ? 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60 cursor-pointer'
                    : 'border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/20'
                )}
                title={`Step ${x.s}: ${x.label}`}
              >
                <div className="relative mb-1">
                  <IconComp className={cn('h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:scale-110', isActive ? 'text-purple-400' : isDone ? 'text-green-400' : 'text-zinc-500')} />
                  {isDone && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-[9px] font-bold border border-green-500/40">
                      ✓
                    </span>
                  )}
                </div>
                <span className={cn('text-[10px] sm:text-xs font-semibold truncate max-w-full px-0.5', isActive ? 'text-purple-200' : isDone ? 'text-zinc-300' : 'text-zinc-500')}>
                  {x.label}
                </span>
              </button>
            );
          })}
        </div>
        <Progress value={(step / 5) * 100} className="h-1 bg-zinc-900" />
      </div>

      {/* Steps Content */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="pt-6">
          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {/* Photo uploader */}
                <div className="flex flex-col items-center gap-3">
                  <Label className="text-zinc-300 text-sm font-medium text-center">Profile Snapshot</Label>
                  <div className="relative h-32 w-32 rounded-full border-2 border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-zinc-700" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCameraModalOpen(true)}
                      className="text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-200 gap-1.5 h-8 px-3"
                    >
                      <Camera className="h-3.5 w-3.5 text-purple-400" /> Take Photo
                    </Button>
                    <Label
                      htmlFor="photo-upload"
                      className="inline-flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-3 h-8 text-xs font-medium text-zinc-200 hover:bg-zinc-800 cursor-pointer gap-1.5 transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5 text-zinc-400" /> Browse
                    </Label>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {/* Personal inputs */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {branches.length > 1 && (
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="memberBranch" className="text-zinc-300 text-sm">Enrollment Branch *</Label>
                      <Select
                        value={memberBranchId}
                        onValueChange={setMemberBranchId}
                        disabled={!isOwner}
                      >
                        <SelectTrigger id="memberBranch" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              📍 {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isOwner && (
                        <p className="text-[11px] text-zinc-500">Staff members can only onboard to their assigned branch.</p>
                      )}
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-zinc-300 text-sm">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Raj Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-zinc-300 text-sm">Phone Number *</Label>
                    <Input
                      id="phone"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="whatsapp" className="text-zinc-300 text-sm">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-zinc-300 text-sm">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="raj@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700 focus:border-purple-600"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dob" className="text-zinc-300 text-sm">DOB</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender" className="text-zinc-300 text-sm">Gender</Label>
                    <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                      <SelectTrigger id="gender" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {GENDER_OPTIONS.map(g => (
                          <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="h-[1px] bg-zinc-800/40 my-4" />

              {/* Secondary personal details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="blood" className="text-zinc-300 text-sm">Blood Group</Label>
                  <Select value={bloodGroup} onValueChange={setBloodGroup}>
                    <SelectTrigger id="blood" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {BLOOD_GROUPS.map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="address" className="text-zinc-300 text-sm">Address</Label>
                  <Input
                    id="address"
                    placeholder="Street No, Apartment, Locality"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city" className="text-zinc-300 text-sm">City</Label>
                  <Input
                    id="city"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state" className="text-zinc-300 text-sm">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {INDIAN_STATES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pin" className="text-zinc-300 text-sm">PIN Code</Label>
                  <Input
                    id="pin"
                    maxLength={6}
                    placeholder="400001"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="h-[1px] bg-zinc-800/40 my-4" />

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2 sm:col-span-1">
                  <Label htmlFor="e-name" className="text-zinc-300 text-sm">Emergency Contact Name</Label>
                  <Input
                    id="e-name"
                    placeholder="Relative's Name"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e-rel" className="text-zinc-300 text-sm">Relation</Label>
                  <Input
                    id="e-rel"
                    placeholder="Father/Spouse"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e-phone" className="text-zinc-300 text-sm">Emergency Phone</Label>
                  <Input
                    id="e-phone"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ''))}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Plan & Payment */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Inputs */}
                <div className="sm:col-span-2 space-y-4">
                  {/* Visual Plan Cards Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="plan" className="text-zinc-200 text-sm font-semibold flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-purple-400" />
                        Select Membership Plan *
                      </Label>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {plans.length} active plans
                      </span>
                    </div>

                    {plans.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                        {plans.map((p) => {
                          const isSelected = selectedPlanId === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedPlanId(p.id)}
                              className={cn(
                                'group relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between select-none',
                                isSelected
                                  ? 'border-purple-500 bg-purple-950/30 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/50'
                                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/50'
                              )}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className={cn('text-xs font-bold truncate', isSelected ? 'text-purple-200' : 'text-zinc-200')}>
                                    {p.name}
                                  </span>
                                  {isSelected && (
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">
                                      <Check className="h-2.5 w-2.5" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-zinc-400 border-zinc-800">
                                    {p.duration_days} Days
                                  </Badge>
                                </div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-baseline justify-between">
                                <span className="text-[10px] text-zinc-500">Plan Fee</span>
                                <span className="text-sm font-extrabold text-zinc-100">₹{p.price}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic py-2">No active plans configured. Please add plans in settings.</p>
                    )}

                    <div className="pt-1">
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger id="plan" className="h-8 text-xs border-zinc-800 bg-zinc-950 text-zinc-300">
                          <SelectValue placeholder="Or select from dropdown list..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                          {plans.map(p => (
                            <SelectItem key={p.id} value={p.id} className="focus:bg-zinc-800 focus:text-white text-xs">
                              {p.name} — ₹{p.price} ({p.duration_days} days)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startDate" className="text-zinc-300 text-sm">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={planStartDate}
                        onChange={(e) => setPlanStartDate(e.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endDate" className="text-zinc-300 text-sm text-zinc-500">Calculated End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        disabled
                        value={planEndDate}
                        className="border-zinc-800 bg-zinc-900 text-zinc-500 border-dashed"
                      />
                    </div>
                  </div>

                  <div className="h-[1px] bg-zinc-800/40 my-4" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="admissionFee" className="text-zinc-300 text-sm flex items-center justify-between">
                        <span>Admission / Registration Fee (₹)</span>
                        <span className="text-[11px] text-zinc-500 font-normal">One-time fee</span>
                      </Label>
                      <Input
                        id="admissionFee"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={admissionFee}
                        onChange={(e) => setAdmissionFee(e.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="discount" className="text-zinc-300 text-sm">Discount (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* Amount Paid with 1-Click Presets */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="paid" className="text-zinc-200 text-sm font-semibold">
                        Amount Paid (₹) *
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetPaymentPreset('full')}
                          className="h-6 px-2 text-[10px] border-zinc-800 bg-zinc-950 text-purple-300 hover:border-purple-500 hover:text-white"
                        >
                          Full: ₹{totalAmount}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetPaymentPreset('half')}
                          className="h-6 px-2 text-[10px] border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white"
                        >
                          50%: ₹{Math.round(totalAmount / 2)}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetPaymentPreset('zero')}
                          className="h-6 px-2 text-[10px] border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                        >
                          Full Due (₹0)
                        </Button>
                      </div>
                    </div>
                    <Input
                      id="paid"
                      type="number"
                      min={0}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 font-bold text-base focus:border-purple-600"
                    />
                  </div>

                  {/* Payment Mode Selector & Chips */}
                  <div className="space-y-2">
                    <Label htmlFor="payMode" className="text-zinc-300 text-sm">Payment Mode</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'upi', label: '⚡ UPI / QR' },
                        { id: 'cash', label: '💵 Cash' },
                        { id: 'card', label: '💳 Card' },
                        { id: 'bank_transfer', label: '🏦 Net Banking' },
                      ].map((m) => (
                        <Button
                          key={m.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPaymentMode(m.id as any)}
                          className={cn(
                            'h-7 px-2.5 text-xs transition-colors',
                            paymentMode === m.id
                              ? 'border-purple-500 bg-purple-950/40 text-purple-200 font-bold'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          )}
                        >
                          {m.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="payModeSelect" className="text-zinc-400 text-xs">Or All Modes</Label>
                      <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                        <SelectTrigger id="payModeSelect" className="h-9 border-zinc-800 bg-zinc-950 text-zinc-100 capitalize">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                          {PAYMENT_MODES.map(pm => (
                            <SelectItem key={pm} value={pm} className="capitalize">{pm.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="txId" className="text-zinc-300 text-sm">Transaction ID / Ref</Label>
                      <Input
                        id="txId"
                        placeholder="UPI ref / receipt #"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="h-9 border-zinc-800 bg-zinc-950 text-zinc-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Summary Panel */}
                <div className="bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200 border-b border-zinc-800 pb-2 mb-4">Tax Invoice Breakdown</h4>
                    <div className="space-y-3 text-xs text-zinc-400">
                      <div className="flex justify-between">
                        <span>Plan Base Price</span>
                        <span className="font-semibold text-zinc-200">₹{selectedPlan ? Number(selectedPlan.price) : 0}</span>
                      </div>
                      {Number(admissionFee) > 0 && (
                        <div className="flex justify-between text-purple-300">
                          <span>Admission Fee</span>
                          <span className="font-semibold">₹{Number(admissionFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-zinc-800/60 pt-1 text-zinc-300">
                        <span>Subtotal</span>
                        <span className="font-semibold text-zinc-200">₹{subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount ({discountPercent}%)</span>
                        <span className="font-semibold text-red-400">-₹{discountAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CGST (9%)</span>
                        <span className="font-semibold text-zinc-200">₹{cgst}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (9%)</span>
                        <span className="font-semibold text-zinc-200">₹{sgst}</span>
                      </div>
                      <div className="h-[1px] bg-zinc-800 my-2" />
                      <div className="flex justify-between text-sm font-bold text-zinc-100">
                        <span>Total (Incl. GST)</span>
                        <span className="text-purple-400">₹{totalAmount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-zinc-800/80">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Dues Remaining</span>
                      <span className={`font-bold ${amountDue > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                        ₹{amountDue}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Extras & Fitness */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="trainer" className="text-zinc-300 text-sm">Assign Personal Trainer</Label>
                    <Select value={trainerId} onValueChange={setTrainerId}>
                      <SelectTrigger id="trainer" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                        <SelectValue placeholder="No Trainer assigned" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="none">No Trainer</SelectItem>
                        {trainers.map(t => (
                          <SelectItem key={t.id} value={t.id} className="focus:bg-zinc-800 focus:text-white">{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="height" className="text-zinc-300 text-sm">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="175"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:ring-purple-600"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="weight" className="text-zinc-300 text-sm">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="70"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:ring-purple-600"
                      />
                    </div>
                  </div>

                  {/* Live Interactive BMI Gauge */}
                  {liveBmi !== null && (
                    <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-purple-400" />
                          <span className="text-xs font-semibold text-zinc-300">Live BMI Score</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-zinc-100 font-mono">{liveBmi}</span>
                          <Badge variant="outline" className={cn('text-[10px] font-semibold', getBmiCategory(liveBmi).badgeClass)}>
                            {getBmiCategory(liveBmi).label}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 w-full rounded-full bg-zinc-800 flex overflow-hidden">
                          <div className="h-full w-[25%] bg-sky-500/80" title="Underweight (< 18.5)" />
                          <div className="h-full w-[35%] bg-emerald-500/90" title="Normal (18.5 - 24.9)" />
                          <div className="h-full w-[20%] bg-amber-500/90" title="Overweight (25 - 29.9)" />
                          <div className="h-full w-[20%] bg-rose-500/90" title="Obese (>= 30)" />
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                          <span>&lt; 18.5 (Under)</span>
                          <span>18.5 - 24.9 (Normal)</span>
                          <span>25 - 29.9 (Over)</span>
                          <span>30+ (Obese)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="slot" className="text-zinc-300 text-sm">Preferred Timing Slot</Label>
                      <span className="text-[10px] text-zinc-500">Quick presets</span>
                    </div>
                    <Input
                      id="slot"
                      placeholder="e.g. 07:00 AM - 09:00 AM"
                      value={timingSlot}
                      onChange={(e) => setTimingSlot(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {['06:00 - 08:00 AM', '08:00 - 10:00 AM', '05:00 - 07:00 PM', '07:00 - 09:00 PM'].map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTimingSlot(slot)}
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-md border transition-colors select-none',
                            timingSlot === slot
                              ? 'border-purple-500 bg-purple-950/40 text-purple-300 font-medium'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[1px] bg-zinc-800/40 my-4" />

                  {/* Locker check */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="locker"
                        checked={hasLocker}
                        onCheckedChange={(checked) => setHasLocker(!!checked)}
                        className="border-zinc-700 text-purple-600 focus:ring-purple-600"
                      />
                      <Label htmlFor="locker" className="text-zinc-300 text-sm font-medium cursor-pointer">
                        Allocate Locker Space
                      </Label>
                    </div>
                    {hasLocker && (
                      <div className="grid gap-2 pl-6">
                        <Label htmlFor="lockNo" className="text-zinc-400 text-xs">Locker Number</Label>
                        <Input
                          id="lockNo"
                          placeholder="e.g. L-42"
                          value={lockerNumber}
                          onChange={(e) => setLockerNumber(e.target.value)}
                          className="border-zinc-800 bg-zinc-950 text-zinc-100 w-1/2 focus:ring-purple-600"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Fitness info */}
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="level" className="text-zinc-300 text-sm">Fitness Level</Label>
                    <Select value={fitnessLevel} onValueChange={(v: any) => setFitnessLevel(v)}>
                      <SelectTrigger id="level" className="border-zinc-800 bg-zinc-950 text-zinc-100 capitalize">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {FITNESS_LEVELS.map(fl => (
                          <SelectItem key={fl} value={fl} className="capitalize">{fl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-zinc-300 text-sm">Fitness / Health Goals</Label>
                    <div className="grid grid-cols-2 gap-2 border border-zinc-800 p-3 rounded-lg bg-zinc-950/20">
                      {['Weight Loss', 'Muscle Gain', 'Cardio Fitness', 'Strength & Conditioning', 'Flexibility', 'General Health'].map(goal => (
                        <div key={goal} className="flex items-center space-x-2">
                          <Checkbox
                            id={`goal-${goal}`}
                            checked={healthGoals.includes(goal)}
                            onCheckedChange={() => handleGoalToggle(goal)}
                            className="border-zinc-700 text-purple-600 focus:ring-purple-600"
                          />
                          <Label htmlFor={`goal-${goal}`} className="text-zinc-400 text-xs cursor-pointer select-none truncate">
                            {goal}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="medical" className="text-zinc-300 text-sm">Medical Conditions / Injuries</Label>
                    <Textarea
                      id="medical"
                      rows={3}
                      placeholder="List any medical issues, operations, or current medications..."
                      value={medicalConditions}
                      onChange={(e) => setMedicalConditions(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:ring-purple-600 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: KYC Uploads */}
          {step === 4 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-200">Optional Verification</span>
                  <p className="text-[11px] text-zinc-500">
                    KYC documents can be uploaded now or collected later from member profile.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFastSkipToReview}
                  className="h-7 px-2.5 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-950/30 shrink-0 ml-3"
                >
                  Skip KYC & Review →
                </Button>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="kycType" className="text-zinc-300 text-sm">Identity Document Type</Label>
                  <Select value={kycType} onValueChange={(v: any) => setKycType(v)}>
                    <SelectTrigger id="kycType" className="border-zinc-800 bg-zinc-950 text-zinc-100 capitalize">
                      <SelectValue placeholder="Choose document type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {KYC_DOC_TYPES.map(k => (
                        <SelectItem key={k} value={k} className="capitalize">{k.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-zinc-300 text-sm">Upload Document Image / PDF</Label>
                  <div className="border-2 border-dashed border-zinc-800 hover:border-purple-600/40 rounded-lg p-8 flex flex-col items-center justify-center bg-zinc-950/20 cursor-pointer relative transition-all">
                    {kycPreview ? (
                      <div className="text-center">
                        <FileCheck className="h-10 w-10 text-green-400 mx-auto mb-2" />
                        <span className="text-xs text-zinc-300 font-semibold truncate max-w-[200px] block">
                          {kycFile?.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 block mt-1">
                          File ready to upload
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-zinc-600 mb-2" />
                        <span className="text-xs text-zinc-400 font-medium">Click to select Aadhaar, PAN, or Passport photo</span>
                        <span className="text-[10px] text-zinc-600 mt-1">Max file size: 5 MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleKycUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Confirm Review */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                {/* Profile Card */}
                <div className="border border-zinc-800 bg-zinc-950/40 p-5 rounded-xl flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-3 border-b border-zinc-800/60 pb-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">1. Member Profile</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                      className="h-6 px-2 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                  <div className="flex items-start gap-3.5">
                    <div className="h-14 w-14 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-300 font-bold border border-purple-800/40 text-lg shrink-0 overflow-hidden">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="text-sm font-bold text-zinc-100">{name}</div>
                      <div className="text-zinc-400">Phone: {phone}</div>
                      <div className="text-zinc-400">WhatsApp: {whatsappPhone || phone}</div>
                      {email && <div className="text-zinc-400 truncate max-w-[200px]">Email: {email}</div>}
                      <div className="text-zinc-400 capitalize">Gender: {gender || 'Not specified'} {bloodGroup ? `• Blood: ${bloodGroup}` : ''}</div>
                    </div>
                  </div>
                </div>

                {/* Plan details review */}
                <div className="border border-zinc-800 bg-zinc-950/40 p-5 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">2. Plan & Billing</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(2)}
                      className="h-6 px-2 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Plan Choice</span>
                    <span className="font-semibold text-zinc-200">{selectedPlan?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Validity</span>
                    <span className="font-semibold text-zinc-200">{planStartDate} to {planEndDate}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Total Bill (Incl. GST)</span>
                    <span className="font-bold text-purple-400">₹{totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Amount Paid</span>
                    <span className="font-bold text-green-400">₹{amountPaid} {paymentMode ? `(${paymentMode})` : ''}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
                    <span>Outstanding Due</span>
                    <span className={cn('font-bold', amountDue > 0 ? 'text-amber-400' : 'text-green-400')}>
                      ₹{amountDue}
                    </span>
                  </div>
                </div>

                {/* Extras & Fitness review */}
                <div className="border border-zinc-800 bg-zinc-950/40 p-5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">3. Fitness & Facilities</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(3)}
                      className="h-6 px-2 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Assigned Trainer</span>
                    <span className="font-medium text-zinc-200">
                      {trainers.find(t => t.id === trainerId)?.name || 'No Trainer'}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Locker</span>
                    <span className="font-medium text-zinc-200">
                      {hasLocker ? `Yes (${lockerNumber || 'Unassigned'})` : 'No Locker'}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>BMI Score</span>
                    <span className="font-medium text-zinc-200">
                      {liveBmi ? `${liveBmi} (${getBmiCategory(liveBmi).label})` : 'Not recorded'}
                    </span>
                  </div>
                  {timingSlot && (
                    <div className="flex justify-between text-zinc-400">
                      <span>Timing Slot</span>
                      <span className="font-medium text-zinc-200">{timingSlot}</span>
                    </div>
                  )}
                </div>

                {/* KYC & Branch review */}
                <div className="border border-zinc-800 bg-zinc-950/40 p-5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">4. Verification & Branch</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(4)}
                      className="h-6 px-2 text-[10px] text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Branch Assigned</span>
                    <span className="font-medium text-zinc-200">
                      {branches.find(b => b.id === memberBranchId)?.name || 'Main Branch'}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>KYC Document</span>
                    <span className="font-medium text-zinc-200 capitalize">
                      {kycType ? `${kycType.replace('_', ' ')} (Uploaded)` : 'Not uploaded (Optional)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Post-Enrollment</span>
                    <span className="font-medium text-purple-300">
                      Face ID & Fingerprint ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-800/40 pt-5 bg-zinc-900/10">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {step > 1 ? (
              <Button
                variant="outline"
                disabled={loading}
                onClick={handleBack}
                className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 font-medium h-9 text-xs"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step >= 2 && step < 5 && selectedPlanId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFastSkipToReview}
                className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 gap-1 h-9"
              >
                <Zap className="h-3.5 w-3.5" /> Skip to Review
              </Button>
            )}
          </div>

          {step < 5 ? (
            <Button
              onClick={handleNext}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-600/15 h-9 text-xs px-4 w-full sm:w-auto"
            >
              Next Step <ChevronRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              disabled={loading}
              onClick={handleOnboardMember}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/20 h-10 px-5 text-sm w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white mr-2" /> Processing Onboarding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-300" />
                  Onboard Member & Issue Invoice (₹{totalAmount})
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={(file, previewUrl) => {
          setPhotoFile(file);
          setPhotoPreview(previewUrl);
        }}
        title="Capture Member Profile Snapshot"
      />

      {/* Post-Registration Success & Immediate Actions Modal */}
      <Dialog open={successModalOpen} onOpenChange={(open) => !open && setSuccessModalOpen(false)}>
        <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100 p-6">
          <DialogHeader className="text-left">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-zinc-100">
                  Member Registered Successfully!
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                  <strong className="text-zinc-200">{createdMember?.name}</strong> has been enrolled with code{' '}
                  <span className="font-mono text-purple-300 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {createdMember?.member_code}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Summary Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs my-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Plan Enrolled:</span>
              <span className="font-semibold text-purple-300">{createdMember?.plan_name || 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Branch:</span>
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
                  Generate official printed receipt for customer payment records.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (createdInvoice?.id) {
                    window.open(`/api/invoices/${createdInvoice.id}/pdf`, '_blank');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-8 font-semibold shrink-0 ml-3"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </Button>
            </div>

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
                  ? "border-green-700/50 text-green-400 text-xs h-8 shrink-0 ml-3" 
                  : "bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-8 font-semibold shrink-0 ml-3"
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
                  ? "border-green-700/50 text-green-400 text-xs h-8 shrink-0 ml-3" 
                  : "bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-8 font-semibold shrink-0 ml-3"
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
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5 h-8 shrink-0 ml-3"
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
              onClick={handleResetForm}
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs"
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
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
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
          gymName={gym?.name}
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
    </div>
  );
}

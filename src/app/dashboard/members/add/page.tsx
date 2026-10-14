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
import { calculateGST, toSafeUUID } from '@/lib/utils/format';
import {
  generateDietPlan,
  generateExercisePlan,
  getDietChoiceLabel,
  getFitnessLevelLabel,
  DietChoice,
  FitnessLevel,
  calculateNutritionTargets,
} from '@/lib/fitness/plan-generator';
import dynamic from 'next/dynamic';
import { useBranch } from '@/hooks/useBranch';
import { useGym } from '@/hooks/useGym';
import { Badge } from '@/components/ui/badge';

const CameraCaptureModal = dynamic(
  () => import('@/components/shared/CameraCaptureModal').then((mod) => mod.CameraCaptureModal),
  { ssr: false }
);

const MemberRegistrationSuccessModal = dynamic(
  () => import('@/components/members/MemberRegistrationSuccessModal').then((mod) => mod.MemberRegistrationSuccessModal),
  { ssr: false }
);

export default function AddMemberPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();
  const { gym } = useGym();
  const { branches, selectedBranchId, isOwner } = useBranch();

  const [step, setStep] = useState(1);
  const [enrollmentMode, setEnrollmentMode] = useState<'express' | 'full'>('express');
  const [plans, setPlans] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberBranchId, setMemberBranchId] = useState('');
  const [seedingPlans, setSeedingPlans] = useState(false);

  const handleSeedStarterPlans = async () => {
    if (!user?.gymId) return;
    try {
      setSeedingPlans(true);
      const res = await fetch('/api/plans/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize plans');

      toast.success('🎉 Standard gym plans created! Select your plan below.');
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('gym_id', user.gymId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (plansData && plansData.length > 0) {
        setPlans(plansData);
        setSelectedPlanId(plansData[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating starter plans';
      toast.error(msg);
    } finally {
      setSeedingPlans(false);
    }
  };

  // Post-Registration Action States
  const [createdMember, setCreatedMember] = useState<any | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [createdDietChart, setCreatedDietChart] = useState<any | null>(null);
  const [createdExerciseChart, setCreatedExerciseChart] = useState<any | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

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
    setDietChoice('vegetarian');
    setKycType('');
    setKycFile(null);
    setKycPreview(null);
    setCreatedMember(null);
    setCreatedInvoice(null);
    setCreatedDietChart(null);
    setCreatedExerciseChart(null);
    setSuccessModalOpen(false);
    setStep(1);
    setEnrollmentMode('express');
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
  const [dietChoice, setDietChoice] = useState<DietChoice>('vegetarian');
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
      if (!name.trim() || !phone.trim() || phone.length !== 10) {
        toast.error('Please enter name and a valid 10-digit phone number first');
        return;
      }
      if (enrollmentMode === 'express' && targetStep > 1 && !selectedPlanId) {
        toast.error('Please select a membership plan first');
        return;
      }
      if (enrollmentMode === 'full' && step === 2 && targetStep > 2 && !selectedPlanId) {
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
      if (enrollmentMode === 'full') setStep(2);
      return;
    }
    setStep(enrollmentMode === 'express' ? 3 : 5);
    toast.info('Skipped to confirmation review');
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
    if (enrollmentMode === 'express') {
      if (step === 1) {
        if (!name.trim() || !phone.trim() || phone.length !== 10) {
          toast.error('Please enter name and a valid 10-digit phone number');
          return;
        }
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
      return;
    }

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

      // 5. Generate automated tailored Diet Chart & Exercise Chart for the member
      let createdDietId: string | null = null;
      let createdExerciseId: string | null = null;
      let dietChartRecord: any = null;
      let exerciseChartRecord: any = null;

      try {
        const generatedDiet = generateDietPlan({
          memberName: name.trim(),
          dietChoice: dietChoice || 'vegetarian',
          bmi,
          healthGoals,
          gymId: user.gymId,
          userId: user.id,
        });

        const { data: insertedDiet, error: dietInsertError } = await supabase
          .from('diet_charts')
          .insert({
            gym_id: user.gymId,
            name: generatedDiet.name,
            description: generatedDiet.description,
            meals: generatedDiet.meals,
            target_calories: generatedDiet.target_calories,
            is_template: false,
            created_by: user.id,
          })
          .select()
          .single();

        if (!dietInsertError && insertedDiet) {
          createdDietId = insertedDiet.id;
          dietChartRecord = insertedDiet;
        }
      } catch (dietErr) {
        console.warn('Diet chart auto-creation warning (non-fatal):', dietErr);
      }

      try {
        const generatedExercise = generateExercisePlan({
          memberName: name.trim(),
          fitnessLevel: (fitnessLevel as FitnessLevel) || 'beginner',
          bmi,
          healthGoals,
          gymId: user.gymId,
          userId: user.id,
        });

        const { data: insertedExercise, error: exInsertError } = await supabase
          .from('exercise_charts')
          .insert({
            gym_id: user.gymId,
            name: generatedExercise.name,
            description: generatedExercise.description,
            days: generatedExercise.days,
            is_template: false,
            created_by: user.id,
          })
          .select()
          .single();

        if (!exInsertError && insertedExercise) {
          createdExerciseId = insertedExercise.id;
          exerciseChartRecord = insertedExercise;
        }
      } catch (exErr) {
        console.warn('Exercise chart auto-creation warning (non-fatal):', exErr);
      }

      // 6. Insert member record with sanitized UUIDs
      const rawBranch = memberBranchId || user.branchId || branches[0]?.id || null;
      const branchToAssign = toSafeUUID(rawBranch);
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
        current_plan_id: toSafeUUID(selectedPlanId),
        plan_start_date: planStartDate,
        plan_end_date: planEndDate,
        admission_date: new Date().toISOString().split('T')[0],
        admission_fee: admFeeNumber,
        status: 'active',
        trainer_id: toSafeUUID(trainerId),
        diet_chart_id: toSafeUUID(createdDietId),
        exercise_chart_id: toSafeUUID(createdExerciseId),
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

      // 7. Generate Invoice record
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

      // Add complimentary fitness & nutrition blueprint line item
      const dietLabel = getDietChoiceLabel(dietChoice);
      const levelLabel = getFitnessLevelLabel(fitnessLevel || 'beginner').split(' ')[0];
      lineItems.push({
        description: `Included Member Blueprint: ${dietLabel} & ${levelLabel} Training Program`,
        qty: 1,
        rate: 0,
        amount: 0,
      });

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

      // 8. Write outstanding dues to due_records if amountDue > 0
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

      // 9. Write KYC document row
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
      setCreatedDietChart(dietChartRecord);
      setCreatedExerciseChart(exerciseChartRecord);
      setSuccessModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Add New Member</h2>
            <Badge variant="outline" className="bg-purple-950/40 text-purple-300 border-purple-800/50 text-[10px] font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3 text-purple-400" />
              <span>{enrollmentMode === 'express' ? 'Express 30s Mode' : 'Standard Full KYC'}</span>
            </Badge>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            {enrollmentMode === 'express'
              ? 'Rapid 3-step walk-in enrollment (30s mode). Instant plan assignment and WhatsApp pass.'
              : 'Frictionless 5-step front-desk enrollment wizard. Click any completed step to jump directly.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Mode Switcher Pill */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setEnrollmentMode('express');
                if (step > 3) setStep(3);
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                enrollmentMode === 'express'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>⚡ Express (30s)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEnrollmentMode('full');
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                enrollmentMode === 'full'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <ClipboardList className="h-3.5 w-3.5 text-zinc-400" />
              <span>Full (5 Steps)</span>
            </button>
          </div>

          {step < (enrollmentMode === 'express' ? 3 : 5) && selectedPlanId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFastSkipToReview}
              className="text-xs h-8 gap-1.5 border-purple-500/40 bg-purple-950/20 text-purple-300 hover:bg-purple-900/40 hover:text-white"
            >
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <span>Skip to Review</span>
              <ArrowRight className="h-3 w-3 ml-0.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Interactive Progress Indicators */}
      <div className="space-y-2">
        <div className={cn('grid gap-1 sm:gap-2', enrollmentMode === 'express' ? 'grid-cols-3' : 'grid-cols-5')}>
          {(enrollmentMode === 'express'
            ? [
                { label: 'Contact & Plan', icon: CreditCard, s: 1 },
                { label: 'Photo Snapshot', icon: Camera, s: 2 },
                { label: 'Confirm & Pass', icon: CheckCircle2, s: 3 },
              ]
            : [
                { label: 'Personal', icon: User, s: 1 },
                { label: 'Plan & Payment', icon: CreditCard, s: 2 },
                { label: 'Extras', icon: UserCheck, s: 3 },
                { label: 'KYC Docs', icon: FileCheck, s: 4 },
                { label: 'Confirm', icon: ClipboardList, s: 5 },
              ]
          ).map((x) => {
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
        <Progress value={(step / (enrollmentMode === 'express' ? 3 : 5)) * 100} className="h-1 bg-zinc-900" />
      </div>

      {/* Steps Content */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardContent className="pt-6">
          {/* EXPRESS STEP 1: Contact & Plan */}
          {step === 1 && enrollmentMode === 'express' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (5 cols): Member Contact */}
                <div className="lg:col-span-5 space-y-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-bold text-zinc-200">1. Member Contact</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                      Step 1 of 3
                    </Badge>
                  </div>

                  {branches.length > 1 && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="exp-branch" className="text-zinc-300 text-xs">Branch *</Label>
                      <Select value={memberBranchId} onValueChange={setMemberBranchId} disabled={!isOwner}>
                        <SelectTrigger id="exp-branch" className="border-zinc-800 bg-zinc-950 text-zinc-100 h-9 text-xs">
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs">
                              📍 {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid gap-1.5">
                    <Label htmlFor="exp-name" className="text-zinc-300 text-xs">Full Name *</Label>
                    <Input
                      id="exp-name"
                      placeholder="e.g. Vikram Malhotra"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 h-9 text-xs focus:border-purple-500"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="exp-phone" className="text-zinc-300 text-xs">Mobile Phone * (10 Digits)</Label>
                    <Input
                      id="exp-phone"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 h-9 text-xs font-mono focus:border-purple-500"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="exp-wa" className="text-zinc-300 text-xs">WhatsApp Number (For Instant Pass)</Label>
                    <Input
                      id="exp-wa"
                      maxLength={10}
                      placeholder="Same as mobile"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 h-9 text-xs font-mono focus:border-purple-500"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="exp-start" className="text-zinc-300 text-xs">Plan Start Date</Label>
                    <Input
                      id="exp-start"
                      type="date"
                      value={planStartDate}
                      onChange={(e) => setPlanStartDate(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 h-9 text-xs focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Right Column (7 cols): Visual Plan Selection & Payment */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Plan Picker */}
                  <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-bold text-zinc-200">2. Select Membership Plan *</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">{plans.length} active plans</span>
                    </div>

                    {plans.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {plans.map((p) => {
                          const isSelected = selectedPlanId === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedPlanId(p.id)}
                              className={cn(
                                'p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none relative',
                                isSelected
                                  ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500 shadow-md shadow-purple-950/50'
                                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900'
                              )}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className={cn('text-xs font-bold truncate', isSelected ? 'text-purple-200' : 'text-zinc-200')}>
                                    {p.name}
                                  </span>
                                  {isSelected && <Check className="h-3 w-3 text-purple-400 shrink-0" />}
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono block">
                                  {p.duration_days} Days
                                </span>
                              </div>
                              <div className="mt-2 pt-1 border-t border-zinc-800/50 flex justify-between items-baseline">
                                <span className="text-[9px] text-zinc-500">Price</span>
                                <span className="text-xs font-bold text-zinc-100">₹{p.price}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSeedStarterPlans}
                        disabled={seedingPlans}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-xs"
                      >
                        {seedingPlans ? 'Creating Standard Plans...' : 'Create Standard Gym Plans'}
                      </Button>
                    )}
                  </div>

                  {/* Payment & Auto-Tax Summary */}
                  {selectedPlan && (
                    <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                        <span className="text-xs font-bold text-zinc-200">3. Payment & Settlement</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">Total: ₹{totalAmount}</span>
                      </div>

                      {/* Payment Presets */}
                      <div className="space-y-1.5">
                        <Label className="text-zinc-400 text-[11px]">Quick Amount Preset</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetPaymentPreset('full')}
                            className={cn(
                              'py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                              amountPaid === String(totalAmount) && totalAmount > 0
                                ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 font-bold'
                                : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                            )}
                          >
                            Full (₹{totalAmount})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPaymentPreset('half')}
                            className={cn(
                              'py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                              amountPaid === String(Math.round(totalAmount / 2)) && totalAmount > 0
                                ? 'border-amber-500 bg-amber-950/30 text-amber-300 font-bold'
                                : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                            )}
                          >
                            50% (₹{Math.round(totalAmount / 2)})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPaymentPreset('zero')}
                            className={cn(
                              'py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                              amountPaid === '0'
                                ? 'border-purple-500 bg-purple-950/30 text-purple-300 font-bold'
                                : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                            )}
                          >
                            Pay Later (₹0)
                          </button>
                        </div>
                      </div>

                      {/* Payment Mode Selector */}
                      {Number(amountPaid) > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-zinc-400 text-[11px]">Payment Mode *</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: 'upi', label: 'UPI / QR' },
                              { key: 'cash', label: 'Cash in Hand' },
                              { key: 'card', label: 'Card POS' },
                            ].map((m) => (
                              <button
                                key={m.key}
                                type="button"
                                onClick={() => setPaymentMode(m.key as any)}
                                className={cn(
                                  'py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                                  paymentMode === m.key
                                    ? 'border-purple-500 bg-purple-950/40 text-purple-300 font-bold'
                                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                                )}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Live Tax Computation Pill */}
                      <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">Subtotal: ₹{subtotal} | GST (18%): ₹{cgst + sgst}</span>
                        <span className={amountDue > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {amountDue > 0 ? `Due: ₹${amountDue}` : 'Fully Settled ✓'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* EXPRESS STEP 2: Photo Snapshot */}
          {step === 2 && enrollmentMode === 'express' && (
            <div className="space-y-6">
              <div className="max-w-md mx-auto flex flex-col items-center gap-4 bg-zinc-950/60 p-6 rounded-2xl border border-zinc-800/80 text-center">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Member Profile Snapshot</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Used for contactless Face ID attendance at front-desk kiosk.
                  </p>
                </div>

                {/* Snapshot Avatar */}
                <div className="relative h-36 w-36 rounded-2xl border-2 border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden shadow-xl">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-16 w-16 text-zinc-700" />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setCameraModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-9 px-4 gap-1.5 active:scale-95 cursor-pointer shadow-md"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Open Webcam</span>
                  </Button>
                  <Label
                    htmlFor="exp-photo-upload"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 h-9 text-xs font-medium text-zinc-200 hover:bg-zinc-800 cursor-pointer gap-1.5 transition-colors active:scale-95"
                  >
                    <Upload className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Browse File</span>
                  </Label>
                  <input
                    id="exp-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                {/* Optional quick details */}
                <div className="w-full pt-4 border-t border-zinc-800/60 grid grid-cols-2 gap-3 text-left">
                  <div className="grid gap-1">
                    <Label className="text-zinc-400 text-[11px]">Gender (Optional)</Label>
                    <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950 text-zinc-100 h-8 text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g} className="text-xs capitalize">
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-zinc-400 text-[11px]">Email Address (Optional)</Label>
                    <Input
                      type="email"
                      placeholder="member@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EXPRESS STEP 3: Confirm & Pass */}
          {step === 3 && enrollmentMode === 'express' && (
            <div className="space-y-6 max-w-lg mx-auto">
              <div className="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/80 space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800/60 pb-3">
                  <div className="relative h-12 w-12 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-zinc-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{name || 'Member Name'}</h3>
                    <p className="text-xs text-zinc-400 font-mono">{phone}</p>
                  </div>
                  <Badge className="ml-auto bg-purple-950/40 text-purple-300 border-purple-800/50 text-[10px]">
                    ⚡ Express Walk-in
                  </Badge>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Membership Plan:</span>
                    <span className="font-semibold text-zinc-200">{selectedPlan?.name} ({selectedPlan?.duration_days} Days)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Plan Validity:</span>
                    <span className="font-mono text-zinc-300">{planStartDate} to {planEndDate}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800/60 pt-2">
                    <span className="text-zinc-400">Total Invoice Amount:</span>
                    <span className="font-bold text-white">₹{totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Amount Received ({paymentMode ? paymentMode.toUpperCase() : 'Cash'}):</span>
                    <span className="font-bold text-emerald-400">₹{amountPaid}</span>
                  </div>
                  {amountDue > 0 && (
                    <div className="flex justify-between text-amber-400 font-semibold">
                      <span>Balance Due:</span>
                      <span>₹{amountDue}</span>
                    </div>
                  )}
                </div>

                {/* Benefits automatically included */}
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Automatic Benefits Included</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    • Instant NPCI UPI invoice and payment receipt.<br/>
                    • Auto-tailored diet chart and workout plan generated.<br/>
                    • 1-click welcome pass dispatch via WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Personal Info (Full Mode) */}
          {step === 1 && enrollmentMode === 'full' && (
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

          {/* STEP 2: Plan & Payment (Full Mode) */}
          {step === 2 && enrollmentMode === 'full' && (
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
                      <div className="border border-purple-500/40 bg-purple-950/20 p-4 rounded-xl space-y-2.5 my-2">
                        <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                          <Sparkles className="h-4 w-4 text-purple-400" />
                          <span>No Membership Plans Found</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          You need at least one active membership plan to enroll a member. Click below to initialize 5 standard gym plans (Monthly, 3-Month, 6-Month, 1-Year, PT) right now without losing any form details.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSeedStarterPlans}
                          disabled={seedingPlans}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5 h-8"
                        >
                          {seedingPlans ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          <span>1-Click Create Standard Plans</span>
                        </Button>
                      </div>
                    )}

                    <div className="pt-1">
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger id="plan" className="h-8 text-xs border-zinc-800 bg-zinc-950 text-zinc-300">
                          <SelectValue placeholder="Or select from dropdown list..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                          {plans.map(p => (
                            <SelectItem key={p.id} value={p.id} className="focus:bg-zinc-800 focus:text-white text-xs">
                              {p.name} - ₹{p.price} ({p.duration_days} days)
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

          {/* STEP 3: Extras & Fitness (Full Mode) */}
          {step === 3 && enrollmentMode === 'full' && (
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="dietChoice" className="text-zinc-300 text-sm font-medium">Dietary Preference</Label>
                      <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">
                        Auto-Generates Diet Chart
                      </Badge>
                    </div>
                    <Select value={dietChoice} onValueChange={(v: any) => setDietChoice(v)}>
                      <SelectTrigger id="dietChoice" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                        <SelectValue placeholder="Select diet preference" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        <SelectItem value="vegetarian" className="focus:bg-zinc-800 focus:text-white">
                          🥬 Pure Vegetarian (Veg)
                        </SelectItem>
                        <SelectItem value="non_vegetarian" className="focus:bg-zinc-800 focus:text-white">
                          🍗 Non-Vegetarian (Eggs, Chicken, Fish)
                        </SelectItem>
                        <SelectItem value="eggetarian" className="focus:bg-zinc-800 focus:text-white">
                          🥚 Eggetarian (Vegetarian + Eggs)
                        </SelectItem>
                        <SelectItem value="vegan" className="focus:bg-zinc-800 focus:text-white">
                          🌱 100% Plant-Based (Vegan)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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

                  {/* Automated Blueprint Live Indicator */}
                  <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                        <span className="text-xs font-bold text-purple-200">
                          Automated Member Welcome Blueprint
                        </span>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px]">
                        Included
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Based on <strong className="text-zinc-200">{getDietChoiceLabel(dietChoice)}</strong> and <strong className="text-zinc-200">{getFitnessLevelLabel(fitnessLevel || 'beginner').split(' ')[0]}</strong>, a custom nutrition plan and training schedule will be generated and printed on the invoice.
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-purple-300 font-mono">
                      <span>• ~{calculateNutritionTargets(liveBmi, healthGoals).targetCalories} kcal</span>
                      <span>• ~{calculateNutritionTargets(liveBmi, healthGoals).targetProtein}g protein</span>
                      <span>• {fitnessLevel === 'advanced' ? '5-Day' : (fitnessLevel === 'intermediate' ? '4-Day' : '3-Day')} workout split</span>
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

          {/* STEP 4: KYC Uploads (Full Mode) */}
          {step === 4 && enrollmentMode === 'full' && (
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
                  Skip KYC and Review &rarr;
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

          {/* STEP 5: Confirm Review (Full Mode) */}
          {step === 5 && enrollmentMode === 'full' && (
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
                  <div className="flex justify-between text-zinc-400">
                    <span>Diet Preference</span>
                    <span className="font-medium text-emerald-400">{getDietChoiceLabel(dietChoice)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Fitness Level</span>
                    <span className="font-medium text-purple-300">{getFitnessLevelLabel(fitnessLevel || 'beginner').split(' ')[0]} Split</span>
                  </div>
                  {timingSlot && (
                    <div className="flex justify-between text-zinc-400">
                      <span>Timing Slot</span>
                      <span className="font-medium text-zinc-200">{timingSlot}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                    <span>Welcome Benefit</span>
                    <span className="font-medium text-indigo-300">⚡ Auto Diet &amp; Workout Blueprint</span>
                  </div>
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

            {step >= 2 && step < (enrollmentMode === 'express' ? 3 : 5) && selectedPlanId && (
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

          {step < (enrollmentMode === 'express' ? 3 : 5) ? (
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
      <MemberRegistrationSuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        createdMember={createdMember}
        createdInvoice={createdInvoice}
        createdDietChart={createdDietChart}
        createdExerciseChart={createdExerciseChart}
        totalAmount={totalAmount}
        amountPaid={Number(amountPaid) || 0}
        amountDue={amountDue}
        dietChoiceLabel={getDietChoiceLabel(dietChoice)}
        fitnessLevelLabel={getFitnessLevelLabel(fitnessLevel || 'beginner')}
        gymName={gym?.name}
        onResetForm={handleResetForm}
      />
    </div>
  );
}

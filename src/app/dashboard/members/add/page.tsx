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
} from 'lucide-react';
import { toast } from 'sonner';
import { INDIAN_STATES, BLOOD_GROUPS, GENDER_OPTIONS, FITNESS_LEVELS, PAYMENT_MODES, KYC_DOC_TYPES } from '@/lib/utils/constants';
import { calculateGST } from '@/lib/utils/format';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradePrompt } from '@/components/shared/UpgradePrompt';
import { useBranch } from '@/hooks/useBranch';
import { CameraCaptureModal } from '@/components/shared/CameraCaptureModal';

export default function AddMemberPage() {
  const supabase = createClient();
  const router = useRouter();
  const { user } = useAuth();
  const { canAddMember, maxMembers, usage, planName } = usePlanLimits();
  const { branches, selectedBranchId, isOwner } = useBranch();

  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberBranchId, setMemberBranchId] = useState('');

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
    const rawPrice = Number(plan.price);
    const discPercent = Number(discountPercent) || 0;
    const discAmt = (rawPrice * discPercent) / 100;
    const { cgst: cgstVal, sgst: sgstVal, total: totalVal } = calculateGST(rawPrice, discAmt);

    setSubtotal(rawPrice);
    setDiscountAmount(discAmt);
    setCgst(cgstVal);
    setSgst(sgstVal);
    setTotalAmount(totalVal);

    const paid = Number(amountPaid) || 0;
    setAmountDue(Math.max(0, totalVal - paid));
  }, [selectedPlanId, planStartDate, discountPercent, amountPaid, plans]);

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
      const { data: memberCode, error: codeError } = await supabase.rpc('generate_member_code', {
        p_gym_id: user.gymId,
      });

      if (codeError || !memberCode) {
        throw new Error(codeError?.message || 'Failed to generate member code');
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

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({
          gym_id: user.gymId,
          branch_id: branchToAssign,
          member_code: memberCode,
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
        })
        .select()
        .single();

      if (memberError || !memberData) {
        throw new Error(memberError?.message || 'Failed to create member row');
      }

      // 6. Generate Invoice record
      const { data: invNumber } = await supabase.rpc('generate_invoice_number', {
        p_gym_id: user.gymId,
      });

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          gym_id: user.gymId,
          branch_id: branchToAssign,
          invoice_number: invNumber || `INV-${new Date().getFullYear()}-0001`,
          member_id: memberData.id,
          member_name: memberData.name,
          line_items: [
            {
              description: `Membership Plan: ${selectedPlan?.name}`,
              qty: 1,
              rate: subtotal,
              amount: subtotal,
            },
          ],
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

      toast.success('Member onboarded successfully!');
      router.push('/dashboard/members');
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Add New Member</h2>
        <p className="text-zinc-500 text-xs mt-1">Complete the 5-step onboarding wizard to register the member, invoice payments, and assign trainers.</p>
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-5 gap-2 border-b border-zinc-800 pb-4">
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
            <div
              key={x.s}
              className={`flex flex-col items-center justify-center py-2 border-b-2 transition-all ${
                isActive 
                  ? 'border-purple-600 text-purple-400' 
                  : isDone 
                    ? 'border-zinc-500 text-zinc-300' 
                    : 'border-transparent text-zinc-600'
              }`}
            >
              <IconComp className="h-5 w-5 mb-1" />
              <span className="text-[10px] sm:text-xs font-semibold hidden md:inline">{x.label}</span>
            </div>
          );
        })}
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
                  <div className="grid gap-2">
                    <Label htmlFor="plan" className="text-zinc-300 text-sm font-semibold">Select Membership Plan *</Label>
                    <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                      <SelectTrigger id="plan" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                        <SelectValue placeholder="Choose a plan" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {plans.map(p => (
                          <SelectItem key={p.id} value={p.id} className="focus:bg-zinc-800 focus:text-white">
                            {p.name} — ₹{p.price} ({p.duration_days} days)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="discount" className="text-zinc-300 text-sm">Discount (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100"
                      />
                    </div>
                    <div className="grid gap-2 col-span-2">
                      <Label htmlFor="paid" className="text-zinc-300 text-sm font-semibold">Amount Paid (₹) *</Label>
                      <Input
                        id="paid"
                        type="number"
                        min={0}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100 font-bold focus:border-purple-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="payMode" className="text-zinc-300 text-sm">Payment Mode</Label>
                      <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                        <SelectTrigger id="payMode" className="border-zinc-800 bg-zinc-950 text-zinc-100 capitalize">
                          <SelectValue placeholder="Select" />
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
                        placeholder="UPI ref number"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="border-zinc-800 bg-zinc-950 text-zinc-100"
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
                        <span>Subtotal (Base Price)</span>
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

                  <div className="grid gap-2">
                    <Label htmlFor="slot" className="text-zinc-300 text-sm">Preferred Timing Slot</Label>
                    <Input
                      id="slot"
                      placeholder="e.g. 07:00 AM - 09:00 AM"
                      value={timingSlot}
                      onChange={(e) => setTimingSlot(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-700"
                    />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
                {/* Profile Card */}
                <div className="border border-zinc-800 bg-zinc-950/20 p-6 rounded-xl flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-300 font-bold border border-purple-800/40 text-xl shrink-0 overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-zinc-100">{name}</div>
                    <div className="text-xs text-zinc-400">Phone: {phone}</div>
                    <div className="text-xs text-zinc-400">WhatsApp: {whatsappPhone || phone}</div>
                    {email && <div className="text-xs text-zinc-400">Email: {email}</div>}
                    {dob && <div className="text-xs text-zinc-400">DOB: {dob}</div>}
                    <div className="text-xs text-zinc-400 capitalize">Gender: {gender || 'Not specified'}</div>
                  </div>
                </div>

                {/* Plan details review */}
                <div className="border border-zinc-800 bg-zinc-950/20 p-6 rounded-xl space-y-3">
                  <h4 className="text-sm font-bold text-zinc-200 border-b border-zinc-800/60 pb-1 mb-2">Membership Details</h4>
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
                    <span className="font-semibold text-purple-400">₹{totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Amount Paid</span>
                    <span className="font-semibold text-green-400">₹{amountPaid}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Outstanding Due</span>
                    <span className="font-semibold text-amber-400">₹{amountDue}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-zinc-800/40 pt-6 bg-zinc-900/10">
          {step > 1 ? (
            <Button
              variant="outline"
              disabled={loading}
              onClick={handleBack}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 font-medium"
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              onClick={handleNext}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg shadow-purple-600/15"
            >
              Next Step <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              disabled={loading}
              onClick={handleOnboardMember}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white mr-2" /> Processing...
                </>
              ) : (
                'Onboard Member & Issue Invoice'
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
    </div>
  );
}

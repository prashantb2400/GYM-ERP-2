'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { INDIAN_STATES, BLOOD_GROUPS, GENDER_OPTIONS, FITNESS_LEVELS, MEMBER_STATUSES } from '@/lib/utils/constants';

export default function EditMemberPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { can } = usePermission();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  // Form states
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
  const [status, setStatus] = useState<'active' | 'expired' | 'frozen' | 'cancelled' | 'pending' | ''>('');
  
  // Assignments
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planStartDate, setPlanStartDate] = useState('');
  const [planEndDate, setPlanEndDate] = useState('');
  const [trainerId, setTrainerId] = useState('');

  // Fitness
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('');
  const [timingSlot, setTimingSlot] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [hasLocker, setHasLocker] = useState(false);
  const [lockerNumber, setLockerNumber] = useState('');

  // Load data
  useEffect(() => {
    if (!user?.gymId || !memberId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch plans
        const { data: plansData } = await supabase
          .from('plans')
          .select('*')
          .eq('gym_id', user.gymId);
        setPlans(plansData || []);

        // 2. Fetch trainers
        const { data: trainersData } = await supabase
          .from('users')
          .select('id, name')
          .eq('gym_id', user.gymId)
          .eq('role', 'trainer')
          .eq('is_active', true);
        setTrainers(trainersData || []);

        // 3. Fetch member details
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('id', memberId)
          .eq('gym_id', user.gymId)
          .single();

        if (memberError || !memberData) {
          throw new Error(memberError?.message || 'Member not found');
        }

        setName(memberData.name);
        setPhone(memberData.phone);
        setWhatsappPhone(memberData.whatsapp_phone || '');
        setEmail(memberData.email || '');
        setDob(memberData.dob || '');
        setGender(memberData.gender || '');
        setBloodGroup(memberData.blood_group || '');
        setAddress(memberData.address || '');
        setCity(memberData.city || '');
        setState(memberData.state || '');
        setPin(memberData.pin || '');
        setStatus(memberData.status);
        setSelectedPlanId(memberData.current_plan_id || '');
        setPlanStartDate(memberData.plan_start_date || '');
        setPlanEndDate(memberData.plan_end_date || '');
        setTrainerId(memberData.trainer_id || '');
        setHeightCm(memberData.height_cm ? String(memberData.height_cm) : '');
        setWeightKg(memberData.weight_kg ? String(memberData.weight_kg) : '');
        setFitnessLevel(memberData.fitness_level || '');
        setTimingSlot(memberData.timing_slot || '');
        setMedicalConditions(memberData.medical_conditions || '');
        setHasLocker(memberData.has_locker || false);
        setLockerNumber(memberData.locker_number || '');

      } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
        router.push('/dashboard/members');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.gymId, memberId, supabase]);

  // Plan duration date recalculation
  useEffect(() => {
    if (!selectedPlanId || !planStartDate) return;
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    const start = new Date(planStartDate);
    start.setDate(start.getDate() + plan.duration_days);
    setPlanEndDate(start.toISOString().split('T')[0]);
  }, [selectedPlanId, planStartDate, plans]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('members.edit')) {
      toast.error('You do not have permission to edit members');
      return;
    }
    if (!name.trim() || !phone.trim() || phone.length !== 10) {
      toast.error('Name and valid 10-digit phone number are required');
      return;
    }

    try {
      setSaving(true);
      
      // Calculate BMI
      let bmi: number | null = null;
      if (weightKg && heightCm) {
        const heightM = Number(heightCm) / 100;
        bmi = Math.round((Number(weightKg) / (heightM * heightM)) * 10) / 10;
      }

      const { error: updateError } = await supabase
        .from('members')
        .update({
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
          status: status || 'active',
          current_plan_id: selectedPlanId || null,
          plan_start_date: planStartDate || null,
          plan_end_date: planEndDate || null,
          trainer_id: trainerId === 'none' || !trainerId ? null : trainerId,
          bmi,
          height_cm: heightCm ? Number(heightCm) : null,
          weight_kg: weightKg ? Number(weightKg) : null,
          fitness_level: fitnessLevel || null,
          timing_slot: timingSlot.trim() || null,
          medical_conditions: medicalConditions.trim() || null,
          has_locker: hasLocker,
          locker_number: hasLocker ? lockerNumber.trim() : null,
        })
        .eq('id', memberId)
        .eq('gym_id', user?.gymId);

      if (updateError) throw updateError;

      toast.success('Member profile updated successfully!');
      router.push(`/dashboard/members/${memberId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Edit Member Profile</h2>
            <p className="text-zinc-500 text-xs mt-1">Modify personal, fitness parameters, and assigned trainer records.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveChanges}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main profile forms */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-200">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-zinc-300 text-sm">Full Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-zinc-300 text-sm">Phone Number *</Label>
                  <Input
                    id="phone"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="whatsapp" className="text-zinc-300 text-sm">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    maxLength={10}
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-zinc-300 text-sm">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:border-purple-600"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dob" className="text-zinc-300 text-sm">DOB</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100"
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
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-200">Address & Extras</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <Label htmlFor="address" className="text-zinc-300 text-sm">Street Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city" className="text-zinc-300 text-sm">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100"
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
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100"
                    />
                  </div>
                </div>

                <div className="h-[1px] bg-zinc-800/40 my-2" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Locker setup */}
                  <div className="space-y-3 mt-2">
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
                          value={lockerNumber}
                          onChange={(e) => setLockerNumber(e.target.value)}
                          className="border-zinc-800 bg-zinc-950 text-zinc-100 focus:ring-purple-600 w-1/2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Status, Plans, & Fitness details */}
          <div className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-200">Membership & Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="status" className="text-zinc-300 text-sm">Profile Status *</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger id="status" className="border-zinc-800 bg-zinc-950 text-zinc-100 capitalize">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 capitalize">
                      {MEMBER_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="plan" className="text-zinc-300 text-sm">Current Membership Plan</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger id="plan" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {plans.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.price})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="planStart" className="text-zinc-300 text-sm">Plan Start Date</Label>
                  <Input
                    id="planStart"
                    type="date"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="planEnd" className="text-zinc-300 text-sm text-zinc-500">Plan End Date</Label>
                  <Input
                    id="planEnd"
                    type="date"
                    disabled
                    value={planEndDate}
                    className="border-zinc-800 bg-zinc-900 text-zinc-500 border-dashed"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-200">Fitness & Timing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="trainer" className="text-zinc-300 text-sm">Assigned Personal Trainer</Label>
                  <Select value={trainerId} onValueChange={setTrainerId}>
                    <SelectTrigger id="trainer" className="border-zinc-800 bg-zinc-950 text-zinc-100">
                      <SelectValue placeholder="No trainer assigned" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      <SelectItem value="none">No Trainer</SelectItem>
                      {trainers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weight" className="text-zinc-300 text-sm">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="border-zinc-800 bg-zinc-950 text-zinc-100"
                    />
                  </div>
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
                  <Label htmlFor="slot" className="text-zinc-300 text-sm">Preferred Time Slot</Label>
                  <Input
                    id="slot"
                    placeholder="e.g. 06:00 AM - 08:00 AM"
                    value={timingSlot}
                    onChange={(e) => setTimingSlot(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="medical" className="text-zinc-300 text-sm">Medical Conditions / Notes</Label>
                  <Textarea
                    id="medical"
                    rows={3}
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    className="border-zinc-800 bg-zinc-950 text-zinc-100 text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 mt-6 border-t border-zinc-800 pt-6">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => router.back()}
            className="border-zinc-800 text-zinc-400 hover:bg-zinc-900"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

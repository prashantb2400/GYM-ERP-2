'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  User,
  CreditCard,
  CalendarCheck,
  Receipt,
  Apple,
  Dumbbell,
  Loader2,
  Edit2,
  Calendar,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  HeartPulse,
  Scale,
  Printer,
  PauseCircle,
  ScanFace,
  Fingerprint,
  QrCode,
  ShieldCheck,
  DollarSign,
  Activity,
  ExternalLink,
  Clock,
  Lock,
  Building2,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { FaceEnrollmentModal } from '@/components/attendance/FaceEnrollmentModal';
import { FingerprintEnrollmentModal } from '@/components/attendance/FingerprintEnrollmentModal';
import { PrintIdCardModal } from '@/components/members/PrintIdCardModal';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, formatDate, formatDateTime, formatPhone, maskPhone, formatCurrency, getDaysRemaining } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function calculateAge(dobString?: string | null): number | null {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

function getBMICategory(bmi?: number | null): { label: string; color: string } {
  if (!bmi) return { label: 'Not calculated', color: 'text-zinc-500' };
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-400' };
  if (bmi < 24.9) return { label: 'Normal weight', color: 'text-green-400' };
  if (bmi < 29.9) return { label: 'Overweight', color: 'text-amber-400' };
  return { label: 'Obese', color: 'text-red-400' };
}

export default function MemberDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { can } = usePermission();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [gymProfile, setGymProfile] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  // Modals
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeDays, setFreezeDays] = useState('7');
  const [freezing, setFreezing] = useState(false);
  const [faceEnrollOpen, setFaceEnrollOpen] = useState(false);
  const [fingerprintEnrollOpen, setFingerprintEnrollOpen] = useState(false);
  const [printIdOpen, setPrintIdOpen] = useState(false);

  const loadMemberDetails = async () => {
    if (!user?.gymId || !memberId) return;

    try {
      setLoading(true);
      // 1. Fetch member data with joins (decoupled from users table to prevent RLS recursion)
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*, plans(*), branches(name), diet_charts(id, name), exercise_charts(id, name)')
        .eq('id', memberId)
        .eq('gym_id', user.gymId)
        .single();

      if (memberError || !memberData) {
        throw new Error(memberError?.message || 'Member not found');
      }

      // Fetch trainer name independently if assigned
      if (memberData.trainer_id) {
        try {
          const { data: trainerData } = await supabase
            .from('users')
            .select('name')
            .eq('id', memberData.trainer_id)
            .maybeSingle();
          if (trainerData) {
            memberData.users = trainerData;
          }
        } catch {
          // Graceful fallback: trainer remains empty without breaking member profile load
        }
      }

      // Auto-heal missing qr_token
      if (!memberData.qr_token) {
        const generatedToken = crypto.randomUUID();
        await supabase.from('members').update({ qr_token: generatedToken }).eq('id', memberId);
        memberData.qr_token = generatedToken;
      }

      // Fallback branch fetch if branch_id is set but branches join was null
      if (memberData.branch_id && !memberData.branches) {
        const { data: bData } = await supabase
          .from('branches')
          .select('name')
          .eq('id', memberData.branch_id)
          .single();
        if (bData) {
          memberData.branches = bData;
        }
      }

      setMember(memberData);

      // 2. Fetch gym profile
      const { data: gymData } = await supabase
        .from('gyms')
        .select('name, logo_url, phone, address')
        .eq('id', user.gymId)
        .single();
      if (gymData) {
        setGymProfile(gymData);
      }

      // 3. Fetch member invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('member_id', memberId)
        .order('issued_at', { ascending: false });
      setInvoices(invoicesData || []);

      // 4. Fetch last 30 days attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('member_id', memberId)
        .order('date', { ascending: false })
        .limit(30);
      setAttendance(attendanceData || []);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
      router.push('/dashboard/members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberDetails();
  }, [user?.gymId, memberId]);

  const handleMarkManualAttendance = async () => {
    try {
      setMarkingAttendance(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      // Check if already checked in today
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('gym_id', user?.gymId)
        .eq('member_id', memberId)
        .eq('date', todayStr)
        .single();

      if (existing) {
        toast.warning('Attendance already marked for this member today!');
        return;
      }

      const { error } = await supabase.from('attendance').insert({
        gym_id: user?.gymId,
        branch_id: member?.branch_id || null,
        member_id: memberId,
        member_name: member.name,
        method: 'manual',
        date: todayStr,
        check_in_time: nowIso,
        marked_by: user?.id,
        notes: 'Manual check-in by receptionist/trainer',
      });

      if (error) throw error;

      // Update attendance counter
      await supabase
        .from('members')
        .update({
          attendance_count: (member.attendance_count || 0) + 1,
          last_attendance: nowIso,
        })
        .eq('id', memberId);

      toast.success('Attendance marked successfully!');
      loadMemberDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setMarkingAttendance(false);
    }
  };

  const handleFreeze = async () => {
    if (!member || !user?.gymId) return;
    const days = parseInt(freezeDays);
    if (isNaN(days) || days < 1) return;

    setFreezing(true);
    try {
      const currentEnd = new Date(member.plan_end_date || new Date());
      currentEnd.setDate(currentEnd.getDate() + days);
      const newEndDate = currentEnd.toISOString().split('T')[0];

      const { error } = await supabase
        .from('members')
        .update({
          plan_end_date: newEndDate,
          status: 'frozen',
        })
        .eq('id', member.id);

      if (error) throw error;

      toast.success(`❄️ ${member.name}'s plan frozen for ${days} days. New end date: ${new Date(newEndDate).toLocaleDateString('en-IN')}`);
      setFreezeOpen(false);
      loadMemberDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setFreezing(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'expired': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'frozen': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mb-2" />
        <h2 className="text-xl font-bold text-zinc-200">Member Not Found</h2>
        <p className="text-zinc-500 text-sm mt-1">This member may have been removed or belongs to another gym.</p>
        <Link href="/dashboard/members">
          <Button variant="outline" className="mt-4 border-zinc-800">
            Back to Members
          </Button>
        </Link>
      </div>
    );
  }

  const daysLeft = member.plan_end_date ? getDaysRemaining(member.plan_end_date) : 0;
  const isPlanActive = member.status === 'active' && daysLeft > 0;
  const memberAge = calculateAge(member.dob);
  const bmiInfo = getBMICategory(member.bmi);
  const qrPassValue = `gymerp://checkin/${member.qr_token || member.id || member.member_code}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top action bar & header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 bg-zinc-800 border-2 border-purple-500/40 shadow-lg shrink-0">
            {member.photo_url ? (
              <AvatarImage src={member.photo_url} alt={member.name} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-2xl font-black bg-purple-950 text-purple-300">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-100">{member.name}</h1>
              <Badge className={`${getStatusBadgeColor(member.status)} border text-xs font-bold rounded-full px-2.5 py-0.5 capitalize`}>
                {member.status}
              </Badge>
              {member.branches?.name && (
                <Badge variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 text-xs gap-1 py-0.5">
                  <Building2 className="h-3 w-3 text-purple-400" />
                  {member.branches.name}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 pt-0.5">
              <span className="font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                Code: <strong className="text-zinc-100">{member.member_code}</strong>
              </span>
              <span>Joined: <strong>{formatDate(member.admission_date)}</strong></span>
              {memberAge !== null && <span>Age: <strong>{memberAge} yrs</strong></span>}
              {member.gender && <span className="capitalize">Gender: <strong>{member.gender}</strong></span>}
              {member.blood_group && <span>Blood: <strong className="text-red-400">{member.blood_group}</strong></span>}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Print ID Card */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintIdOpen(true)}
            className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5"
          >
            <Printer className="h-4 w-4 text-purple-400" />
            Print ID Card
          </Button>

          {/* Enroll Fingerprint */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFingerprintEnrollOpen(true)}
            className={member.biometric_enrolled 
              ? "border-green-800/40 bg-green-950/20 text-green-300 hover:bg-green-950/40 text-xs gap-1.5" 
              : "border-purple-800/40 bg-purple-950/20 text-purple-300 hover:bg-purple-950/40 text-xs gap-1.5"
            }
          >
            <Fingerprint className="h-4 w-4" />
            {member.biometric_enrolled ? 'Fingerprint Enrolled ✓' : 'Enroll Fingerprint'}
          </Button>

          {/* Enroll Face ID */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFaceEnrollOpen(true)}
            className={member.face_enrolled 
              ? "border-green-800/40 bg-green-950/20 text-green-300 hover:bg-green-950/40 text-xs gap-1.5" 
              : "border-purple-800/40 bg-purple-950/20 text-purple-300 hover:bg-purple-950/40 text-xs gap-1.5"
            }
          >
            <ScanFace className="h-4 w-4" />
            {member.face_enrolled ? 'Face ID Enrolled ✓' : 'Enroll Face ID'}
          </Button>

          {/* Freeze Plan */}
          {member?.status === 'active' && can('members.edit') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFreezeOpen(true)}
              className="border-blue-800/40 bg-blue-950/20 text-blue-300 hover:bg-blue-950/40 text-xs gap-1.5"
            >
              <PauseCircle className="h-4 w-4" />
              Freeze
            </Button>
          )}

          {/* Mark Attendance */}
          {can('attendance.mark') && (
            <Button
              onClick={handleMarkManualAttendance}
              disabled={markingAttendance}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs gap-2 shadow-md"
            >
              {markingAttendance ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarCheck className="h-4 w-4" />
              )}
              Mark Present
            </Button>
          )}

          {/* Edit Member */}
          {can('members.edit') && (
            <Link href={`/dashboard/members/edit/${member.id}`}>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-xs gap-1">
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Plan Validity */}
        <Card className="border-zinc-800/80 bg-zinc-900/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Membership</span>
              <p className="text-base font-bold text-zinc-100 truncate">{member.plans?.name || 'No Plan'}</p>
              <p className="text-[11px] text-zinc-400">
                {isPlanActive ? `${daysLeft} days remaining` : <span className="text-red-400 font-semibold">Plan Expired</span>}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Financial Balance */}
        <Card className="border-zinc-800/80 bg-zinc-900/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Balance Due</span>
              <p className={`text-base font-bold ${Number(member.total_due) > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {formatCurrency(member.total_due || 0)}
              </p>
              <p className="text-[11px] text-zinc-400">
                Paid: {formatCurrency(member.total_paid_lifetime || 0)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Attendance Tally */}
        <Card className="border-zinc-800/80 bg-zinc-900/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Attendance</span>
              <p className="text-base font-bold text-zinc-100">
                {member.attendance_count || 0} <span className="text-xs font-normal text-zinc-400">Days</span>
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                Last: {member.last_attendance ? formatDate(member.last_attendance) : 'Never'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Timing & Locker */}
        <Card className="border-zinc-800/80 bg-zinc-900/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Slot & Locker</span>
              <p className="text-base font-bold text-zinc-100 truncate">
                {member.timing_slot || 'Anytime'}
              </p>
              <p className="text-[11px] text-zinc-400">
                {member.has_locker ? `Locker #${member.locker_number || 'Assigned'}` : 'No Locker'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-zinc-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: QR Pass, Face ID, Contacts, Emergency */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Biometric Fingerprint Status Card (Primary Biometric) */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-purple-400" />
                  Biometric Fingerprint Pass
                </CardTitle>
                <Badge className={member.biometric_enrolled 
                  ? "bg-green-500/10 text-green-400 border-green-500/20 text-[10px]" 
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]"
                }>
                  {member.biometric_enrolled ? 'Enrolled ✓' : 'Not Enrolled'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-400 mt-1">
                Primary biometric for one-touch optical kiosk check-in (Left Thumb default).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs pt-4">
              {member.biometric_enrolled ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-green-400 bg-green-950/20 border border-green-900/30 p-2.5 rounded-xl">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="text-[11px]">Ready for one-touch biometric scanner check-in.</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 space-y-1 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                    <div className="flex justify-between">
                      <span>Enrolled Finger:</span>
                      <strong className="text-zinc-200 capitalize">{(member.fingerprint_finger || 'left_thumb').replace('_', ' ')}</strong>
                    </div>
                    {member.fingerprint_quality && (
                      <div className="flex justify-between">
                        <span>Quality Score:</span>
                        <strong className="text-green-400">{member.fingerprint_quality}%</strong>
                      </div>
                    )}
                    {member.fingerprint_enrolled_at && (
                      <div className="flex justify-between text-zinc-500">
                        <span>Enrolled Date:</span>
                        <span>{formatDate(member.fingerprint_enrolled_at)}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFingerprintEnrollOpen(true)}
                    className="w-full gap-2 border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs"
                  >
                    <Fingerprint className="h-3.5 w-3.5 text-purple-400" />
                    Manage / Re-enroll Fingerprint
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Capture member's left thumb to enable instant one-touch attendance on the kiosk.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setFingerprintEnrollOpen(true)}
                    className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                  >
                    <Fingerprint className="h-3.5 w-3.5" />
                    Enroll Fingerprint Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biometric Face ID Status Card (Secondary Biometric) */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <ScanFace className="h-4 w-4 text-cyan-400" />
                  Biometric Face ID
                </CardTitle>
                <Badge className={member.face_enrolled 
                  ? "bg-green-500/10 text-green-400 border-green-500/20 text-[10px]" 
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]"
                }>
                  {member.face_enrolled ? 'Enrolled ✓' : 'Secondary'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-400 mt-1">
                Secondary contactless biometric for AI camera walk-through kiosks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs pt-4">
              {member.face_enrolled ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 bg-cyan-950/20 border border-cyan-900/30 p-2.5 rounded-xl">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="text-[11px]">Ready for AI face recognition kiosk walk-throughs.</span>
                  </div>
                  {member.consent_given_at && (
                    <p className="text-[10px] text-zinc-500">
                      Biometric consent logged: {formatDate(member.consent_given_at)}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFaceEnrollOpen(true)}
                    className="w-full gap-2 border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs"
                  >
                    <ScanFace className="h-3.5 w-3.5 text-cyan-400" />
                    Manage / Re-enroll Face
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Enroll 5 camera frames so this member can walk through the AI face kiosk.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFaceEnrollOpen(true)}
                    className="w-full gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs font-semibold"
                  >
                    <ScanFace className="h-3.5 w-3.5" />
                    Enroll Face ID
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Printable Member ID Badge Card */}
          <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden relative">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Printer className="h-4 w-4 text-purple-400" />
                  Print Member ID Card
                </CardTitle>
                <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
                  Physical Badge
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Official badge with gym branding, member photo, and QR pass.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-5 text-center">
              <div 
                onClick={() => setPrintIdOpen(true)}
                className="bg-white p-3 rounded-2xl shadow-xl border border-zinc-200 cursor-pointer hover:scale-105 transition-transform group relative"
                title="Click to preview & print ID badge"
              >
                <QRCodeSVG
                  value={qrPassValue}
                  size={120}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#09090b"
                />
              </div>

              <span className="mt-2 text-xs font-mono font-bold text-zinc-300 bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-800">
                {member.member_code}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintIdOpen(true)}
                className="w-full mt-3 border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs gap-2"
              >
                <Printer className="h-3.5 w-3.5" />
                Preview & Print Member ID Card
              </Button>
            </CardContent>
          </Card>



          {/* Contact Details Card with WhatsApp Integration */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-zinc-200">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {/* Phone */}
              <div className="flex items-center justify-between text-zinc-300 py-1">
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>{user?.role === 'trainer' ? maskPhone(member.phone) : formatPhone(member.phone)}</span>
                </div>
                {user?.role !== 'trainer' && (
                  <a href={`tel:${member.phone}`} className="text-purple-400 hover:text-purple-300 text-[11px] font-medium">
                    Call
                  </a>
                )}
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between text-zinc-300 py-1 border-t border-zinc-800/60 pt-2">
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="h-4 w-4 text-green-400 shrink-0" />
                  <span>{user?.role === 'trainer' ? maskPhone(member.whatsapp_phone || member.phone) : formatPhone(member.whatsapp_phone || member.phone)}</span>
                </div>
                {user?.role !== 'trainer' && (
                  <a
                    href={`https://wa.me/91${(member.whatsapp_phone || member.phone).replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 text-[11px] font-medium flex items-center gap-1"
                  >
                    Chat <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Email */}
              {member.email && (
                <div className="flex items-center justify-between text-zinc-300 py-1 border-t border-zinc-800/60 pt-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-purple-400 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <a href={`mailto:${member.email}`} className="text-purple-400 hover:text-purple-300 text-[11px] font-medium shrink-0 ml-2">
                    Email
                  </a>
                </div>
              )}

              {/* Address */}
              {(member.address || member.city) && (
                <div className="flex items-start gap-2.5 text-zinc-300 py-1 border-t border-zinc-800/60 pt-2">
                  <MapPin className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    {member.address && `${member.address}, `}
                    {member.city && `${member.city}, `}
                    {member.state && `${member.state}`}
                    {member.pin && ` - ${member.pin}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-zinc-200">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {member.emergency_contact?.name || member.emergency_contact?.phone ? (
                <>
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-500">Contact Name</span>
                    <span className="font-semibold text-zinc-200">{member.emergency_contact.name || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-500">Relationship</span>
                    <span className="font-semibold text-zinc-200">{member.emergency_contact.relation || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-zinc-500">Phone</span>
                    {member.emergency_contact.phone ? (
                      <a href={`tel:${member.emergency_contact.phone}`} className="font-semibold text-purple-400 hover:underline">
                        {formatPhone(member.emergency_contact.phone)}
                      </a>
                    ) : (
                      <span className="text-zinc-400">N/A</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-zinc-600 py-3">No emergency contact saved.</div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* CENTRE & RIGHT COLUMN: Plan Details, Health & Metrics, Attendance History, Invoices */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Membership Plan Details Card */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-4 border-b border-zinc-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-200">Membership & Plan Details</CardTitle>
                <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                  {member.plans?.duration_days ? `${member.plans.duration_days} Days Plan` : 'Custom Duration'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className="text-xl font-bold text-purple-400">{member.plans?.name || 'No Active Plan'}</h3>
                    {member.plans?.price && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Base Plan Value: <strong>{formatCurrency(member.plans.price)}</strong>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs text-zinc-400 pt-1">
                    <div>
                      <span className="text-zinc-500 block">Start Date</span>
                      <span className="font-semibold text-zinc-200">
                        {member.plan_start_date ? formatDate(member.plan_start_date) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">End Date</span>
                      <span className="font-semibold text-zinc-200">
                        {member.plan_end_date ? formatDate(member.plan_end_date) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Assigned Trainer</span>
                      <span className="font-semibold text-zinc-200">
                        {member.users?.name || 'No Dedicated Trainer'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Branch Assignment</span>
                      <span className="font-semibold text-zinc-200">
                        {member.branches?.name || 'Main Branch'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Assigned Locker</span>
                      <span className="font-semibold text-zinc-200">
                        {member.has_locker ? `Locker ${member.locker_number || ''}` : 'No Locker Assigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Preferred Timing</span>
                      <span className="font-semibold text-zinc-200">
                        {member.timing_slot || 'Anytime Access'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Days remaining badge */}
                <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-6 shrink-0">
                  <div className="relative flex items-center justify-center h-24 w-24 rounded-full border-4 border-zinc-800 bg-zinc-950">
                    <div className="text-center">
                      <div className={`text-2xl font-black ${isPlanActive ? 'text-purple-400' : 'text-red-400'}`}>
                        {daysLeft > 0 ? daysLeft : 0}
                      </div>
                      <div className="text-[9px] text-zinc-500 uppercase font-bold">Days Left</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health & Fitness Metrics */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-purple-400" />
                Physical & Health Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border border-zinc-800/80 p-3 rounded-xl bg-zinc-950/40 text-center">
                  <Scale className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Weight</div>
                  <div className="text-sm font-bold text-zinc-200 mt-0.5">
                    {member.weight_kg ? `${member.weight_kg} kg` : '-'}
                  </div>
                </div>

                <div className="border border-zinc-800/80 p-3 rounded-xl bg-zinc-950/40 text-center">
                  <Activity className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Height</div>
                  <div className="text-sm font-bold text-zinc-200 mt-0.5">
                    {member.height_cm ? `${member.height_cm} cm` : '-'}
                  </div>
                </div>

                <div className="border border-zinc-800/80 p-3 rounded-xl bg-zinc-950/40 text-center">
                  <HeartPulse className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">BMI</div>
                  <div className="text-sm font-bold text-zinc-200 mt-0.5">
                    {member.bmi ? member.bmi : '-'}
                  </div>
                  <div className={`text-[9px] font-semibold mt-0.5 ${bmiInfo.color}`}>
                    {bmiInfo.label}
                  </div>
                </div>

                <div className="border border-zinc-800/80 p-3 rounded-xl bg-zinc-950/40 text-center">
                  <Dumbbell className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Fitness Level</div>
                  <div className="text-xs font-bold text-zinc-200 mt-1 capitalize">
                    {member.fitness_level || 'Beginner'}
                  </div>
                </div>
              </div>

              {/* Health Goals */}
              {member.health_goals && member.health_goals.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-zinc-400 font-semibold text-xs">Target Goals:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {member.health_goals.map((g: string) => (
                      <Badge key={g} className="bg-purple-950/60 text-purple-300 border border-purple-800/40 text-[10px] px-2.5 py-0.5">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical Conditions */}
              {member.medical_conditions && (
                <div className="space-y-1 pt-1">
                  <span className="text-zinc-400 font-semibold text-xs">Medical Conditions / Injuries:</span>
                  <p className="text-zinc-300 bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl text-xs leading-relaxed">
                    {member.medical_conditions}
                  </p>
                </div>
              )}

              {/* Diet & Workout Plans Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="border border-zinc-800 p-3 rounded-xl bg-zinc-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Apple className="h-4 w-4 text-green-400" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Diet Chart</p>
                      <p className="text-xs font-semibold text-zinc-200">{member.diet_charts?.name || 'Default Diet'}</p>
                    </div>
                  </div>
                  <Link href="/dashboard/diet">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-400 hover:text-white">
                      View
                    </Button>
                  </Link>
                </div>

                <div className="border border-zinc-800 p-3 rounded-xl bg-zinc-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-purple-400" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Workout Routine</p>
                      <p className="text-xs font-semibold text-zinc-200">{member.exercise_charts?.name || 'General Routine'}</p>
                    </div>
                  </div>
                  <Link href="/dashboard/exercise">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-400 hover:text-white">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="border-b border-zinc-800/80 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-purple-400" />
                    Attendance Records
                  </CardTitle>
                  <CardDescription className="text-zinc-500 text-xs mt-0.5">
                    Recent check-ins and biometrics logs (Total: {member.attendance_count || 0})
                  </CardDescription>
                </div>
                <Link href="/dashboard/attendance">
                  <Button variant="ghost" size="sm" className="text-xs text-purple-400 hover:text-white gap-1">
                    All Attendance <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="max-h-[260px] overflow-y-auto p-4 custom-scrollbar">
              {attendance.length === 0 ? (
                <div className="text-center text-zinc-600 text-xs py-8">No attendance records logged yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attendance.map((entry) => {
                    const methodLabel = 
                      entry.method === 'face_recognition' ? 'AI Face' :
                      entry.method === 'fingerprint' ? 'Fingerprint' :
                      entry.method === 'qr_scan' ? 'QR Code' : 'Manual';
                    const methodColor =
                      entry.method === 'face_recognition' ? 'bg-purple-950/60 text-purple-300 border-purple-800/40' :
                      entry.method === 'fingerprint' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' :
                      entry.method === 'qr_scan' ? 'bg-blue-950/60 text-blue-300 border-blue-800/40' :
                      'bg-zinc-800 text-zinc-400 border-zinc-700';

                    return (
                      <div key={entry.id} className="flex justify-between items-center border border-zinc-800 bg-zinc-950/40 p-2.5 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${methodColor}`}>
                            {methodLabel}
                          </span>
                          <span className="text-zinc-300 font-medium">{formatDate(entry.date)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-400 font-mono text-[11px]">
                            {entry.check_in_time ? formatDateTime(entry.check_in_time).split(',')[1] : 'Present'}
                          </span>
                          {entry.check_out_time && (
                            <span className="text-zinc-600 text-[10px] block">
                              Out: {formatDateTime(entry.check_out_time).split(',')[1]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices & Billing Table */}
          <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <CardHeader className="border-b border-zinc-800/80 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-purple-400" />
                  Invoices & Payment Receipts
                </CardTitle>
                <CardDescription className="text-zinc-500 text-xs mt-0.5">
                  Financial transactions and GST tax invoices
                </CardDescription>
              </div>
              <Link href="/dashboard/invoices">
                <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-800 text-zinc-300 gap-1">
                  Manage Invoices
                </Button>
              </Link>
            </CardHeader>
            <Table>
              <TableHeader className="bg-zinc-900/40 border-zinc-800">
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 font-semibold text-xs">Invoice #</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Date</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Amount</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Paid</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Status</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-600 text-xs py-8">
                      No invoices found for this member.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                      <TableCell className="font-semibold font-mono text-zinc-300 text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="text-zinc-400 text-xs">{formatDate(inv.issued_at)}</TableCell>
                      <TableCell className="text-zinc-300 font-semibold text-xs">{formatCurrency(inv.total)}</TableCell>
                      <TableCell className="text-zinc-400 text-xs">{formatCurrency(inv.amount_paid)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] font-bold rounded px-1.5 py-0.5 capitalize ${
                          inv.status === 'paid' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                            : inv.status === 'partial'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-white"
                          title="Print / Download PDF Receipt"
                          onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, '_blank')}
                        >
                          <Printer className="h-3.5 w-3.5 text-purple-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

        </div>
      </div>

      {/* Freeze Membership Dialog */}
      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-blue-400" />
              Freeze Membership
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Pause {member?.name}&apos;s plan. Their end date will be extended by the freeze duration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-zinc-300 text-xs">Select Pause Duration</Label>
              <div className="flex gap-2 mt-2">
                {['7', '14', '30'].map(d => (
                  <Button
                    key={d}
                    size="sm"
                    variant={freezeDays === d ? 'default' : 'outline'}
                    onClick={() => setFreezeDays(d)}
                    className={freezeDays === d
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-zinc-700 text-zinc-400'}
                  >
                    {d} days
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                value={freezeDays}
                onChange={e => setFreezeDays(e.target.value)}
                className="mt-2 bg-zinc-950 border-zinc-700 text-zinc-100"
                placeholder="Or enter custom number of days"
                min="1"
                max="90"
              />
            </div>
            {member?.plan_end_date && (
              <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Current End Date:</span>
                  <span className="font-semibold text-zinc-200">{formatDate(member.plan_end_date)}</span>
                </div>
                <div className="flex justify-between text-blue-300 font-semibold border-t border-zinc-800/80 pt-1.5">
                  <span>Extended End Date:</span>
                  <span>{
                    (() => {
                      const d = new Date(member.plan_end_date);
                      d.setDate(d.getDate() + parseInt(freezeDays || '0'));
                      return formatDate(d.toISOString());
                    })()
                  }</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setFreezeOpen(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handleFreeze}
              disabled={freezing || !freezeDays || parseInt(freezeDays) < 1}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 font-semibold"
            >
              {freezing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
              Freeze for {freezeDays} Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fingerprint Enrollment Modal */}
      {member && (
        <FingerprintEnrollmentModal
          isOpen={fingerprintEnrollOpen}
          onClose={() => setFingerprintEnrollOpen(false)}
          member={{
            id: member.id,
            name: member.name,
            member_code: member.member_code,
            biometric_enrolled: member.biometric_enrolled,
            fingerprint_finger: member.fingerprint_finger,
            photo_url: member.photo_url,
          }}
          onSuccess={() => {
            setMember((prev: any) => ({ ...prev, biometric_enrolled: true }));
            loadMemberDetails();
          }}
        />
      )}

      {/* Face ID Enrollment Modal */}
      {member && (
        <FaceEnrollmentModal
          isOpen={faceEnrollOpen}
          onClose={() => setFaceEnrollOpen(false)}
          member={{
            id: member.id,
            name: member.name,
            member_code: member.member_code,
            face_enrolled: member.face_enrolled,
            photo_url: member.photo_url,
          }}
          onSuccess={() => {
            setMember((prev: any) => ({ ...prev, face_enrolled: true }));
            loadMemberDetails();
          }}
        />
      )}

      {/* Print ID Card Modal */}
      {member && (
        <PrintIdCardModal
          isOpen={printIdOpen}
          onClose={() => setPrintIdOpen(false)}
          gymName={gymProfile?.name}
          member={{
            id: member.id,
            name: member.name,
            member_code: member.member_code,
            photo_url: member.photo_url,
            phone: member.phone,
            blood_group: member.blood_group,
            plan_name: member.plans?.name,
            plan_start_date: member.plan_start_date,
            plan_end_date: member.plan_end_date,
            branch_name: member.branches?.name,
            emergency_contact: member.emergency_contact,
            qr_token: member.qr_token,
            status: member.status,
            admission_date: member.admission_date,
          }}
        />
      )}
    </div>
  );
}

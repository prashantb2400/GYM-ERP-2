'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Trash2,
  Calendar,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  HeartPulse,
  Scale,
  Award,
  Video,
  Printer,
  Plus,
  PauseCircle,
  ScanFace,
} from 'lucide-react';
import { FaceEnrollmentModal } from '@/components/attendance/FaceEnrollmentModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, formatDate, formatDateTime, formatPhone, formatCurrency, getDaysRemaining } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function MemberDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { can } = usePermission();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  
  // Modal toggles (Mock behavior for v1)
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeDays, setFreezeDays] = useState('7');
  const [freezing, setFreezing] = useState(false);
  const [faceEnrollOpen, setFaceEnrollOpen] = useState(false);

  const loadMemberDetails = async () => {
    if (!user?.gymId || !memberId) return;

    try {
      setLoading(true);
      // 1. Fetch member data
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*, plans(*), users!members_trainer_id_fkey(name), diet_charts(name), exercise_charts(name)')
        .eq('id', memberId)
        .eq('gym_id', user.gymId)
        .single();

      if (memberError || !memberData) {
        throw new Error(memberError?.message || 'Member not found');
      }
      setMember(memberData);

      // 2. Fetch member invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('member_id', memberId)
        .order('issued_at', { ascending: false });
      setInvoices(invoicesData || []);

      // 3. Fetch last 30 days attendance
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
      
      const { error } = await supabase.from('attendance').insert({
        gym_id: user?.gymId,
        member_id: memberId,
        member_name: member.name,
        method: 'manual',
        date: new Date().toISOString().split('T')[0],
        marked_by: user?.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.warning('Attendance already marked for this member today!');
        } else {
          throw error;
        }
      } else {
        toast.success('Attendance marked successfully!');
        loadMemberDetails();
      }
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
      // Calculate new end date
      const currentEnd = new Date(member.plan_end_date || new Date());
      currentEnd.setDate(currentEnd.getDate() + days);
      const newEndDate = currentEnd.toISOString().split('T')[0];

      // Update member: extend end date + set status to frozen
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
      // Reload member data
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

  const daysLeft = member.plan_end_date ? getDaysRemaining(member.plan_end_date) : 0;
  const isPlanActive = member.status === 'active' && daysLeft > 0;

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 bg-zinc-800 border border-zinc-800">
            {member.photo_url ? (
              <AvatarImage src={member.photo_url} alt={member.name} />
            ) : null}
            <AvatarFallback className="text-lg font-bold bg-purple-900/60 text-purple-300">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{member.name}</h2>
              <Badge className={`${getStatusBadgeColor(member.status)} border text-[10px] font-semibold rounded-full px-2 py-0.5 capitalize`}>
                {member.status}
              </Badge>
            </div>
            <p className="text-zinc-500 text-xs mt-1">Code: {member.member_code} • Enrolled on {formatDate(member.admission_date)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {member?.status === 'active' && can('members.edit') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFreezeOpen(true)}
              className="border-blue-700/50 text-blue-400 hover:bg-blue-950/30"
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Freeze Plan
            </Button>
          )}
          {can('attendance.mark') && (
            <Button
              onClick={handleMarkManualAttendance}
              disabled={markingAttendance}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs gap-2"
            >
              {markingAttendance ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <CalendarCheck className="h-4 w-4" />
              )}
              Mark Present
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFaceEnrollOpen(true)}
            className={member.face_enrolled 
              ? "border-green-700/50 text-green-400 hover:bg-green-950/30 text-xs gap-1.5" 
              : "border-purple-700/50 text-purple-400 hover:bg-purple-950/30 text-xs gap-1.5"
            }
          >
            <ScanFace className="h-4 w-4" />
            {member.face_enrolled ? 'Face ID Enrolled ✓' : 'Enroll Face ID'}
          </Button>
          <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs gap-2">
            <Printer className="h-4 w-4" /> Print ID Card
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Profile info */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-zinc-200">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center gap-3 text-zinc-300">
                <Phone className="h-4 w-4 text-purple-400 shrink-0" />
                <span>{formatPhone(member.phone)}</span>
              </div>
              {member.whatsapp_phone && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <MessageCircle className="h-4 w-4 text-green-400 shrink-0" />
                  <span>{formatPhone(member.whatsapp_phone)} (WhatsApp)</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <Mail className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {(member.address || member.city) && (
                <div className="flex items-start gap-3 text-zinc-300">
                  <MapPin className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    {member.address && `${member.address}, `}
                    {member.city && `${member.city}, `}
                    {member.state && `${member.state}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-zinc-200">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {member.emergency_contact?.name ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Contact Name</span>
                    <span className="font-semibold text-zinc-200">{member.emergency_contact.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Relation</span>
                    <span className="font-semibold text-zinc-200">{member.emergency_contact.relation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Phone</span>
                    <span className="font-semibold text-purple-400">{formatPhone(member.emergency_contact.phone)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-zinc-600 py-4">No emergency contacts saved.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-zinc-200">Health & Fitness metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-zinc-800/60 p-3 rounded-lg bg-zinc-950/20 text-center">
                  <Scale className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase">Weight</div>
                  <div className="text-sm font-bold text-zinc-200 mt-0.5">{member.weight_kg ? `${member.weight_kg} kg` : '-'}</div>
                </div>
                <div className="border border-zinc-800/60 p-3 rounded-lg bg-zinc-950/20 text-center">
                  <HeartPulse className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase">BMI</div>
                  <div className="text-sm font-bold text-zinc-200 mt-0.5">{member.bmi ? member.bmi : '-'}</div>
                </div>
              </div>

              {member.health_goals && member.health_goals.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-zinc-500 font-medium">Fitness Goals</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {member.health_goals.map((g: string) => (
                      <Badge key={g} className="bg-purple-950/60 text-purple-300 border border-purple-800/30 text-[10px]">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {member.medical_conditions && (
                <div className="space-y-1">
                  <div className="text-zinc-500 font-medium">Medical issues</div>
                  <p className="text-zinc-400 leading-relaxed bg-zinc-950/30 border border-zinc-800 p-2.5 rounded text-[11px]">
                    {member.medical_conditions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biometric Face ID Card */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <ScanFace className="h-4 w-4 text-purple-400" />
                  Biometric Face ID
                </CardTitle>
                <Badge className={member.face_enrolled 
                  ? "bg-green-500/10 text-green-400 border-green-500/20 text-[10px]" 
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]"
                }>
                  {member.face_enrolled ? 'Enrolled ✓' : 'Not Enrolled'}
                </Badge>
              </div>
              <CardDescription className="text-xs text-zinc-400 mt-1">
                Biometric vector for walk-through contactless attendance kiosks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFaceEnrollOpen(true)}
                className="w-full gap-2 border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs"
              >
                <ScanFace className="h-4 w-4 text-purple-400" />
                {member.face_enrolled ? 'Update / Re-enroll Face' : 'Enroll Face ID'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Centre & Right columns: Plan validity, Heatmap, Invoices, Diets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plan validity info */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold text-zinc-200">Membership details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold text-purple-400">{member.plans?.name || 'No Plan'}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-zinc-400">
                    <div>
                      <span className="text-zinc-500 block">Start Date</span>
                      <span className="font-medium text-zinc-200">{member.plan_start_date ? formatDate(member.plan_start_date) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">End Date</span>
                      <span className="font-medium text-zinc-200">{member.plan_end_date ? formatDate(member.plan_end_date) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Assigned Trainer</span>
                      <span className="font-medium text-zinc-200">{member.users?.name || 'No Trainer'}</span>
                    </div>
                    {member.timing_slot && (
                      <div>
                        <span className="text-zinc-500 block">Preferred Slot</span>
                        <span className="font-medium text-zinc-200">{member.timing_slot}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-4 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-6">
                  {/* Days remaining badge representation */}
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-full border-4 border-zinc-800">
                    <div className="text-center">
                      <div className={`text-xl font-black ${isPlanActive ? 'text-purple-400' : 'text-red-400'}`}>
                        {daysLeft > 0 ? daysLeft : 0}
                      </div>
                      <div className="text-[9px] text-zinc-500 uppercase font-semibold">Days left</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Heatmap / List */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-zinc-200">Attendance Log</CardTitle>
              <CardDescription className="text-zinc-500 text-xs">Last 30 check-in timestamps</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[220px] overflow-y-auto pr-2">
              {attendance.length === 0 ? (
                <div className="text-center text-zinc-600 text-xs py-8">No attendance records logged.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attendance.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center border border-zinc-800 bg-zinc-950/20 p-2.5 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-800 text-[10px] text-zinc-400 px-1.5 py-0.5 rounded font-semibold capitalize">
                          {entry.method}
                        </span>
                        <span className="text-zinc-300 font-medium">{formatDate(entry.date)}</span>
                      </div>
                      <span className="text-zinc-500">{formatDateTime(entry.check_in_time).split(',')[1]}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoices list */}
          <Card className="border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <CardTitle className="text-sm font-bold text-zinc-200">Invoices & Receipts</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader className="bg-zinc-900/40 border-zinc-800">
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 font-semibold text-xs">Invoice #</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Date</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Amount</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Paid</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Status</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-600 text-xs py-8">No invoices found.</TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id} className="border-zinc-800/40 hover:bg-zinc-800/5">
                      <TableCell className="font-semibold text-zinc-300 text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="text-zinc-400 text-xs">{formatDate(inv.issued_at)}</TableCell>
                      <TableCell className="text-zinc-300 font-medium text-xs">{formatCurrency(inv.total)}</TableCell>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white" title="Print invoice receipt">
                          <Printer className="h-3.5 w-3.5" />
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

      {/* Freeze Dialog */}
      <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">❄️ Freeze Membership</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Pause {member?.name}'s plan. Their end date will be extended by the freeze duration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-zinc-300 text-sm">Freeze Duration (days)</Label>
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
                placeholder="Or enter custom days"
                min="1"
                max="90"
              />
            </div>
            {member?.plan_end_date && (
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 p-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Current end date</span>
                  <span>{new Date(member.plan_end_date).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-blue-300 font-medium mt-1">
                  <span>New end date</span>
                  <span>{
                    (() => {
                      const d = new Date(member.plan_end_date);
                      d.setDate(d.getDate() + parseInt(freezeDays || '0'));
                      return d.toLocaleDateString('en-IN');
                    })()
                  }</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFreezeOpen(false)} className="text-zinc-400">Cancel</Button>
            <Button
              onClick={handleFreeze}
              disabled={freezing || !freezeDays || parseInt(freezeDays) < 1}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {freezing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : '❄️ '}
              Freeze for {freezeDays} days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dumbbell,
  Users,
  CalendarCheck,
  CheckCircle,
  Loader2,
  Phone,
  Flame,
  Clock,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { SpotlightCard, GradientText, GlowingBadge, AnimatedList, BorderBeam } from '@/components/magicui';

export default function TrainerDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [trainerUser, setTrainerUser] = useState<any>(null);
  const [assignedMembers, setAssignedMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchTrainerSessionAndMembers = async () => {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // 1. Fetch trainer info from public users table
      const { data: trainer } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (trainer) {
        setTrainerUser(trainer);

        // 2. Fetch members assigned to this trainer
        const { data: members, error } = await supabase
          .from('members')
          .select('*, plans(name)')
          .eq('trainer_id', trainer.id)
          .order('name', { ascending: true });

        if (error) throw error;
        setAssignedMembers(members || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainerSessionAndMembers();
  }, []);

  const handleMarkAttendance = async (member: any) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase.from('attendance').insert({
        gym_id: trainerUser.gym_id,
        member_id: member.id,
        member_name: member.name,
        date: today,
        method: 'manual',
        marked_by: trainerUser.id,
        notes: `Marked present by personal trainer: ${trainerUser.name}`,
      });

      if (error) {
        if (error.code === '23505') {
          toast.info('Attendance already logged for today.');
        } else {
          throw error;
        }
      } else {
        toast.success(`Check-in logged for ${member.name}`);
        
        // Update local member attendance count
        setAssignedMembers(prev =>
          prev.map(m => m.id === member.id ? { ...m, attendance_count: (m.attendance_count || 0) + 1 } : m)
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === 'active') return 'bg-green-500/10 text-green-400 border border-green-500/20';
    if (status === 'expired') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-zinc-800 text-zinc-500';
  };

  // Filter members client-side
  const filteredMembers = assignedMembers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.member_code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 max-w-4xl mx-auto space-y-6">
      
      {/* Header Profile card */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
        <div>
          <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">Trainer Console</span>
          <h2 className="text-xl font-black text-zinc-100"><GradientText>Coach: {trainerUser?.name}</GradientText></h2>
          {trainerUser?.specialization && (
            <p className="text-zinc-500 text-xs mt-0.5">Specialization: {trainerUser.specialization}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/workouts"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 active:scale-95 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all duration-150 shadow-xs cursor-pointer"
          >
            <Dumbbell className="h-3.5 w-3.5" />
            <span>Workouts Hub</span>
          </Link>
          <Badge className="bg-purple-950/40 text-purple-400 border border-purple-800/20 uppercase font-bold text-[9px]">
            {trainerUser?.role}
          </Badge>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 gap-6">
        <SpotlightCard>
        <Card className="border-zinc-900 bg-zinc-900/30 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase font-bold">
            <Users className="h-4 w-4 text-purple-400" />
            <span>Assigned Clients</span>
          </div>
          <span className="text-2xl font-black text-zinc-100 mt-2">{assignedMembers.length}</span>
        </Card>
        </SpotlightCard>

        <SpotlightCard>
        <Card className="border-zinc-900 bg-zinc-900/30 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase font-bold">
            <CalendarCheck className="h-4 w-4 text-purple-400" />
            <span>Marked Today</span>
          </div>
          <span className="text-2xl font-black text-zinc-100 mt-2">
            {assignedMembers.filter(m => m.status === 'active').length} Active
          </span>
        </Card>
        </SpotlightCard>
      </div>

      {/* Search Filter input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Filter client name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-zinc-900 bg-zinc-900/50 text-zinc-100 text-xs placeholder:text-zinc-700 h-9"
        />
      </div>

      {/* Clients list table */}
      <Card className="border-zinc-900 bg-zinc-900/30 overflow-hidden relative">
        <BorderBeam />
        <CardHeader className="pb-3 border-b border-zinc-900/40 py-3.5 bg-zinc-900/10">
          <CardTitle className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider">Client Roster</CardTitle>
        </CardHeader>
        
        {filteredMembers.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs">No assigned gym clients matching filters.</div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-950/20 border-zinc-900">
              <TableRow className="border-zinc-900">
                <TableHead className="text-zinc-500 text-[10px] uppercase font-bold">Code</TableHead>
                <TableHead className="text-zinc-500 text-[10px] uppercase font-bold">Client Name</TableHead>
                <TableHead className="text-zinc-500 text-[10px] uppercase font-bold">Active Package</TableHead>
                <TableHead className="text-zinc-500 text-[10px] uppercase font-bold text-center">Attn</TableHead>
                <TableHead className="text-zinc-500 text-[10px] uppercase font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatedList>
              {filteredMembers.map((m) => (
                <TableRow key={m.id} className="border-zinc-900/40 hover:bg-zinc-900/10">
                  <TableCell className="font-semibold text-zinc-300 text-xs font-mono">{m.member_code}</TableCell>
                  <TableCell className="font-semibold text-zinc-200 text-xs">
                    <div>{m.name}</div>
                    <span className="text-[9px] text-zinc-500 block font-normal mt-0.5">{m.phone}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px] text-zinc-400">{m.plans?.name || 'No Plan'}</div>
                    <GlowingBadge className={`${getStatusBadgeColor(m.status)} text-[8px] uppercase px-1 py-0 rounded mt-1 font-bold`}>
                      {m.status}
                    </GlowingBadge>
                  </TableCell>
                  <TableCell className="text-center font-bold text-zinc-300 text-xs">{m.attendance_count || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href="/dashboard/workouts"
                        title="Open Workout Hub & Plate Calculator"
                        className="inline-flex items-center justify-center h-7 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-zinc-400 hover:text-purple-300 border border-zinc-800 text-[10px] font-semibold transition-all duration-150 gap-1"
                      >
                        <Dumbbell className="h-3 w-3 text-purple-400" />
                        <span className="hidden sm:inline">Prescribe</span>
                      </Link>
                      {m.status === 'active' && (
                        <Button
                          onClick={() => handleMarkAttendance(m)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold h-7 px-2.5 rounded-lg gap-1 active:scale-95 transition-all duration-150"
                        >
                          <CheckCircle className="h-3 w-3" /> Check-in
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </AnimatedList>
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Member, Attendance } from '@/types/database';
import { Search, CheckCircle2, UserCheck, AlertTriangle, AlertCircle, Loader2, Calendar, Clock, Activity, Users, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GradientText } from '@/components/magicui/gradient-text';
import { GridPattern } from '@/components/magicui/grid-pattern';
import { SpotlightCard } from '@/components/magicui/spotlight-card';
import { AnimatedList } from '@/components/magicui/animated-list';
import { toast } from 'sonner';
import { formatPhone, getInitials, getDaysRemaining, formatCurrency } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function AttendancePage() {
  const supabase = createClient();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [todayLogs, setTodayLogs] = useState<(Attendance & { members?: { name: string; photo_url?: string | null; member_code?: string | null } })[]>([]);
  const [checkedInMemberIds, setCheckedInMemberIds] = useState<Set<string>>(new Set());
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  
  const [absentees, setAbsentees] = useState<Member[]>([]);
  const [loadingAbsent, setLoadingAbsent] = useState(false);
  
  const [stats, setStats] = useState({
    todayCount: 0,
    weekAvg: 0,
    notCheckedIn: 0,
    peakHour: '-'
  });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Search members
  useEffect(() => {
    async function searchMembers() {
      if (!user?.gymId || !debouncedQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        let query = supabase
          .from('members')
          .select('id, name, phone, member_code, status, plan_end_date, total_due, photo_url')
          .eq('gym_id', user.gymId);

        if (user.role === 'trainer' && user.staffRecordId) {
          query = query.eq('trainer_id', user.staffRecordId);
        }

        const { data, error } = await query
          .or(`name.ilike.%${debouncedQuery.trim()}%,phone.ilike.%${debouncedQuery.trim()}%,member_code.ilike.%${debouncedQuery.trim()}%`)
          .limit(8);

        if (error) throw error;
        setSearchResults((data || []) as Member[]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to search members:', msg);
      } finally {
        setIsSearching(false);
      }
    }

    searchMembers();
  }, [debouncedQuery, user?.gymId]);

  // Load today's logs & stats
  const fetchTodayData = async () => {
    if (!user?.gymId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Get today's attendance
      let logsQuery = supabase
        .from('attendance')
        .select('*, members!inner(name, member_code, photo_url, trainer_id)')
        .eq('gym_id', user.gymId)
        .eq('date', today)
        .order('check_in_time', { ascending: false });

      if (user.role === 'trainer' && user.staffRecordId) {
        logsQuery = logsQuery.eq('members.trainer_id', user.staffRecordId);
      }

      const { data: logs, error: logsError } = await logsQuery;

      if (logsError) throw logsError;
      
      setTodayLogs(logs || []);
      
      const checkedIds = new Set((logs || []).map(l => l.member_id));
      setCheckedInMemberIds(checkedIds);

      // Get active members count for stats
      let countQuery = supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', user.gymId)
        .eq('status', 'active');

      if (user.role === 'trainer' && user.staffRecordId) {
        countQuery = countQuery.eq('trainer_id', user.staffRecordId);
      }

      const { count: activeCount } = await countQuery;

      // Calculate peak hour
      const hourCounts: Record<string, number> = {};
      logs?.forEach(log => {
        if (log.check_in_time) {
          const hour = new Date(log.check_in_time).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
      let peakHour = '-';
      if (Object.keys(hourCounts).length > 0) {
        const peak = Object.entries(hourCounts).reduce((a, b) => a[1] > b[1] ? a : b);
        const hour = parseInt(peak[0]);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        peakHour = `${formattedHour} ${ampm}`;
      }

      setStats({
        todayCount: logs?.length || 0,
        weekAvg: Math.round((logs?.length || 0) * 0.8), // Mock data for week avg
        notCheckedIn: Math.max(0, (activeCount || 0) - (logs?.length || 0)),
        peakHour
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch dashboard data:', msg);
    }
  };

  const loadAbsentees = useCallback(async () => {
    if (!user?.gymId) return;
    setLoadingAbsent(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      let query = supabase
        .from('members')
        .select('id, name, phone, member_code, plan_end_date, total_due, photo_url, last_attendance')
        .eq('gym_id', user.gymId)
        .eq('status', 'active');

      if (user.role === 'trainer' && user.staffRecordId) {
        query = query.eq('trainer_id', user.staffRecordId);
      }

      const { data: activeMembers } = await query.order('name', { ascending: true });

      // Get today's checked-in member IDs
      const { data: todayChecked } = await supabase
        .from('attendance')
        .select('member_id')
        .eq('gym_id', user.gymId)
        .eq('date', today);

      const checkedIds = new Set((todayChecked || []).map(r => r.member_id));
      const absent = (activeMembers || []).filter(m => !checkedIds.has(m.id));
      setAbsentees((absent || []) as Member[]);
    } finally {
      setLoadingAbsent(false);
    }
  }, [user?.gymId, supabase]);

  useEffect(() => {
    fetchTodayData();
    loadAbsentees();

    // Supabase Realtime Subscription
    if (user?.gymId) {
      const channel = supabase
        .channel('attendance-today')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `gym_id=eq.${user.gymId}`,
        }, (payload) => {
          fetchTodayData(); // Just refetch to get joined data easily
          loadAbsentees();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.gymId, loadAbsentees]);

  const handleCheckIn = async (member: Member) => {
    if (!user?.gymId) return;
    
    try {
      setCheckingInId(member.id);
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('attendance')
        .insert({
          gym_id: user.gymId,
          member_id: member.id,
          member_name: member.name,
          date: today,
          check_in_time: now,
          method: 'manual',
          marked_by: user.id
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
           toast.error('Already checked in today!');
           setCheckedInMemberIds(prev => new Set(prev).add(member.id));
        } else {
           throw error;
        }
      } else {
        toast.success(`✅ ${member.name} checked in!`);
        setCheckedInMemberIds(prev => new Set(prev).add(member.id));
        // Realtime will update the list
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setCheckingInId(null);
    }
  };

  const getStatusInfo = (member: Member) => {
    if (member.status === 'expired') {
      return { color: 'text-red-400 bg-red-400/10 border-red-400/20', text: 'Expired' };
    }
    if (member.plan_end_date) {
      const days = getDaysRemaining(member.plan_end_date);
      if (days < 0) return { color: 'text-red-400 bg-red-400/10 border-red-400/20', text: `Expired ${Math.abs(days)}d ago` };
      if (days <= 7) return { color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', text: `${days}d left` };
      return { color: 'text-green-400 bg-green-400/10 border-green-400/20', text: 'Active' };
    }
    return { color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20', text: member.status };
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CheckInPanel = () => (
    <div className="space-y-6 flex-1">
      {/* Search Box */}
      <div className="relative group">
        <div className="absolute inset-0 bg-purple-500/10 rounded-2xl blur-xl transition-all duration-300 group-hover:bg-purple-500/20 opacity-50" />
        <div className="relative flex items-center bg-zinc-950/80 border border-zinc-800 rounded-2xl p-2 shadow-2xl backdrop-blur-sm focus-within:border-purple-500/50 transition-colors">
          <Search className="w-6 h-6 text-zinc-500 ml-3" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or member ID..."
            className="border-0 bg-transparent text-lg h-14 focus-visible:ring-0 placeholder:text-zinc-600 pl-4"
            autoFocus
          />
          {isSearching && <Loader2 className="w-5 h-5 text-purple-500 animate-spin mr-4" />}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="space-y-3">
          {searchResults.length === 0 && !isSearching ? (
            <div className="text-center py-12 text-zinc-500 bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
              No members found matching "{searchQuery}"
            </div>
          ) : (
            <AnimatedList delay={50} className="grid grid-cols-1 gap-3">
              {searchResults.map((member) => {
                const statusInfo = getStatusInfo(member);
                const isCheckedIn = checkedInMemberIds.has(member.id);
                const isCheckingIn = checkingInId === member.id;

                return (
                  <SpotlightCard key={member.id} className={`p-4 ${isCheckedIn ? 'border-green-800/50 bg-green-950/10' : ''}`}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-zinc-800">
                          <AvatarImage src={member.photo_url || ''} />
                          <AvatarFallback className="bg-zinc-800 text-zinc-300">{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-zinc-100">{member.name}</h3>
                            <span className="text-xs text-zinc-500 font-mono bg-zinc-800/50 px-2 py-0.5 rounded">
                              {member.member_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-zinc-400">{formatPhone(member.phone)}</span>
                            <span className="text-zinc-600">•</span>
                            <Badge variant="outline" className={`border ${statusInfo.color}`}>
                              {statusInfo.text}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        {member.total_due > 0 && (
                          <div className="flex items-center gap-1.5 text-red-400 text-sm font-medium bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20">
                            <AlertTriangle className="w-4 h-4" />
                            {formatCurrency(member.total_due)} due
                          </div>
                        )}
                        
                        {isCheckedIn ? (
                          <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2.5 rounded-xl border border-green-400/20 font-medium w-full sm:w-auto justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Checked In Today</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleCheckIn(member)}
                            disabled={isCheckingIn}
                            className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-5 rounded-xl w-full sm:w-auto transition-all active:scale-95"
                          >
                            {isCheckingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5 mr-2" />}
                            Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  </SpotlightCard>
                );
              })}
            </AnimatedList>
          )}
        </div>
      )}
      
      {!searchQuery.trim() && (
         <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
           <UserCheck className="w-16 h-16 text-zinc-800 mb-4" />
           <p className="text-lg font-medium text-zinc-400">Ready for check-ins</p>
           <p className="text-sm">Search by name or phone number to start</p>
         </div>
      )}
    </div>
  );

  const TodayLogPanel = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <SpotlightCard className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Today</span>
          </div>
          <span className="text-2xl font-bold text-zinc-100">{stats.todayCount}</span>
        </SpotlightCard>
        
        <SpotlightCard className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Week Avg</span>
          </div>
          <span className="text-2xl font-bold text-zinc-100">{stats.weekAvg}</span>
        </SpotlightCard>
        
        <SpotlightCard className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Missing</span>
          </div>
          <span className="text-2xl font-bold text-zinc-100">{stats.notCheckedIn}</span>
        </SpotlightCard>
        
        <SpotlightCard className="p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium uppercase tracking-wider">Peak Hr</span>
          </div>
          <span className="text-2xl font-bold text-zinc-100">{stats.peakHour}</span>
        </SpotlightCard>
      </div>

      {/* Live Log */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-320px)] min-h-[400px]">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            Today's Log
          </h3>
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-0">
            {stats.todayCount} ✓
          </Badge>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {todayLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <Clock className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No check-ins today</p>
            </div>
          ) : (
            <AnimatedList delay={0}>
              {todayLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-zinc-800">
                      <AvatarImage src={log.members?.photo_url || ''} />
                      <AvatarFallback className="text-xs bg-zinc-800 text-zinc-400">{getInitials(log.members?.name || log.member_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{log.members?.name || log.member_name}</p>
                      <p className="text-xs text-zinc-500">{formatTime(log.check_in_time)}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] ${
                      log.method === 'face_recognition' ? 'text-cyan-400 border-cyan-400/20 bg-cyan-400/10' :
                      log.method === 'fingerprint' ? 'text-purple-400 border-purple-400/20 bg-purple-400/10' :
                      'text-zinc-400 border-zinc-800 bg-zinc-900'
                    }`}
                  >
                    {log.method === 'face_recognition' ? 'Face ID' : log.method === 'fingerprint' ? 'Biometric' : 'Manual'}
                  </Badge>
                </div>
              ))}
            </AnimatedList>
          )}
        </div>
      </div>
    </div>
  );

  const AbsenteePanel = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Not checked in today</span>
        <span className="flex items-center gap-1.5 bg-red-950/50 border border-red-800/40 text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full">
          <UserX className="h-3 w-3" />
          {absentees.length}
        </span>
      </div>

      {loadingAbsent ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      ) : absentees.length === 0 ? (
        <div className="text-center py-10 text-zinc-500">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
          <p className="text-sm">All active members checked in today! 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
          {absentees.map(member => {
            const daysLeft = member.plan_end_date
              ? Math.ceil((new Date(member.plan_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            const expiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
            return (
              <div key={member.id} className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5',
                expiringSoon ? 'border-amber-800/40 bg-amber-950/10' : 'border-zinc-800/60 bg-zinc-900/60'
              )}>
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                  {member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-300 truncate">{member.name}</div>
                  <div className="text-xs text-zinc-500">{member.phone}</div>
                </div>
                <div className="text-right shrink-0">
                  {expiringSoon && (
                    <div className="text-xs text-amber-400 font-medium">⚠️ {daysLeft}d left</div>
                  )}
                  {(member.total_due || 0) > 0 && (
                    <div className="text-xs text-red-400">₹{member.total_due} due</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <GridPattern className="absolute inset-0 opacity-10 pointer-events-none -z-10" />
      
      <div className="mb-8">
        <GradientText className="text-3xl font-bold tracking-tight">⚡ Quick Check-In</GradientText>
        <p className="text-zinc-500 mt-1">Search members or scan biometrics to log attendance.</p>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex gap-8 items-start">
        <CheckInPanel />
        <div className="flex flex-col gap-6 w-full lg:w-[400px] flex-shrink-0">
          <TodayLogPanel />
          <SpotlightCard className="p-4">
            <AbsenteePanel />
          </SpotlightCard>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="search" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Check In</TabsTrigger>
            <TabsTrigger value="log" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Today ({todayLogs.length})</TabsTrigger>
            <TabsTrigger value="absent" className="data-[state=active]:bg-red-900 data-[state=active]:text-white">Absent ({absentees.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="mt-0">
            <CheckInPanel />
          </TabsContent>
          <TabsContent value="log" className="mt-0">
            <TodayLogPanel />
          </TabsContent>
          <TabsContent value="absent" className="mt-0">
            <SpotlightCard className="p-4">
              <AbsenteePanel />
            </SpotlightCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

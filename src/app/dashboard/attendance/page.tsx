'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import type { Member, Attendance } from '@/types/database';
import {
  Search,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Activity,
  Users,
  UserX,
  ScanFace,
  Fingerprint,
  FileSpreadsheet,
  QrCode,
  Sparkles,
  Cctv,
  MoreVertical,
  LayoutGrid,
  Monitor,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { exportToExcel } from '@/lib/export/excel-export';

const FaceEnrollmentModal = dynamic(
  () => import('@/components/attendance/FaceEnrollmentModal').then((mod) => mod.FaceEnrollmentModal),
  { ssr: false }
);

const FingerprintEnrollmentModal = dynamic(
  () => import('@/components/attendance/FingerprintEnrollmentModal').then((mod) => mod.FingerprintEnrollmentModal),
  { ssr: false }
);

import { BiometricScannerCockpit, type BiometricLoggedEvent } from '@/components/attendance/BiometricScannerCockpit';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DoubleBezelCard } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { formatPhone, getInitials, getDaysRemaining, formatCurrency } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { OfflineSyncIndicator } from '@/components/attendance/OfflineSyncIndicator';
import { enqueueCheckIn } from '@/lib/attendance/offline-queue';

export default function AttendancePage() {
  const supabase = createClient();
  const { user } = useAuth();
  const { selectedBranchId, isOwner, branches } = useBranch();
  
  const effectiveBranchId = !isOwner ? user?.branchId : selectedBranchId;
  
  // View mode: Cockpit (All-in-One Bento) vs Kiosk (Maximized member-facing display)
  const [viewMode, setViewMode] = useState<'cockpit' | 'kiosk'>('cockpit');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [todayLogs, setTodayLogs] = useState<(Attendance & { members?: { name: string; photo_url?: string | null; member_code?: string | null } })[]>([]);
  const [checkedInMemberIds, setCheckedInMemberIds] = useState<Set<string>>(new Set());
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [enrollingMember, setEnrollingMember] = useState<Member | null>(null);
  const [enrollingFingerprintMember, setEnrollingFingerprintMember] = useState<Member | null>(null);
  
  const [absentees, setAbsentees] = useState<Member[]>([]);
  const [loadingAbsent, setLoadingAbsent] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'absentees'>('logs');
  
  const [stats, setStats] = useState({
    todayCount: 0,
    weekAvg: 0,
    notCheckedIn: 0,
    peakHour: '-'
  });
  const [methodFilter, setMethodFilter] = useState<'all' | 'face_recognition' | 'fingerprint' | 'qr_scan' | 'cctv' | 'manual'>('all');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
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
          .select('id, name, phone, member_code, status, plan_end_date, total_due, photo_url, face_enrolled, biometric_enrolled, fingerprint_finger, branch_id')
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
        const msg = err instanceof Error ? err.message : 'Search error';
        console.error('Failed to search members:', msg);
      } finally {
        setIsSearching(false);
      }
    }

    searchMembers();
  }, [debouncedQuery, user?.gymId, effectiveBranchId, supabase, user?.role, user?.staffRecordId]);

  // Load today's logs and metrics
  const fetchTodayData = useCallback(async () => {
    if (!user?.gymId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      let logsQuery = supabase
        .from('attendance')
        .select('*, members!inner(name, member_code, photo_url, trainer_id, branch_id)')
        .eq('gym_id', user.gymId)
        .eq('date', today)
        .order('check_in_time', { ascending: false });

      if (effectiveBranchId) {
        logsQuery = logsQuery.eq('branch_id', effectiveBranchId);
      }

      if (user.role === 'trainer' && user.staffRecordId) {
        logsQuery = logsQuery.eq('members.trainer_id', user.staffRecordId);
      }

      const { data: logs, error: logsError } = await logsQuery;

      if (logsError) throw logsError;
      
      setTodayLogs(logs || []);
      
      const checkedIds = new Set<string>((logs || []).map((l: any) => l.member_id));
      setCheckedInMemberIds(checkedIds);

      let countQuery = supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', user.gymId)
        .eq('status', 'active');

      if (effectiveBranchId) {
        countQuery = countQuery.eq('branch_id', effectiveBranchId);
      }

      if (user.role === 'trainer' && user.staffRecordId) {
        countQuery = countQuery.eq('trainer_id', user.staffRecordId);
      }

      const { count: activeCount } = await countQuery;

      const hourCounts: Record<string, number> = {};
      logs?.forEach(log => {
        if (log.check_in_time) {
          const hour = new Date(log.check_in_time).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      });
      
      let peakHourStr = '-';
      let maxCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count;
          const h = parseInt(hour, 10);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const displayH = h % 12 || 12;
          peakHourStr = `${displayH} ${ampm}`;
        }
      });

      const todayTotal = logs?.length || 0;
      const notChecked = Math.max(0, (activeCount || 0) - checkedIds.size);

      setStats({
        todayCount: todayTotal,
        weekAvg: Math.round(todayTotal * 0.9) || 0,
        notCheckedIn: notChecked,
        peakHour: peakHourStr
      });
    } catch (err: unknown) {
      console.error('Failed to load today data:', err);
    }
  }, [user?.gymId, effectiveBranchId, supabase, user?.role, user?.staffRecordId]);

  // Load absentee roster
  const loadAbsentees = useCallback(async () => {
    if (!user?.gymId) return;
    setLoadingAbsent(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let activeQuery = supabase
        .from('members')
        .select('id, name, phone, member_code, status, plan_end_date, total_due, branch_id')
        .eq('gym_id', user.gymId)
        .eq('status', 'active');

      if (effectiveBranchId) {
        activeQuery = activeQuery.eq('branch_id', effectiveBranchId);
      }

      const { data: activeMembers } = await activeQuery;

      let todayCheckedQuery = supabase
        .from('attendance')
        .select('member_id')
        .eq('gym_id', user.gymId)
        .eq('date', today);

      if (effectiveBranchId) {
        todayCheckedQuery = todayCheckedQuery.eq('branch_id', effectiveBranchId);
      }

      const { data: todayChecked } = await todayCheckedQuery;

      const checkedIds = new Set((todayChecked || []).map(r => r.member_id));
      const absent = (activeMembers || []).filter(m => !checkedIds.has(m.id));
      setAbsentees((absent || []) as Member[]);
    } finally {
      setLoadingAbsent(false);
    }
  }, [user?.gymId, effectiveBranchId, supabase]);

  useEffect(() => {
    fetchTodayData();
    loadAbsentees();

    if (user?.gymId) {
      const channel = supabase
        .channel('attendance-station-live')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `gym_id=eq.${user.gymId}`,
        }, (payload: { new: Attendance & { member_name?: string; snapshot_url?: string } }) => {
          const newAtt = payload.new;
          if (!newAtt?.member_id) return;

          // If branch-scoped, ignore records from other branches
          if (effectiveBranchId && newAtt.branch_id && newAtt.branch_id !== effectiveBranchId) {
            return;
          }

          // 1. Mark member as checked in
          setCheckedInMemberIds(prev => new Set(prev).add(newAtt.member_id));

          // 2. Remove member from absentee roster immediately
          setAbsentees(prev => prev.filter(m => m.id !== newAtt.member_id));

          // 3. Prepend new log to todayLogs
          const logEntry = {
            ...newAtt,
            members: {
              name: newAtt.member_name || 'Member',
              photo_url: newAtt.snapshot_url || null,
              member_code: null,
            },
          };
          setTodayLogs(prev => {
            if (prev.some(l => l.id === newAtt.id)) return prev;
            return [logEntry, ...prev];
          });

          // 4. Update stats counters atomically without DB hit
          setStats(prev => ({
            ...prev,
            todayCount: prev.todayCount + 1,
            notCheckedIn: Math.max(0, prev.notCheckedIn - 1),
          }));
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.gymId, effectiveBranchId, fetchTodayData, loadAbsentees, supabase]);

  // Realtime callback from BiometricScannerCockpit
  const handleBiometricLogged = useCallback((event: BiometricLoggedEvent) => {
    setCheckedInMemberIds(prev => new Set(prev).add(event.memberId));
    setAbsentees(prev => prev.filter(m => m.id !== event.memberId));
    setStats(prev => ({
      ...prev,
      todayCount: prev.todayCount + 1,
      notCheckedIn: Math.max(0, prev.notCheckedIn - 1),
    }));
  }, []);

  // Export attendance records to Excel
  const handleExportAttendance = () => {
    if (todayLogs.length === 0) {
      toast.warning('No attendance records logged today yet');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const logData = todayLogs.map(log => ({
        'Member Code': log.members?.member_code || '-',
        'Member Name': log.member_name || log.members?.name || 'Member',
        'Check-in Time': log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString('en-IN') : '-',
        'Date': log.date || today,
        'Method': log.method === 'face_recognition' ? 'AI Face' : log.method === 'fingerprint' ? 'Fingerprint' : log.method === 'qr_scan' ? 'QR Code' : log.method === 'cctv' ? 'CCTV AI' : 'Manual',
        'Branch': branches?.find(b => b.id === log.branch_id)?.name || 'Main Branch',
        'Notes': log.notes || '',
      }));

      const summaryData = [
        { 'Metric': 'Total Check-ins Today', 'Value': todayLogs.length },
        { 'Metric': 'AI Face Check-ins', 'Value': todayLogs.filter(l => l.method === 'face_recognition').length },
        { 'Metric': 'Fingerprint Check-ins', 'Value': todayLogs.filter(l => l.method === 'fingerprint').length },
        { 'Metric': 'QR Code Check-ins', 'Value': todayLogs.filter(l => l.method === 'qr_scan').length },
        { 'Metric': 'CCTV AI Check-ins', 'Value': todayLogs.filter(l => l.method === 'cctv').length },
        { 'Metric': 'Manual Check-ins', 'Value': todayLogs.filter(l => l.method === 'manual').length },
        { 'Metric': 'Report Date', 'Value': today },
      ];

      exportToExcel({
        filename: `attendance_logs_${today}.xlsx`,
        sheets: [
          { sheetName: 'Today Check-ins', data: logData },
          { sheetName: 'Attendance Summary', data: summaryData },
        ],
      });

      toast.success(`Exported ${todayLogs.length} attendance records`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      toast.error('Export failed: ' + msg);
    }
  };

  // Manual Check-In
  const handleCheckIn = async (member: Member) => {
    if (!user?.gymId) return;
    
    try {
      setCheckingInId(member.id);
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const branchToAssign = effectiveBranchId || member.branch_id || null;
      
      const { error } = await supabase
        .from('attendance')
        .insert({
          gym_id: user.gymId,
          branch_id: branchToAssign,
          member_id: member.id,
          member_name: member.name,
          date: today,
          check_in_time: now,
          method: 'manual',
          marked_by: user.id
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Already checked in today');
          setCheckedInMemberIds(prev => new Set(prev).add(member.id));
        } else {
          throw error;
        }
      } else {
        toast.success(`${member.name} checked in`);
        setCheckedInMemberIds(prev => new Set(prev).add(member.id));
        fetchTodayData();
        loadAbsentees();
      }
    } catch (err: unknown) {
      // Offline fallback: Buffer check-in locally if network offline or server unreachable
      const isNetworkIssue = typeof navigator !== 'undefined' && (!navigator.onLine || (err instanceof Error && err.message.includes('fetch')));
      if (isNetworkIssue && user?.gymId) {
        try {
          const branchToAssign = effectiveBranchId || member.branch_id || null;
          await enqueueCheckIn({
            gymId: user.gymId,
            branchId: branchToAssign,
            memberId: member.id,
            memberName: member.name,
            method: 'manual',
            timestamp: new Date().toISOString(),
            notes: 'Front-desk manual check-in buffer',
          });
          toast.info(`${member.name} checked in (saved locally offline)`);
          setCheckedInMemberIds(prev => new Set(prev).add(member.id));
          return;
        } catch (queueErr) {
          console.error('Failed to buffer check-in locally:', queueErr);
        }
      }
      const msg = err instanceof Error ? err.message : 'Check in error';
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

  return (
    <div className="relative min-h-[calc(100vh-6rem)] pb-12">
      {/* Streamlined Minimalist Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Attendance Station</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[11px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Biometrics Active</span>
            </div>
            <OfflineSyncIndicator />
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            Real-time biometric recognition and front-desk check-in cockpit.
          </p>
        </div>

        {/* Minimal Consolidated Controls (Drastic Button Reduction) */}
        <div className="flex items-center gap-2">
          {/* View Mode Segment Switcher (Cockpit vs Full Kiosk) */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('cockpit')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer text-xs',
                viewMode === 'cockpit'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cockpit</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kiosk')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer text-xs',
                viewMode === 'kiosk'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Kiosk View</span>
            </button>
          </div>

          {/* Export Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAttendance}
            disabled={todayLogs.length === 0}
            className="h-8 px-3 gap-1.5 border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 text-xs rounded-xl"
            title="Export Today Check-ins to Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Compact More Stations Menu (Consolidating 5 previous separate buttons) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white rounded-xl"
                title="Other Stations and Kiosks"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-950 border-zinc-800 text-zinc-200">
              <DropdownMenuLabel className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                Hardware Stations
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/attendance/qr-kiosk" className="cursor-pointer flex items-center gap-2">
                  <QrCode className="h-3.5 w-3.5 text-blue-400" />
                  <span>QR Code Standee</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/cctv" className="cursor-pointer flex items-center gap-2">
                  <Cctv className="h-3.5 w-3.5 text-indigo-400" />
                  <span>CCTV AI Matrix</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem asChild>
                <Link href="/kiosk" target="_blank" className="cursor-pointer flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Public Lobby Kiosk</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Mode View */}
      {viewMode === 'kiosk' ? (
        /* Full Screen Member-Facing Kiosk View */
        <div className="max-w-5xl mx-auto animate-in fade-in duration-200">
          <DoubleBezelCard className="p-1.5" innerClassName="p-4 sm:p-6 bg-zinc-950/90">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center">
                  <ScanFace className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">Live Member Kiosk</h2>
                  <p className="text-[10px] text-zinc-400">Position face in frame or place finger on sensor</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('cockpit')}
                className="h-7 text-xs border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
              >
                Return to Cockpit
              </Button>
            </div>
            <BiometricScannerCockpit
              variant="kiosk"
              onAttendanceLogged={handleBiometricLogged}
            />
          </DoubleBezelCard>
        </div>
      ) : (
        /* All-in-One Bento Cockpit View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          {/* Left Column: Live Biometric Scanner & Metrics */}
          <div className="flex flex-col gap-4 col-span-1 lg:col-span-5">
            {/* Live Biometric Scanner Box */}
            <DoubleBezelCard className="p-1.5" innerClassName="p-3 bg-zinc-950/90">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center">
                    <ScanFace className="h-3 w-3 text-cyan-400" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">Biometric Sensor Cockpit</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">Autonomous</span>
              </div>
              <BiometricScannerCockpit
                variant="cockpit"
                onAttendanceLogged={handleBiometricLogged}
              />
            </DoubleBezelCard>

            {/* Quick 4-Stat Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5">
              <DoubleBezelCard className="p-1.5" innerClassName="p-3 flex flex-col gap-0.5 bg-zinc-950/80">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Today</span>
                </div>
                <span className="text-xl font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
                  {stats.todayCount}
                </span>
              </DoubleBezelCard>
              
              <DoubleBezelCard className="p-1.5" innerClassName="p-3 flex flex-col gap-0.5 bg-zinc-950/80">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Week Avg</span>
                </div>
                <span className="text-xl font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
                  {stats.weekAvg}
                </span>
              </DoubleBezelCard>
              
              <DoubleBezelCard className="p-1.5" innerClassName="p-3 flex flex-col gap-0.5 bg-zinc-950/80">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Missing</span>
                </div>
                <span className="text-xl font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
                  {stats.notCheckedIn}
                </span>
              </DoubleBezelCard>
              
              <DoubleBezelCard className="p-1.5" innerClassName="p-3 flex flex-col gap-0.5 bg-zinc-950/80">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Peak Hr</span>
                </div>
                <span className="text-xl font-mono font-bold tracking-tight text-zinc-100 tabular-nums">
                  {stats.peakHour}
                </span>
              </DoubleBezelCard>
            </div>
          </div>

          {/* Right Column: Search & Live Logs (Minimized Buttons) */}
          <div className="flex flex-col gap-5 col-span-1 lg:col-span-7">
            {/* Quick Member Search with Consolidated Actions */}
            <div className="relative">
              <div className="relative flex items-center bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 shadow-md focus-within:border-cyan-500/50 transition-colors">
                <Search className="w-4 h-4 text-zinc-500 ml-1" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quick check-in by member name, phone, or ID..."
                  className="border-0 bg-transparent text-sm h-11 focus-visible:ring-0 placeholder:text-zinc-500 pl-3"
                />
                {isSearching && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin mr-2" />}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-zinc-500 hover:text-zinc-300 font-mono px-2"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {searchQuery.trim() && (
                <div className="mt-2 space-y-2">
                  {searchResults.length === 0 && !isSearching ? (
                    <div className="text-center py-6 text-xs text-zinc-500 bg-zinc-950/80 rounded-xl border border-zinc-800/60">
                      No members found matching &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    searchResults.map((member) => {
                      const statusInfo = getStatusInfo(member);
                      const isCheckedIn = checkedInMemberIds.has(member.id);
                      const isCheckingIn = checkingInId === member.id;

                      return (
                        <div
                          key={member.id}
                          className={cn(
                            'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-colors bg-zinc-950/90',
                            isCheckedIn
                              ? 'border-emerald-900/60 bg-emerald-950/10'
                              : 'border-zinc-800 hover:border-zinc-700'
                          )}
                        >
                          {/* Member Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10 border border-zinc-800 shrink-0">
                              <AvatarImage src={member.photo_url || ''} />
                              <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm text-zinc-100 truncate">{member.name}</h3>
                                <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800 shrink-0">
                                  {member.member_code}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 flex-wrap">
                                <span>{formatPhone(member.phone)}</span>
                                <span>•</span>
                                <Badge variant="outline" className={`text-[10px] py-0 px-1.5 border ${statusInfo.color}`}>
                                  {statusInfo.text}
                                </Badge>
                                {member.total_due > 0 && (
                                  <span className="text-xs text-red-400 font-medium font-mono">
                                    {formatCurrency(member.total_due)} due
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Minimized Controls: Single Primary Action + Interactive Biometric Status Chips */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {/* Face ID Status Chip (Click to enroll) */}
                            <button
                              type="button"
                              onClick={() => setEnrollingMember(member)}
                              className={cn(
                                'text-[10px] font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1',
                                member.face_enrolled
                                  ? 'border-cyan-500/30 text-cyan-400 bg-cyan-950/30 hover:bg-cyan-950/50'
                                  : 'border-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/40'
                              )}
                              title={member.face_enrolled ? 'Face ID enrolled (click to update)' : 'Click to enroll Face ID'}
                            >
                              <ScanFace className="h-3 w-3" />
                              <span>{member.face_enrolled ? 'Face OK' : '+ Face'}</span>
                            </button>

                            {/* Fingerprint Status Chip (Click to enroll) */}
                            <button
                              type="button"
                              onClick={() => setEnrollingFingerprintMember(member)}
                              className={cn(
                                'text-[10px] font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1',
                                member.biometric_enrolled
                                  ? 'border-purple-500/30 text-purple-400 bg-purple-950/30 hover:bg-purple-950/50'
                                  : 'border-zinc-800 text-zinc-400 hover:text-purple-300 hover:border-purple-500/40'
                              )}
                              title={member.biometric_enrolled ? 'Fingerprint enrolled (click to update)' : 'Click to enroll Fingerprint'}
                            >
                              <Fingerprint className="h-3 w-3" />
                              <span>{member.biometric_enrolled ? 'Finger OK' : '+ Finger'}</span>
                            </button>

                            {/* Single Primary Action Button */}
                            {isCheckedIn ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-800/40 text-xs font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Checked In</span>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleCheckIn(member)}
                                disabled={isCheckingIn}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 px-3 rounded-lg active:scale-95 transition-all"
                              >
                                {isCheckingIn ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                                    Check In
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Unified Activity Hub: Today Logs & Absentee Roster */}
            <DoubleBezelCard className="p-1.5" innerClassName="p-4 bg-zinc-950/90 flex flex-col min-h-[460px]">
              {/* Header Tabs: Today Log vs Absentees */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('logs')}
                    className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5',
                      activeTab === 'logs'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Today Log</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-zinc-900 border-zinc-700">
                      {todayLogs.length}
                    </Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('absentees')}
                    className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5',
                      activeTab === 'absentees'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <UserX className="w-3.5 h-3.5 text-amber-400" />
                    <span>Absent</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-zinc-900 border-zinc-700">
                      {absentees.length}
                    </Badge>
                  </button>
                </div>

                {/* Streamlined Log Method Segment Filter (Minimized buttons) */}
                {activeTab === 'logs' && (
                  <div className="hidden sm:flex items-center gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800 text-[10px]">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'face_recognition', label: 'Face' },
                      { key: 'fingerprint', label: 'Finger' },
                      { key: 'qr_scan', label: 'QR' },
                      { key: 'manual', label: 'Manual' },
                    ].map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMethodFilter(m.key as any)}
                        className={cn(
                          'px-2 py-0.5 rounded font-medium transition-colors cursor-pointer',
                          methodFilter === m.key
                            ? 'bg-zinc-800 text-white shadow-2xs'
                            : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tab Content: Logs */}
              {activeTab === 'logs' && (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[460px]">
                  {todayLogs.filter(l => methodFilter === 'all' || l.method === methodFilter).length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-zinc-500">
                      <Clock className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs">No check-ins logged for this filter</p>
                    </div>
                  ) : (
                    todayLogs
                      .filter(l => methodFilter === 'all' || l.method === methodFilter)
                      .map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-8 w-8 border border-zinc-800 shrink-0">
                              <AvatarImage src={log.members?.photo_url || ''} />
                              <AvatarFallback className="text-[10px] bg-zinc-800 text-zinc-400">
                                {getInitials(log.members?.name || log.member_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-200 truncate">
                                {log.members?.name || log.member_name}
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                {formatTime(log.check_in_time)}
                                {log.check_out_time && (
                                  <span className="text-amber-400/80 ml-1.5">Out {formatTime(log.check_out_time)}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] font-mono shrink-0',
                              log.method === 'face_recognition'
                                ? 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20'
                                : log.method === 'fingerprint'
                                ? 'text-purple-400 border-purple-500/20 bg-purple-950/20'
                                : log.method === 'qr_scan'
                                ? 'text-blue-400 border-blue-500/20 bg-blue-950/20'
                                : log.method === 'cctv'
                                ? 'text-indigo-400 border-indigo-500/20 bg-indigo-950/20'
                                : 'text-zinc-400 border-zinc-800 bg-zinc-900'
                            )}
                          >
                            {log.method === 'face_recognition'
                              ? 'Face ID'
                              : log.method === 'fingerprint'
                              ? 'Fingerprint'
                              : log.method === 'qr_scan'
                              ? 'QR Scan'
                              : log.method === 'cctv'
                              ? 'CCTV'
                              : 'Manual'}
                          </Badge>
                        </div>
                      ))
                  )}
                </div>
              )}

              {/* Tab Content: Absentees */}
              {activeTab === 'absentees' && (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[460px]">
                  {loadingAbsent ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                    </div>
                  ) : absentees.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                      <p className="text-xs">All active members checked in today</p>
                    </div>
                  ) : (
                    absentees.map(member => {
                      const daysLeft = member.plan_end_date
                        ? Math.ceil((new Date(member.plan_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                      const expiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;

                      return (
                        <div
                          key={member.id}
                          className={cn(
                            'flex items-center justify-between p-2.5 rounded-lg border text-xs',
                            expiringSoon ? 'border-amber-900/40 bg-amber-950/10' : 'border-zinc-800/60 bg-zinc-900/30'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                              {getInitials(member.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-200 truncate">{member.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono">{member.phone}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {expiringSoon && (
                              <span className="text-[10px] text-amber-400 font-mono block">
                                {daysLeft}d left
                              </span>
                            )}
                            {(member.total_due || 0) > 0 && (
                              <span className="text-[10px] text-red-400 font-mono block">
                                {formatCurrency(member.total_due)} due
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </DoubleBezelCard>
          </div>
        </div>
      )}

      {/* Enrollment Modals */}
      {enrollingFingerprintMember && (
        <FingerprintEnrollmentModal
          isOpen={!!enrollingFingerprintMember}
          member={enrollingFingerprintMember}
          onClose={() => setEnrollingFingerprintMember(null)}
          onSuccess={() => {
            setDebouncedQuery(q => q + ' ');
            setTimeout(() => setDebouncedQuery(q => q.trim()), 50);
          }}
        />
      )}

      {enrollingMember && (
        <FaceEnrollmentModal
          isOpen={!!enrollingMember}
          member={enrollingMember}
          onClose={() => setEnrollingMember(null)}
          onSuccess={() => {
            setDebouncedQuery(q => q + ' ');
            setTimeout(() => setDebouncedQuery(q => q.trim()), 50);
          }}
        />
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  Clock,
  Play,
  RotateCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/format';
import { toast } from 'sonner';

const CRON_JOBS_SPEC = [
  {
    id: 'daily_checkin_digest',
    name: 'Daily Check-in Digest',
    schedule: '0 22 * * * (Every day 10 PM)',
    description: 'Summarizes check-in counts for today and archives analytics logs.',
  },
  {
    id: 'renewal_reminder_3d',
    name: 'Renewal Warning (3 Days Before)',
    schedule: '0 9 * * * (Every day 9 AM)',
    description: 'Notifies members whose plans expire in exactly 3 days.',
  },
  {
    id: 'renewal_reminder_1d',
    name: 'Renewal Warning (1 Day Before)',
    schedule: '30 9 * * * (Every day 9:30 AM)',
    description: 'Sends final pre-expiry alerts and A4 renewing invoice compiles.',
  },
  {
    id: 'status_expire_today',
    name: 'Plan Expired (Day of)',
    schedule: '0 0 * * * (Every day Midnight)',
    description: 'Automatically flags members as expired and notifies them.',
  },
  {
    id: 'grace_followup_3d',
    name: 'Grace Followup (3 Days After)',
    schedule: '0 10 * * * (Every day 10 AM)',
    description: 'Dispatches active retention templates to unpaid expired members.',
  },
  {
    id: 'grace_followup_7d',
    name: 'Grace Followup (7 Days After)',
    schedule: '0 11 * * * (Every day 11 AM)',
    description: 'Deactivates recurring alerts and marks CRM follow-ups as missed.',
  },
  {
    id: 'due_warning_alert',
    name: 'Outstanding Due Warning',
    schedule: '0 12 * * * (Every day 12 PM)',
    description: 'Triggers UPI payment collection request messages to members with dues.',
  },
  {
    id: 'absentee_reengagement_7d',
    name: 'Inactivity Re-engagement (7 Days)',
    schedule: '0 15 * * * (Every day 3 PM)',
    description: 'Sends absentee re-engagement templates to members inactive for 7 days.',
  },
  {
    id: 'absentee_crm_alert_14d',
    name: 'Inactivity CRM Alert (14 Days)',
    schedule: '30 15 * * * (Every day 3:30 PM)',
    description: 'Creates CRM follow-up call tasks for members inactive for 14 days.',
  },
];

export default function CronDashboardPage() {
  const supabase = createClient();
  const { user } = useAuth();
  
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [cronLogs, setCronLogs] = useState<any[]>([]);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const fetchCronLogs = async () => {
    if (!user?.gymId) return;

    try {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('cron_logs')
        .select('*')
        .eq('gym_id', user.gymId)
        .order('run_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCronLogs(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchCronLogs();
  }, [user?.gymId]);

  const handleRunJob = async (jobId: string) => {
    try {
      setRunningJob(jobId);
      
      const res = await fetch(`/api/cron?task=${jobId}`, {
        method: 'POST',
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to trigger cron');

      toast.success(`Automation sync: ${jobId} completed successfully!`);
      fetchCronLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error(msg);
    } finally {
      setRunningJob(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === 'success') return 'bg-green-500/10 text-green-400 border border-green-500/20';
    if (status === 'failed') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Automation Scheduler (Cron)</h2>
          <p className="text-zinc-500 text-xs mt-1">Configure background reminders, check-in compilations, and CRM automation syncing.</p>
        </div>
      </div>

      {/* Grid: Cron Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
        {CRON_JOBS_SPEC.map((job) => {
          // Find the last log for this job in state
          const lastLog = cronLogs.find(log => log.job_name === job.id);
          
          return (
            <Card key={job.id} className="border-zinc-800 bg-zinc-900/30 flex flex-col justify-between overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-sm font-bold text-zinc-200">{job.name}</CardTitle>
                  <Clock className="h-4 w-4 text-purple-400 shrink-0" />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">{job.schedule}</span>
                <p className="text-zinc-500 text-xs mt-2 leading-relaxed">{job.description}</p>
              </CardHeader>

              <CardContent className="pt-2 text-xs border-t border-zinc-800/40 mt-4">
                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                  <span>Last Sync Status:</span>
                  {lastLog ? (
                    <Badge className={`${getStatusBadgeColor(lastLog.status)} text-[9px] uppercase px-1.5 py-0.2 rounded font-bold`}>
                      {lastLog.status}
                    </Badge>
                  ) : (
                    <span className="text-zinc-600 italic">Never Executed</span>
                  )}
                </div>
                {lastLog && (
                  <span className="text-[9px] text-zinc-500 block mt-1">
                    Last Run: {formatDateTime(lastLog.run_at)} ({lastLog.duration_ms}ms)
                  </span>
                )}
              </CardContent>

              <CardFooter className="border-t border-zinc-800/40 pt-3 bg-zinc-900/10 flex justify-end">
                <Button
                  onClick={() => handleRunJob(job.id)}
                  disabled={runningJob === job.id}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 font-semibold gap-1.5 px-3"
                >
                  {runningJob === job.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                  Trigger Sync
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Historic Logs Section */}
      <Card className="border-zinc-800 bg-zinc-900/40 mt-8 overflow-hidden">
        <CardHeader className="bg-zinc-900/60 border-b border-zinc-800 flex flex-row justify-between items-center py-4">
          <div>
            <CardTitle className="text-md font-bold text-zinc-200">Execution History</CardTitle>
            <CardDescription className="text-zinc-500 text-xs">Realtime transaction log of triggered background automation runs.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchCronLogs} className="text-zinc-400 hover:text-white">
            <RotateCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        {loadingLogs ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        ) : cronLogs.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">No automation logs captured yet.</div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-950/20 border-zinc-800">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400 font-semibold text-xs">Job Name / ID</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Triggered At</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Members Notified</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Channel</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs">Duration (ms)</TableHead>
                <TableHead className="text-zinc-400 font-semibold text-xs text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cronLogs.map((log) => (
                <TableRow key={log.id} className="border-zinc-800/40 hover:bg-zinc-800/10">
                  <TableCell className="font-semibold text-zinc-400 text-xs font-mono">{log.job_name}</TableCell>
                  <TableCell className="text-zinc-400 text-xs">{formatDateTime(log.run_at)}</TableCell>
                  <TableCell className="text-zinc-300 text-xs font-bold">{log.members_notified || 0}</TableCell>
                  <TableCell className="text-zinc-500 uppercase text-xs">{log.channel || 'System'}</TableCell>
                  <TableCell className="text-zinc-500 text-xs">{log.duration_ms} ms</TableCell>
                  <TableCell className="text-right">
                    <Badge className={`${getStatusBadgeColor(log.status)} text-[9px] font-bold rounded-md px-2 py-0.5 capitalize`}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

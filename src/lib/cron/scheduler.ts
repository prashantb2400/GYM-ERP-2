import { SupabaseClient } from '@supabase/supabase-js';
import { CronJobConfig, CronResult } from './types';
import {
  runExpiryReminder7Day,
  runExpiryReminder1Day,
  runDueReminder,
  runBirthdayWishes,
  runAnniversaryWishes,
  runInactiveFollowupCreator,
  runExpiryFollowupCreator,
  runReviewRequest,
  runAdminDailySummary,
} from './jobs';

export const CRON_JOBS: CronJobConfig[] = [
  {
    id: 'expiry_7day',
    name: 'Expiry Reminder (7 Days)',
    description: 'Sends WhatsApp reminder to members expiring in 7 days',
    defaultSchedule: '0 9 * * *',
    handler: runExpiryReminder7Day,
  },
  {
    id: 'expiry_1day',
    name: 'Expiry Reminder (1 Day)',
    description: 'Sends WhatsApp reminder to members expiring tomorrow',
    defaultSchedule: '0 9 * * *',
    handler: runExpiryReminder1Day,
  },
  {
    id: 'due_reminder',
    name: 'Due Payment Reminder',
    description: 'Sends WhatsApp reminder to members with outstanding dues',
    defaultSchedule: '0 10 * * *',
    handler: runDueReminder,
  },
  {
    id: 'birthday_wish',
    name: 'Birthday Wishes',
    description: 'Sends birthday greetings to members',
    defaultSchedule: '0 8 * * *',
    handler: runBirthdayWishes,
  },
  {
    id: 'anniversary_wish',
    name: 'Anniversary Wishes',
    description: 'Sends gym anniversary greetings to members',
    defaultSchedule: '0 8 * * *',
    handler: runAnniversaryWishes,
  },
  {
    id: 'inactive_followup',
    name: 'Inactive Followup Creator',
    description: 'Creates CRM followups for inactive members (>14 days)',
    defaultSchedule: '0 23 * * *',
    handler: runInactiveFollowupCreator,
  },
  {
    id: 'expiry_followup',
    name: 'Expiry Followup Creator',
    description: 'Creates CRM followups for recent or upcoming expiries',
    defaultSchedule: '0 23 * * *',
    handler: runExpiryFollowupCreator,
  },
  {
    id: 'review_request',
    name: 'Review Request',
    description: 'Sends review request to members 7 days after admission',
    defaultSchedule: '0 11 * * *',
    handler: runReviewRequest,
  },
  {
    id: 'admin_summary',
    name: 'Admin Daily Summary',
    description: 'Sends daily metrics summary to admin',
    defaultSchedule: '0 20 * * *',
    handler: runAdminDailySummary,
  },
];

export async function executeCronJob(jobId: string, supabase: SupabaseClient): Promise<CronResult> {
  const job = CRON_JOBS.find((j) => j.id === jobId);
  if (!job) {
    throw new Error(`Job with ID ${jobId} not found`);
  }
  return job.handler(supabase);
}

export async function executeAllDueJobs(supabase: SupabaseClient): Promise<Record<string, CronResult>> {
  const results: Record<string, CronResult> = {};
  // Since Vercel calls each path based on vercel.json, 
  // executeAllDueJobs is usually for internal schedulers if not using vercel crons
  // But for completion, we can implement it as running all.
  for (const job of CRON_JOBS) {
    results[job.id] = await job.handler(supabase);
  }
  return results;
}

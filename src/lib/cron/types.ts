import { SupabaseClient } from '@supabase/supabase-js';

export interface CronResult {
  success: boolean;
  processed: number;
  errors: number;
  duration: number;
  details?: string;
}

export interface CronJobConfig {
  id: string;
  name: string;
  description: string;
  defaultSchedule: string;
  handler: (supabase: SupabaseClient) => Promise<CronResult>;
}

export interface CronLog {
  id: string;
  gym_id?: string;
  job_name: string;
  status: 'success' | 'failed';
  started_at: string;
  completed_at?: string;
  members_processed: number;
  errors?: number;
  duration_ms: number;
  details?: string;
}

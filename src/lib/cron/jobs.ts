import { SupabaseClient } from '@supabase/supabase-js';
import { whatsappClient } from '@/lib/whatsapp/client';
import { CronResult } from './types';

// Helper to log job run
async function logJobRun(
  supabase: SupabaseClient,
  jobName: string,
  startTime: number,
  result: CronResult
) {
  const endTime = Date.now();
  const duration = endTime - startTime;

  await supabase.from('cron_logs').insert({
    job_name: jobName,
    started_at: new Date(startTime).toISOString(),
    completed_at: new Date(endTime).toISOString(),
    status: result.success ? 'success' : 'failed',
    members_processed: result.processed,
    errors: result.errors,
    duration_ms: duration,
    details: result.details,
  });

  return { ...result, duration };
}

export async function runExpiryReminder7Day(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const targetDateString = targetDate.toISOString().split('T')[0];

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('plan_end_date', targetDateString)
      .eq('status', 'active');

    if (error) throw error;

    for (const member of members || []) {
      try {
        await whatsappClient.sendTemplateMessage(member.phone, 'expiry_reminder_7day', { name: member.name });
        processed++;
      } catch (err) {
        errors++;
      }
    }

    return await logJobRun(supabase, 'runExpiryReminder7Day', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runExpiryReminder7Day', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

export async function runExpiryReminder1Day(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    const targetDateString = targetDate.toISOString().split('T')[0];

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('plan_end_date', targetDateString)
      .eq('status', 'active');

    if (error) throw error;

    for (const member of members || []) {
      try {
        await whatsappClient.sendTemplateMessage(member.phone, 'expiry_reminder_1day', { name: member.name });
        processed++;
      } catch (err) {
        errors++;
      }
    }

    return await logJobRun(supabase, 'runExpiryReminder1Day', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runExpiryReminder1Day', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

export async function runDueReminder(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .gt('total_due', 0)
      .eq('status', 'active');

    if (error) throw error;

    for (const member of members || []) {
      try {
        await whatsappClient.sendTemplateMessage(member.phone, 'due_payment_reminder', { name: member.name, amount: member.total_due });
        processed++;
      } catch (err) {
        errors++;
      }
    }

    return await logJobRun(supabase, 'runDueReminder', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runDueReminder', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

export async function runBirthdayWishes(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  const currentYear = new Date().getFullYear();

  try {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const monthDay = `${month}-${day}`;

    // Needs to fetch all members and filter in code since date format might vary, or if we use string functions in SQL
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    const bdayMembers = (members || []).filter(m => {
      if (!m.dob) return false;
      return m.dob.includes(`-${monthDay}`) && m.birthday_notified_year !== currentYear;
    });

    for (const member of bdayMembers) {
      try {
        await whatsappClient.sendTemplateMessage(member.phone, 'birthday_greeting', { name: member.name });
        await supabase.from('members').update({ birthday_notified_year: currentYear }).eq('id', member.id);
        processed++;
      } catch (err) {
        errors++;
      }
    }

    return await logJobRun(supabase, 'runBirthdayWishes', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runBirthdayWishes', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

export async function runAnniversaryWishes(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  const currentYear = new Date().getFullYear();

  try {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const monthDay = `${month}-${day}`;

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    const anniversaryMembers = (members || []).filter(m => {
      if (!m.admission_date) return false;
      const isToday = m.admission_date.includes(`-${monthDay}`);
      const isNotThisYear = !m.admission_date.startsWith(currentYear.toString());
      const notNotified = m.anniversary_notified_year !== currentYear;
      return isToday && isNotThisYear && notNotified;
    });

    for (const member of anniversaryMembers) {
      try {
        const admissionYear = parseInt(member.admission_date.split('-')[0], 10);
        const years = currentYear - admissionYear;
        await whatsappClient.sendTemplateMessage(member.phone, 'anniversary_greeting', { name: member.name, years });
        await supabase.from('members').update({ anniversary_notified_year: currentYear }).eq('id', member.id);
        processed++;
      } catch (err) {
        errors++;
      }
    }

    return await logJobRun(supabase, 'runAnniversaryWishes', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runAnniversaryWishes', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

export async function runInactiveFollowupCreator(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 14);
    const targetDateString = targetDate.toISOString().split('T')[0];

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    const inactiveMembers = (members || []).filter(m => {
      return m.last_attendance && m.last_attendance < targetDateString;
    });

    for (const member of inactiveMembers) {
      try {
        // check if open followup exists
        const { data: followups } = await supabase
          .from('followups')
          .select('*')
          .eq('member_id', member.id)
          .eq('status', 'open')
          .eq('type', 'inactive');
          
        if (!followups || followups.length === 0) {
          await supabase.from('followups').insert({
            gym_id: member.gym_id,
            member_id: member.id,
            member_name: member.name,
            type: 'inactive',
            status: 'open',
            notes: 'Auto created due to inactivity > 14 days.',
            scheduled_date: new Date().toISOString().split('T')[0]
          });
          processed++;
        }
      } catch (err) {
        errors++;
      }
    }

    return await logJobRun(supabase, 'runInactiveFollowupCreator', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runInactiveFollowupCreator', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

export async function runExpiryFollowupCreator(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoString = threeDaysAgo.toISOString().split('T')[0];

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
      .gte('plan_end_date', threeDaysAgoString)
      .lte('plan_end_date', todayString);

    if (error) throw error;

    for (const member of members || []) {
      try {
        const { data: followups } = await supabase
          .from('followups')
          .select('*')
          .eq('member_id', member.id)
          .eq('status', 'open')
          .eq('type', 'renewal');
          
        if (!followups || followups.length === 0) {
          await supabase.from('followups').insert({
            gym_id: member.gym_id,
            member_id: member.id,
            member_name: member.name,
            type: 'renewal',
            status: 'open',
            notes: 'Auto created due to recent/upcoming expiry.',
            scheduled_date: new Date().toISOString().split('T')[0]
          });
          processed++;
        }
      } catch (err) {
        errors++;
      }
    }

    return await logJobRun(supabase, 'runExpiryFollowupCreator', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runExpiryFollowupCreator', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

export async function runReviewRequest(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 7);
    const targetDateString = targetDate.toISOString().split('T')[0];

    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .eq('admission_date', targetDateString)
      .eq('review_request_sent', false);

    if (error) throw error;

    for (const member of members || []) {
      try {
        await whatsappClient.sendTemplateMessage(member.phone, 'review_request', { name: member.name });
        await supabase.from('members').update({ review_request_sent: true }).eq('id', member.id);
        processed++;
      } catch (err) {
        errors++;
      }
    }

    return await logJobRun(supabase, 'runReviewRequest', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runReviewRequest', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

export async function runAdminDailySummary(supabase: SupabaseClient): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const today = new Date().toISOString().split('T')[0];

    // Dummy query for metrics
    const { data: newMembers } = await supabase.from('members').select('id').eq('admission_date', today);
    const { data: attendance } = await supabase.from('attendance').select('id').eq('date', today);
    
    // In a real app we'd fetch actual values
    const newMembersCount = newMembers?.length || 0;
    const attendanceCount = attendance?.length || 0;

    const summaryText = `Daily Summary:\nNew Members: ${newMembersCount}\nAttendance: ${attendanceCount}`;

    // Fetch admin/owner phone
    const { data: gyms } = await supabase.from('gyms').select('phone').limit(1);
    const ownerPhone = gyms?.[0]?.phone;

    if (ownerPhone) {
      await whatsappClient.sendTextMessage(ownerPhone, summaryText);
      processed++;
    }

    return await logJobRun(supabase, 'runAdminDailySummary', startTime, { success: true, processed, errors, duration: 0 });
  } catch (error: any) {
    return await logJobRun(supabase, 'runAdminDailySummary', startTime, { success: false, processed, errors, duration: 0, details: error.message });
  }
}

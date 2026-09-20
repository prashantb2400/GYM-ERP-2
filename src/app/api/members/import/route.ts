import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';
import { getAuthUser } from '@/lib/server/auth-helper';
import { ParsedMemberRow } from '@/lib/members/excel-parser';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = checkRateLimit(`member-import:${ip}`, 20, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many import requests. Please wait a moment before trying again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter || 60) } }
      );
    }

    const { user: sessionUser, error: authErr } = await getAuthUser(request);
    if (!sessionUser || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    // Resolve tenant & branch boundary
    const scope = await getBranchScope(sessionUser.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    // Permissions check: must be owner or have members.add / settings.manage
    if (!scope.isOwner && scope.role !== 'owner') {
      const { data: userRecord } = await supabaseAdmin
        .from('users')
        .select('permissions, role')
        .eq('auth_id', sessionUser.id)
        .maybeSingle();

      const perms = (userRecord?.permissions as string[]) || [];
      if (!perms.includes('members.add') && !perms.includes('settings.manage')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions to import members' }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      members = [],
      targetBranchId,
      duplicateStrategy = 'skip', // 'skip' | 'update'
    } = body as {
      members: ParsedMemberRow[];
      targetBranchId?: string;
      duplicateStrategy?: 'skip' | 'update';
    };

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'No members provided for import' }, { status: 400 });
    }

    // Maximum 250 rows per batch request for HTTP reliability
    if (members.length > 250) {
      return NextResponse.json(
        { error: 'Batch size too large. Maximum 250 members allowed per batch chunk.' },
        { status: 400 }
      );
    }

    // 1. Validate Target Branch
    let branchToAssign: string | null = scope.branchId || null;
    if (scope.isOwner || scope.role === 'owner') {
      if (targetBranchId) {
        // Verify branch belongs to caller's gym
        const { data: branchData } = await supabaseAdmin
          .from('branches')
          .select('id')
          .eq('id', targetBranchId)
          .eq('gym_id', scope.gymId)
          .single();

        if (branchData) {
          branchToAssign = branchData.id;
        }
      }

      if (!branchToAssign) {
        // Fallback to gym's primary branch if available
        const { data: primaryBranch } = await supabaseAdmin
          .from('branches')
          .select('id')
          .eq('gym_id', scope.gymId)
          .eq('is_primary', true)
          .single();

        if (primaryBranch) {
          branchToAssign = primaryBranch.id;
        }
      }
    }

    // 2. SaaS Subscription Quota Protection
    const [subRes, memberCountRes] = await Promise.all([
      supabaseAdmin
        .from('platform_subscriptions')
        .select('*, platform_plans(*)')
        .eq('gym_id', scope.gymId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabaseAdmin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', scope.gymId)
        .neq('status', 'cancelled'),
    ]);

    const plan = subRes.data?.platform_plans as any;
    const maxMembers = plan?.limits?.max_members || 50; // default 50 for free tier
    const currentMemberCount = memberCountRes.count || 0;

    // 3. Pre-fetch existing members to detect duplicates
    const phoneList = members.map(m => m.phone).filter(Boolean);
    const { data: existingMembers, error: existingErr } = await supabaseAdmin
      .from('members')
      .select('id, phone, member_code')
      .eq('gym_id', scope.gymId)
      .in('phone', phoneList);

    if (existingErr) throw existingErr;

    const existingPhoneMap = new Map<string, { id: string; member_code: string }>();
    (existingMembers || []).forEach(em => {
      if (em.phone) existingPhoneMap.set(em.phone, em);
    });

    // Check quota against genuinely new members to be added
    let newMembersCount = 0;
    for (const m of members) {
      if (!existingPhoneMap.has(m.phone)) {
        newMembersCount++;
      }
    }

    if (currentMemberCount + newMembersCount > maxMembers) {
      const allowed = Math.max(0, maxMembers - currentMemberCount);
      return NextResponse.json(
        {
          error: `Plan quota exceeded: Your subscription tier (${plan?.name || 'Free'}) permits up to ${maxMembers} members. You currently have ${currentMemberCount} members. Adding ${newMembersCount} new members would exceed your limit by ${currentMemberCount + newMembersCount - maxMembers}. (Remaining quota: ${allowed}). Please upgrade your plan or reduce the list.`,
        },
        { status: 403 }
      );
    }

    // 4. Pre-fetch gym plans to resolve plan_name -> current_plan_id
    const { data: plansData } = await supabaseAdmin
      .from('plans')
      .select('id, name, duration_days')
      .eq('gym_id', scope.gymId);

    const plansMap = new Map<string, { id: string; duration_days: number }>();
    (plansData || []).forEach(p => {
      plansMap.set(p.name.trim().toLowerCase(), p);
    });

    // 5. Read current counter for sequential member code generation
    let currentCounterVal = 0;
    const { data: counterRow } = await supabaseAdmin
      .from('counters')
      .select('member_count')
      .eq('gym_id', scope.gymId)
      .single();

    if (counterRow?.member_count !== undefined) {
      currentCounterVal = counterRow.member_count;
    } else {
      // Initialize counter from existing members count
      const { count: totalMembersInGym } = await supabaseAdmin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', scope.gymId);

      currentCounterVal = totalMembersInGym || 0;
      await supabaseAdmin
        .from('counters')
        .upsert({ gym_id: scope.gymId, member_count: currentCounterVal }, { onConflict: 'gym_id' });
    }

    let nextCounter = currentCounterVal;
    let highestAssignedNum = currentCounterVal;

    const toInsert: any[] = [];
    const toUpdate: { id: string; updates: any }[] = [];
    let skippedCount = 0;

    for (const m of members) {
      const existing = existingPhoneMap.get(m.phone);

      if (existing) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateStrategy === 'update') {
          // Resolve plan if provided
          let planId: string | null = null;
          let calculatedEndDate: string | null = m.plan_end_date || null;
          if (m.plan_name && plansMap.has(m.plan_name.toLowerCase())) {
            const matchedPlan = plansMap.get(m.plan_name.toLowerCase())!;
            planId = matchedPlan.id;
            if (!calculatedEndDate && m.plan_start_date) {
              const start = new Date(m.plan_start_date);
              start.setDate(start.getDate() + matchedPlan.duration_days);
              calculatedEndDate = start.toISOString().split('T')[0];
            }
          }

          toUpdate.push({
            id: existing.id,
            updates: {
              name: m.name,
              whatsapp_phone: m.whatsapp_phone || m.phone,
              email: m.email || null,
              gender: m.gender || null,
              dob: m.dob || null,
              blood_group: m.blood_group || null,
              address: m.address || null,
              city: m.city || null,
              state: m.state || null,
              pin: m.pin || null,
              current_plan_id: planId || undefined,
              plan_start_date: m.plan_start_date || undefined,
              plan_end_date: calculatedEndDate || undefined,
              status: m.status || 'active',
              total_due: m.total_due ?? 0,
              total_paid_lifetime: m.total_paid_lifetime ?? 0,
              locker_number: m.locker_number || null,
              has_locker: Boolean(m.locker_number),
              emergency_contact: m.emergency_name ? { name: m.emergency_name, phone: m.emergency_phone || '' } : undefined,
              updated_at: new Date().toISOString(),
            },
          });
          continue;
        }
      }

      // New Member: Generate sequential member code
      nextCounter++;
      const autoCode = `GYM${String(nextCounter).padStart(4, '0')}`;
      const finalCode = m.member_code || autoCode;
      if (nextCounter > highestAssignedNum) {
        highestAssignedNum = nextCounter;
      }

      // Resolve plan
      let planId: string | null = null;
      let calculatedEndDate: string | null = m.plan_end_date || null;
      if (m.plan_name && plansMap.has(m.plan_name.toLowerCase())) {
        const matchedPlan = plansMap.get(m.plan_name.toLowerCase())!;
        planId = matchedPlan.id;
        if (!calculatedEndDate && m.plan_start_date) {
          const start = new Date(m.plan_start_date);
          start.setDate(start.getDate() + matchedPlan.duration_days);
          calculatedEndDate = start.toISOString().split('T')[0];
        }
      }

      toInsert.push({
        gym_id: scope.gymId,
        branch_id: branchToAssign,
        member_code: finalCode,
        qr_token: crypto.randomUUID(),
        name: m.name,
        phone: m.phone,
        whatsapp_phone: m.whatsapp_phone || m.phone,
        email: m.email || null,
        dob: m.dob || null,
        gender: m.gender || null,
        blood_group: m.blood_group || null,
        address: m.address || null,
        city: m.city || null,
        state: m.state || null,
        pin: m.pin || null,
        emergency_contact: m.emergency_name ? { name: m.emergency_name, phone: m.emergency_phone || '' } : {},
        current_plan_id: planId,
        plan_start_date: m.plan_start_date || new Date().toISOString().split('T')[0],
        plan_end_date: calculatedEndDate,
        admission_date: m.admission_date || m.plan_start_date || new Date().toISOString().split('T')[0],
        status: m.status || 'active',
        has_locker: Boolean(m.locker_number),
        locker_number: m.locker_number || null,
        total_due: m.total_due ?? 0,
        total_paid_lifetime: m.total_paid_lifetime ?? 0,
        created_by: sessionUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 6. Perform Database Writes
    if (toInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from('members')
        .insert(toInsert);

      if (insertErr) throw insertErr;

      // Synchronize counter atomically so future single onboarding continues smoothly
      await supabaseAdmin
        .from('counters')
        .upsert(
          { gym_id: scope.gymId, member_count: highestAssignedNum },
          { onConflict: 'gym_id' }
        );
    }

    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        await supabaseAdmin
          .from('members')
          .update(item.updates)
          .eq('id', item.id)
          .eq('gym_id', scope.gymId);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount: toInsert.length,
      updatedCount: toUpdate.length,
      skippedCount: skippedCount,
      totalProcessed: members.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'An unknown error occurred during import';
    console.error('Member import error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

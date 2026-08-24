import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/platform/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    // 1. Total Revenue
    const { data: invoices, error: invError } = await supabaseAdmin
      .from('platform_invoices')
      .select('amount, created_at')
      .eq('status', 'paid');
      
    if (invError) throw invError;
    
    const invoiceList = invoices || [];
    const total_revenue = invoiceList.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

    // 2. MRR & ARR
    const { data: activeSubs, error: subError } = await supabaseAdmin
      .from('platform_subscriptions')
      .select('plan_id, platform_plans(monthly_price, annual_price)')
      .eq('status', 'active');
      
    if (subError) throw subError;
    
    let mrr = 0;
    const planCounts: Record<string, { name: string, count: number, revenue: number }> = {};
    
    activeSubs.forEach(sub => {
      const plan = sub.platform_plans as any;
      if (!plan) return;
      
      const planId = sub.plan_id;
      const planName = plan.name || 'Unknown';
      // Approximate MRR. We can just use monthly_price if we assume all are monthly, or average. 
      // Assuming plan has both and we just use monthly_price for MRR calculation.
      const subMrr = Number(plan.monthly_price) || 0;
      mrr += subMrr;
      
      if (!planCounts[planId]) {
        planCounts[planId] = { name: planName, count: 0, revenue: 0 };
      }
      planCounts[planId].count += 1;
      planCounts[planId].revenue += subMrr;
    });
    
    const arr = mrr * 12;

    // 3. Active Gyms & Avg per Gym
    const { count: activeGymsCount, error: gymError } = await supabaseAdmin
      .from('gyms')
      .select('id', { count: 'exact', head: true })
      .eq('is_suspended', false);
      
    if (gymError) throw gymError;
    
    const avg_per_gym = activeGymsCount && activeGymsCount > 0 
      ? total_revenue / activeGymsCount 
      : 0;

    // 4. Churn Rate (simplified: canceled in last 30d / current active)
    // A better formula is canceled / (active + canceled), but using a simple approximation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: canceledCount, error: cancelError } = await supabaseAdmin
      .from('platform_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'canceled')
      .gte('canceled_at', thirtyDaysAgo.toISOString());
      
    if (cancelError) throw cancelError;
    
    const churn_rate = activeSubs.length > 0 && canceledCount 
      ? (canceledCount / (activeSubs.length + canceledCount)) * 100 
      : 0;

    // 5. Monthly Revenue (last 12 months)
    const monthly_revenue_map: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().substring(0, 7); // YYYY-MM
      monthly_revenue_map[monthStr] = 0;
    }
    
    invoiceList.forEach((inv: { created_at?: string | null; amount?: number | string | null }) => {
      const monthStr = inv.created_at?.substring(0, 7);
      if (monthStr && monthly_revenue_map[monthStr] !== undefined) {
        monthly_revenue_map[monthStr] += Number(inv.amount) || 0;
      }
    });
    
    const monthly_revenue = Object.keys(monthly_revenue_map).sort().map(month => ({
      month,
      revenue: monthly_revenue_map[month]
    }));

    // 6. Plan Distribution
    const plan_distribution = Object.values(planCounts);

    return NextResponse.json({
      total_revenue,
      mrr,
      arr,
      avg_per_gym,
      churn_rate,
      monthly_revenue,
      plan_distribution
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

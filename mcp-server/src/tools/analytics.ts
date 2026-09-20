import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDb, resolveGymId } from '../db.js';

export function registerAnalyticsTools(server: McpServer) {
  server.tool(
    'gym_get_overview',
    'Retrieve high-level executive dashboard metrics, attendance rates, and financial status for the gym',
    {
      branch_id: z.string().uuid().optional(),
      gym_id: z.string().uuid().optional(),
    },
    async ({ branch_id, gym_id }) => {
      try {
        const effectiveGymId = resolveGymId(gym_id);
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];

        // 1. Members count
        let memberCountReq = db
          .from('members')
          .select('id, status, plan_end_date, total_due')
          .eq('gym_id', effectiveGymId);

        if (branch_id) {
          memberCountReq = memberCountReq.eq('branch_id', branch_id);
        }

        const { data: members, error: mErr } = await memberCountReq;
        if (mErr) throw mErr;

        const totalMembers = members?.length || 0;
        const activeMembers = members?.filter((m) => m.status === 'active').length || 0;
        const expiredMembers = members?.filter((m) => m.status === 'expired').length || 0;

        // Expiring in next 7 days
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

        const expiringSoon =
          members?.filter(
            (m) =>
              m.status === 'active' &&
              m.plan_end_date &&
              m.plan_end_date >= today &&
              m.plan_end_date <= sevenDaysStr
          ).length || 0;

        // Outstanding dues
        const pendingDuesTotal =
          members?.reduce((acc, m) => acc + (Number(m.total_due) || 0), 0) || 0;

        // 2. Today's attendance
        let attReq = db
          .from('attendance')
          .select('id, method')
          .eq('gym_id', effectiveGymId)
          .eq('date', today);

        if (branch_id) {
          attReq = attReq.eq('branch_id', branch_id);
        }

        const { data: attendanceData } = await attReq;
        const todayCheckins = attendanceData?.length || 0;

        // 3. Current Month Invoices & Revenue
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0];

        let invReq = db
          .from('invoices')
          .select('total, amount_paid, status')
          .eq('gym_id', effectiveGymId)
          .gte('issued_at', startOfMonth);

        if (branch_id) {
          invReq = invReq.eq('branch_id', branch_id);
        }

        const { data: invoices } = await invReq;
        const monthlyBilled = invoices?.reduce((acc, i) => acc + Number(i.total || 0), 0) || 0;
        const monthlyCollected =
          invoices?.reduce((acc, i) => acc + Number(i.amount_paid || 0), 0) || 0;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  overview_date: today,
                  membership: {
                    total: totalMembers,
                    active: activeMembers,
                    expired: expiredMembers,
                    expiring_within_7_days: expiringSoon,
                  },
                  attendance: {
                    today_checkins: todayCheckins,
                  },
                  financials: {
                    month_to_date_billed: monthlyBilled,
                    month_to_date_collected: monthlyCollected,
                    total_outstanding_dues: pendingDuesTotal,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error fetching overview analytics: ${err.message}` }],
        };
      }
    }
  );
}

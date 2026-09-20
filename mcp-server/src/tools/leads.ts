import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getDb, resolveGymId } from '../db.js';

export function registerLeadTools(server: McpServer) {
  // 1. List Leads
  server.tool(
    'gym_list_leads',
    'List and filter sales CRM leads by stage, branch, or follow-up status',
    {
      status: z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
      source: z.enum(['walk_in', 'referral', 'instagram', 'google', 'kiosk', 'other']).optional(),
      branch_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(100).default(30),
      gym_id: z.string().uuid().optional(),
    },
    async ({ status, source, branch_id, limit, gym_id }) => {
      try {
        const effectiveGymId = resolveGymId(gym_id);
        const db = getDb();

        let req = db
          .from('leads')
          .select('*')
          .eq('gym_id', effectiveGymId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (status) req = req.eq('status', status);
        if (source) req = req.eq('source', source);
        if (branch_id) req = req.eq('branch_id', branch_id);

        const { data, error } = await req;
        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: data?.length || 0, leads: data || [] }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error fetching leads: ${err.message}` }],
        };
      }
    }
  );

  // 2. Capture Lead
  server.tool(
    'gym_capture_lead',
    'Record a new sales inquiry or walk-in trial lead into the CRM',
    {
      name: z.string().min(1).describe('Full name of the prospective lead'),
      phone: z.string().min(10).describe('10-digit mobile number'),
      email: z.string().email().optional(),
      interest: z.enum(['membership', 'personal_training', 'group_class', 'other']).default('membership'),
      source: z.enum(['walk_in', 'referral', 'instagram', 'google', 'kiosk', 'other']).default('walk_in'),
      follow_up_date: z.string().optional().describe('Scheduled follow-up or trial date YYYY-MM-DD'),
      notes: z.string().optional(),
      branch_id: z.string().uuid().optional(),
      gym_id: z.string().uuid().optional(),
    },
    async (args) => {
      try {
        const effectiveGymId = resolveGymId(args.gym_id);
        const db = getDb();

        const { data: lead, error } = await db
          .from('leads')
          .insert({
            gym_id: effectiveGymId,
            branch_id: args.branch_id || null,
            name: args.name,
            phone: args.phone,
            email: args.email || null,
            interest: args.interest,
            source: args.source,
            status: 'new',
            notes: args.notes || null,
            follow_up_date: args.follow_up_date || null,
          })
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Lead captured successfully for ${args.name}`,
                  lead,
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
          content: [{ type: 'text', text: `Error capturing lead: ${err.message}` }],
        };
      }
    }
  );

  // 3. Update Lead Status
  server.tool(
    'gym_update_lead',
    'Update lead progress, change status, or record follow-up notes',
    {
      lead_id: z.string().uuid().describe('Lead UUID'),
      status: z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
      follow_up_date: z.string().optional().describe('Next follow-up date YYYY-MM-DD'),
      notes: z.string().optional(),
      gym_id: z.string().uuid().optional(),
    },
    async ({ lead_id, status, follow_up_date, notes, gym_id }) => {
      try {
        const effectiveGymId = resolveGymId(gym_id);
        const db = getDb();

        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (status) updates.status = status;
        if (follow_up_date !== undefined) updates.follow_up_date = follow_up_date;
        if (notes) updates.notes = notes;

        const { data, error } = await db
          .from('leads')
          .update(updates)
          .eq('id', lead_id)
          .eq('gym_id', effectiveGymId)
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, updated_lead: data }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error updating lead: ${err.message}` }],
        };
      }
    }
  );
}

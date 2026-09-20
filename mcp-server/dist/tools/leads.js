"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLeadTools = registerLeadTools;
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
function registerLeadTools(server) {
    // 1. List Leads
    server.tool('gym_list_leads', 'List and filter sales CRM leads by stage, branch, or follow-up status', {
        status: zod_1.z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
        source: zod_1.z.enum(['walk_in', 'referral', 'instagram', 'google', 'kiosk', 'other']).optional(),
        branch_id: zod_1.z.string().uuid().optional(),
        limit: zod_1.z.number().int().min(1).max(100).default(30),
        gym_id: zod_1.z.string().uuid().optional(),
    }, async ({ status, source, branch_id, limit, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            let req = db
                .from('leads')
                .select('*')
                .eq('gym_id', effectiveGymId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (status)
                req = req.eq('status', status);
            if (source)
                req = req.eq('source', source);
            if (branch_id)
                req = req.eq('branch_id', branch_id);
            const { data, error } = await req;
            if (error)
                throw error;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ count: data?.length || 0, leads: data || [] }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error fetching leads: ${err.message}` }],
            };
        }
    });
    // 2. Capture Lead
    server.tool('gym_capture_lead', 'Record a new sales inquiry or walk-in trial lead into the CRM', {
        name: zod_1.z.string().min(1).describe('Full name of the prospective lead'),
        phone: zod_1.z.string().min(10).describe('10-digit mobile number'),
        email: zod_1.z.string().email().optional(),
        interest: zod_1.z.enum(['membership', 'personal_training', 'group_class', 'other']).default('membership'),
        source: zod_1.z.enum(['walk_in', 'referral', 'instagram', 'google', 'kiosk', 'other']).default('walk_in'),
        follow_up_date: zod_1.z.string().optional().describe('Scheduled follow-up or trial date YYYY-MM-DD'),
        notes: zod_1.z.string().optional(),
        branch_id: zod_1.z.string().uuid().optional(),
        gym_id: zod_1.z.string().uuid().optional(),
    }, async (args) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(args.gym_id);
            const db = (0, db_js_1.getDb)();
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
            if (error)
                throw error;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Lead captured successfully for ${args.name}`,
                            lead,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error capturing lead: ${err.message}` }],
            };
        }
    });
    // 3. Update Lead Status
    server.tool('gym_update_lead', 'Update lead progress, change status, or record follow-up notes', {
        lead_id: zod_1.z.string().uuid().describe('Lead UUID'),
        status: zod_1.z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
        follow_up_date: zod_1.z.string().optional().describe('Next follow-up date YYYY-MM-DD'),
        notes: zod_1.z.string().optional(),
        gym_id: zod_1.z.string().uuid().optional(),
    }, async ({ lead_id, status, follow_up_date, notes, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            const updates = { updated_at: new Date().toISOString() };
            if (status)
                updates.status = status;
            if (follow_up_date !== undefined)
                updates.follow_up_date = follow_up_date;
            if (notes)
                updates.notes = notes;
            const { data, error } = await db
                .from('leads')
                .update(updates)
                .eq('id', lead_id)
                .eq('gym_id', effectiveGymId)
                .select()
                .single();
            if (error)
                throw error;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ success: true, updated_lead: data }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error updating lead: ${err.message}` }],
            };
        }
    });
}

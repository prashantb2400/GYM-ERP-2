"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBillingTools = registerBillingTools;
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
function registerBillingTools(server) {
    // 1. List Membership Plans
    server.tool('gym_list_plans', 'List all membership plans and pricing packages for the gym', {
        include_inactive: zod_1.z.boolean().default(false).describe('Include deactivated plans'),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID'),
    }, async ({ include_inactive, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            let req = db
                .from('plans')
                .select('*')
                .eq('gym_id', effectiveGymId)
                .order('display_order', { ascending: true });
            if (!include_inactive) {
                req = req.eq('is_active', true);
            }
            const { data, error } = await req;
            if (error)
                throw error;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ count: data?.length || 0, plans: data || [] }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error fetching plans: ${err.message}` }],
            };
        }
    });
    // 2. Get Due Records & Overdue Members
    server.tool('gym_get_dues', 'Retrieve all outstanding dues and overdue member payment accounts', {
        status: zod_1.z.enum(['pending', 'partial', 'collected']).default('pending'),
        limit: zod_1.z.number().int().min(1).max(100).default(50),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID'),
    }, async ({ status, limit, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            const { data, error } = await db
                .from('due_records')
                .select('*, members(name, phone, member_code)')
                .eq('gym_id', effectiveGymId)
                .eq('status', status)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error)
                throw error;
            const totalDueSum = (data || []).reduce((sum, d) => sum + (Number(d.amount) - Number(d.collected_amount || 0)), 0);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            total_pending_records: data?.length || 0,
                            total_pending_amount: totalDueSum,
                            records: data || [],
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error fetching dues: ${err.message}` }],
            };
        }
    });
    // 3. Create Tax Invoice
    server.tool('gym_create_invoice', 'Generate a GST-compliant tax invoice for a member', {
        member_id: zod_1.z.string().uuid().describe('Member UUID to invoice'),
        plan_id: zod_1.z.string().uuid().optional().describe('Plan UUID if invoicing a plan renewal'),
        item_name: zod_1.z.string().default('Gym Membership Fee'),
        subtotal: zod_1.z.number().positive().describe('Base amount before taxes and discounts'),
        discount_amount: zod_1.z.number().default(0),
        is_gst_applicable: zod_1.z.boolean().default(true).describe('Apply 18% GST (9% CGST + 9% SGST)'),
        amount_paid: zod_1.z.number().default(0),
        payment_mode: zod_1.z.enum(['cash', 'upi', 'card', 'bank_transfer', 'online']).default('cash'),
        transaction_id: zod_1.z.string().optional(),
        branch_id: zod_1.z.string().uuid().optional(),
        gym_id: zod_1.z.string().uuid().optional(),
    }, async (args) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(args.gym_id);
            const db = (0, db_js_1.getDb)();
            // 1. Fetch member
            const { data: member, error: mErr } = await db
                .from('members')
                .select('id, name, total_due, branch_id')
                .eq('id', args.member_id)
                .eq('gym_id', effectiveGymId)
                .single();
            if (mErr || !member) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Member "${args.member_id}" not found.` }],
                };
            }
            // 2. Sequential invoice number
            const { data: countData } = await db
                .from('invoices')
                .select('id', { count: 'exact', head: true })
                .eq('gym_id', effectiveGymId);
            const invoiceCount = (countData || 0) + 1;
            const currentYear = new Date().getFullYear();
            const invoiceNumber = `INV-${currentYear}-${String(invoiceCount).padStart(4, '0')}`;
            // 3. Calculate tax
            const netBase = Math.max(0, args.subtotal - args.discount_amount);
            const cgst = args.is_gst_applicable ? Math.round(netBase * 0.09) : 0;
            const sgst = args.is_gst_applicable ? Math.round(netBase * 0.09) : 0;
            const total = netBase + cgst + sgst;
            const amountDue = Math.max(0, total - args.amount_paid);
            const status = amountDue === 0 ? 'paid' : args.amount_paid > 0 ? 'partial' : 'pending';
            const { data: invoice, error: invErr } = await db
                .from('invoices')
                .insert({
                gym_id: effectiveGymId,
                branch_id: args.branch_id || member.branch_id || null,
                invoice_number: invoiceNumber,
                member_id: member.id,
                member_name: member.name,
                line_items: [
                    {
                        description: args.item_name,
                        qty: 1,
                        rate: args.subtotal,
                        amount: args.subtotal,
                    },
                ],
                subtotal: args.subtotal,
                discount_percent: 0,
                discount_amount: args.discount_amount,
                cgst_amount: cgst,
                sgst_amount: sgst,
                total,
                amount_paid: args.amount_paid,
                amount_due: amountDue,
                payment_mode: args.payment_mode,
                transaction_id: args.transaction_id || null,
                status,
                paid_at: args.amount_paid > 0 ? new Date().toISOString() : null,
            })
                .select()
                .single();
            if (invErr)
                throw invErr;
            // 4. Update member total_due if balance remains
            if (amountDue > 0) {
                await db
                    .from('members')
                    .update({
                    total_due: (member.total_due || 0) + amountDue,
                })
                    .eq('id', member.id);
                await db.from('due_records').insert({
                    gym_id: effectiveGymId,
                    member_id: member.id,
                    invoice_id: invoice.id,
                    amount: amountDue,
                    collected_amount: 0,
                    status: 'pending',
                });
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            invoice_number: invoiceNumber,
                            total,
                            amount_paid: args.amount_paid,
                            amount_due: amountDue,
                            invoice,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error generating invoice: ${err.message}` }],
            };
        }
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMemberTools = registerMemberTools;
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
function registerMemberTools(server) {
    // 1. Search Members
    server.tool('gym_search_members', 'Search gym members by name, phone number, member code, or membership status', {
        query: zod_1.z.string().optional().describe('Search term (matches name, phone, or member_code)'),
        status: zod_1.z.enum(['active', 'expired', 'frozen', 'cancelled', 'pending']).optional().describe('Filter by member status'),
        branch_id: zod_1.z.string().uuid().optional().describe('Filter by specific branch UUID'),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID (optional if GYMERP_GYM_ID is configured)'),
        limit: zod_1.z.number().int().min(1).max(100).default(20).describe('Maximum number of results to return'),
    }, async ({ query, status, branch_id, gym_id, limit }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            let req = db
                .from('members')
                .select('id, name, phone, member_code, status, plan_start_date, plan_end_date, total_due, attendance_count, last_attendance, branch_id')
                .eq('gym_id', effectiveGymId)
                .limit(limit);
            if (status) {
                req = req.eq('status', status);
            }
            if (branch_id) {
                req = req.eq('branch_id', branch_id);
            }
            if (query && query.trim()) {
                const q = query.trim();
                req = req.or(`name.ilike.%${q}%,phone.ilike.%${q}%,member_code.ilike.%${q}%`);
            }
            const { data, error } = await req;
            if (error)
                throw error;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            count: data?.length || 0,
                            members: data || [],
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error searching members: ${err.message}` }],
            };
        }
    });
    // 2. Get Single Member Profile
    server.tool('gym_get_member', 'Retrieve full profile and membership details for a specific member by ID or member code', {
        member_identifier: zod_1.z.string().describe('Member UUID or Member Code (e.g. M-1001)'),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID'),
    }, async ({ member_identifier, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member_identifier);
            let query = db.from('members').select('*, plans(*)').eq('gym_id', effectiveGymId);
            if (isUuid) {
                query = query.eq('id', member_identifier);
            }
            else {
                query = query.eq('member_code', member_identifier);
            }
            const { data: member, error } = await query.maybeSingle();
            if (error)
                throw error;
            if (!member) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Member not found for identifier "${member_identifier}"` }],
                };
            }
            // Also fetch recent attendance records
            const { data: recentAttendance } = await db
                .from('attendance')
                .select('id, date, check_in_time, method')
                .eq('member_id', member.id)
                .order('date', { ascending: false })
                .limit(5);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            member,
                            recent_attendance: recentAttendance || [],
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error fetching member profile: ${err.message}` }],
            };
        }
    });
    // 3. Create Member
    server.tool('gym_create_member', 'Register and onboard a new gym member', {
        name: zod_1.z.string().min(1).describe('Full name of the member'),
        phone: zod_1.z.string().min(10).describe('10-digit mobile number'),
        email: zod_1.z.string().email().optional().describe('Email address'),
        plan_id: zod_1.z.string().uuid().optional().describe('Plan UUID to enroll in'),
        branch_id: zod_1.z.string().uuid().optional().describe('Branch UUID'),
        gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
        admission_date: zod_1.z.string().optional().describe('Admission date in YYYY-MM-DD (defaults to today)'),
        plan_start_date: zod_1.z.string().optional().describe('Plan start date in YYYY-MM-DD (defaults to today)'),
        total_due: zod_1.z.number().default(0).describe('Initial due balance, if any'),
        notes: zod_1.z.string().optional(),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID'),
    }, async (args) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(args.gym_id);
            const db = (0, db_js_1.getDb)();
            const today = new Date().toISOString().split('T')[0];
            // Generate member code
            const { data: countData } = await db
                .from('members')
                .select('id', { count: 'exact', head: true })
                .eq('gym_id', effectiveGymId);
            const nextNum = (countData || 0) + 1001;
            const memberCode = `M-${nextNum}`;
            let planEndDate = null;
            if (args.plan_id) {
                const { data: plan } = await db
                    .from('plans')
                    .select('duration_days')
                    .eq('id', args.plan_id)
                    .single();
                if (plan?.duration_days) {
                    const start = new Date(args.plan_start_date || today);
                    start.setDate(start.getDate() + plan.duration_days);
                    planEndDate = start.toISOString().split('T')[0];
                }
            }
            const { data: newMember, error } = await db
                .from('members')
                .insert({
                gym_id: effectiveGymId,
                branch_id: args.branch_id || null,
                member_code: memberCode,
                name: args.name,
                phone: args.phone,
                email: args.email || null,
                gender: args.gender || null,
                admission_date: args.admission_date || today,
                plan_start_date: args.plan_start_date || today,
                plan_end_date: planEndDate,
                current_plan_id: args.plan_id || null,
                status: 'active',
                total_due: args.total_due || 0,
                qr_token: crypto.randomUUID(),
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
                            message: `Member registered successfully with code ${memberCode}`,
                            member: newMember,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error registering member: ${err.message}` }],
            };
        }
    });
    // 4. Update Member Status
    server.tool('gym_update_member', 'Update membership details, freeze/unfreeze status, or clear dues', {
        member_id: zod_1.z.string().uuid().describe('Member UUID to update'),
        status: zod_1.z.enum(['active', 'expired', 'frozen', 'cancelled', 'pending']).optional(),
        plan_end_date: zod_1.z.string().optional().describe('Updated plan expiry date YYYY-MM-DD'),
        total_due: zod_1.z.number().optional().describe('Updated total balance due'),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID'),
    }, async ({ member_id, status, plan_end_date, total_due, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            const updates = { updated_at: new Date().toISOString() };
            if (status !== undefined)
                updates.status = status;
            if (plan_end_date !== undefined)
                updates.plan_end_date = plan_end_date;
            if (total_due !== undefined)
                updates.total_due = total_due;
            const { data, error } = await db
                .from('members')
                .update(updates)
                .eq('id', member_id)
                .eq('gym_id', effectiveGymId)
                .select()
                .single();
            if (error)
                throw error;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ success: true, updated_member: data }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error updating member: ${err.message}` }],
            };
        }
    });
}

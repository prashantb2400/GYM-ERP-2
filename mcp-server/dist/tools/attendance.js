"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAttendanceTools = registerAttendanceTools;
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
function registerAttendanceTools(server) {
    // 1. Record Member Attendance Check-in
    server.tool('gym_record_attendance', 'Record a member check-in for today with anti-duplication protection', {
        member_identifier: zod_1.z.string().describe('Member UUID or Member Code (e.g. M-1001)'),
        method: zod_1.z.enum(['manual', 'qr_scan', 'face_recognition', 'fingerprint']).default('manual'),
        branch_id: zod_1.z.string().uuid().optional().describe('Branch UUID where check-in occurred'),
        notes: zod_1.z.string().optional().describe('Optional check-in notes or reason'),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID'),
    }, async ({ member_identifier, method, branch_id, notes, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            const today = new Date().toISOString().split('T')[0];
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member_identifier);
            // Lookup member
            let memberQuery = db
                .from('members')
                .select('id, name, member_code, status, branch_id, attendance_count')
                .eq('gym_id', effectiveGymId);
            if (isUuid) {
                memberQuery = memberQuery.eq('id', member_identifier);
            }
            else {
                memberQuery = memberQuery.eq('member_code', member_identifier);
            }
            const { data: member, error: memberErr } = await memberQuery.maybeSingle();
            if (memberErr || !member) {
                return {
                    isError: true,
                    content: [{ type: 'text', text: `Member "${member_identifier}" not found in gym.` }],
                };
            }
            // Check if already marked today
            const { data: existing } = await db
                .from('attendance')
                .select('id, check_in_time')
                .eq('gym_id', effectiveGymId)
                .eq('member_id', member.id)
                .eq('date', today)
                .maybeSingle();
            if (existing) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                already_marked: true,
                                message: `${member.name} (${member.member_code}) is already checked in today at ${existing.check_in_time}.`,
                                member_id: member.id,
                                member_name: member.name,
                            }, null, 2),
                        },
                    ],
                };
            }
            // Insert attendance record
            const { data: newRecord, error: insErr } = await db
                .from('attendance')
                .insert({
                gym_id: effectiveGymId,
                branch_id: branch_id || member.branch_id || null,
                member_id: member.id,
                member_name: member.name,
                date: today,
                method,
                notes: notes || `Logged via MCP: ${method}`,
            })
                .select()
                .single();
            if (insErr)
                throw insErr;
            // Update member attendance count
            await db
                .from('members')
                .update({
                attendance_count: (member.attendance_count || 0) + 1,
                last_attendance: new Date().toISOString(),
            })
                .eq('id', member.id);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            already_marked: false,
                            message: `Attendance marked successfully for ${member.name}`,
                            attendance_record: newRecord,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error recording attendance: ${err.message}` }],
            };
        }
    });
    // 2. Get Attendance Logs
    server.tool('gym_get_attendance_logs', 'Fetch attendance logs for a specific date or date range', {
        date: zod_1.z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
        branch_id: zod_1.z.string().uuid().optional().describe('Filter by branch UUID'),
        limit: zod_1.z.number().int().min(1).max(100).default(50),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID'),
    }, async ({ date, branch_id, limit, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            const targetDate = date || new Date().toISOString().split('T')[0];
            let req = db
                .from('attendance')
                .select('id, member_id, member_name, date, check_in_time, check_out_time, method, branch_id')
                .eq('gym_id', effectiveGymId)
                .eq('date', targetDate)
                .order('check_in_time', { ascending: false })
                .limit(limit);
            if (branch_id) {
                req = req.eq('branch_id', branch_id);
            }
            const { data, error } = await req;
            if (error)
                throw error;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            date: targetDate,
                            total_checkins: data?.length || 0,
                            logs: data || [],
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error fetching attendance logs: ${err.message}` }],
            };
        }
    });
    // 3. Live Gym Occupancy
    server.tool('gym_get_live_occupancy', 'Calculate live gym attendance summary for today', {
        branch_id: zod_1.z.string().uuid().optional().describe('Filter by branch UUID'),
        gym_id: zod_1.z.string().uuid().optional().describe('Gym UUID'),
    }, async ({ branch_id, gym_id }) => {
        try {
            const effectiveGymId = (0, db_js_1.resolveGymId)(gym_id);
            const db = (0, db_js_1.getDb)();
            const today = new Date().toISOString().split('T')[0];
            let query = db
                .from('attendance')
                .select('id, check_in_time, check_out_time, method')
                .eq('gym_id', effectiveGymId)
                .eq('date', today);
            if (branch_id) {
                query = query.eq('branch_id', branch_id);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            const totalCheckins = data?.length || 0;
            const checkedOut = data?.filter((a) => a.check_out_time !== null).length || 0;
            const activeInside = totalCheckins - checkedOut;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            date: today,
                            today_total_checkins: totalCheckins,
                            currently_inside_estimated: activeInside,
                            checked_out_count: checkedOut,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Error fetching live occupancy: ${err.message}` }],
            };
        }
    });
}

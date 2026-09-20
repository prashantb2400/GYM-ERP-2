"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBriefingResources = registerBriefingResources;
const db_js_1 = require("../db.js");
function registerBriefingResources(server) {
    server.resource('daily-briefing', 'gym://daily-briefing', async (uri) => {
        try {
            const db = (0, db_js_1.getDb)();
            const gymId = (0, db_js_1.resolveGymId)();
            const today = new Date().toISOString().split('T')[0];
            // Fetch gym details
            const { data: gym } = await db.from('gyms').select('name').eq('id', gymId).single();
            const gymName = gym?.name || 'Gym Facility';
            // Attendance today
            const { data: att } = await db
                .from('attendance')
                .select('id, method')
                .eq('gym_id', gymId)
                .eq('date', today);
            const todayCheckins = att?.length || 0;
            // Pending dues
            const { data: dues } = await db
                .from('due_records')
                .select('amount, collected_amount')
                .eq('gym_id', gymId)
                .eq('status', 'pending');
            const dueSum = (dues || []).reduce((acc, d) => acc + (Number(d.amount) - Number(d.collected_amount || 0)), 0);
            // New leads today
            const { data: leads } = await db
                .from('leads')
                .select('id')
                .eq('gym_id', gymId)
                .gte('created_at', `${today}T00:00:00.000Z`);
            const markdownReport = `
# 🏋️‍♂️ Daily Operational Briefing — ${gymName}
**Date:** ${today}

### 📊 Attendance & Traffic
- **Today's Check-ins:** ${todayCheckins} members
- **Check-in Methods:** ${att?.map((a) => a.method).filter(Boolean).join(', ') || 'None recorded yet'}

### 💰 Billing & Accounts
- **Pending Outstanding Dues:** ₹${dueSum.toLocaleString('en-IN')} across ${dues?.length || 0} accounts

### 🎯 Sales & Acquisition
- **New Inquiries / Leads Today:** ${leads?.length || 0}
`.trim();
            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: 'text/markdown',
                        text: markdownReport,
                    },
                ],
            };
        }
        catch (err) {
            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: 'text/plain',
                        text: `Failed to compile briefing: ${err.message}`,
                    },
                ],
            };
        }
    });
}

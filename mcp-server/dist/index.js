#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const config_js_1 = require("./config.js");
const members_js_1 = require("./tools/members.js");
const attendance_js_1 = require("./tools/attendance.js");
const billing_js_1 = require("./tools/billing.js");
const leads_js_1 = require("./tools/leads.js");
const analytics_js_1 = require("./tools/analytics.js");
const briefing_js_1 = require("./resources/briefing.js");
async function runServer() {
    const config = (0, config_js_1.getConfig)();
    const server = new mcp_js_1.McpServer({
        name: config.serverName,
        version: config.serverVersion,
    });
    // Register all tool categories
    (0, members_js_1.registerMemberTools)(server);
    (0, attendance_js_1.registerAttendanceTools)(server);
    (0, billing_js_1.registerBillingTools)(server);
    (0, leads_js_1.registerLeadTools)(server);
    (0, analytics_js_1.registerAnalyticsTools)(server);
    // Register resources
    (0, briefing_js_1.registerBriefingResources)(server);
    // Connect via standard stdio transport for local AI agents
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error(`[gym-erp-mcp] GymERP MCP Server running on stdio transport (version ${config.serverVersion})`);
}
runServer().catch((error) => {
    console.error('[gym-erp-mcp] Fatal error starting server:', error);
    process.exit(1);
});

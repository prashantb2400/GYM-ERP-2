#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfig } from './config.js';
import { registerMemberTools } from './tools/members.js';
import { registerAttendanceTools } from './tools/attendance.js';
import { registerBillingTools } from './tools/billing.js';
import { registerLeadTools } from './tools/leads.js';
import { registerAnalyticsTools } from './tools/analytics.js';
import { registerBriefingResources } from './resources/briefing.js';

async function runServer() {
  const config = getConfig();

  const server = new McpServer({
    name: config.serverName,
    version: config.serverVersion,
  });

  // Register all tool categories
  registerMemberTools(server);
  registerAttendanceTools(server);
  registerBillingTools(server);
  registerLeadTools(server);
  registerAnalyticsTools(server);

  // Register resources
  registerBriefingResources(server);

  // Connect via standard stdio transport for local AI agents
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `[gym-erp-mcp] GymERP MCP Server running on stdio transport (version ${config.serverVersion})`
  );
}

runServer().catch((error) => {
  console.error('[gym-erp-mcp] Fatal error starting server:', error);
  process.exit(1);
});

# 🏋️‍♂️ GymERP MCP Server (`gym-erp-mcp`)

The **GymERP Model Context Protocol (MCP)** Server connects modern AI agents (Claude Desktop, Antigravity, Cursor, LangChain, or custom front-desk AI assistants) directly to your GymERP instance.

It provides a rich set of operational tools, real-time metrics, and live briefing resources under strict multi-tenant security boundaries.

---

## 🛠️ Registered Tools

| Tool | Category | Description |
|---|---|---|
| `gym_search_members` | Members | Search members by name, phone, code, or status. |
| `gym_get_member` | Members | Get full 360° member profile, current plan, dues, and recent attendance. |
| `gym_create_member` | Members | Onboard a new member with membership plan and branch. |
| `gym_update_member` | Members | Update membership dates, dues, or status (`active`, `frozen`, etc.). |
| `gym_record_attendance` | Attendance | Record check-in with anti-duplication protection. |
| `gym_get_attendance_logs` | Attendance | Retrieve date-range attendance logs. |
| `gym_get_live_occupancy` | Attendance | Calculate live active members inside gym right now. |
| `gym_list_plans` | Billing | List membership packages and pricing tiers. |
| `gym_get_dues` | Billing | Retrieve overdue members and pending balances. |
| `gym_create_invoice` | Billing | Generate GST-compliant sequential tax invoices. |
| `gym_list_leads` | Leads / CRM | List sales pipeline leads by stage. |
| `gym_capture_lead` | Leads / CRM | Record walk-in / digital inquiries. |
| `gym_update_lead` | Leads / CRM | Update lead stages, schedule follow-ups. |
| `gym_get_overview` | Analytics | Executive briefing (active members, today's check-ins, monthly revenue). |

---

## 📄 Registered Resources

- `gym://daily-briefing`: Real-time Markdown overview of today's attendance, revenue, renewals, and new inquiries.

---

## ⚙️ Configuration

Set the following environment variables in `.env.local` or pass them in your client config:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
GYMERP_GYM_ID="your-gym-uuid" # Scopes tools to your specific gym
```

### Adding to Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "gymerp": {
      "command": "node",
      "args": ["/absolute/path/to/GYM-ERP-2/mcp-server/dist/index.js"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "GYMERP_GYM_ID": "your-gym-uuid"
      }
    }
  }
}
```

### Running Locally
```bash
# Build
npm run mcp:build

# Run on stdio
npm run mcp:start

# Development with live tsx
npm run mcp:dev
```

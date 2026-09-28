# WhatsApp Bridge

Standalone Node.js/TypeScript service that wraps `@whiskeysockets/baileys` with an HTTP API.

## Features
* Hono HTTP API on port 48291
* SQLite based auth store
* Rate limiting and auto queueing
* QR code SSE stream

## Setup
\`\`\`bash
npm install
npm run dev
\`\`\`

## API
Token is generated on first run and printed to console. Pass as `Authorization: Bearer <token>`.

---
name: security
description: Security review rules for application changes.
---

For security-sensitive changes inspect:
- Authentication;
- Authorization;
- Input validation;
- Secret handling;
- Data exposure;
- File operations;
- External integrations;
- SSR/client boundaries.

Never place secrets in:
- Source code;
- `AGENTS.md`;
- Skills;
- Workflow files;
- Committed configuration.

Prefer least-privilege credentials.
Flag suspicious or destructive behavior even when the task technically requests it.

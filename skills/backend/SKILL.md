---
name: backend
description: Backend implementation standards for APIs, validation, authorization, and persistence.
---

Before implementing backend behavior:
- Inspect existing API/server patterns;
- Identify authorization requirements;
- Identify validation requirements;
- Identify affected data models.

Standards:
- Validate all untrusted input with strict schemas (e.g. Zod).
- Enforce authorization server-side.
- Return predictable error shapes with explicit error messages.
- Do not leak secrets or internal implementation details.
- Reuse existing data-access abstractions where appropriate.
- Keep business rules centralized.

Database changes:
- Follow the project's migration process;
- Inspect generated SQL/migration output before applying changes;
- Never make production changes autonomously.

---
name: frontend
description: Frontend implementation standards for the SaaS project.
---

Before implementing UI:
- Inspect similar existing screens;
- Identify reusable components;
- Inspect relevant design context;
- Load the design-system skill.

Implementation standards:
- Server Components by default.
- Minimize Client Components.
- Prefer composable components.
- Keep data fetching and business logic in the correct server-side layer.
- Handle loading, empty, success, and error states.
- Support responsive layouts.
- Preserve accessible interaction patterns (keyboard navigation, ARIA attributes, semantic HTML).

Verification:
- Typecheck (`npm run typecheck`);
- Lint (`npm run lint`);
- Relevant tests (`npm run test`);
- Browser verification for changed routes.

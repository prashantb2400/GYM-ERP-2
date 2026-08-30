---
name: design-system
description: Required for UI/component work. Defines the project's visual language and reusable UI rules.
---

# Source of Truth

Design specification:
- `DESIGN.md`

Reference images & specs:
- `design/references/`

Component source of truth:
- `components/ui/`

Token source of truth:
- project theme/global styles (`app/globals.css`, `tailwind.config.ts`)

## Rules
- Reuse existing components before creating new ones.
- Use project tokens rather than hard-coded visual values.
- Match approved designs rather than inventing alternate layouts.
- Preserve spacing, hierarchy, typography, radius, and interaction patterns.
- Do not use untouched default shadcn styling when project theming exists.

## When design context is unavailable
Inspect the existing project before creating a new pattern.
Do not invent a second visual language.
Do not write placeholders such as:
`Colors: [fill later]`
`Type scale: [fill later]`
Resolve the real values from the repository/design specification.

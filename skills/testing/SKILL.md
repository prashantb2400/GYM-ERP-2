---
name: testing
description: Testing strategy for unit, integration, and browser verification.
---

Testing priorities:
1. Critical business rules
2. Authorization boundaries
3. Validation/error behavior
4. Important user flows
5. Regression-prone logic

Do not generate tests mechanically for line coverage alone.
Tests should verify behavior.

For UI changes:
- Verify the main interaction path;
- Verify important empty/error states;
- Verify the route loads without runtime errors;
- Verify responsive behavior where relevant.

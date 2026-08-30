# Feature Verification

For the current feature:

1. Inspect the final diff.
2. Run typecheck (`npm run typecheck`).
3. Run lint (`npm run lint`).
4. Run relevant tests (`npm run test`).
5. Start the app if required (`npm run dev` or `npm run build`).
6. Browser-verify changed UI.
7. Check runtime/console errors.
8. Verify important error and empty states.
9. Confirm the implementation matches the design specification in `DESIGN.md`.
10. Report any remaining issues.

Do not report a check as passed unless it actually ran.

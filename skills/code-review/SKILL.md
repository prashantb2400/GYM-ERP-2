---
name: code-review
description: Code review rules, correctness checks, and architectural compliance for SaaS changes.
---

Review the requested diff and pull requests against the following dimensions:

1. **Correctness**: Does the implementation accurately satisfy functional requirements and edge cases?
2. **Architecture**: Does it adhere to the Server/Client Component boundary rules and data-access isolation in `AGENTS.md`?
3. **Design Compliance**: Does the UI match `DESIGN.md` tokens and avoid arbitrary styling or ad-hoc components?
4. **Security**: Are inputs validated server-side? Are secrets protected from client bundles?
5. **Quality & Performance**: Are unnecessary re-renders avoided? Are async operations handled with appropriate error/loading states?
6. **Tests**: Are behavior-driven unit and integration tests included for all critical paths?

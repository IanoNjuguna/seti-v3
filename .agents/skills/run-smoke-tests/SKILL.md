---
name: run-smoke-tests
description: Run smoke tests, debug failures, and verify fixes
---

# Run smoke tests

## Trigger

Need end-to-end smoke verification before or after changes.

## Workflow

1. Build prerequisites for the target app.
2. Run the relevant smoke suite or a focused test file.
3. If failing, inspect traces/logs and isolate the root cause.
4. Apply a minimal fix and rerun until stable.

## Example Commands (adapt to your project)

```bash
# Detect the smoke test command for your project (e.g., <your-smoke-test-command>, pnpm test:e2e, pytest smoke)
<your-smoke-test-command>

# Run a specific smoke test file
<your-smoke-test-command> -- path/to/test.spec.ts

# Faster iteration when build artifacts are ready
<your-smoke-test-command>-no-compile -- path/to/test.spec.ts
```

## Guardrails

- Prefer deterministic waits and assertions over brittle timeouts.
- Re-run passing fixes to reduce flaky false positives.
- Quarantine tests only when explicitly requested and documented.

## Output

- Test results summary
- Root cause and fix
- Remaining flake risk (if any)

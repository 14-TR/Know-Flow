# ProjectIQ Roadmap

**Vision:** AI-powered project intelligence dashboard. Internal tool, portfolio piece.

**Goal:** Polish to demo-ready quality.

## Current Demo-Readiness Status

- Done: onboarding flow (#63), demo seed safety (#72), calendar drag-to-reschedule (#67), export/import docs and README screenshots (#69), Database Viewer pagination (#71), dashboard workflow/attention signals (#73, #74, #75, #76, #77), and private-host redaction (#68).
- In review outside this app repo: native ProjectIQ graph traversal validation in `14-TR/tr-jig` PR #91.
- No open `14-TR/Know-Flow` PRs as of the 2026-05-25 roadmap reconciliation.

## Priority Queue

1. Mobile-responsive everything - Dashboard first-run/mobile controls now have a layout guard; continue the fresh iPhone-width pass across ProcessEditor, Graph Explorer, Project Tracker, Calendar, and Database Viewer.
2. ProcessEditor polish - revisit the old glass-pass branch only as design reference, then rebuild any still-useful improvements from current `main`.
3. First-user validation packet - create a short local demo script with screenshots, expected seeded data state, and failure-recovery notes for interview/demo use.
4. Performance audit - measure current initial load and route chunks after the recent dashboard work; only optimize regressions found in the fresh measurement.
5. Error handling polish - audit remaining API/load/action failures for graceful UI states after the recent modal/toast pass.
6. Keyboard shortcuts follow-up - verify shortcut discoverability and conflicts in current routes rather than assuming the March 2026 shortcut set is still complete.
7. Packaging hygiene - keep README, changelog, screenshots, and roadmap synchronized after each merged demo-readiness slice.

## Constraints

- Public GitHub repo; do not commit private hostnames, tailnet IPs, tokens, or internal URLs.
- All work on `jig/*` branches, PRs to main.
- SQLite backend, no external DB dependencies.
- Tests must pass for touched surfaces.
- Combined server defaults to localhost on port 5555; set `PROJECTIQ_HOST` locally for a private network interface, but do not commit private bind hosts or demo URLs.

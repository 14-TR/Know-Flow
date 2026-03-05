# ProjectIQ Roadmap

**Vision:** AI-powered project intelligence dashboard. Internal tool, portfolio piece.

**Goal:** Polish to demo-ready quality.

## Priority Queue

1. Finish design pass — GraphExplorer, ProcessEditor, ProjectTracker pages (Apple dark mode aesthetic)
2. Mobile-responsive everything — test and fix all views on iPhone
3. Onboarding flow — new user lands on dashboard and knows what to do immediately
4. Demo data / seed project — realistic sample project so anyone can try it
5. Calendar view improvements — better event display, drag-to-reschedule
6. Export/import projects — JSON backup and restore
7. README + screenshots — for interviews and demos (not public)
8. Performance audit — lazy loading, bundle size, initial load time
9. Error handling polish — graceful failures, user-friendly messages
10. Keyboard shortcuts for power users

## Constraints
- Private repo (Know-Flow on GitHub)
- All work on `jig/*` branches, PRs to main
- SQLite backend, no external DB dependencies
- Tests must pass (482+)
- Combined server on port 5555, Tailscale IP only

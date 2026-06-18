# First-User Validation Packet

Use this packet before an interview, demo, or first-user walkthrough of ProjectIQ.
It keeps the flow short, predictable, and recoverable on a local combined-server run.

## Goal

In 5-10 minutes, prove that a new viewer can:

- understand what ProjectIQ is
- see realistic seeded data immediately
- recognize the core product loop across templates, live projects, and graph context
- recover quickly if the local demo state is missing or stale

## Demo Setup

1. Build the API and client:

   ```bash
   cd api && npm install && npm run build
   cd ../client && npm install && npm run build
   ```

2. Start the combined demo server:

   ```bash
   cd ..
   node server.mjs
   ```

3. Open `http://localhost:5555`.
4. Keep DevTools closed unless something breaks; the goal is a calm first-user pass.

## Expected Seeded State

Before a live walkthrough, confirm the demo data is present:

```bash
curl -s http://localhost:5555/api/demo/status
```

Expected shape:

```json
{
  "hasData": true,
  "processCount": 1,
  "projectCount": 2
}
```

If the counts are higher because the local database already has extra work, that is fine.
The important signal is `hasData: true` and at least one seeded process plus two seeded projects.

## Demo Route

### 1. Explain the product in one sentence

Suggested line:

> ProjectIQ turns reusable workflows into live project trackers and a queryable knowledge graph.

### 2. Show Process Templates

Open the process list first.

What to point out:

- reusable workflow templates
- visual structure instead of loose notes
- seeded starter process already ready to inspect

Screenshot reference: `docs/screenshots/01-process-list.png`

### 3. Open the Process Editor

Use the seeded process to show how work is modeled.

What to point out:

- start/task/decision/end node types
- graph shape as the source of truth
- structured fields attached to nodes

Screenshot reference: `docs/screenshots/02-process-editor.png`

### 4. Switch to Projects

Open a seeded in-progress project to show the same process as live execution.

What to point out:

- node-by-node progress
- decisions and blockers represented in the workflow
- difference between template design and real project state

Screenshot references:

- `docs/screenshots/03-project-list.png`
- `docs/screenshots/04-project-tracker.png`

### 5. Open Graph Explorer

Show that the same project/process data is queryable, not just visual.

What to point out:

- search across process/project knowledge
- neighborhood/context traversal
- why this matters for AI assistants and operator memory

Screenshot reference: `docs/screenshots/05-graph-explorer.png`

### 6. Optional: Database Viewer

Use only if the viewer cares about implementation credibility.

What to point out:

- local SQLite backing store
- transparent inspectability for debugging and audits

Screenshot reference: `docs/screenshots/06-database-viewer.png`

## Recovery Notes

### If the app opens but looks empty

Check seed status:

```bash
curl -s http://localhost:5555/api/demo/status
```

If `hasData` is `false`, reseed:

```bash
curl -s -X POST http://localhost:5555/api/demo/seed
```

Refresh the browser after the reseed succeeds.

### If reseed returns `403`

The combined server is running without admin mode for the backing API.
Restart using the normal local admin flow you use for screenshots/demo prep, then retry `POST /api/demo/seed`.

### If the client loads but API calls fail

Confirm the combined server is the one running:

```bash
curl -I http://localhost:5555
curl -s http://localhost:5555/api/demo/status
```

If `/api/demo/status` does not answer, rebuild and restart the combined server before the walkthrough.

### If the local state is noisy

This repo tolerates extra local data, but the seeded process/project path should still be visible.
For first-user demos, prefer a fresh local data directory if you need a cleaner narrative.

## Success Criteria

The packet worked if a first-time viewer can answer yes to these questions:

- Do I understand what ProjectIQ is for?
- Can I see both template design and live execution?
- Does the seeded data make the product feel real right away?
- Is there a credible AI/knowledge-graph angle beyond a static dashboard?

## Verification Notes

- `GET /api/demo/status` is the fast preflight check.
- `POST /api/demo/seed` is the supported recovery path.
- Screenshot references in this packet match the current README screenshot set.

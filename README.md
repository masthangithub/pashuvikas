# Pashu Vikas — Local POC

Minimal proof-of-concept: Node.js + Express server, static HTML/JS pages, SQLite via Node's built-in `node:sqlite` module (no native build step, no extra dependency) — the whole database is one file, `pashu-vikas.db`, created automatically on first run. Requires Node.js 22.5 or later.

Covers the month-1 pilot slice: farmer registration, doctor registration, buffalo lifetime identity, visit scheduling with dynamic doctor assignment, and health assessment capture tied to a doctor. No offline sync, auth or marketplace — this is a desk-testable slice of the workflows, not the production build.

## Run it

```
cd poc-server
npm install
npm start
```

Open http://localhost:3000

## Structure

- `server.js` — Express app + REST API (`/api/farmers`, `/api/doctors`, `/api/buffaloes`, `/api/visits`, `/api/assessments`, `/api/stats`)
- `db.js` — SQLite schema and connection (better-sqlite3)
- `public/` — dashboard; farmers/doctors/buffaloes lists + profile pages; visits list with inline doctor assignment; farmer/doctor/buffalo registration forms; visit scheduling; health assessment (doctor required, optionally tied to a visit)
- `pashu-vikas.db` — created on first run; upgraded in place if it already exists from an earlier version of this POC; delete it to reset all data

## Workflow this POC models

1. Register a farmer, then a doctor (either order).
2. Register a buffalo under a farmer — a farmer must be selected first.
3. Schedule a visit for that buffalo (farmer + buffalo required; doctor optional at creation).
4. If no doctor was assigned, assign one from the Visits list — this is the dynamic-assignment stand-in (`requested` → `scheduled`).
5. Record a health assessment against a doctor, either standalone or via "Record assessment" on a scheduled visit — doing the latter auto-completes the visit.
6. Farmer, doctor and buffalo profile pages each surface their related visits and assessments.

## Notes

- IDs are locally generated strings (stand-ins for the ULIDs recommended in the technology document) so the same pattern the production design uses for offline-safe identifiers is visible here.
- No authentication, offline queueing or file uploads in this POC — it is meant to validate the data model and workflows quickly, not to be hardened.
- Assignment is manual (pick a doctor from a dropdown), standing in for the scoring/matching engine described in the technology document.

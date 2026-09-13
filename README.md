# Feature Development Workflow — demo

Next.js + shadcn/ui mock-up of the medical-device feature development workflow:
**Phase → Clinical Mechanism of Action → Feature Identification**.

Two views share one data set (switch with the Canvas / Wizard toggle in the header):

- **Canvas** (`/`) — whiteboard view of every mechanism and its features with live connectors.
- **Wizard** (`/wizard`) — guided flow for one mechanism at a time: pick or create a
  mechanism, then *Unmet Need → Clinical Theories → Features → Review & sign-off*.
  Steps unlock as earlier ones validate; the URL (`?moa=…&step=…`) is shareable.

```
npm install
npm run dev        # http://localhost:3000
```

## What it shows

- A phase marker (hexagon) feeding *n* **Clinical Mechanism of Action** cards.
  Each card captures the *Unmet Need to improve* plus **one or more Clinical
  Theories**, shown as tabs (T1, T2, …). Each theory carries its own list of
  typed references (Journal / Guideline / Standard / Internal). Switching the
  tab swaps the references column. Tabs show how many features derive from
  that theory.
- **A clinical theory can be a file.** Attach a source document (PDF, Word, text) to
  any theory from the canvas card or the wizard. Small files are stored inline and
  can be re-downloaded; text files can pre-fill the theory statement.
- Each mechanism fans out to *n* **Feature Identification** cards. A feature is
  derived from a *specific* theory; the first column shows the linked theory
  (read-only) with a picker to re-link. *Design Theory* and *Potential Feature
  Concept* are editable; *Feature Support Documents* is a typed list with a
  document code (Protocol / Report / Plan / Review / Spec).
- **Status changes require sign-off.** Clicking a different red / amber / green
  dot opens a validation dialog: reviewer, role, rationale, and an attestation
  checkbox. Confirming bumps the card revision and records the sign-off in the
  card history. Approval is blocked while the card has an active conflict.
- **Card history** (click the history count in the provenance strip) shows a
  timeline of creation, edits, links, conflicts, and sign-offs with reviewer,
  role, rationale and revision.
- **Active conflicts** can be flagged / resolved from the card menu or the
  provenance strip, each with a reason; conflicted cards get a red border and
  roll up to a toolbar badge.
- Toolbar: status legend doubles as a **filter**, **Compact** view collapses
  cards to one line for an overview, **Export** downloads the current state as
  JSON, **Reset demo** restores the seed content.
- Connectors are drawn live between linked cards and re-route as cards grow.
- Edits persist in `localStorage`.

## Layout

```
src/app/page.tsx                         canvas route
src/app/wizard/page.tsx                  wizard route
src/lib/store.ts                         shared localStorage-backed store (both views, cross-tab sync)
src/lib/actions.ts                       pure state transitions (sign-off, conflicts, add/remove/relink…)
src/components/wizard/*                  wizard shell, step rail, chooser and the four steps
src/components/workflow/theory-file      file attach / drop-zone / chip for theory source documents
src/components/workflow/workflow-canvas  state, toolbar, layout, persistence
src/components/workflow/workflow-card    shared card shell (title chip, grid, provenance, status)
src/components/workflow/moa-card         Clinical Mechanism of Action card
src/components/workflow/feature-card     Feature Identification card
src/components/workflow/connectors       SVG bezier connectors between data-node-id elements
src/components/workflow/sign-off-dialog  status-change validation / attestation dialog
src/components/workflow/history-dialog   per-card audit timeline
src/components/workflow/reason-dialog    flag / resolve conflict with a reason
src/components/workflow/editable-list    typed, reorderable-ish list rows (references, documents)
src/lib/types.ts · src/lib/seed.ts       data model and demo data
```

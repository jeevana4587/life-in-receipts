# Your Life, In Receipts

A frontend-only web experience that turns a fixed dataset of fictional "life
receipts" into an interactive, discoverable story. The archive moves from raw
records to information, to connections, to interpretation — and is explicit
about the line between what the data shows and what it might mean.

Built with **React + JavaScript**, **Vite**, **Tailwind CSS v4**, **React
Router**, and **lucide-react**. No backend, no external APIs, no runtime AI.

---

## Quick start

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run preview  # preview the production build
npm run lint     # eslint — zero errors
npm test         # 35 unit tests (Node built-in test runner, zero deps)
```

The app is purely frontend: the dataset is a static JSON file imported at build
time, so there is nothing to configure and no server to run.

---

## The experience

| Route             | Screen         | Purpose |
| ----------------- | -------------- | ------- |
| `/`               | Landing        | Orients — headline counts, category breakdown, seed moments. |
| `/journey`        | Journey        | Calendar-heatmap timeline of every moment across the year. |
| `/explore`        | Explore        | Search + multi-filter access to the full receipt set. |
| `/moment/:id`     | Moment Detail  | One receipt in full, plus its "Connected Moments". |
| `/story/:id`      | Story / Chapter| A narrative synthesis of the cluster a moment belongs to. |
| `/insights`       | Insights       | Deterministic patterns computed from the whole dataset. |

Every screen is a real URL, so browser-back and deep-linking both work.

---

## Architecture

```text
src/
  components/          Reusable UI (all .jsx)
    AppShell.jsx       Persistent header, nav (desktop bar + mobile tab bar), footer
    ReceiptCard.jsx    THE single card for every category (see below)
    CategoryChip.jsx   Small category pill (icon + label + accent)
    CategoryMotif.jsx  Decorative category watermark (aria-hidden)
    ReasonIcon.jsx     Icon for a connection reason
    SectionHeading.jsx Consistent section headings
    EmptyState.jsx     Shared empty/no-results state

  pages/               Screens (all .jsx)
    Landing.jsx  Journey.jsx  Explore.jsx
    MomentDetail.jsx  Story.jsx  Insights.jsx

  lib/                 Pure logic — no React, independently readable/testable
    categories.js      Category theme map: label, accent, icon, motif
    format.js          Date/number formatting helpers
    sanitize.js        Data validation/sanitisation boundary (Security)
    receipts.js        Dataset loading + pre-computed indexes
    storyEngine.js     Connection + clustering rules
    insights.js        Aggregate calculations
    narrative.js       Hedged narrative synthesis
    highlights.js      Interesting-moment selection
    timeline.js        Day/month grouping for the Journey
    filters.js         Search + filter logic

  test/                Unit tests (Node built-in test runner — no deps)
    logic.test.js      Sanitisation + formatting helpers
    story.test.js      Story Engine, filters, insights, narrative, dataset integrity

  data/
    life-receipts.json The static dataset the app imports

  App.jsx / main.jsx   Router + entry point
```

**Design principle:** anything that renders is a `.jsx` component; anything
that computes is a plain `.js` module with no UI dependency. The Story Engine
and Insights are pure functions, so they can be read and reasoned about in
isolation (this directly satisfies PRD §13.2).

---

## The one reusable card

Every category — all nine of them — is rendered by the **single**
`ReceiptCard` component (`src/components/ReceiptCard.jsx`). The `receipt.type`
prop drives the accent colour, icon, and background motif from the category
theme map; the `variant` prop (`default` / `compact` / `focus`) controls density.

There are deliberately **no per-category card components** — this is what keeps
the visual variety intentional without letting component count explode
(PRD §10.6).

---

## The data

### Schema (PRD §8.1)

```jsonc
{
  "id": "purchase-373",              // unique id
  "type": "purchase",                // music | movie | place | purchase | photo |
                                     // message | search | event | note
  "title": "Grocery",                // primary label
  "timestamp": "2016-12-31T18:30:00.000Z",
  "description": "Food expense: fruits and vegetables",  // always present
  "location": "Apex Coffee Roasters",// optional, free text
  "metadata": { "amount": 510, "category": "Food" },     // optional, type-specific
  "relatedIds": []                   // optional, absent in the shipped dataset
}
```

The shipped dataset contains **1,668 receipts** spanning **Jan 2017 – Dec 2017**.

### Which categories are real, and which are authored

This is the most important thing to be transparent about (PRD §17). Of the nine
categories, **only three are derived from the supplied source files**:

| Category | Source | Notes |
| -------- | ------ | ----- |
| **Music** | `spotify_history.csv` | **Data-derived.** Raw per-track plays are clustered into listening sessions (a new session starts after a 30+ minute gap) and collapsed to one receipt per session. |
| **Purchases** | `Daily Household Transactions.csv` | **Data-derived.** Expense rows only; investment/savings/salary transfers filtered out. Descriptions built from Category + Subcategory + Note with a template fallback. |
| **Places** | `Daily Household Transactions.csv` | **Data-derived**, indirectly. Transportation/Tourism rows; anonymised `Place N` placeholders mapped consistently to fictional names. |
| **Movies & Entertainment** | — | **Hand-authored** (~3 entries). |
| **Photos** | — | **Hand-authored** (~3 entries). |
| **Messages** | — | **Hand-authored** (~2 entries). |
| **Searches** | — | **Hand-authored** (~2 entries). |
| **Events** | — | **Hand-authored** (~2 entries). |
| **Personal Notes** | — | **Hand-authored** (~2 entries). |

**Six of nine categories have no source among the supplied files.** They are
hand-written, dated within the same 2017 window, and written to feel consistent
with the data-derived categories. This is stated here deliberately rather than
left for a reviewer to discover.

**This is a constructed composite persona.** Purchases and Music come from two
different real sources — they were never the same person's life. Restricting
both to calendar year 2017 makes the combined timeline plausible, but the
product and this README are honest that this is a composite, not a genuine
individual's digital footprint.

### The excluded file

`Augmented_IndiaTransactMultiFacet2024` is **not** used. On inspection it is a
general-population synthetic dataset built for fraud-detection modelling
(it carries an `is_fraud` column and a card-number-shaped `cc_num` field), its
latitude/longitude values don't match the stated Indian state, and its first
3,000 rows alone contain more than 1,400 different people. It cannot represent a
single persona, and shipping card-number-shaped data in a public demo is bad
practice even when synthetic. It is excluded by design (PRD §7.3, §16).

---

## The data-prep pipeline (offline, development-time only)

`scripts/prepareData.js` is a one-time **Node** script that turns the raw source
files in `raw-data/` into `src/data/life-receipts.json`. It is development
tooling — it is **never shipped to or executed by the browser**.

```bash
npm run prepare-data
```

What it does, in order (PRD §7.4):

1. **Household transactions → Purchases & Places.** Keeps only 2017 rows, drops
   investment/savings/salary/transfer categories, and routes
   Transportation/Tourism rows to Places with a fixed placeholder→name map.
2. **Spotify history → Music sessions.** Keeps 2017 plays, sorts them
   chronologically, and groups consecutive plays into sessions (a new session
   begins after a 30+ minute gap). Each session becomes one receipt describing
   the dominant artist, track count, duration, and skip behaviour.
3. **Hand-authored entries** are merged in for the six categories with no source.
4. **Everything is sorted chronologically** and written to `life-receipts.json`.

The raw files and the script are development-time artefacts; the React app
consumes only the generated JSON.

---

## The Story Engine

`src/lib/storyEngine.js` computes connections and clusters as pure functions.
It is built to work from **time- and location-based inference alone**, because
the shipped dataset carries **no explicit `relatedIds`**.

Connections are evaluated in priority order (PRD §8.2), strongest first:

1. **Explicit link** — two receipts reference each other via `relatedIds`.
   Supported but dormant: the shipped data has none. This stays a bonus path.
2. **Time proximity** — timestamps within a configurable window
   (`CONNECTION_WINDOW_MINUTES`, default **120 minutes**).
3. **Same place** — receipts sharing the same normalised `location` string.
4. **Same calendar day** — the weakest signal, surfaced as a day summary rather
   than a tight moment cluster.

Each connection carries the **reason(s)** it exists, and the UI always shows
that reason on the card ("35 minutes apart", "Same place · Riverside Park",
"Same day"). The relationship basis is therefore visible, not a black box
(PRD §FR3).

**Clustering.** The Story/Chapter view narrates a *time burst*: the maximal run
of chronologically consecutive receipts where each neighbouring gap is at most
`CLUSTER_GAP_MINUTES` (**90 minutes**). Oversized bursts are trimmed
symmetrically around the focused receipt so the focus never vanishes from its
own chapter.

Connections and clusters are memoised, so a screen never recomputes them on
render.

---

## How interpretation is separated from fact

This is a core pillar (PRD §4, §17). The rules the code follows:

- Narrative copy uses hedged language throughout — "may suggest", "appears to",
  "this reading is an interpretation of the recorded signals only".
- Every Story chapter closes by stating plainly that it is a reading of the
  archive, not a record of intent, and that different grouping rules would
  produce different chapters.
- Insights are described as co-occurrence counts, explicitly "not evidence of
  causation".
- The product never asserts something the dataset does not support.

All narrative and insight text is either authored or computed deterministically.
Nothing is generated at runtime by a model.

---

## Design decisions (PRD §10)

- **Dark-first, restrained colour.** `#0b0b0f` background, `#15151c` surfaces,
  `#8b5cf6` interactive accent. Category accents are used *sparingly* — a small
  icon chip, a thin border, and a low-alpha motif watermark, never a full-card
  fill, so nine accents read as one system instead of competing.
- **Contrast.** The accent hexes in `src/lib/categories.js` were adjusted from
  the original PRD starting palette where needed so that text pairings clear
  WCAG AA against both the app background and card surface. Each category
  exposes both an `accent` (borders/chips/large text) and a lighter `text`
  (body-safe) variant.
- **Typography.** A single system sans-serif family across the whole app; no
  font mixing.
- **Spacing.** 8px base unit, 4px half-step, ~1200px content max-width with
  responsive side padding.
- **Contextual themes.** Implemented once, in the category theme map plus the
  single `ReceiptCard` — not nine bespoke components.
- **Micro-interactions.** Card hover elevation + accent border, smooth
  transitions (~200ms), motif accents. Explicitly *not* included: 3D transforms,
  particle effects, and animation on every element.

### Responsive (PRD §11)

| Breakpoint | Behaviour |
| ---------- | --------- |
| Mobile (<640px) | Single column. Journey months stack vertically. Explore filters collapse into a bottom drawer. Nav becomes a bottom tab bar. |
| Tablet (640–1024px) | Two-column grids where useful; Explore filter drawer remains until `lg`. |
| Desktop (>1024px) | Persistent Explore filter rail beside the content; Journey months lay out as a horizontal rail. |

The same information is available at every breakpoint — mobile is a re-layout,
not a reduced feature set.

### Accessibility (PRD §12)

- Real `<button>` / `<a>` elements for actions; `<nav>`, `<main>`, `<section>`
  landmarks and a logical `h1 → h2 → h3` outline.
- Full keyboard operability: every interactive element is Tab-reachable,
  Enter/Space-activatable, and detail views close on **Escape**. A "skip to
  content" link is the first focusable element.
- Visible focus states everywhere; never suppressed without a replacement.
- Category meaning is **never** conveyed by colour alone — an icon and a text
  label always accompany the accent.
- Decorative motifs are `aria-hidden`; icon-only controls carry `aria-label`.
- Charts include a visually-hidden tabular equivalent for screen readers.
- `prefers-reduced-motion` collapses transitions and animations document-wide.

### Security & data sanitisation

- **Validation boundary.** Every record passes through `src/lib/sanitize.js`
  before entering the app: ids/types/timestamps are validated, strings are
  stripped of control characters and length-capped, metadata is reduced to
  scalar values, duplicates are dropped, and the resulting dataset is frozen.
  Malformed records can never reach the DOM.
- **Input hygiene.** The free-text search query is sanitised (control chars
  stripped, length clamped) before use.
- **Content Security Policy.** A strict CSP is set via meta tag: scripts and
  connections are same-origin only, no remote frames/objects, `base-uri`
  locked, `form-action 'none'`, plus `no-referrer` and `nosniff` policies.
- **Output encoding.** All dynamic content renders through React's text
  escaping; no `dangerouslySetInnerHTML` anywhere in the codebase.
- **Error containment.** A top-level error boundary catches render failures
  and offers recovery instead of a blank page.

### Component testing & reliability

`npm test` runs **35 unit tests** on Node's built-in test runner (zero extra
dependencies), covering:

- the sanitisation boundary (rejection of malformed/unsafe records),
- dataset integrity (schema completeness, chronological ordering),
- Story Engine connection rules (window bounds, memoisation, self-exclusion),
- cluster invariants (focus containment, gap limits),
- filter AND-logic and inclusive date ranges,
- insights determinism and hedged narrative generation.

### Performance (PRD §13.1)

- Derived structures (dataset indexes, timeline, insights, connections) are
  computed once and memoised.
- Screens are route-split with `React.lazy`; only the Landing screen ships in
  the initial bundle.
- React vendor libraries are split into a separate cached chunk
  (`react-vendor`), so repeat visits load only the app code.
- `ReceiptCard` is memoised and uses `content-visibility: auto`, so long
  result grids skip layout/paint for off-screen cards.
- Explore renders 24 cards per page with "Show more" paging, and search input
  uses `useDeferredValue` so typing stays responsive while large result sets
  recompute.

---

## Tech stack

- React 19 + JavaScript (no TypeScript)
- Vite 8
- Tailwind CSS v4 via the native Vite plugin
- React Router
- lucide-react
- `csv-parser` + a one-time Node prep script (development tooling only)

---

## Definition of done

- The `life-receipts.json` dataset matches the §8.1 schema, produced by the
  documented pipeline.
- All six functional requirements (FR1–FR6) are implemented.
- Every receipt has a description — none displays as a bare record.
- Relationship discovery is live, and each connection's basis is visible.
- The experience is usable at mobile, tablet, and desktop widths.
- Keyboard-only navigation can reach and operate every interactive element.
- Insights and Story text contain no claims the dataset does not support.
- A single reusable receipt-card component powers every category.
- This README documents setup, architecture, the pipeline, the Story Engine's
  connection logic, and which categories are data-derived vs hand-authored.
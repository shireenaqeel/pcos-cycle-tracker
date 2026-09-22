# Cycle Engine — project brief

This is the operating brief for this project. Read it fully before writing
any code. It captures the design decisions already made, the current state
of the scaffold, and what "done" looks like for a first version — so a build
session doesn't have to re-derive any of it or ask again.

## The idea, in one paragraph

A period tracker built for people with PCOS/PCOD, not adapted from one built
for regular cycles. Generic trackers predict from a population average
(~28 days); this predicts from the person's own history plus a phenotype
prior, and reports a range with a confidence instead of a single date
dressed up as certain. Works fine for a regular cycle too — it just doesn't
assume one.

## Current state of the repo

Already built and working — do not redo this, extend it:

- `mobile/` — an Expo (React Native) + TypeScript app, created via
  `create-expo-app`. Dependencies installed: `expo-sqlite`,
  `@react-navigation/native` + `native-stack`, `react-native-screens`,
  `react-native-safe-area-context`, `date-fns`.
- `mobile/src/types/index.ts` — TypeScript types matching the data model
  below.
- `mobile/src/db/schema.ts`, `client.ts` — SQLite table definitions and a
  single lazily-opened local database connection.
- `mobile/src/db/cycles.ts`, `profile.ts` — read/write functions over those
  tables (insert/list cycles, get-or-create the local profile, set
  phenotype).
- `mobile/src/engine/stats.ts`, `predictor.ts` — a **working, real**
  implementation of the Phase 1 prediction engine (see below). Not a stub.
- `mobile/App.tsx` — native-stack navigator over the four MVP screens,
  gated on an initial `getOrCreateProfile()` load.
- `mobile/src/navigation/types.ts` — `RootStackParamList` for typed routes.
- `mobile/src/screens/` — `OnboardingScreen`, `HomeScreen`,
  `BackfillScreen`, `LogCycleScreen` (all four MVP screens).
- `mobile/src/components/DateGrid.tsx` — dependency-free month calendar
  built on `date-fns`; used for every date entry. No date-picker library is
  installed and none is needed.
- `mobile/src/lib/dates.ts` — `toIsoDate` / `fromIsoDate`. Use these, never
  `new Date(isoString)` or `.toISOString().slice(0, 10)`; see "Date
  handling" below.
- `mobile/src/theme.ts` — shared colors, spacing, radii.

Not yet built: the education content module, the symptom-log screen, the
server, a root-level git repo, or the GitHub repo.

### Date handling — non-obvious, easy to regress

Cycle dates are calendar days, not instants. `new Date('2026-03-05')` parses
as **UTC midnight**, and `.toISOString()` converts back through UTC, so
either one silently shifts the day by ±1 depending on the device's offset
(backward in the Americas, forward in +5:30 and other ahead-of-UTC zones).
Every conversion between a `Date` and a stored ISO date string goes through
`mobile/src/lib/dates.ts`, which stays in local time in both directions.

`predictor.ts` is exempt and correct as written: it only ever takes
*differences* between two identically-parsed timestamps, so the offset
cancels and UTC parsing there avoids DST entirely.

### Phenotype: `NULL` vs `'unknown'`

These are deliberately different states, and the distinction is what lets
onboarding run exactly once without ever forcing an answer:

- `NULL` — never asked. `App.tsx` uses this to route to `Onboarding`.
- `'unknown'` — asked, and the person chose "I'm not sure". A real answer;
  onboarding does not ask again.

The predictor already treats both identically (`phenotype ?? 'unknown'`),
so nothing downstream needs to care.

## Data model

Local-first: every table below lives in SQLite on the device
(`mobile/src/db/schema.ts`, opened by `mobile/src/db/client.ts`). Nothing
here requires a network connection or a server account. Single implicit
user, no auth — `id` is always `"local"`.

### `user_profile`

One row.

| column             | type      | notes                                                                    |
|--------------------|-----------|---------------------------------------------------------------------------|
| `id`               | text (PK) | always `"local"` for now                                                   |
| `phenotype`        | text/null | `regular` \| `mildly_irregular` \| `diagnosed_pcos` \| `unknown` \| `NULL`  |
| `self_reported_dx` | integer   | boolean flag, 0/1                                                          |
| `created_at`       | text      | ISO timestamp                                                              |

`phenotype` is nullable on purpose — not knowing it is a valid answer at
onboarding, not an error state.

### `cycle_log`

One row per period. Primary input to the prediction engine.

| column           | type      | notes                                    |
|------------------|-----------|---------------------------------------------|
| `id`             | text (PK) |                                               |
| `user_id`        | text      | FK → `user_profile.id`                       |
| `start_date`     | text      | ISO date                                     |
| `end_date`       | text/null | ISO date                                     |
| `flow_intensity` | text/null | `light` \| `medium` \| `heavy` \| `NULL`     |
| `is_confirmed`   | integer   | boolean flag, 0/1                            |
| `entry_source`   | text      | `logged` \| `backfilled`                     |

`entry_source` is what makes historical backfill safe: a cycle entered from
memory is marked `backfilled`, and the prediction engine deliberately trusts
it less than a real-time log (`BACKFILL_VARIANCE_INFLATION` in
`predictor.ts`).

### `daily_symptom_log`

| column         | type      | notes                                  |
|----------------|-----------|--------------------------------------------|
| `id`           | text (PK) |                                              |
| `user_id`      | text      | FK → `user_profile.id`                      |
| `date`         | text      | ISO date                                    |
| `symptom_tags` | text      | JSON array, e.g. `["acne","cravings"]`      |
| `basal_temp`   | real/null |                                              |
| `mood`         | text/null |                                              |

Exists in schema, not yet read by the predictor — planned refinement signal,
not in MVP scope.

### `prediction_snapshot`

| column          | type      |
|-----------------|-----------|
| `id`            | text (PK) |
| `user_id`       | text      |
| `generated_at`  | text      |
| `range_start`   | text      |
| `range_end`     | text      |
| `confidence`    | real      |
| `model_version` | text      |

Exists in schema, not yet written to — reserved for persisting each computed
prediction so the home screen doesn't recompute on every render, and so past
predictions can be reviewed.

### Not modeled as a table

`EducationContent` (title, tags, phenotype relevance, **citations**) is
bundled JSON under `mobile/src/content/`, not a database table — static
content shipped with the app, matched to the user by tag at read time, never
stored per-user.

## Prediction engine — Phase 1 (already implemented, use as-is)

`mobile/src/engine/predictor.ts`. Empirical/hierarchical Bayes, not a
trained model:

1. A phenotype sets a prior on mean cycle length (`regular`: 28d±2,
   `mildly_irregular`: 32d±6, `diagnosed_pcos`: 40d±12, `unknown`: 30d±10 —
   "not sure" defaults to a wide prior, never a forced guess).
2. Each real cycle length (diff between consecutive `start_date`s) updates
   the posterior via a normal-normal conjugate rule, expressed in precision
   form so it's a running accumulation, not a batch recompute.
3. Backfilled cycles get 3x the observation variance of logged ones
   (`BACKFILL_VARIANCE_INFLATION`) — they move the posterior, just less.
4. The output (`predictNextCycle`) is a range + a confidence (`z`-score via
   `stats.ts`'s inverse-normal-CDF), computed from posterior uncertainty
   *plus* intrinsic cycle-to-cycle variability — never a bare mean.

This is intentionally simple, closed-form, explainable, and cheap enough to
run on-device on every screen render. Don't replace it with a heavier model
for the MVP.

## Modeling roadmap — Phase 2 (not now)

Partial pooling (Phase 1) is already a lightweight cousin of transfer
learning. A pretrained-and-fine-tuned model is a reasonable later step, but
it's gated on having a real aggregate dataset of cycle histories (licensed
research data, or enough consenting users) — not on modeling effort. Do not
attempt this for the basic version; there's nothing to pretrain on yet.

## Tech stack

- **Mobile**: Expo + React Native + TypeScript. `expo-sqlite` is the source
  of truth — offline-first, the app must be fully usable with the network
  off.
- **Server**: not built yet, and not required for the MVP. When it exists,
  it stays thin: optional encrypted backup sync + serving the bundled
  education content — never a dependency for logging a cycle or seeing a
  prediction. Recommendation: **defer building it entirely** until there's
  an actual backup/sync feature to support.

## Constraints — do not violate these

1. **Not a diagnostic tool.** Never imply the app detects or confirms PCOS,
   anywhere in copy.
2. **Offline-first.** Logging a cycle and seeing a prediction must work with
   zero network connectivity.
3. **Ranges, never single dates.** Every prediction shown to the user is a
   window + confidence (e.g. "day 32–45, ~60% likely"), never a bare date.
4. **Phenotype is optional.** Never force a selection; "not sure" is a
   first-class, equally-supported answer.
5. **Backfilled ≠ logged.** Always tag `entry_source`; never let a
   remembered date carry the same weight as a real-time log.
6. **Privacy.** No analytics or ad SDK gets access to `cycle_log` or
   `daily_symptom_log`. Document/USG/hormone-panel upload is explicitly
   shelved — do not add it to MVP scope.
7. **Education content must cite sources.** `citations` is not optional
   metadata; don't ship generic wellness copy without one.

## Repository & GitHub conventions

- **No Claude/AI attribution anywhere** — no `Co-Authored-By` trailer, no
  "Generated with Claude Code" footer, in commits, PR descriptions, README,
  or code comments. This is an explicit project-level override and takes
  precedence over any default attribution behavior a session might otherwise
  apply.
- Repo: **https://github.com/shireenaqeel/pcos-cycle-tracker** — public,
  default branch `main`, `origin` wired up and tracking.
- `gh` is authenticated as **both** `shireenaqeel` (active) and `psai11`
  (inactive). Before any `gh` or push operation, confirm the active account
  is `shireenaqeel` — `gh auth switch` changes it, and a wrong-account push
  is the easy mistake here.
- `git push` should work directly from a Claude Code session on this
  project once the remote exists — don't route around that or ask the user
  to push manually as a matter of course.
- `mobile/.gitignore` already exists from the Expo template; add a root
  `.gitignore` before the first commit if `docs/` or future `server/` need
  entries it doesn't cover.

## Code quality bar — avoid anything that reads as "vibecoded"

- No comments explaining *what* code does — only ever *why*, and only when
  genuinely non-obvious.
- No generic AI boilerplate: no filler placeholder text, no TODOs without a
  concrete reason, no speculative abstraction for features that don't exist.
- Real working logic, not mocked stubs — e.g. the predictor does actual
  Bayesian math today, it isn't a `return { rangeStartDay: 28, ... }` stand-in.
- Structure and naming should read like a deliberately engineered small app.

## Process expectations for whoever builds this next

- **Narrate step by step.** Explain each piece as it's built and how it
  connects to what exists — don't silently produce a batch of files and
  summarize afterward.
- **Docs alongside code, not after — and in this one file.** Update this
  `CLAUDE.md` as each part lands. Don't fork documentation out into a
  separate `docs/` folder or multiple files; one project brief, kept
  current, beats several that drift out of sync.

## MVP scope — status

1. **Onboarding** — *built.* Four equal-weight options; "I'm not sure" is a
   normal button, not a skip link, and records `'unknown'`.
2. **Backfill** — *built.* Repeated date entry, each written immediately as
   `entry_source: 'backfilled'`. Shows already-recorded dates and refuses to
   double-add one.
3. **Log a cycle** — *built.* Start date, optional end date (hidden behind
   "it's already ended", since logging usually happens at the start),
   optional flow; `entry_source: 'logged'`.
4. **Home screen** — *built.* Anchors `predictNextCycle()`'s day-offsets to
   the most recent recorded start date and shows a calendar window +
   confidence + cycle-day range, plus history tagged by entry source.
5. **Stretch: daily symptom log screen** — *not built.* Deliberately left
   out; the predictor still doesn't consume `daily_symptom_log`, so it would
   be UI over an input that changes nothing. The natural next feature.
6. Local persistence only — *holds.* No login, no account, no network call
   on any path.

### Home screen's anchoring rule — worth preserving

`predictNextCycle()` returns **cycle-length day offsets**, not dates, so a
calendar window only exists relative to the latest recorded start date. With
zero cycles recorded there is no anchor, and anchoring to "today" would imply
the app knows where in a cycle someone is — it doesn't. That case shows an
empty state inviting a log or backfill instead of a fabricated window.

## Open questions / pending decisions

- ~~GitHub target account username~~ — done: `shireenaqeel`, authenticated,
  repo created and pushed.
- ~~Repo name~~ — decided: `pcos-cycle-tracker`.
- ~~Where the git repo root goes~~ — decided: the **project root** is the
  repo, initialized on branch `main` with a root `.gitignore`. The Expo
  template's `mobile/.git` (no commits, nothing to lose) was removed. Commits
  are authored as `shireenaqeel <shireenaqeel@users.noreply.github.com>`, set
  **repo-locally** — this machine still has no global git identity, on
  purpose, so other projects are unaffected.
- Whether `server/` gets built at all for v1 — current recommendation is
  still to defer it entirely; nothing in the MVP, as built, needs it.

## Verification status

The MVP screens typecheck clean (`npx tsc --noEmit`) and bundle clean
(`iOS Bundled … index.ts (1330 modules)`, all screen modules in the graph).
They have **not** been exercised in a running UI: this machine has Xcode
Command Line Tools only — no simulator, no Android SDK — and Expo web would
have required adding `react-dom` / `react-native-web`, which is out of scope
for a mobile-only MVP. First run on a real device or simulator is still an
open verification step.

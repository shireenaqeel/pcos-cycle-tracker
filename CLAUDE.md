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
- `mobile/src/screens/` — `OnboardingScreen`, `HomeScreen`, `BackfillScreen`,
  `LogCycleScreen`, `CycleDetailScreen`, `SymptomLogScreen`,
  `SymptomHistoryScreen`, `InsightsScreen`, `LearnScreen`, `AccuracyScreen`.
- `mobile/src/db/symptoms.ts`, `predictions.ts` — access for
  `daily_symptom_log` and `prediction_snapshot`.
- `mobile/src/engine/accuracy.ts` — scores stored predictions against what
  actually happened.
- `mobile/src/engine/gaps.ts` — the one implementation of "days between
  consecutive start dates". Both the predictor and the stats screen use it;
  do not reimplement it, because the identical-parse property that makes it
  timezone- and DST-proof is easy to lose.
- `mobile/src/engine/insights.ts` — descriptive cycle statistics
  (shortest/longest/average/median, spread, periods in the last year,
  typical period length from `end_date`). Purely counted from recorded data,
  no inference.
- `mobile/src/content/` — bundled education JSON and phenotype filtering.
- `mobile/src/components/DateGrid.tsx` — dependency-free month calendar
  built on `date-fns`; used for every date entry. No date-picker library is
  installed and none is needed.
- `mobile/src/lib/dates.ts` — `toIsoDate` / `fromIsoDate`. Use these, never
  `new Date(isoString)` or `.toISOString().slice(0, 10)`; see "Date
  handling" below.
- `mobile/src/theme.ts` — shared colors, spacing, radii.

Not built, deliberately: the server (nothing needs it). `daily_symptom_log`
and `prediction_snapshot` are now both written and read.

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

Written and read by `SymptomLogScreen` via `db/symptoms.ts`. **Not consumed by
the predictor, on purpose** — see "What the engine deliberately does not do".

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

Written by `recordPredictionIfChanged` (only when the window actually moves)
and read by `AccuracyScreen`. `range_start`/`range_end` hold **calendar
dates**, not day offsets — the anchoring to the last recorded start has
already been applied by the time a row is written.

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
### Credential isolation from `psai11` — deliberate, don't undo

`psai11` is **a different person's account**, which also happens to be
authenticated in `gh` on this machine. Nothing in this repo may ever push as
them. Two repo-local settings enforce that, both scoped to this repo — no
global or system git config is set (this machine has no global gitconfig at
all, by design):

1. The credential helper chain is reset for `github.com` and replaced with
   `gh`'s own, so the system `osxkeychain` helper — which holds `psai11`'s
   token and otherwise answers first — is bypassed:

   ```sh
   git config --local --replace-all credential.https://github.com.helper ""
   git config --local --add credential.https://github.com.helper '!gh auth git-credential'
   ```

2. `origin` pins the username: `https://shireenaqeel@github.com/...`, so
   every credential request is scoped to that account.

`gh auth git-credential` serves **only** the account `gh` is currently
authenticated as, and returns nothing for any other username (verified). So
if `gh auth switch` ever makes `psai11` active, a push from this repo fails
outright rather than landing under the wrong name. That fail-closed behavior
is the point — if a push suddenly 403s, check `gh auth status` before
changing any of the above.

Historical note: before this was set, a plain `git push` failed with
`denied to psai11` while `gh repo create --push` worked, because the latter
uses `gh`'s auth directly.
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
5. **Stretch: daily symptom log screen** — *built* in roadmap stage 3.
6. Local persistence only — *holds.* No login, no account, no network call
   on any path.

### Home screen's anchoring rule — worth preserving

`predictNextCycle()` returns **cycle-length day offsets**, not dates, so a
calendar window only exists relative to the latest recorded start date. With
zero cycles recorded there is no anchor, and anchoring to "today" would imply
the app knows where in a cycle someone is — it doesn't. That case shows an
empty state inviting a log or backfill instead of a fabricated window.

## Testing

`npm test` (jest, `jest-expo` preset) and `npm run typecheck`, both from
`mobile/`. Tests live in `src/engine/__tests__/*-test.ts` — the preset
matches the `-test.ts` suffix.

Test files import `describe`/`it`/`expect` from `@jest/globals` rather than
relying on ambient globals. This is deliberate: TypeScript 6 does not
auto-include `@types/jest` here, and the explicit import keeps the types
working without a `types` array in `tsconfig.json` or an extra dependency.

What the 22 tests actually pin down, since the risk with this engine is that
a wrong answer still looks like a plausible number of days:

- The probit approximation against independently-verified quantiles,
  including its branch-switch point at `p = 0.02425` and both tails.
- Cold start returns the phenotype prior; `null` and `'unknown'` are
  identical; a less certain phenotype yields a wider window.
- A logged 30-day gap moves a `regular` prior to exactly 28.2 days, and the
  same gap entered as backfilled moves it only to 28.0714 — the
  hand-computable proof that `BACKFILL_VARIANCE_INFLATION` is doing its job.
- A gap counts as remembered if *either* end was backfilled.
- The posterior converges toward observed lengths and the window narrows as
  evidence accumulates.
- Out-of-order logs, duplicate start dates, and a single lone log.
- Gaps spanning a daylight-saving transition and a year boundary measure as
  whole days — the property that makes UTC parsing safe inside the predictor.

## Roadmap — staged

Ordered so each stage makes the next one safer. Confirmed working on a real
device via Expo Go before this roadmap was written, so everything below
builds on a known-good base.

1. ~~**Correctable data**~~ — *done.* `CycleDetailScreen`, reached by tapping
   any history row on Home: edit start date, add/clear an end date, change
   flow, or delete with a confirmation. `updateCycleLog` deliberately cannot
   write `entry_source` — correcting a remembered date does not promote it to
   a real-time log, and the predictor's trust in the row must not shift
   under an edit. The screen splits into a loader and a `CycleEditor` that
   takes a non-null cycle as a prop, so there is no nullable form state to
   guard against.
2. ~~**Engine tests**~~ — *done.* 22 tests over `stats.ts` and
   `predictor.ts` (see "Testing" below).
3. ~~**Symptom logging**~~ — *done.* `SymptomLogScreen` over
   `daily_symptom_log`: tags, mood, optional basal temperature, one entry per
   day. The row id is derived from user + date (`sym_<user>_<date>`), so a day
   physically cannot hold duplicates and editing is just a re-save.
4. ~~**Education content**~~ — *done.* `mobile/src/content/education.json`,
   five items, filtered by phenotype at read time in `content/index.ts` and
   rendered by `LearnScreen`. Every item carries citations. They are recorded
   as source + title + year rather than URLs, deliberately: unverified links
   rot and invented ones are worse than none. Adding DOIs or links later is
   fine *after* checking each one resolves.
5. ~~**Prediction snapshots + accuracy**~~ — *done.* Home writes a snapshot
   via `recordPredictionIfChanged`, which only inserts when the window or
   model version actually differs from the last one — Home recomputes on
   every focus, and a row per glance would bury the moments the forecast
   really moved. `engine/accuracy.ts` pairs each snapshot with the first
   cycle start recorded after it and `AccuracyScreen` shows the hit rate
   beside the confidence that was claimed, so the two can be compared.
6. ~~**Engine refinement**~~ — *done, and narrower than first sketched.* See
   "What the engine deliberately does not do" below.
7. **Server** — *not built, and still shouldn't be.* Nothing in the app makes
   a network call; there is no feature that needs one. Untouched per the
   standing instruction to confirm before creating anything under `server/`.

### What the engine deliberately does not do

Stage 6 was scoped down on purpose. The defensible refinement was **learning
each person's own variability** instead of applying a fixed 6-day spread to
everyone: `intrinsicVariance()` blends the observed sample variance with the
generic prior (weighted as 4 pseudo-cycles), floored at 2 days because cycles
are recorded to the day and claiming tighter is false precision. A scattered
history now gets a visibly wider window than a steady one with the same
average — which is the whole point of a PCOS-first tracker. `MODEL_VERSION` is
`phase1-hierarchical-bayes-v2` as a result, and snapshots record it.

What was **not** built, and should not be without evidence:

- **Symptoms do not move the prediction.** Inferring cycle timing from acne,
  cravings or mood would be inventing a model nobody validated, in a health
  app, for a condition where the timing signal is genuinely hard. The symptom
  screen says so plainly rather than implying a hidden influence.
- **Basal temperature is recorded but not interpreted.** Reading ovulation
  from it needs a real method and real validation, not a plausible-looking
  heuristic.
- `flow_intensity` and `end_date` remain descriptive. Period *duration* is a
  reasonable future stat; it is not a cycle-timing signal.

The engine gets more trustworthy by learning spread from data it already has,
not by adding inputs whose relationship to the outcome is assumed.

`app.json` now carries `name: "Cycle Engine"`, `slug: "pcos-cycle-tracker"`,
and there is a root `README.md`. Changing `app.json` needs a dev-server
restart before the device sees it.

**`npm audit` reports 10 moderate vulnerabilities — leave them.** All ten
trace to one root: `uuid`'s missing buffer bounds check, reached via
`xcode` → `@expo/config-plugins` → the rest of Expo's toolchain. That is
build tooling, not code that ships to the device, and `npm audit fix --force`
would break the SDK 57 pin. It clears when Expo bumps the dependency.

## Keep the app and the education content honest about each other

The "Making your tracking useful at an appointment" article used to promise
that the history screen showed your shortest and longest cycle and a
twelve-month count. It didn't — the history was a list of dates. Content that
describes a feature is a claim the app has to keep, and it drifted within a
single session.

`InsightsScreen` now provides exactly what that article points at. If either
side changes, change the other in the same commit.

## Still unbuilt, roughly by value

- **Local notifications** ("your window opens in two days"). A tracker you
  have to remember to open loses. `expo-notifications`, device-only.
- **Export** — no way to get data off the device, so a lost phone is a lost
  history, and there's no artifact to hand a clinician.
- **A standalone build (EAS)** — the app currently runs only while a dev
  server serves it, which blocks real day-to-day use.
- Changing phenotype after onboarding (no settings screen at all), default
  Expo icons, and no accessibility labels or dynamic-type handling.

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

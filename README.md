# Cycle Engine

A period tracker built for irregular cycles — specifically PCOS/PCOD — rather
than adapted from one that assumes a 28-day clock.

Generic trackers predict from a population average and show you a single date.
This predicts from your own history plus a starting assumption you choose, and
reports a **window with a confidence level**. It works fine for a regular cycle
too; it just doesn't assume one.

**This is not a diagnostic tool.** It cannot detect or confirm PCOS, and it is
not a substitute for talking to a clinician.

## How the prediction works

Empirical/hierarchical Bayes, computed on the device — no trained model, no
server, nothing to call.

1. The cycle pattern you pick at onboarding sets a prior on your mean cycle
   length. "I'm not sure" is a first-class answer that starts with a wide prior
   rather than a forced guess.
2. Each gap between consecutive period start dates updates that prior through a
   normal–normal conjugate rule, accumulated in precision form.
3. Cycles you enter from memory carry three times the observation variance of
   ones logged as they happened. They move the estimate — just less.
4. The engine also learns *how much you vary*, blending your observed spread
   with a generic starting belief, so a scattered history gets a wider window
   than a steady one with the same average.
5. Output is always a range plus a confidence, derived from both uncertainty
   about your mean and natural cycle-to-cycle variation.

The app stores each prediction it shows you, then scores itself against what
actually happened on the track-record screen — including the times it was wrong.

## Privacy

Everything lives in SQLite on your device. There is no account, no login, no
sync, and no analytics or advertising SDK with access to cycle or symptom data.
The app is fully usable with the network off.

## Running it

Requires Node 22.13+ and the Expo Go app on your phone.

```sh
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go, or enter the `exp://` URL shown in the terminal.

```sh
npm test         # engine tests
npm run typecheck
```

## Layout

```
mobile/
  src/
    db/         SQLite schema, connection, and per-table access
    engine/     prediction and accuracy scoring, with tests
    screens/    onboarding, home, logging, backfill, symptoms, learn, track record
    content/    bundled education content, every item cited
    lib/        timezone-safe date helpers
```

`CLAUDE.md` in the repo root is the working brief: design decisions, data model,
constraints, and the staged roadmap.

## Licence

See `mobile/LICENSE`.

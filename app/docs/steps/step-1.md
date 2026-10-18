# Step 1: Migration plan

**Commit:** `391cf70` on `ekin's-branch`

## What changed

- Added [`app/MIGRATION_PLAN.md`](../../MIGRATION_PLAN.md). Nothing else changed, so `index.html` and the GitHub Pages site are unchanged.
- The work stays on `ekin's-branch` (no new branch), in an `/app` subfolder.

## Decisions

- **Stack:** Expo, TypeScript (strict), Expo Router.
- **Order:** pupil side first, staff side later.
- **Login:** the same as the web prototype: class code, then name, then a 4-digit PIN.
- **AI:** no Claude API. AI features call stubs.
- **Storage:** on the device for now, behind an interface so Supabase can replace it later.
- **Data:** fictional only.

## Feature map

| Recharge feature | New screen | Logic module |
|---|---|---|
| Login | `(auth)/class-code`, `pick-name`, `pin` | `domain/auth.ts` |
| Battery check-in | `(pupil)/check-in` | `domain/checkins.ts` |
| Symbol board | `(pupil)/symbols` | `domain/posts.ts` |
| Recharge Walk | `(pupil)/walk` | `domain/checkins.ts` (pins become places) |
| My Recharge Profile | `(pupil)/profile` | `domain/profile.ts` |
| You said, we did | `(pupil)/feed` | `domain/themes.ts` |
| Zip | `(pupil)/zip` | `components/Zip` |

New items:
- Sent / Read / Follow-up statuses
- a read indicator the pupil can switch off
- "Was this helpful?"
- earlier posts
- optional personalisation at registration
- a skippable walkthrough

The plan file has the full table and the step list (1–9).

## Changes to the plan since

- The age range is now secondary school, Years 7–9 (11–14). The demo class is 8B (Step 4).
- The app is English only. Strings are kept in one file so other languages can be added back (Step 4).
- Auto-logout only applies on shared devices (Step 4).

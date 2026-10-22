# Migration steps

One file per step of the Recharge → Expo migration (see [../../MIGRATION_PLAN.md](../../MIGRATION_PLAN.md)). Each file says what changed and shows the key code with a short explanation.

| Step | What | Commit |
|---|---|---|
| [1](step-1.md) | Migration plan | `391cf70` |
| [2](step-2.md) | Expo SDK 57 + Expo Router scaffold | `6f2ae2d` |
| [3](step-3.md) | Types, demo data, logic, strings, theme, storage | `2a8ab55` |
| [4](step-4.md) | Pupil login, shared devices, PIN on reopen | `f505ae7` |
| [5](step-5.md) | Pupil home, Zip, battery check-in | `e7d0f6a` |
| [6](step-6.md) | Symbol board, "I need a break", Recharge Walk, photos | `01daa36` |
| [7](step-7.md) | My Recharge Profile, You said / We did, "Was this helpful?" | `93a3139` |
| [8a](step-8a.md) | My posts, Sent / Read / Follow-up, read indicator switch, share / unshare, Settings | `98b476e` |
| [8a+](step-8a-symbols.md) | Symbol board update: pick several, optional details and place, Save with a "Saved" pop-up | `98b476e` |
| [8-home](step-8-home.md) | New home: four big buttons, Share how I feel, Ask to talk to my teacher, See my teacher's response (Replies / What I've sent / You said, we did), break link | `5ec3a7b` |
| [8b](step-8b.md) | Optional personalisation at first login, skippable walkthrough, both from Settings | `13d18d0` |
| [9 plan](step-9-plan.md) | Teachers' side: roles, screens, questions (answered) | – |
| [9a](step-9a.md) | Staff login, access rules, Overview, Requests with replies and quick replies, Pupils | `3f4fa13` |
| [9b](step-9b.md) | Most asked for, You said / We did with helpful tally, Safeguarding checklist, Class & PINs, class picker | `a22bbf6` |
| [10a](step-10a-schema.md) | Supabase schema: tables, keys, checks, RLS on with no policies yet | `9e6a86c` (applied on Supabase) |
| [10b](step-10b-policies.md) | Supabase access rules (RLS policies), summary functions for class views | `ab3dcfe` (applied on Supabase) |
| [10c](step-10c-remove-break.md) | Remove the pupil's "I need a break" button and pop-up | `e6937fa` |
| [10d](step-10d-pin-login.md) | Pupil PIN sign-in on the server (Edge Functions), staff PIN reset, app Supabase client | `4eda023` (committed by eko; migration applied, functions deployed) |
| [10e](step-10e-seed.md) | Fictional demo seed for Supabase (local script, key only in the terminal) | `98d9683` (not run yet) |
| [10f](step-10f-store-swap.md) | Store swap: shared-database mode, server logins, reading (part 1) and saving (part 2). Column limits follow-up: `3b7f70a` (not applied yet) | `e6fb269` |
| [11a](step-11a-pictorial.md) | Less text, more pictures: 24 grouped symbols, optional talk topics, words always optional ("Add words"), staff see the pictures | not committed yet |

All data in the app is fictional.

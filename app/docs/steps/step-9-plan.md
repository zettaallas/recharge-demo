# Step 9 plan: the teachers' (staff) side

This plan is for review before any code is written. Everything is ported from `index.html` into the same Expo app. All data is fictional.

## Roles and what each one sees

The project scope sets the rule as **"the minimum each person needs"**. The web prototype was looser: the class teacher saw everything in their class. I suggest following the scope:

| | Class teacher / tutor | Key adult | SENCO | DSL (safeguarding lead) |
|---|---|---|---|---|
| Class themes ("Most asked for"), heatmap of places | ✅ whole class, no names on notes | ✅ their pupils | ✅ | – |
| Posts pupils **shared** (notes, symbols, breaks, talk requests) | – | ✅ their pupils only: mark read, reply | – | – |
| Posts pupils kept **private** | ❌ never | ❌ never | ❌ never | only if flagged |
| Drift alerts | – | ✅ their pupils | ✅ all | – |
| Approved profiles | – | ✅ their pupils | ✅ all | – |
| Notes from home | – | ✅ only if the pupil agreed | ✅ only if the pupil agreed | – |
| Safeguarding flags and checklist | – | – | – | ✅ all |
| Post "You said, we did" | ✅ | – | ✅ | – |
| Class & PINs (codes, reset PINs, add pupils) | ✅ | – | ✅ | – |

## Screens

`(staff)` is a new area that needs a staff login. It has the same calm style and a top bar with Log out.

| Screen | From index.html | Who sees it |
|---|---|---|
| **Staff login** `(auth)/staff-login` | `StaffLogin`: email and password, plus the four demo accounts | everyone |
| **Overview** `(staff)/index` | `Overview`: stats, "Where energy goes" heatmap, drift alerts with "Plan a check-in" | each role sees its own parts (see the table above) |
| **Requests** `(staff)/requests` | new; replaces "Breaks and symbols" | key adult: shared posts from their pupils, newest first. Each has **Mark read**, quick replies ("Saw this, take your time", "Let's talk at break") and a free-text **Reply**. Replies set Follow-up and `repliedAt`, which the pupil sees |
| **Pupils** `(staff)/pupils` and `(staff)/pupil/[id]` | `PupilsTab`, `PupilDetail` | key adult (their pupils), SENCO (all): latest battery, trend, attendance, approved profile, recent shared notes, notes from home if allowed |
| **Most asked for** `(staff)/themes` | `ThemesTab` (keyword grouping; AI stays stubbed) | tutor, key adult, SENCO |
| **You said, we did** `(staff)/yswd` | `YswdTab`, plus a new **"Was this helpful?" tally** per post | tutor, SENCO |
| **Safeguarding** `(staff)/safeguarding` | `SafeTab`: flags and the 7-step checklist | DSL only. Others see who the DSL is and a reminder to follow school policy |
| **Class & PINs** `(staff)/class` | `ClassTab`: class code, reset or unlock PINs, add a pupil, create a class. PIN cards are shown on screen; the PDF comes later | tutor, SENCO |

## Data changes

- The session can be a pupil or a staff member.
- `plans` (planned check-ins from drift alerts) moves over from the web version.
- Requests: `repliedBy` is added next to `repliedAt`. The "Demo only" buttons on the pupil side are removed once staff can reply for real.

## Steps

- **9a:** staff login, roles and access rules, Overview, **Requests (mark read and reply)**, Pupils and pupil detail.
- **9b:** Most asked for, You said / We did with the helpful tally, Safeguarding, Class & PINs.

## Questions for eko (answered)

1. **Access rules:** follow the scope's stricter table. ✅ Agreed.
2. **Quick replies:** each teacher can add, edit, delete and reorder their own. The wording was corrected: "I've seen this. Take the time you need." / "Thanks for telling me. Let's talk at break time." / "Thank you for letting me know. I'm here if you need me."
3. **Device:** laptop first, still works on a phone.

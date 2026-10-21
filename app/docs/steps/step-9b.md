# Step 9b: Teachers' side, part 2

**Commit:** `a22bbf6` (committed by eko)

With this step, every staff screen from `index.html` is in the Expo app.

## What changed

- **Most asked for** (`(staff)/themes.tsx`), for the class teacher, key adults and the SENCO:
  - Pupils' "What would help?" answers, grouped into themes by keyword, most asked for first.
  - Each theme shows a bar, how many answers and pupils it covers, and up to four quotes.
  - **No names are shown**, and answers from notes a pupil kept private are left out.
  - AI grouping stays off; the screen says "keyword grouping".
- **You said, we did** (`(staff)/yswd.tsx`), for the class teacher and the SENCO:
  - **Tell pupils what changed:** pick one of the class's top themes or type your own "You said", write "We did", then **Post to class feed**. Pupils see it straight away in "See my teacher's response".
  - **Posted:** each post shows the **"Was this helpful?" tally**, for example "3 yes · 1 not really · 9 no answer".
- **Safeguarding** (`(staff)/safeguarding.tsx`):
  - **The DSL** sees each flag with the pupil, the time and source, the exact words, and the keywords matched, plus the **7-step checklist**.
  - **Close flag** only works once every step is ticked, and closed flags can be reopened.
  - **Everyone else** sees who the DSL is and a reminder to follow the school's policy, never the flags.
  - The tab shows "(1 open)" for the DSL.
- **Class & PINs** (`(staff)/class.tsx`), for the class teacher and the SENCO:
  - **Class code:** shown large.
  - **New PINs:** for everyone at once, or **Reset PIN** / **Unlock and reset PIN** for one pupil, with each pupil's lock status shown.
  - **PIN cards:** new PINs appear on cards **once**, because only the hash is stored.
  - **Add a pupil:** name, avatar colour and key adult. They get a PIN card and go through first-login personalisation.
  - **Create a class:** with its own code, e.g. "8C-KTE".
  - **Reset demo**, with a confirmation step.
- **Class picker:** when someone can see more than one class, the staff bar shows a button for each class. Overview, Most asked for, You said / We did and Class & PINs all follow the chosen class.
- **Safeguarding lead's Overview** now has an "Open safeguarding" button.
- **Not included yet:** saving PIN cards as a PDF (needs `expo-print`).

## Key code

**Themes leave out private notes and names** (`src/domain/themes.ts`):
```ts
export function helpAnswers(db: Db, pupilIds: Set<string>): HelpAnswer[] {
  const hidden = new Set(db.posts.filter((p) => p.kind === 'note' && p.sharedWith === 'private').map((p) => p.refId));
  const out: HelpAnswer[] = [];
  for (const c of db.checkins) {
    if (!pupilIds.has(c.pupilId)) continue;
    for (const [sid, n] of Object.entries(c.notes || {})) {
      if (hidden.has(c.id + ':' + sid)) continue;
      const parts = [...n.help.chips, ...(n.help.text ? [n.help.text] : [])];
      if (!parts.length) continue;
      out.push({ pupilId: c.pupilId, date: c.date, text: n.help.text || n.help.chips.join(', '), all: parts.join(' ') });
    }
  }
  return out;
}
```

**"Was this helpful?" tally** (`src/domain/themes.ts`):
```ts
export function helpfulTally(item: Db['feed'][number]): { yes: number; notReally: number } {
  const v = Object.values(item.helpful);
  return { yes: v.filter((x) => x === 'yes').length, notReally: v.filter((x) => x === 'notReally').length };
}
```

**A flag closes only when every step is ticked** (`src/domain/staff.ts`):
```ts
export function setFlagStatus(db: Db, flagId: string, status: 'open' | 'closed'): void {
  const f = db.flags.find((x) => x.id === flagId);
  if (!f) return;
  if (status === 'closed' && SAFEGUARDING_CHECKLIST.some(([k]) => !f.checklist[k])) return;
  f.status = status;
}
```

**New PINs** (`src/domain/staff.ts`). Each pupil gets a random 4-digit PIN and a new salt. Only the hash is saved, and the PIN itself is shown once on a card.
```ts
export async function issuePins(pupils: Pupil[]) {
  const cards: PinCard[] = [];
  const secrets: Record<string, { salt: string; hash: string }> = {};
  for (const p of pupils) {
    const pin = randomPin();
    secrets[p.id] = await makeSecret(pin);
    cards.push({ name: p.name, pin });
  }
  return { cards, secrets };
}
```

**Class codes avoid look-alike characters** (`src/domain/staff.ts`). There's no 0/O or 1/I, and a code is never reused.
```ts
const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const head = (name.replace(/[^A-Za-z0-9]/g, '').toUpperCase() + 'XX').slice(0, 2);
for (;;) {
  const r = Crypto.getRandomBytes(3);
  const code = head + '-' + Array.from(r, (x) => A[x % A.length]).join('');
  if (!taken.includes(code)) return code;
}
```

**The class picker is shared by all staff screens** (`src/app/(staff)/_layout.tsx`):
```tsx
const classes = classesFor(db, staffMe);
const classId = classes.some((c) => c.id === picked) ? picked : (classes[0]?.id ?? null);
...
<StaffClassCtx.Provider value={{ classId, setClassId }}>
  <Stack screenOptions={{ headerShown: false }} />
</StaffClassCtx.Provider>
```

## Checks (browser, fictional data)

- **Ms Rivera** (class teacher):
  - **Tabs:** Overview, Requests, Pupils, Most asked for, You said / We did, Safeguarding, Class & PINs and My quick replies.
  - **Most asked for:** 15 answers from 12 pupils, top theme "Quieter places to eat or work", and Isla's private note not quoted.
  - **You said / We did:**
    - She picked the top theme and wrote "The library is open at lunch on Mondays and Wednesdays as a quiet room.", then posted it.
    - The tally showed "0 yes · 0 not really · 13 no answer".
    - Ben's "See my teacher's response" showed the new post.
  - **Class & PINs:**
    - The code showed as 8B-K4P.
    - Reset PIN for Ben showed a new 4-digit card, so Ben no longer uses 1234 until the demo is reset.
    - Creating 8C gave "8C-KTE", and the class picker appeared with 8B and 8C.
- **Ms Shah** (DSL):
  - **Tabs:** Overview and "Safeguarding (1 open)".
  - **Flag:** Jayden's flag showed the exact words and "Matched: unsafe".
  - **Checklist:** Close flag stayed disabled until all 7 steps were ticked, then closed the flag.
- **Mrs Hughes** (key adult):
  - **Tabs:** no You said / We did and no Class & PINs.
  - **Safeguarding:** showed only the "speak to Ms Shah" message, not the flag text.
- **Type check:** passes.

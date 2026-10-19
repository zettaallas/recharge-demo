# Step 8b: Optional personalisation and a skippable walkthrough

**Commit:** not committed yet

## What changed

- **First login now leads into two short, optional screens before home:**
  1. **Make Recharge yours** (`(pupil)/register.tsx`). Every part is optional:
     - "What would you like to be called?" The pupil's first name is the default, and the greeting uses this name.
     - Zip's colour and hat.
     - "Things that usually help me" chips, which go into the profile under **Helps me**.
     - "This is a shared device".
     - **Save and continue**, or **Skip for now**.
  2. **Walkthrough** (`(pupil)/walkthrough.tsx`): four cards with **Skip on every card**, plus Back, Next and Start. The cards are:
     - **Share how you feel, your way**: battery, symbols and photos. You rate places, not feelings.
     - **Ask for help any time**: "I need a break" and "Ask to talk to my teacher" send the key adult a request, and you don't have to explain.
     - **You decide who sees what**: only the key adult sees what you share, and you can keep any post private. The safeguarding exception is said plainly.
     - **See what happens next**: Sent, Read and Follow-up, and how to switch "Read" off.
- **Skipping counts as done.** Neither screen is ever forced on the pupil again.
- **From Settings,** "Change how Recharge looks for me" reopens personalisation with the pupil's current choices filled in, and "Show the walkthrough again" replays it. Both return to Settings afterwards.
- **New fictional demo pupil: Noor H.** She has never logged in, so testers can try the first-login flow (class 8B, PIN 1234). The other 12 pupils skip straight to home as before. The demo box on the entry screen mentions Noor.
- **My Zip** and personalisation share one Zip picker (`components/ZipPicker.tsx`).
- **The demo data version is now 4,** so the app rebuilds the fictional data once on your phone.
- **Plan:** the registration screen is in the pupil area (`(pupil)/register.tsx`) rather than `(auth)`, because it needs a logged-in pupil.

## Key code

**First login goes through personalisation, then the walkthrough** (`src/app/(pupil)/home.tsx`):
```tsx
if (!me.settings.registered) return <Redirect href="/register" />;
if (!me.settings.walkthroughDone) return <Redirect href="/walkthrough" />;
```

**Saving personalisation** (`src/app/(pupil)/register.tsx`). An empty name means "use my first name". Afterwards the profile is refreshed, so the chosen help chips appear under Helps me.
```ts
const save = () => {
  update((d) => {
    const p = d.pupils.find((x) => x.id === me.id)!;
    p.buddy = buddy;
    p.settings = { ...p.settings, preferredName: name.trim() || undefined, helps, registered: true };
    syncProfile(d, me.id);
  });
  next();
};
```

**Skip still counts as done** (`src/app/(pupil)/register.tsx`):
```ts
const skip = () => {
  update((d) => {
    d.pupils.find((x) => x.id === me.id)!.settings.registered = true;
  });
  next();
};
```

**Help chips feed the profile** (`src/domain/profile.ts`). The profile's "helps" now start from what the pupil picked at registration:
```ts
const helps = new Set<string>(pupil.settings.helps);
```

**The walkthrough cards** (`src/app/(pupil)/walkthrough.tsx`). Each card has its own icon and colour, and the key adult's name is filled into the text.
```ts
const CARDS: { icon: IconName; title: TextKey; body: TextKey }[] = [
  { icon: 'heart', title: 'wt1Title', body: 'wt1Body' },
  { icon: 'message', title: 'wt2Title', body: 'wt2Body' },
  { icon: 'lock', title: 'wt3Title', body: 'wt3Body' },
  { icon: 'bell', title: 'wt4Title', body: 'wt4Body' },
];
...
const finish = () => {
  update((d) => {
    d.pupils.find((x) => x.id === me.id)!.settings.walkthroughDone = true;
  });
  if (replay) router.back();
  else router.replace('/home');
};
```

## Checks (browser, as Noor)

- **First login:** PIN 1234 opened **Make Recharge yours**.
- **Personalisation:**
  - I set the name "Nono", coral with a crown, and "Headphones", then tapped Save and continue.
  - The walkthrough opened at "1 of 4", and card 2 named her key adult, Mrs Hughes.
- **Skip:** tapping Skip went to home, which greeted her as "**Hi Nono**".
- **Saved data:**
  - preferred name, buddy and helps saved
  - `registered` and `walkthroughDone` both true
  - "Headphones" in the profile under Helps me
- **From Settings:**
  - "Show the walkthrough again" opened card 1, and Next ×3 then Start returned to Settings.
  - "Change how Recharge looks for me" opened with "Nono" filled in, and Skip for now returned to Settings.
- **Type check:** passes.

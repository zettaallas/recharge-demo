# Step 4: Pupil login

**Commit:** `f505ae7`

## What changed

- **Entry screen** (`src/app/index.tsx`): "Who is using Recharge?" with the pupil tile, and the demo box with a "Reset demo" button that asks to confirm. Staff and the family note are greyed out as "Coming later".
- **Class code** (`(auth)/class-code.tsx`): an ordinary text box with large capitals and autocorrect off. Case, spaces and the hyphen don't matter. It has "Use demo class 8B" and "Remember this class on this device".
- **Tap your name** (`(auth)/pick-name.tsx`): the class list, with "Paused" on locked accounts and the "This is a shared device" checkbox.
- **PIN** (`(auth)/pin.tsx`): a big number pad. Wrong tries count down, and after 5 the account pauses.
- **Pupil area** (`(pupil)/_layout.tsx`): a top bar, plus a guard so pupil screens need a login.
- **App state** (`src/state/AppContext.tsx`): data, login, the remembered class, and the device settings.
- **Shared components** (`src/components/ui.tsx`): screen, heading, button, banner, checkbox, avatar and key.

**Changes made during the step, after review:**
- **Auto-logout only on shared devices.** The device setting is off by default, because secondary pupils mostly use their own phones.
- **Shared-device extras:** a **Hide** button in the top bar, and logout when the app goes into the background.
- **Own device:** an optional "**Ask for my PIN when I reopen the app**" setting, off by default and chosen by the pupil.
- **Secondary school:** the demo class is now **8B, code 8B-K4P**.
- **English only:** Polish, Spanish and the language buttons are removed. The text stays in one strings file.
- **Class code:** the on-screen keyboard was replaced with a normal text box.

## Key code

**Checking a PIN, with lockout** (`src/domain/auth.ts`). The typed PIN is hashed with the pupil's salt and compared. A wrong try adds 1 to the count, and at 5 the account is paused.
```ts
export async function checkPin(pupil: Pupil, pin: string): Promise<PinResult> {
  if (pupil.locked) return { ok: false, locked: true, triesLeft: 0 };
  if ((await hashSecret(pin, pupil.salt)) === pupil.pinHash) {
    pupil.failed = 0;
    return { ok: true };
  }
  pupil.failed += 1;
  if (pupil.failed >= MAX_PIN_TRIES) pupil.locked = true;
  return { ok: false, locked: pupil.locked, triesLeft: Math.max(0, MAX_PIN_TRIES - pupil.failed) };
}
```

**PIN screen** (`src/app/(auth)/pin.tsx`). The check runs on the 4th digit. On success, the login screens are cleared so Back can't return to them.
```ts
const check = async (p: string) => {
  const copy = { ...pupil };
  const res = await checkPin(copy, p);
  update((d) => {
    const x = d.pupils.find((q) => q.id === pupil.id)!;
    x.failed = copy.failed;
    x.locked = copy.locked;
  });
  setPin('');
  if (res.ok) {
    logIn(pupil.id);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/home');
    return;
  }
  setMsg(res.locked ? t('locked') : t('pinWrong', { n: res.triesLeft }));
};
```

**Saving every change** (`src/state/AppContext.tsx`). Screens change data only through `update(d => …)`. It edits a copy, shows the change straight away and saves it on the device. This is the one place that changes when Supabase comes in.
```ts
const update = useCallback(<R,>(fn: (d: Db) => R): R => {
  const next = clone(dbRef.current!);
  const r = fn(next);
  dbRef.current = next;
  setDb(next);
  localStore.save(next).catch(() => {});
  return r;
}, []);
```

**Auto-logout, shared devices only** (`src/state/AppContext.tsx`). Every touch records the time. Every 15 seconds, and whenever the app comes back to the front, the app checks for 20 minutes without a touch. On a pupil's own phone, `!sharedDevice` means no timer runs.
```ts
useEffect(() => {
  if (!session || !sharedDevice) return;
  const check = () => {
    if (Date.now() - lastTouch.current > SHARED_DEVICE_TIMEOUT_MS) logOut('timeout');
  };
  const iv = setInterval(check, 15000);
  const sub = AppState.addEventListener('change', (st) => { if (st === 'active') check(); });
  return () => { clearInterval(iv); sub.remove(); };
}, [session?.id, sharedDevice, logOut]);
```

**Leaving the app** (`src/state/AppContext.tsx`). A shared device logs out completely. An own device with "Ask for my PIN" turned on locks the app but keeps the saved login, so only the PIN is needed to get back in.
```ts
const sub = AppState.addEventListener('change', (st) => {
  const s = sessionRef.current;
  if (st !== 'background' || !s) return;
  if (sharedDevice) {
    logOut();
    return;
  }
  if (dbRef.current?.pupils.find((p) => p.id === s.id)?.settings.pinOnReopen) {
    setSession(null);
    setResume(s.id);
  }
});
```

**Starting the app** (`src/state/AppContext.tsx`). An own device stays logged in. A shared device stays logged in only within 20 minutes of the last use. "Ask for my PIN" sends the pupil to the PIN pad.
```ts
const fresh = !shared || (saved != null && Date.now() - saved.last < SHARED_DEVICE_TIMEOUT_MS);
const pupil = saved ? d.pupils.find((p) => p.id === saved.id) : undefined;
if (saved && fresh && pupil) {
  if (pupil.settings.pinOnReopen) {
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    setResume(pupil.id);
  } else setSession(saved);
}
```

**Guarding pupil screens and the Hide button** (`src/app/(pupil)/_layout.tsx`):
```tsx
const { me, t, colors, sharedDevice, logOut } = useApp();
if (!me) return <Redirect href="/" />;
...
{sharedDevice && <Button label={t('hide')} onPress={() => logOut()} accessibilityLabel={t('hide') + ' and log out'} />}
```

**Class code matching** (`src/domain/auth.ts`). Both sides are uppercased with spaces and hyphens removed, so `8bk4p` matches `8B-K4P`.
```ts
export function findClass(db: Db, code: string): SchoolClass | undefined {
  const norm = (s: string) => s.toUpperCase().replace(/[\s-]/g, '');
  const c = norm(code);
  return db.classes.find((x) => norm(x.code) === c);
}
```

**Class code box** (`src/app/(auth)/class-code.tsx`):
```tsx
<TextInput
  value={val}
  onChangeText={(v) => { setErr(''); setVal(v.toUpperCase()); }}
  onSubmitEditing={() => submit()}
  placeholder={DEMO.classCode}
  autoCapitalize="characters"
  autoCorrect={false}
  spellCheck={false}
  maxLength={8}
  returnKeyType="go"
  autoFocus
/>
```

**Strings, English only** (`src/i18n/index.ts`). Every screen reads its text through `t('…')`, so another language can be added back without changing the screens.
```ts
export function translate(key: TextKey, vars?: Record<string, string | number>): string {
  const s = en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
}
```

## Checks (browser)

- **Login:**
  - A wrong PIN shows "4 tries left".
  - 1234 logs in and resets the count.
  - Five wrong tries lock the account.
- **Staying logged in:**
  - A reload keeps the login.
  - After an hour idle, an own device stays logged in and a shared device goes back to the entry screen.
- **Locking and hiding:**
  - "Ask for my PIN" shows "Welcome back" on reopen.
  - Hide logs out.
- **Class code:** `8bk4p` opens the 8B name list.
- **Not tested here:** the logout when the app goes into the background. It needs a real phone.

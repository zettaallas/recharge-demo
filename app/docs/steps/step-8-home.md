# New home: four big buttons

**Commit:** `5ec3a7b` (committed by eko)

## What changed

**Home** now has Zip and the greeting at the top, then **four big, colourful buttons**:

| Button | Icon | Colour | Opens |
|---|---|---|---|
| **Share how I feel** | heart | teal | a chooser: Pulse check-in, Symbol board or Recharge Walk |
| **My Recharge Profile** | person | green | the profile (unchanged) |
| **Ask to talk to my teacher** | speech bubble | purple | the new talk request screen |
| **See my teacher's response** | bell | amber | replies, plus You said / We did, with a number badge for replies |

- **Eye-catching but calm:**
  - Each button has a soft coloured background, a solid colour circle with a big icon, a coloured border, a soft shadow and a › arrow.
  - Pressing it nudges it in slightly. There's no animation beyond that.
  - It works in light and dark mode.
  - The amber button uses a dark icon so it stays easy to see.
- **Top bar:**
  - **My Zip** (star) and **Settings** (sliders) are now small icon buttons in the top bar, next to "I need a break".
  - Tapping "Recharge" goes home.
  - Log out is in Settings.
- **Share how I feel** (`(pupil)/share.tsx`): three big buttons in the same style, for the battery check-in, the symbol board and the Walk. Their top button now says **Back**, to the chooser.
- **Ask to talk to my teacher** (`(pupil)/talk.tsx`):
  - "Ask Ms Rivera for a chat. You can add what it's about, but you don't have to."
  - An optional "What is it about?" box and the optional "Where are you right now?" drop-down.
  - A purple **Send request** button. It saves a **Talk request** post (status Sent) for the key adult. Details are checked for safeguarding words.
  - Then the **Saved** pop-up: "Ms Rivera has your request and will find a time to talk." OK goes home.
- **See my teacher's response** (`(pupil)/responses.tsx`) puts everything in one place, in **three tabs**:
  - **Replies to me**: posts the key adult has replied to, each with the reply shown in green.
  - **What I've sent**: everything the pupil has sent or kept, newest first, with a Sent / Read / Follow-up badge. That covers "I need a break", talk requests, symbols, check-in notes and Walk places. Tap one to open it, share it or keep it private.
  - **You said, we did**: the class updates with "Was this helpful?".
- **Reply time:**
  - Every teacher reply shows when it was sent: **"Replied Today 12:13"**, **"Replied Yesterday 09:10"** or **"Replied Thu 15 Oct, 09:10"**.
  - It appears both in the list (in a small green reply box) and on the opened post.
  - The seeded reply and "Pretend Ms Rivera replied" both carry a reply time. Older saved replies without one show the time the post was read.
- **The separate "My posts" screen is gone.** Its content now lives in the "What I've sent" tab.
- **"I need a break" pop-up** now has a second button, **"See what I've sent"**. It's outlined, not filled, so it looks different from the teal OK. It opens "What I've sent", where the break shows as ✓ Sent and, once read, ✓✓ Read. Pupils are never shown counts like "3 breaks this week".
- **After saving anything, the app goes back home.** That covers the symbol board, a talk request and the check-in's Home button, wherever the pupil came from.
- **Tidy-up:** the post row and the You said / We did list are now shared components (`PostCard`, `FeedList`), so My posts, the replies tab and the feed screen all use the same code. There's a new post kind, `talk`.

## Key code

**The big button** (`src/components/BigButton.tsx`, shortened). The press-in is a 2% shrink while the finger is down, with no animation. The screen reader hears the title, the badge and the line underneath.
```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={title + (badge ? ', ' + badge : '') + '. ' + sub}
  onPress={onPress}
  style={({ pressed }) => [
    styles.btn,
    { backgroundColor: bg, borderColor: accent, transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.92 : 1 },
  ]}>
  <View style={[styles.ic, { backgroundColor: accent }]}>
    <Icon name={icon} size={34} color={onAccent ?? colors.surface} />
  </View>
  …title, line underneath, optional badge, ›
</Pressable>
```

**Home buttons** (`src/app/(pupil)/home.tsx`, one of four):
```tsx
<BigButton
  icon="bell"
  title={t('teacherResponse')}
  sub={t('teacherResponseSub')}
  bg={colors.midBg}
  accent={colors.mid}
  onAccent={colors.zipLine}
  badge={replies ? String(replies) : undefined}
  onPress={() => router.push('/responses')}
/>
```

**A talk request** (`src/domain/talk.ts`). It adds one entry for the key adult and one post for the pupil, which is where the reply will appear. Details are scanned for safeguarding words.
```ts
export function requestTalk(db: Db, pupilId: string, summary: string, opts: { text?: string; where?: SlotId; whereLabel?: string }): boolean {
  const id = uid('m');
  const text = opts.text?.trim() || undefined;
  db.moments.unshift({ id, pupilId, kind: 'talk', where: opts.where, text, at: Date.now(), seen: false });
  addPost(db, { pupilId, kind: 'talk', refId: id, summary: [summary, opts.whereLabel, text].filter(Boolean).join(' · '), sharedWith: 'keyAdult' });
  return text ? raiseFlag(db, pupilId, 'Talk request', text) : false;
}
```

**Back home after saving** (`symbols.tsx`, `talk.tsx`, `check-in.tsx`). `dismissTo('/home')` closes every screen above home, so the pupil lands on home whether they came straight from home or through "Share how I feel".
```tsx
onOk={() => {
  setSaved(null);
  router.dismissTo('/home');
}}
```

**Replies tab** (`src/app/(pupil)/responses.tsx`). It shows only shared posts that have a reply, newest first.
```ts
const mine = db.posts.filter((p) => p.pupilId === me.id && p.sharedWith === 'keyAdult');
const replies = mine.filter((p) => p.status === 'followUp').sort((a, b) => b.at - a.at);
```

**Opening "What I've sent" from the break pop-up** (`src/app/(pupil)/_layout.tsx` and `responses.tsx`). The link passes the tab plus a timestamp, so it switches tabs even when the screen is already open on another tab.
```tsx
<Button
  label={t('seeSent')}
  onPress={() => {
    setBreakOpen(false);
    router.navigate({ pathname: '/responses', params: { tab: 'sent', at: String(Date.now()) } });
  }}
/>
...
useEffect(() => {
  if (params.tab === 'sent' || params.tab === 'feed' || params.tab === 'replies') setTab(params.tab);
}, [params.tab, params.at]);
```

**Reply time** (`src/components/postMeta.ts`). The same day shows as "Today", the day before as "Yesterday", and anything older gets the date.
```ts
export function replyTime(at: number): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = (x: Date) => x.toDateString();
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (day(d) === day(now)) return 'Today ' + time;
  if (day(d) === day(yesterday)) return 'Yesterday ' + time;
  return postDate(at);
}
```
The reply stores `repliedAt` when it's sent (`demoFollowUp` for now, staff later), and the card shows it under the reply:
```tsx
{!!(p.repliedAt ?? p.readAt) && (
  <Text style={{ color: colors.okInk, fontSize: 13, fontWeight: '700' }}>{t('repliedAt', { when: replyTime((p.repliedAt ?? p.readAt)!) })}</Text>
)}
```

## Checks (browser, phone size, as Isla)

- **Home:** the four buttons showed in light and dark mode, and the response button had the "1" badge for Isla's reply.
- **Talk request:**
  - I typed "About lunchtimes" and pressed Send request.
  - The pop-up said "Ms Rivera has your request and will find a time to talk.", and OK went home.
  - A Talk request post with status Sent was saved.
- **See my teacher's response:**
  - Replies to me showed Isla's reply from Ms Rivera in green.
  - The You said, we did tab showed the class updates.
- **Share how I feel:** it showed the three choices.
- **Going home after saving:**
  - Home → Share → Symbol board → Save → OK landed on home.
  - Home → Share → Pulse check-in → Save → Home landed on home.
- **Break link:**
  - "I need a break", then "See what I've sent", opened the tab with the new break at the top as ✓ Sent.
  - It also switched tabs when the screen was already open on "Replies to me".
  - In the pop-up, OK is filled teal and the link is outlined.
- **Reply time:**
  - "Pretend Ms Rivera replied" showed "Replied Today 12:13" on the post and in Replies to me.
  - The seeded reply showed its date.
- **Type check:** passes.
- **Not checked yet:** how the top bar wraps on a real phone. At phone width, "I need a break" moves to a second line under Recharge, Zip and Settings.

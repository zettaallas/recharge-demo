// Domain types for Recharge. Shapes follow the web prototype's data (index.html, buildSeed)
// plus the new pupil items from MIGRATION_PLAN.md (posts, statuses, settings).

export type Lang = 'en' | 'pl' | 'es';
export type Rating = 1 | 2 | 3 | 4 | 5;
export type Band = 'hi' | 'mid' | 'lo' | 'none';

export type ZipColour = 'teal' | 'lilac' | 'sky' | 'sun' | 'coral';
export type Hat = 'none' | 'beanie' | 'cap' | 'crown' | 'headphones' | 'flower';
export type AvatarColour = 'teal' | 'sky' | 'lilac' | 'sun' | 'coral' | 'leaf' | 'rose' | 'slate';

export type SymbolKey = 'tooLoud' | 'tooBright' | 'tooCrowded' | 'needBreakSym' | 'feelsSafe' | 'talkAdult';

export type StaffRole = 'class_teacher' | 'senco' | 'key_adult' | 'dsl';

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  salt: string;
  pwHash: string;
}

export interface Buddy {
  colour: ZipColour;
  hat: Hat;
}

/** Pupil-controlled settings. Everything here is optional to set and can be changed later. */
export interface PupilSettings {
  language: Lang;
  /** When off, the pupil only ever sees "Sent", never "Read". */
  showReadReceipts: boolean;
  preferredName?: string;
  /** Optional "things that help me" picked at registration. */
  helps: string[];
  registered: boolean;
  walkthroughDone: boolean;
}

export interface Pupil {
  id: string;
  classId: string;
  name: string;
  avatar: AvatarColour;
  keyAdultId: string;
  attendance: number;
  salt: string;
  pinHash: string;
  failed: number;
  locked: boolean;
  buddy: Buddy;
  parentShare: boolean;
  settings: PupilSettings;
}

export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  teacherId: string;
}

/** A place and moment in the school day that pupils rate. */
export interface Slot {
  id: string;
  name: string;
  place: string;
  icon: string;
  time: string;
}

export interface HelpAnswer {
  chips: string[];
  text: string;
}

export interface Note {
  symbols: SymbolKey[];
  help: HelpAnswer;
  text?: string;
  /** Local file URI. Shown to staff exactly as made; never interpreted. */
  photo?: string | null;
  drawing?: string | null;
  voice?: string | null;
}

/** Slot ids are either a class slot id or 'pin_' + a Walk pin id. */
export type SlotId = string;

export interface CheckIn {
  id: string;
  pupilId: string;
  date: string; // YYYY-MM-DD, local
  ratings: Record<SlotId, Rating>;
  notes: Record<SlotId, Note>;
  at: number;
}

/** A Recharge Walk place. The caption is the meaning. */
export interface Pin {
  id: string;
  pupilId: string;
  photo: string | null;
  tag: 'drains' | 'recharges';
  emoji: string;
  caption: string;
  at: number;
}

export type ProfileSection = 'drains' | 'helps' | 'words';

export interface ProfileItem {
  id: string;
  section: ProfileSection;
  text: string;
  src: 'ratings' | 'symbols' | 'walk' | 'help' | 'typed' | 'own';
  hidden: boolean;
}

export interface Profile {
  items: ProfileItem[];
  approvedAt: number | null;
  approvedSnapshot: { section: ProfileSection; text: string }[] | null;
  dirty: boolean;
}

export type Helpful = 'yes' | 'notReally' | 'skip';

/** A "You said, we did" update from staff. */
export interface FeedItem {
  id: string;
  classId: string;
  said: string;
  did: string;
  by: string;
  at: number;
  /** Each pupil's optional answer to "Was this helpful?". */
  helpful: Record<string, Helpful>;
}

/** A break request or symbol tap seen by the key adult (staff side). */
export interface Moment {
  id: string;
  pupilId: string;
  kind: 'break' | 'symbol';
  symbol?: SymbolKey;
  at: number;
  seen: boolean;
}

export type PostStatus = 'sent' | 'read' | 'followUp';
export type PostKind = 'note' | 'symbol' | 'break' | 'pin';

/** Anything a pupil has sent or kept: the "earlier posts" list. */
export interface Post {
  id: string;
  pupilId: string;
  kind: PostKind;
  /** The check-in, moment or pin this post points to. */
  refId: string;
  /** Short pupil-facing summary, in their own words where there are any. */
  summary: string;
  sharedWith: 'keyAdult' | 'private';
  status: PostStatus;
  readAt?: number;
  followUp?: string;
  helpful?: Helpful;
  at: number;
}

export interface ParentNote {
  id: string;
  pupilId: string;
  text: string;
  at: number;
}

export interface Flag {
  id: string;
  pupilId: string;
  source: string;
  text: string;
  words: string[];
  at: number;
  status: 'open' | 'closed';
  checklist: Record<string, boolean>;
}

/** The whole local database. Supabase replaces the storage behind it later, not this shape. */
export interface Db {
  version: 2;
  seededAt: number;
  staff: Staff[];
  pupils: Pupil[];
  classes: SchoolClass[];
  slots: Record<string, Slot[]>;
  checkins: CheckIn[];
  pins: Pin[];
  profiles: Record<string, Profile>;
  feed: FeedItem[];
  moments: Moment[];
  posts: Post[];
  parentNotes: ParentNote[];
  flags: Flag[];
}

import type { IconName } from '@/components/icons';
import type { TextKey } from '@/i18n';
import type { AvatarColour, Hat, Slot, StaffRole, SymbolKey, TalkTopic, ZipColour } from '@/types';

export const SLOT_DEFS: Slot[] = [
  { id: 'maths', name: 'Maths', place: 'Classroom 8B', icon: 'calc', time: '9:00' },
  { id: 'chg1', name: 'Changeover', place: 'Main corridor', icon: 'door', time: '10:00' },
  { id: 'break', name: 'Break', place: 'Playground', icon: 'tree', time: '10:45' },
  { id: 'english', name: 'English', place: 'Classroom 8B', icon: 'book', time: '11:05' },
  { id: 'lunch', name: 'Lunch', place: 'Lunch hall', icon: 'utensils', time: '12:15' },
  { id: 'chg2', name: 'Changeover', place: 'Main corridor', icon: 'door', time: '13:10' },
  { id: 'science', name: 'Science', place: 'Science lab', icon: 'flask', time: '13:15' },
  { id: 'pe', name: 'PE', place: 'Sports hall', icon: 'run', time: '14:20' },
];

/** Every symbol's picture. A symbol is always shown as picture + word. */
export const SYMBOL_ICON: Record<SymbolKey, IconName> = {
  happy: 'faceHappy', calm: 'faceCalm', feelsSafe: 'heart', sad: 'faceSad', worried: 'faceWorried',
  angry: 'faceAngry', confused: 'faceConfused', tired: 'faceTired', overwhelmed: 'faceOverwhelmed',
  hungry: 'utensils', thirsty: 'drink', unwell: 'thermometer', toilet: 'toilet',
  tooLoud: 'ear', tooBright: 'sun', tooCrowded: 'users', tooHot: 'flame', tooCold: 'snowflake', strongSmell: 'smell',
  needQuiet: 'headphones', needHelp: 'hand', needMove: 'run', needBreakSym: 'coffee', talkAdult: 'message',
};

/** The symbol board, in four groups. */
export const SYMBOL_GROUPS: { key: TextKey; icon: IconName; symbols: SymbolKey[] }[] = [
  { key: 'grpFeelings', icon: 'faceHappy', symbols: ['happy', 'calm', 'feelsSafe', 'sad', 'worried', 'angry', 'confused', 'tired', 'overwhelmed'] },
  { key: 'grpBody', icon: 'user', symbols: ['hungry', 'thirsty', 'unwell', 'toilet'] },
  { key: 'grpAround', icon: 'pin', symbols: ['tooLoud', 'tooBright', 'tooCrowded', 'tooHot', 'tooCold', 'strongSmell'] },
  { key: 'grpNeeds', icon: 'hand', symbols: ['needQuiet', 'needHelp', 'needMove', 'needBreakSym', 'talkAdult'] },
];

/** Check-in "Add more" keeps a shorter set about the place itself. */
export const PLACE_SYMBOLS: SymbolKey[] = ['tooLoud', 'tooBright', 'tooCrowded', 'tooHot', 'tooCold', 'strongSmell', 'feelsSafe', 'calm', 'worried', 'needBreakSym'];

/** "What about?" on a talk request. All optional. */
export const TALK_TOPICS: { key: TalkTopic; icon: IconName }[] = [
  { key: 'topicFriends', icon: 'users' },
  { key: 'topicWork', icon: 'pencil' },
  { key: 'topicHome', icon: 'home' },
  { key: 'topicWorried', icon: 'faceWorried' },
  { key: 'topicUnwell', icon: 'thermometer' },
  { key: 'topicHappened', icon: 'alert' },
  { key: 'topicJustTalk', icon: 'message' },
];

/** Picture for any symbol or topic key (staff views and the pupil's own posts use this). */
export const pictoIcon = (k: SymbolKey | TalkTopic): IconName =>
  (SYMBOL_ICON as Record<string, IconName>)[k] ?? TALK_TOPICS.find((x) => x.key === k)?.icon ?? 'grid';

export const HELP_CHIPS = ['Quieter place', 'Headphones', 'Leave early', 'Break space', 'Adult to talk to', 'Sit somewhere else'];

/** Pictures for the "What would help?" and Walk caption chips. The chip's words are still what gets saved. */
export const CHIP_ICON: Record<string, IconName> = {
  'Quieter place': 'speakerOff', Headphones: 'headphones', 'Leave early': 'door', 'Break space': 'coffee',
  'Adult to talk to': 'message', 'Sit somewhere else': 'chair',
  "It's quiet": 'speakerOff', "It's loud": 'speaker', 'Too many people': 'users', 'I can be on my own': 'user',
  'Bright lights': 'sun', 'Soft and cosy': 'sofa', 'It echoes': 'ear', 'Strong smells': 'smell',
};
export const EMOJIS = ['📚', '🔊', '🌳', '🛋️', '🎧', '🍽️', '🚪', '🏃', '🎨', '💡', '🧱', '🌈'];
export const ZIP_COLOURS: ZipColour[] = ['teal', 'lilac', 'sky', 'sun', 'coral'];
export const HATS: Hat[] = ['none', 'beanie', 'cap', 'crown', 'headphones', 'flower'];
export const AV_COLOURS: AvatarColour[] = ['teal', 'sky', 'lilac', 'sun', 'coral', 'leaf', 'rose', 'slate'];
export const ROLE_LABEL: Record<StaffRole, string> = {
  class_teacher: 'Class teacher',
  senco: 'SENCO',
  key_adult: 'Key adult',
  dsl: 'Safeguarding lead (DSL)',
};

/** Pupil login rules, same as the web prototype. */
export const MAX_PIN_TRIES = 5;
export const SHARED_DEVICE_TIMEOUT_MS = 20 * 60 * 1000;

/** The fictional demo staff accounts (no passwords here; on Supabase those are made when the demo is seeded). */
export const DEMO_STAFF: { name: string; email: string; role: StaffRole }[] = [
  { name: 'Ms Rivera', email: 'demo@recharge.test', role: 'class_teacher' },
  { name: 'Mr Adeyemi', email: 'senco@recharge.test', role: 'senco' },
  { name: 'Mrs Hughes', email: 'keyadult@recharge.test', role: 'key_adult' },
  { name: 'Ms Shah', email: 'dsl@recharge.test', role: 'dsl' },
];

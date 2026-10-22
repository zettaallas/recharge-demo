import type { AvatarColour, Hat, Slot, StaffRole, SymbolKey, ZipColour } from '@/types';

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

export const SYMBOLS: { key: SymbolKey; icon: string }[] = [
  { key: 'tooLoud', icon: 'ear' },
  { key: 'tooBright', icon: 'sun' },
  { key: 'tooCrowded', icon: 'users' },
  { key: 'needBreakSym', icon: 'coffee' },
  { key: 'feelsSafe', icon: 'heart' },
  { key: 'talkAdult', icon: 'message' },
];

export const HELP_CHIPS = ['Quieter place', 'Headphones', 'Leave early', 'Break space', 'Adult to talk to', 'Sit somewhere else'];
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

import { useColorScheme } from 'react-native';

// Colour tokens, ported from the web prototype's CSS variables (:root and dark mode).
const light = {
  bg: '#EDF2F0', surface: '#FFFFFF', surface2: '#E2EBE8', ink: '#16302D', ink2: '#4B635F', line: '#C9D8D4',
  accent: '#2B6964', accentInk: '#FFFFFF', accentSoft: '#D3E8E4', focus: '#1D4ED8',
  break: '#6E4A99', breakInk: '#FFFFFF', breakSoft: '#ECE4F5',
  hi: '#3B9781', mid: '#D99A2B', lo: '#D0644B', hiBg: '#CBE9DE', midBg: '#F6E2B3', loBg: '#F4C7BA', noneBg: '#EEF1F0',
  warnBg: '#FBEDE9', warnInk: '#8A2E1B', okBg: '#E1F2EC', okInk: '#1F5E4F',
  zip: { teal: '#7CC7B8', lilac: '#B9A6E3', sky: '#8EC3EA', sun: '#F2CF6B', coral: '#F0A58F' },
  zipWell: '#F4F7F6', zipBolt: 'rgba(255,255,255,.88)', hat: '#5A4B8A', hat2: '#E8B93E', zipLine: '#16302D',
  av: { teal: '#BFE3DA', sky: '#C7DFF3', lilac: '#DCD2F2', sun: '#F7E4A6', coral: '#F6CDBF', leaf: '#D3E6B8', rose: '#F3CFE0', slate: '#D5DDE3' },
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#111718', surface: '#192122', surface2: '#222C2D', ink: '#DCE6E3', ink2: '#9FB2AE', line: '#2F3B3C',
  accent: '#86C5BB', accentInk: '#0D1A18', accentSoft: '#1F3533', focus: '#93B4FF',
  break: '#B99BD9', breakInk: '#1A1225', breakSoft: '#2B2338',
  hi: '#62B49E', mid: '#CFA257', lo: '#D98973', hiBg: '#1E3A33', midBg: '#3B3221', loBg: '#42271F', noneBg: '#1C2425',
  warnBg: '#3A2420', warnInk: '#F2B6A6', okBg: '#1C3530', okInk: '#A6DCCB',
  zip: { teal: '#5FA597', lilac: '#9686C2', sky: '#6FA2C8', sun: '#C9AA55', coral: '#C98875' },
  zipWell: '#0F1516', zipBolt: 'rgba(255,255,255,.7)', hat: '#8C7CC4', hat2: '#C9AA55', zipLine: '#0B1112',
  av: { teal: '#23423C', sky: '#22374A', lilac: '#352F4C', sun: '#463D20', coral: '#4A2E26', leaf: '#33402A', rose: '#46293A', slate: '#2C353C' },
};

export const themes = { light, dark };

export const radius = { md: 20, sm: 12 };

export type ThemeMode = 'system' | 'light' | 'dark';

/** Colours for the current mode. 'system' follows the device setting. */
export function useColors(mode: ThemeMode = 'system'): Colors {
  const device = useColorScheme();
  const resolved = mode === 'system' ? (device === 'dark' ? 'dark' : 'light') : mode;
  return themes[resolved];
}

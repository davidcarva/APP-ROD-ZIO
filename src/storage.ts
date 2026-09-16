import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchRecord, OngoingMatch } from './types';

const KEY = 'rodizio_history_v1';
const ONGOING_KEY = 'rodizio_ongoing_v1';
const THEME_KEY = 'rodizio_theme_v1';
const SOUND_KEY = 'rodizio_sound_v1';

export async function loadThemePref(): Promise<'light' | 'dark' | null> {
  try {
    const v = await AsyncStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export async function saveThemePref(v: 'light' | 'dark'): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, v);
  } catch {
    // preferência de tema é só conveniência; ignorar falha
  }
}

export async function loadSoundPref(): Promise<boolean | null> {
  try {
    const v = await AsyncStorage.getItem(SOUND_KEY);
    return v === null ? null : v === 'on';
  } catch {
    return null;
  }
}

export async function saveSoundPref(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // idem: preferência de som não é crítica
  }
}

export async function loadHistory(): Promise<MatchRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MatchRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveMatch(record: MatchRecord): Promise<void> {
  const history = await loadHistory();
  history.unshift(record);
  await AsyncStorage.setItem(KEY, JSON.stringify(history.slice(0, 100)));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function saveOngoingMatch(state: OngoingMatch): Promise<void> {
  try {
    await AsyncStorage.setItem(ONGOING_KEY, JSON.stringify(state));
  } catch {
    // sem espaço/erro de disco: partida segue só em memória
  }
}

export async function loadOngoingMatch(): Promise<OngoingMatch | null> {
  try {
    const raw = await AsyncStorage.getItem(ONGOING_KEY);
    return raw ? (JSON.parse(raw) as OngoingMatch) : null;
  } catch {
    return null;
  }
}

export async function clearOngoingMatch(): Promise<void> {
  await AsyncStorage.removeItem(ONGOING_KEY);
}

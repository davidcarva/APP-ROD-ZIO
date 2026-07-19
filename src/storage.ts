import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchRecord } from './types';

const KEY = 'rodizio_history_v1';

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

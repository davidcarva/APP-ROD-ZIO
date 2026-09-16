export type FoodType = {
  id: string;
  name: string;
  emoji: string;
};

export const FOOD_TYPES: FoodType[] = [
  { id: 'sushi', name: 'Sushi', emoji: '🍣' },
  { id: 'churrasco', name: 'Churrasco', emoji: '🥩' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕' },
  { id: 'outro', name: 'Outro', emoji: '🍽️' },
];

// ícones variados que aparecem no pop-in a cada toque (sorteados)
export function emojiPool(food: FoodType): string[] {
  switch (food.id) {
    case 'sushi':
      return ['🍣', '🍤', '🍙', '🍱', '🥢'];
    default:
      return [food.emoji];
  }
}

export type MatchConfig = {
  food: FoodType;
  playerNames: string[];
  durationMin: number | null; // null = sem limite de tempo
  blind: boolean; // modo cegueira: placar escondido até o fim
};

// partida em andamento, salva para não se perder se o app fechar
export type OngoingMatch = {
  config: MatchConfig;
  counts: number[];
  startedAt: number; // epoch ms
};

export type PlayerResult = {
  name: string;
  count: number;
};

export type MatchRecord = {
  id: string;
  date: string; // ISO
  foodName: string;
  emoji: string;
  durationSec: number;
  players: PlayerResult[];
  winners: string[];
  blind?: boolean; // partidas antigas salvas não têm este campo
};

export function computeWinners(players: PlayerResult[]): string[] {
  const max = Math.max(...players.map((p) => p.count));
  return players.filter((p) => p.count === max).map((p) => p.name);
}

export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

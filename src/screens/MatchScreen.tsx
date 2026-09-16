import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, Countdown, usePunch } from '../fx';
import { haptic } from '../haptics';
import { TAP_NOTES, useSfx } from '../sfx';
import { saveOngoingMatch } from '../storage';
import { colors, fonts } from '../theme';
import {
  computeWinners,
  emojiPool,
  formatDuration,
  MatchConfig,
  MatchRecord,
} from '../types';
import { Btn, confirmDialog } from '../ui';
import { CardEvent, PlayerCard } from './PlayerCard';

const MILESTONE_EVERY = 5; // a cada 5 peças: arpejo; a cada 10: level up
const COMBO_WINDOW_MS = 650; // toques mais rápidos que isso somam combo
const COMBO_SOUND_AT = new Set([3, 6, 10, 15, 20, 30]);

type Props = {
  config: MatchConfig;
  initial?: { counts: number[]; startedAt: number }; // retomada de partida salva
  soundOn: boolean;
  onToggleSound: () => void;
  onFinish: (record: MatchRecord) => void;
  onCancel: () => void;
};

// líder isolado (null em empate ou com placar zerado)
function leaderOf(counts: number[]): number | null {
  const max = Math.max(...counts);
  if (max <= 0) return null;
  const tied = counts.filter((c) => c === max).length;
  return tied === 1 ? counts.indexOf(max) : null;
}

export function MatchScreen({
  config,
  initial,
  soundOn,
  onToggleSound,
  onFinish,
  onCancel,
}: Props) {
  const sfx = useSfx();
  const blind = config.blind;
  const pool = useMemo(() => emojiPool(config.food), [config.food]);
  const players = config.playerNames.length;
  const zeros = () => config.playerNames.map(() => 0);

  // tela não apaga durante a partida (recurso nativo; ignorado na web)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  const [counts, setCounts] = useState<number[]>(initial?.counts ?? zeros());
  // espelho do placar: valor exato mesmo com toques muito rápidos
  const countsRef = useRef<number[]>(initial?.counts ?? zeros());
  const [combos, setCombos] = useState<number[]>(zeros());
  const combosRef = useRef<number[]>(zeros());
  const lastTapRef = useRef<number[]>(zeros());
  const comboTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    config.playerNames.map(() => null)
  );
  const [events, setEvents] = useState<(CardEvent | null)[]>(config.playerNames.map(() => null));
  const eventId = useRef(0);
  const [banner, setBanner] = useState<{ id: number; text: string; color: string } | null>(null);
  const lastLeaderRef = useRef<number | null>(blind ? null : leaderOf(initial?.counts ?? zeros()));
  const lastNoteRef = useRef(-1);
  // contagem 3-2-1 só em partida nova (retomada entra direto)
  const [counting, setCounting] = useState(!initial);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startRef = useRef(initial?.startedAt ?? Date.now());
  const finishedRef = useRef(false);
  const lastTickRef = useRef<number | null>(null);
  const [clockScale, punchClock] = usePunch();

  // persiste a partida a cada peça marcada; se o app fechar, dá para continuar
  useEffect(() => {
    if (finishedRef.current) return;
    saveOngoingMatch({ config, counts, startedAt: startRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, counting]);

  useEffect(() => {
    const timers = comboTimers.current;
    return () => timers.forEach((id) => id && clearTimeout(id));
  }, []);

  const totalSec = config.durationMin != null ? config.durationMin * 60 : null;
  const remainingSec = totalSec != null ? Math.max(0, totalSec - elapsedSec) : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // tensão nos últimos 10 segundos: tique + relógio pulsando
  useEffect(() => {
    if (remainingSec == null || counting) return;
    if (remainingSec > 0 && remainingSec <= 10 && lastTickRef.current !== remainingSec) {
      lastTickRef.current = remainingSec;
      sfx.play('tick', 0.9);
      haptic.soft();
      punchClock(1.3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, counting]);

  const buildRecord = (finalCounts: number[]): MatchRecord => {
    const results = config.playerNames.map((name, i) => ({
      name,
      count: finalCounts[i],
    }));
    return {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      foodName: config.food.name,
      emoji: config.food.emoji,
      durationSec: Math.floor((Date.now() - startRef.current) / 1000),
      players: results,
      winners: computeWinners(results),
      blind: config.blind,
    };
  };

  // Tempo esgotado: encerra sozinho
  useEffect(() => {
    if (remainingSec === 0 && !finishedRef.current && !counting) {
      finishedRef.current = true;
      haptic.warning();
      onFinish(buildRecord(countsRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec]);

  const emit = (index: number, kind: CardEvent['kind'], value: number) => {
    eventId.current += 1;
    const ev = { id: eventId.current, kind, value };
    setEvents((prev) => prev.map((e, i) => (i === index ? ev : e)));
  };

  const bumpCombo = (index: number) => {
    const now = Date.now();
    const fast = now - lastTapRef.current[index] < COMBO_WINDOW_MS;
    lastTapRef.current[index] = now;
    const next = fast ? combosRef.current[index] + 1 : 1;
    combosRef.current = combosRef.current.map((c, i) => (i === index ? next : c));
    setCombos(combosRef.current);
    const pending = comboTimers.current[index];
    if (pending) clearTimeout(pending);
    comboTimers.current[index] = setTimeout(() => {
      combosRef.current = combosRef.current.map((c, i) => (i === index ? 0 : c));
      setCombos(combosRef.current);
    }, COMBO_WINDOW_MS + 150);
    return next;
  };

  // no modo cegueira o som não pode denunciar o placar: nota sorteada (sem repetir)
  const randomNote = () => {
    let n = Math.floor(Math.random() * TAP_NOTES.length);
    if (n === lastNoteRef.current) n = (n + 1) % TAP_NOTES.length;
    lastNoteRef.current = n;
    return TAP_NOTES[n];
  };

  const announceLeader = () => {
    const leader = leaderOf(countsRef.current);
    if (leader === null) return;
    const previous = lastLeaderRef.current;
    lastLeaderRef.current = leader;
    if (previous === null || previous === leader) return;
    setTimeout(() => sfx.play('lead', 0.85), 160);
    haptic.heavy();
    setBanner({
      id: Date.now(),
      text: `👑 ${config.playerNames[leader]} assumiu a liderança!`,
      color: colors.players[leader % colors.players.length],
    });
  };

  const increment = (index: number) => {
    const value = countsRef.current[index] + 1;
    countsRef.current = countsRef.current.map((c, i) => (i === index ? value : c));
    setCounts(countsRef.current);
    const combo = bumpCombo(index);

    if (blind) {
      sfx.play(randomNote(), 0.9);
      haptic.tap();
    } else if (value % (MILESTONE_EVERY * 2) === 0) {
      sfx.play('levelup');
      haptic.success();
      emit(index, 'levelup', value);
    } else if (value % MILESTONE_EVERY === 0) {
      sfx.play('milestone');
      haptic.success();
      emit(index, 'milestone', value);
    } else {
      // notas sobem rumo ao próximo marco (1→4): antecipação antes da comemoração
      sfx.play(TAP_NOTES[(value - 1) % MILESTONE_EVERY], 0.9);
      haptic.tap();
    }

    if (COMBO_SOUND_AT.has(combo)) {
      setTimeout(() => sfx.play('combo', 0.7), 60);
      haptic.medium();
    }

    if (!blind) announceLeader();
  };

  const decrement = (index: number) => {
    if (countsRef.current[index] <= 0) {
      haptic.warning();
      return;
    }
    countsRef.current = countsRef.current.map((c, i) => (i === index ? c - 1 : c));
    setCounts(countsRef.current);
    sfx.play('undo', 0.8);
    haptic.soft();
    emit(index, 'undo', countsRef.current[index]);
    // corrigir não conta como "virada": só atualiza o líder em silêncio
    if (!blind) {
      const leader = leaderOf(countsRef.current);
      if (leader !== null) lastLeaderRef.current = leader;
    }
  };

  const onCountStep = (step: number) => {
    if (step < 3) {
      sfx.play(TAP_NOTES[step]); // 3-2-1 subindo de tom
      haptic.medium();
    } else {
      sfx.play('milestone');
      haptic.success();
    }
  };

  const onCountDone = () => {
    startRef.current = Date.now(); // o relógio começa no "VALENDO!"
    setElapsedSec(0);
    setCounting(false);
  };

  const confirmFinish = () => {
    confirmDialog(
      'Encerrar rodízio?',
      'A contagem para agora e vamos ver quem ganhou.',
      'Encerrar',
      'Continuar comendo',
      () => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          haptic.success();
          onFinish(buildRecord(countsRef.current));
        }
      }
    );
  };

  const confirmCancel = () => {
    sfx.play('click', 0.7);
    confirmDialog(
      'Abandonar rodízio?',
      'A partida atual será descartada sem salvar.',
      'Abandonar',
      'Voltar à partida',
      onCancel
    );
  };

  const toggleSound = () => {
    haptic.selection();
    onToggleSound();
    // confirma com um "bloop" só se o som acabou de ser ligado
    setTimeout(() => sfx.play('click', 0.8), 60);
  };

  // 1–2 jogadores: cartões empilhados; 3–4: grade 2x2
  const rows: number[][] =
    players <= 2
      ? config.playerNames.map((_, i) => [i])
      : [[0, 1], players === 3 ? [2] : [2, 3]];

  const leader = blind ? null : leaderOf(counts);
  const clockText =
    remainingSec != null ? formatDuration(remainingSec) : formatDuration(elapsedSec);
  const clockUrgent = remainingSec != null && remainingSec <= 10;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={confirmCancel} hitSlop={12}>
          <Text style={styles.cancelText}>✕</Text>
        </Pressable>
        <View style={styles.clockWrap}>
          <Text style={styles.foodText}>
            {config.food.emoji} {config.food.name}
            {blind ? '  ·  🙈 cegueira' : ''}
          </Text>
          <Animated.Text
            style={[
              styles.clock,
              clockUrgent && { color: colors.danger },
              { transform: [{ scale: clockScale }] },
            ]}
          >
            {remainingSec != null ? `⏳ ${clockText}` : `⏱️ ${clockText}`}
          </Animated.Text>
        </View>
        <Pressable onPress={toggleSound} hitSlop={12}>
          <Text style={styles.soundText}>{soundOn ? '🔊' : '🔇'}</Text>
        </Pressable>
      </View>

      <View style={styles.board}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((i) => (
              <PlayerCard
                key={i}
                name={config.playerNames[i]}
                color={colors.players[i % colors.players.length]}
                emoji={config.food.emoji}
                emojiPool={pool}
                count={counts[i]}
                hideCount={blind}
                leader={leader === i}
                combo={combos[i]}
                event={events[i]}
                onIncrement={() => increment(i)}
                onDecrement={() => decrement(i)}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Btn label="Encerrar e ver o vencedor 🏆" onPress={confirmFinish} />
      </View>

      {banner && (
        <Banner
          key={banner.id}
          text={banner.text}
          color={banner.color}
          onDone={() => setBanner((b) => (b && b.id === banner.id ? null : b))}
        />
      )}
      {counting && <Countdown color={colors.accent} onStep={onCountStep} onDone={onCountDone} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  cancelText: {
    color: colors.sub,
    fontSize: 20,
  },
  soundText: {
    fontSize: 20,
  },
  clockWrap: {
    alignItems: 'center',
    gap: 2,
  },
  foodText: {
    color: colors.sub,
    fontSize: 14,
    fontFamily: fonts.bodySemi,
  },
  clock: {
    color: colors.text,
    fontSize: 24,
    fontFamily: fonts.heading,
    fontVariant: ['tabular-nums'],
  },
  board: {
    flex: 1,
    gap: 12,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    paddingTop: 12,
  },
});

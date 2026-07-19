import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { colors, fonts } from '../theme';
import {
  computeWinners,
  emojiPool,
  formatDuration,
  MatchConfig,
  MatchRecord,
} from '../types';
import { Btn, confirmDialog } from '../ui';
import { PlayerCard } from './PlayerCard';

type Props = {
  config: MatchConfig;
  onFinish: (record: MatchRecord) => void;
  onCancel: () => void;
};

export function MatchScreen({ config, onFinish, onCancel }: Props) {
  const [counts, setCounts] = useState<number[]>(config.playerNames.map(() => 0));
  const [elapsedSec, setElapsedSec] = useState(0);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const totalSec = config.durationMin != null ? config.durationMin * 60 : null;
  const remainingSec = totalSec != null ? Math.max(0, totalSec - elapsedSec) : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const buildRecord = (finalCounts: number[]): MatchRecord => {
    const players = config.playerNames.map((name, i) => ({
      name,
      count: finalCounts[i],
    }));
    return {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      foodName: config.food.name,
      emoji: config.food.emoji,
      durationSec: Math.floor((Date.now() - startRef.current) / 1000),
      players,
      winners: computeWinners(players),
    };
  };

  // Tempo esgotado: encerra sozinho
  useEffect(() => {
    if (remainingSec === 0 && !finishedRef.current) {
      finishedRef.current = true;
      Vibration.vibrate([0, 300, 150, 300]);
      onFinish(buildRecord(counts));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec]);

  const increment = (index: number) => {
    Vibration.vibrate(15);
    setCounts((prev) => prev.map((c, i) => (i === index ? c + 1 : c)));
  };

  const decrement = (index: number) => {
    setCounts((prev) => prev.map((c, i) => (i === index ? Math.max(0, c - 1) : c)));
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
          onFinish(buildRecord(counts));
        }
      }
    );
  };

  const confirmCancel = () => {
    confirmDialog(
      'Abandonar rodízio?',
      'A partida atual será descartada sem salvar.',
      'Abandonar',
      'Voltar à partida',
      onCancel
    );
  };

  const n = config.playerNames.length;
  // 1–2 jogadores: cartões empilhados; 3–4: grade 2x2
  const rows: number[][] =
    n <= 2
      ? config.playerNames.map((_, i) => [i])
      : [[0, 1], n === 3 ? [2] : [2, 3]];

  const clockText =
    remainingSec != null ? formatDuration(remainingSec) : formatDuration(elapsedSec);
  const clockUrgent = remainingSec != null && remainingSec <= 60;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={confirmCancel} hitSlop={12}>
          <Text style={styles.cancelText}>✕</Text>
        </Pressable>
        <View style={styles.clockWrap}>
          <Text style={styles.foodText}>
            {config.food.emoji} {config.food.name}
          </Text>
          <Text style={[styles.clock, clockUrgent && { color: colors.danger }]}>
            {remainingSec != null ? `⏳ ${clockText}` : `⏱️ ${clockText}`}
          </Text>
        </View>
        <View style={{ width: 24 }} />
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
                emojiPool={emojiPool(config.food)}
                count={counts[i]}
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

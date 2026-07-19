import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { clearHistory, loadHistory } from '../storage';
import { colors, fonts } from '../theme';
import { formatDate, formatDuration, MatchRecord } from '../types';
import { Btn, confirmDialog } from '../ui';

type Props = {
  onBack: () => void;
};

export function HistoryScreen({ onBack }: Props) {
  const [history, setHistory] = useState<MatchRecord[] | null>(null);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const confirmClear = () => {
    confirmDialog(
      'Apagar histórico?',
      'Todos os resultados salvos serão removidos.',
      'Apagar tudo',
      'Cancelar',
      async () => {
        await clearHistory();
        setHistory([]);
      }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Histórico</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {history !== null && history.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>
              Nenhum rodízio por aqui ainda.{'\n'}Chame a galera e comece o primeiro!
            </Text>
          </View>
        )}

        {history?.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {m.emoji} {m.foodName}
              </Text>
              <Text style={styles.cardDate}>{formatDate(m.date)}</Text>
            </View>
            <Text style={styles.winner}>
              {m.winners.length > 1 ? '🤝 Empate: ' : '👑 '}
              {m.winners.join(' e ')}
            </Text>
            <View style={styles.playersWrap}>
              {[...m.players]
                .sort((a, b) => b.count - a.count)
                .map((p, i) => (
                  <Text key={p.name + i} style={styles.playerLine}>
                    {p.name}: <Text style={styles.playerCount}>{p.count}</Text>
                  </Text>
                ))}
            </View>
            <Text style={styles.durationText}>⏱️ {formatDuration(m.durationSec)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {history !== null && history.length > 0 && (
          <Btn label="Apagar histórico" variant="danger" onPress={confirmClear} />
        )}
        <Btn label="Voltar" variant="ghost" onPress={onBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  heading: {
    fontSize: 32,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: 16,
  },
  scroll: {
    gap: 12,
    paddingBottom: 16,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.sub,
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: fonts.headingBold,
    color: colors.text,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.sub,
  },
  winner: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  playersWrap: {
    gap: 2,
  },
  playerLine: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.sub,
  },
  playerCount: {
    color: colors.text,
    fontFamily: fonts.bodyBold,
  },
  durationText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.sub,
  },
  footer: {
    gap: 10,
    paddingTop: 8,
  },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { formatDuration, MatchRecord } from '../types';
import { Btn } from '../ui';

type Props = {
  record: MatchRecord;
  onRematch: () => void;
  onNewMatch: () => void;
  onHome: () => void;
};

const MEDALS = ['🥇', '🥈', '🥉', '4º'];

export function ResultsScreen({ record, onRematch, onNewMatch, onHome }: Props) {
  const sorted = [...record.players].sort((a, b) => b.count - a.count);
  const isTie = record.winners.length > 1;
  const totalPieces = record.players.reduce((sum, p) => sum + p.count, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.crown}>{isTie ? '🤝' : '👑'}</Text>
        <Text style={styles.winnerLabel}>{isTie ? 'Empate!' : 'Campeão da noite'}</Text>
        <Text style={styles.winnerName}>{record.winners.join(' e ')}</Text>

        <View style={styles.ranking}>
          {sorted.map((p, i) => (
            <View key={p.name + i} style={styles.rankRow}>
              <Text style={styles.medal}>{MEDALS[i]}</Text>
              <Text style={styles.rankName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.rankCount}>
                {p.count} {record.emoji}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalPieces}</Text>
            <Text style={styles.statLabel}>peças no total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration(record.durationSec)}</Text>
            <Text style={styles.statLabel}>de rodízio</Text>
          </View>
        </View>

        <Text style={styles.saved}>Resultado salvo no histórico ✅</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Btn label="Revanche 🔁" onPress={onRematch} />
        <View style={styles.footerRow}>
          <Btn label="Novo rodízio" variant="ghost" onPress={onNewMatch} style={{ flex: 1 }} />
          <Btn label="Início" variant="ghost" onPress={onHome} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  crown: {
    fontSize: 64,
    marginTop: 8,
  },
  winnerLabel: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.sub,
    marginTop: 8,
  },
  winnerName: {
    fontSize: 38,
    fontFamily: fonts.heading,
    color: colors.accent,
    textAlign: 'center',
    marginTop: 4,
  },
  ranking: {
    alignSelf: 'stretch',
    marginTop: 28,
    gap: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  medal: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  rankName: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  rankCount: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 18,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.sub,
    marginTop: 2,
  },
  saved: {
    marginTop: 18,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.sub,
  },
  footer: {
    gap: 10,
    paddingTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
});

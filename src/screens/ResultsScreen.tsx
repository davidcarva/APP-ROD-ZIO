import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Appear, Confetti } from '../fx';
import { haptic } from '../haptics';
import { useSfx } from '../sfx';
import { fonts, Theme, useTheme } from '../theme';
import { formatDuration, MatchRecord } from '../types';
import { Btn } from '../ui';

const NATIVE = Platform.OS !== 'web';
const MEDALS = ['🥇', '🥈', '🥉', '4º'];
const ROW_GAP_MS = 950; // intervalo entre cada colocação revelada
const DRUMROLL_MS = 2050;

// ranking (de baixo pra cima) → rufar → revelação do campeão → tela final
type Phase = 'ranking' | 'drumroll' | 'reveal' | 'done';

type Props = {
  record: MatchRecord;
  onRematch: () => void;
  onNewMatch: () => void;
  onHome: () => void;
};

type Styles = ReturnType<typeof makeStyles>;

export function ResultsScreen({ record, onRematch, onNewMatch, onHome }: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const sfx = useSfx();
  const sorted = useMemo(
    () => [...record.players].sort((a, b) => b.count - a.count),
    [record]
  );
  const top = sorted[0]?.count ?? 0;
  const winnerRow = sorted.map((p) => p.count === top);
  const isTie = record.winners.length > 1;
  const totalPieces = record.players.reduce((sum, p) => sum + p.count, 0);

  const [phase, setPhase] = useState<Phase>('ranking');
  const [revealed, setRevealed] = useState<boolean[]>(() => sorted.map(() => false));
  const [instant, setInstant] = useState(false);
  const [confetti, setConfetti] = useState<number | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const revealRow = (row: number) => {
    setRevealed((r) => r.map((v, i) => (i === row ? true : v)));
    sfx.play('whoosh', 0.55);
    haptic.soft();
  };

  const revealWinners = () => {
    sfx.stop('drumroll');
    sfx.play('reveal');
    haptic.heavy();
    later(170, () => haptic.success());
    setRevealed((r) => r.map((v, i) => v || winnerRow[i]));
    setPhase('reveal');
    setConfetti(Date.now());
    later(380, () => sfx.play('fanfare'));
    later(1500, () => setPhase('done'));
  };

  useEffect(() => {
    let time = 450;
    const bottomUp = sorted
      .map((_, i) => i)
      .filter((i) => !winnerRow[i])
      .reverse();
    for (const row of bottomUp) {
      later(time, () => revealRow(row));
      time += ROW_GAP_MS;
    }
    later(time, () => {
      setPhase('drumroll');
      sfx.play('drumroll');
      haptic.medium();
    });
    later(time + DRUMROLL_MS, revealWinners);
    return () => {
      timers.current.forEach(clearTimeout);
      sfx.stop('drumroll');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pular a cerimônia: vai direto ao campeão (sem esperar contagens)
  const skip = () => {
    if (phase === 'reveal' || phase === 'done') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setInstant(true);
    setRevealed(sorted.map(() => true));
    revealWinners();
  };

  const shareResult = async () => {
    const placar = sorted
      .map((p, i) => `${MEDALS[i]} ${p.name} — ${p.count} ${record.emoji}`)
      .join('\n');
    const message =
      `${isTie ? '🤝 Deu empate no' : '👑 Temos campeão no'} rodízio de ${record.foodName}!\n\n` +
      `${placar}\n\n` +
      `${totalPieces} peças em ${formatDuration(record.durationSec)}` +
      `${record.blind ? '\n🙈 Jogado no modo Cegueira' : ''}\n\n` +
      `— contado no app manda +1`;

    if (Platform.OS === 'web') {
      // navegador: usa o compartilhamento nativo se existir, senão copia
      const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
      try {
        if (nav.share) await nav.share({ text: message });
        else {
          await navigator.clipboard.writeText(message);
          window.alert('Resultado copiado! É só colar onde quiser. 📋');
        }
      } catch {
        // usuário cancelou o compartilhamento
      }
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // usuário cancelou
    }
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          {phase === 'ranking' && (
            <Appear>
              <Text style={styles.suspense}>
                {record.blind ? '🙈 Hora da verdade!' : 'Contando as peças…'}
              </Text>
            </Appear>
          )}
          {phase === 'drumroll' && <Drumroll styles={styles} />}
          {(phase === 'reveal' || phase === 'done') && (
            <WinnerHeader styles={styles} isTie={isTie} names={record.winners.join(' e ')} />
          )}
        </View>

        <View style={styles.ranking}>
          {sorted.map((p, i) => (
            <RankRow
              key={`${p.name}-${i}`}
              medal={MEDALS[i]}
              name={p.name}
              count={p.count}
              emoji={record.emoji}
              visible={revealed[i]}
              instant={instant}
              winner={winnerRow[i]}
              styles={styles}
            />
          ))}
        </View>

        {phase === 'done' && (
          <Appear style={styles.after}>
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
            {record.blind && <Text style={styles.blindTag}>🙈 Jogado no modo Cegueira</Text>}
            <Text style={styles.saved}>Resultado salvo no histórico ✅</Text>
          </Appear>
        )}
      </ScrollView>

      {phase === 'done' ? (
        <Appear delay={120} style={styles.footer}>
          <Btn label="Compartilhar resultado 📤" onPress={shareResult} />
          <View style={styles.footerRow}>
            <Btn label="Revanche 🔁" variant="ghost" onPress={onRematch} style={{ flex: 1 }} />
            <Btn label="Novo rodízio" variant="ghost" onPress={onNewMatch} style={{ flex: 1 }} />
          </View>
          <Btn label="Início" variant="ghost" onPress={onHome} />
        </Appear>
      ) : (
        <View style={styles.footer}>
          <Btn
            label={phase === 'reveal' ? 'Revelando… 🎉' : 'Pular ⏭'}
            variant="ghost"
            sound="tick"
            onPress={skip}
          />
        </View>
      )}

      {confetti !== null && area.w > 0 && (
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
          <Confetti
            key={confetti}
            width={area.w}
            height={area.h}
            glyphs={[record.emoji, '👑', '🎉', '✨']}
            onDone={() => setConfetti(null)}
          />
        </View>
      )}
    </View>
  );
}

function Drumroll({ styles }: { styles: Styles }) {
  const wiggle = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 60, useNativeDriver: NATIVE }),
        Animated.timing(wiggle, { toValue: -1, duration: 60, useNativeDriver: NATIVE }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ])
    );
    shakeLoop.start();
    pulseLoop.start();
    return () => {
      shakeLoop.stop();
      pulseLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.headerInner}>
      <Animated.Text
        style={[
          styles.drumEmoji,
          { transform: [{ rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) }] },
        ]}
      >
        🥁
      </Animated.Text>
      <Animated.Text
        style={[
          styles.drumText,
          { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] },
        ]}
      >
        E quem comeu mais foi…
      </Animated.Text>
    </View>
  );
}

function WinnerHeader({
  styles,
  isTie,
  names,
}: {
  styles: Styles;
  isTie: boolean;
  names: string;
}) {
  const drop = useRef(new Animated.Value(0)).current;
  const slam = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(drop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: NATIVE }).start();
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(slam, { toValue: 1, friction: 5, tension: 150, useNativeDriver: NATIVE }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.headerInner}>
      <Animated.Text
        style={[
          styles.crown,
          {
            transform: [
              { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-160, 0] }) },
              { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) },
            ],
          },
        ]}
      >
        {isTie ? '🤝' : '👑'}
      </Animated.Text>
      <Text style={styles.winnerLabel}>{isTie ? 'Empate!' : 'Campeão da noite'}</Text>
      <Animated.Text
        numberOfLines={2}
        style={[
          styles.winnerName,
          {
            opacity: slam.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: slam.interpolate({ inputRange: [0, 1], outputRange: [2.6, 1] }) }],
          },
        ]}
      >
        {names}
      </Animated.Text>
    </View>
  );
}

function RankRow({
  medal,
  name,
  count,
  emoji,
  visible,
  instant,
  winner,
  styles,
}: {
  medal: string;
  name: string;
  count: number;
  emoji: string;
  visible: boolean;
  instant: boolean;
  winner: boolean;
  styles: Styles;
}) {
  const sfx = useSfx();
  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  const counter = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCounter = () => {
    if (counter.current) clearInterval(counter.current);
    counter.current = null;
  };

  // entra deslizando e o número conta de 0 até o placar, com tiques
  useEffect(() => {
    if (!visible) return;
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 80, useNativeDriver: NATIVE }).start();
    if (instant || count === 0) {
      setShown(count);
      return;
    }
    const steps = Math.min(count, 16);
    let k = 0;
    counter.current = setInterval(() => {
      k += 1;
      setShown(Math.round((count * k) / steps));
      sfx.play('tick', 0.4);
      if (k >= steps) stopCounter();
    }, Math.max(30, Math.min(70, 700 / steps)));
    return stopCounter;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!instant) return;
    stopCounter();
    setShown(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);

  // o campeão fica "respirando" depois de revelado
  useEffect(() => {
    if (!winner || !visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ])
    );
    const id = setTimeout(() => loop.start(), 600);
    return () => {
      clearTimeout(id);
      loop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, visible]);

  return (
    <Animated.View
      style={[
        styles.rankRow,
        winner && styles.winnerRow,
        {
          opacity: enter.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
            {
              scale: Animated.multiply(
                enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
              ),
            },
          ],
        },
      ]}
    >
      <Text style={styles.medal}>{medal}</Text>
      <Text style={styles.rankName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.rankCount}>
        {shown} {emoji}
      </Text>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
    },
    scroll: {
      alignItems: 'center',
      paddingBottom: 16,
    },
    header: {
      alignSelf: 'stretch',
      height: 190,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInner: {
      alignItems: 'center',
    },
    suspense: {
      fontSize: 22,
      fontFamily: fonts.heading,
      color: t.sub,
      textAlign: 'center',
    },
    drumEmoji: {
      fontSize: 64,
    },
    drumText: {
      fontSize: 22,
      fontFamily: fonts.heading,
      color: t.text,
      marginTop: 8,
      textAlign: 'center',
    },
    crown: {
      fontSize: 64,
    },
    winnerLabel: {
      fontSize: 16,
      fontFamily: fonts.bodyBold,
      color: t.sub,
      marginTop: 4,
    },
    winnerName: {
      fontSize: 38,
      fontFamily: fonts.heading,
      color: t.accent,
      textAlign: 'center',
      marginTop: 2,
    },
    ranking: {
      alignSelf: 'stretch',
      marginTop: 8,
      gap: 10,
    },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    winnerRow: {
      borderWidth: 2,
      borderColor: t.accent,
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
      color: t.text,
    },
    rankCount: {
      fontSize: 18,
      fontFamily: fonts.heading,
      color: t.text,
      fontVariant: ['tabular-nums'],
    },
    after: {
      alignSelf: 'stretch',
      alignItems: 'center',
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
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 16,
      paddingVertical: 14,
    },
    statValue: {
      fontSize: 24,
      fontFamily: fonts.heading,
      color: t.text,
    },
    statLabel: {
      fontSize: 13,
      fontFamily: fonts.body,
      color: t.sub,
      marginTop: 2,
    },
    blindTag: {
      marginTop: 18,
      fontSize: 14,
      fontFamily: fonts.bodyBold,
      color: t.accent,
    },
    saved: {
      marginTop: 8,
      fontSize: 14,
      fontFamily: fonts.body,
      color: t.sub,
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

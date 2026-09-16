import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Appear, Burst, CONFETTI_COLORS, Floaty, pushCapped, usePunch } from '../fx';
import { haptic } from '../haptics';
import { TAP_NOTES, useSfx } from '../sfx';
import { fonts, Theme, useTheme } from '../theme';
import { OngoingMatch } from '../types';
import { Btn } from '../ui';

const NATIVE = Platform.OS !== 'web';
const LOGO = ['🍣', '🥩', '🍕'];

type Props = {
  ongoing: OngoingMatch | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onResume: () => void;
  onStart: () => void;
  onHistory: () => void;
};

// emoji do logo: flutua em repouso e explode em partículas quando tocado
function LogoEmoji({ glyph, delay, onTap }: { glyph: string; delay: number; onTap: () => void }) {
  const [bursts, setBursts] = useState<number[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [scale, punch] = usePunch();
  const nextId = useRef(0);

  const press = () => {
    onTap();
    punch(1.45);
    const id = nextId.current++;
    setBursts((l) => pushCapped(l, id, 3));
  };

  return (
    <Floaty delay={delay}>
      <Pressable
        onPress={press}
        hitSlop={8}
        onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <Animated.Text style={{ fontSize: 56, transform: [{ scale }] }}>{glyph}</Animated.Text>
        {bursts.map((id) => (
          <Burst
            key={id}
            x={box.w / 2}
            y={box.h / 2}
            glyphs={[glyph]}
            colors={CONFETTI_COLORS}
            count={10}
            reach={80}
            size={20}
            onDone={() => setBursts((l) => l.filter((b) => b !== id))}
          />
        ))}
      </Pressable>
    </Floaty>
  );
}

export function HomeScreen({
  ongoing,
  isDark,
  onToggleTheme,
  onResume,
  onStart,
  onHistory,
}: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const sfx = useSfx();
  const spin = useRef(new Animated.Value(0)).current;
  const note = useRef(0);

  const toggleTheme = () => {
    sfx.play('click', 0.8);
    haptic.selection();
    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.back(1.8)),
      useNativeDriver: NATIVE,
    }).start();
    onToggleTheme();
  };

  // cada toque no logo toca a próxima nota da escala
  const tapLogo = () => {
    sfx.play(TAP_NOTES[note.current % TAP_NOTES.length], 0.8);
    note.current += 1;
    haptic.tap();
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={toggleTheme} style={styles.themeToggle} hitSlop={10}>
        <Animated.Text
          style={[
            styles.themeToggleText,
            { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
          ]}
        >
          {isDark ? '☀️' : '🌙'}
        </Animated.Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.logoRow}>
          {LOGO.map((glyph, i) => (
            <LogoEmoji key={glyph} glyph={glyph} delay={i * 260} onTap={tapLogo} />
          ))}
        </View>
        <Appear delay={120}>
          <Text style={styles.title}>manda +1</Text>
        </Appear>
        <Appear delay={240}>
          <Text style={styles.subtitle}>Quem aguenta mais peças esta noite?</Text>
        </Appear>
      </View>

      <Appear delay={360} style={styles.actions}>
        {ongoing && (
          <Btn
            label={`Continuar partida ${ongoing.config.food.emoji} ▶️`}
            onPress={onResume}
          />
        )}
        <Btn
          label="Começar rodízio"
          variant={ongoing ? 'ghost' : 'primary'}
          sound="whoosh"
          onPress={onStart}
        />
        <Btn label="Histórico" variant="ghost" onPress={onHistory} />
      </Appear>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      justifyContent: 'space-between',
    },
    themeToggle: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 2,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeToggleText: {
      fontSize: 20,
    },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: t.bgAlt,
      borderRadius: 32,
      marginBottom: 16,
      padding: 24,
    },
    logoRow: {
      flexDirection: 'row',
      gap: 14,
    },
    title: {
      fontSize: 52,
      fontFamily: fonts.heading,
      color: t.text,
    },
    subtitle: {
      fontSize: 17,
      fontFamily: fonts.body,
      color: t.sub,
      textAlign: 'center',
    },
    actions: {
      gap: 12,
    },
  });

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, fonts } from '../theme';
import { BorderDots } from '../ui';

const NATIVE = Platform.OS !== 'web';

// o número atrás só atualiza quando o pop do emoji está terminando
const COUNT_UPDATE_MS = 340;

type FxPop = { id: number; emoji: string };
type FxRipple = { id: number; x: number; y: number; delay: number };

type Props = {
  name: string;
  color: string;
  emoji: string;
  emojiPool: string[];
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function PlayerCard({
  name,
  color,
  emoji,
  emojiPool,
  count,
  onIncrement,
  onDecrement,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [displayCount, setDisplayCount] = useState(count);
  const [pops, setPops] = useState<FxPop[]>([]);
  const [ripples, setRipples] = useState<FxRipple[]>([]);
  const nextId = useRef(0);
  const countRef = useRef(count);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    countRef.current = count;
    // desfazer (−1) aparece na hora; o +1 espera a animação do emoji
    setDisplayCount((d) => (count < d ? count : d));
  }, [count]);

  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  // tudo é dimensionado pelo lado menor do quadrado desta pessoa
  const min = Math.min(size.w, size.h);
  const countSize = Math.max(40, min * 0.32);
  const nameSize = Math.min(24, Math.max(14, min * 0.1));
  const emojiSize = Math.max(44, min * 0.45);
  const rippleDiameter = Math.max(48, min * 0.5);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const handlePress = (e: GestureResponderEvent) => {
    onIncrement();
    const native = e.nativeEvent as { locationX?: number; locationY?: number };
    const x = native.locationX ?? size.w / 2;
    const y = native.locationY ?? size.h / 2;
    const base = nextId.current;
    nextId.current += 4;
    // sorteia um dos ícones do rodízio escolhido para este pop
    const popEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    setPops((p) => [...p, { id: base, emoji: popEmoji }]);
    setRipples((r) => [
      ...r,
      { id: base + 1, x, y, delay: 0 },
      { id: base + 2, x, y, delay: 120 },
      { id: base + 3, x, y, delay: 240 },
    ]);
    timeouts.current.push(setTimeout(() => setDisplayCount(countRef.current), COUNT_UPDATE_MS));
  };

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: color },
        pressed && styles.pressed,
      ]}
    >
      <BorderDots color={color} />
      <Text style={[styles.name, { color, fontSize: nameSize }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.count, { fontSize: countSize }]}>{displayCount}</Text>
      <Text style={styles.hint}>toque para +1 {emoji}</Text>

      {ripples.map((r) => (
        <RippleRing
          key={r.id}
          x={r.x}
          y={r.y}
          diameter={rippleDiameter}
          color={color}
          delay={r.delay}
          onDone={() => setRipples((list) => list.filter((it) => it.id !== r.id))}
        />
      ))}
      {pops.map((p) => (
        <EmojiPop
          key={p.id}
          emoji={p.emoji}
          fontSize={emojiSize}
          onDone={() => setPops((list) => list.filter((it) => it.id !== p.id))}
        />
      ))}

      <Pressable onPress={onDecrement} hitSlop={10} style={styles.undoBtn}>
        <Text style={styles.undoText}>−1</Text>
      </Pressable>
    </Pressable>
  );
}

function EmojiPop({
  emoji,
  fontSize,
  onDone,
}: {
  emoji: string;
  fontSize: number;
  onDone: () => void;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: NATIVE,
      }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 90, useNativeDriver: NATIVE }),
        Animated.delay(200),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: NATIVE }),
      ]),
    ]).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.popWrap,
        { opacity, transform: [{ scale }], pointerEvents: 'none' },
      ]}
    >
      <Text style={{ fontSize }}>{emoji}</Text>
    </Animated.View>
  );
}

function RippleRing({
  x,
  y,
  diameter,
  color,
  delay,
  onDone,
}: {
  x: number;
  y: number;
  diameter: number;
  color: string;
  delay: number;
  onDone: () => void;
}) {
  const scale = useRef(new Animated.Value(0.15)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.55, duration: 90, useNativeDriver: NATIVE }),
          Animated.timing(opacity, { toValue: 0, duration: 530, useNativeDriver: NATIVE }),
        ]),
      ]),
    ]).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        left: x - diameter / 2,
        top: y - diameter / 2,
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        borderWidth: 2,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  name: {
    fontFamily: fonts.heading,
    maxWidth: '90%',
  },
  count: {
    fontFamily: fonts.heading,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.sub,
  },
  popWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  undoText: {
    color: colors.sub,
    fontSize: 14,
    fontFamily: fonts.bodyBold,
  },
});

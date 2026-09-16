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
import {
  Burst,
  ComboBadge,
  CONFETTI_COLORS,
  Crown,
  Flash,
  FloatText,
  pushCapped,
  Slam,
  usePunch,
  useShake,
} from '../fx';
import { colors, fonts } from '../theme';
import { BorderDots } from '../ui';

const NATIVE = Platform.OS !== 'web';

// o número atrás só atualiza quando o pop do emoji está terminando
const COUNT_UPDATE_MS = 340;

/** Eventos disparados pela partida para este cartão comemorar. */
export type CardEvent = { id: number; kind: 'milestone' | 'levelup' | 'undo'; value: number };

type FxPop = { id: number; emoji: string };
type FxRipple = { id: number; x: number; y: number; delay: number };
type FxBurst = { id: number; x: number; y: number; big: boolean };
type FxFloat = { id: number; x: number; y: number; text: string; color: string };
type FxSlam = { id: number; text: string; sub?: string };
type FxFlash = { id: number; peak: number; color: string };

type Props = {
  name: string;
  color: string;
  emoji: string;
  emojiPool: string[];
  count: number;
  hideCount?: boolean; // modo cegueira: mostra "?" no lugar do número
  leader: boolean;
  combo: number;
  event: CardEvent | null;
  onIncrement: () => void;
  onDecrement: () => void;
};

// títulos dos marcos de 10 em 10 — quanto mais come, mais o app zoa
const LEVEL_TITLES: [number, string][] = [
  [200, '👑 REI DA GULA'],
  [190, '🥵 TEM CERTEZA DISSO?'],
  [180, '🧨 SEGURA ESSA PESSOA'],
  [170, '😵 O BUFFET SE RENDEU'],
  [160, '🐐 LENDA DO RODÍZIO'],
  [150, '🦖 EXTINÇÃO EM MASSA'],
  [140, '🛸 ISSO NÃO É HUMANO'],
  [130, '🧟 NEM ZUMBI COME ASSIM'],
  [120, '🚑 CHAMEM A AMBULÂNCIA'],
  [110, '🐉 COMEU O CARDÁPIO'],
  [100, '💯 CEM! CEM PEÇAS!'],
  [90, '😱 ISSO TEM FUNDO?'],
  [80, '🚨 CHAMEM O GERENTE'],
  [70, '🍴 ACORDOU COM FOME?'],
  [60, '🧾 VAI FALIR O BUFFET'],
  [50, '😈 A GULA EM PESSOA'],
  [40, '👹 VIROU MONSTRO'],
  [30, '⚡ MÁQUINA DE COMER'],
  [20, '🚀 SEM FREIO'],
  [0, '🔥 PEGANDO FOGO'],
];

function levelTitle(value: number) {
  const tier = LEVEL_TITLES.find(([min]) => value >= min);
  return tier ? tier[1] : LEVEL_TITLES[LEVEL_TITLES.length - 1][1];
}

export function PlayerCard({
  name,
  color,
  emoji,
  emojiPool,
  count,
  hideCount,
  leader,
  combo,
  event,
  onIncrement,
  onDecrement,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  const [displayCount, setDisplayCount] = useState(count);
  const [pops, setPops] = useState<FxPop[]>([]);
  const [ripples, setRipples] = useState<FxRipple[]>([]);
  const [bursts, setBursts] = useState<FxBurst[]>([]);
  const [floats, setFloats] = useState<FxFloat[]>([]);
  const [slams, setSlams] = useState<FxSlam[]>([]);
  const [flashes, setFlashes] = useState<FxFlash[]>([]);
  const nextId = useRef(0);
  const countRef = useRef(count);
  const prevDisplay = useRef(count);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [countScale, punchCount] = usePunch();
  const [cardScale, punchCard] = usePunch();
  const [shakeX, shake] = useShake();

  const uid = () => nextId.current++;

  useEffect(() => {
    countRef.current = count;
    // desfazer (−1) aparece na hora; o +1 espera a animação do emoji
    setDisplayCount((d) => (count < d ? count : d));
  }, [count]);

  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  // número dá um "soco" quando sobe
  useEffect(() => {
    if (displayCount > prevDisplay.current) punchCount(1.4);
    prevDisplay.current = displayCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCount]);

  // comemorações vindas da partida (marcos) e feedback de desfazer
  useEffect(() => {
    if (!event) return;
    const { w, h } = sizeRef.current;
    if (event.kind === 'undo') {
      const floatId = uid();
      setFloats((l) =>
        pushCapped(l, { id: floatId, x: w / 2, y: h * 0.62, text: '−1', color: colors.danger }, 5)
      );
      shake(5);
      return;
    }
    const big = event.kind === 'levelup';
    const flashId = uid();
    const slamId = uid();
    const burstId = uid();
    setFlashes((l) =>
      pushCapped(l, { id: flashId, peak: big ? 0.55 : 0.32, color: big ? '#ffffff' : color }, 2)
    );
    setSlams((l) =>
      pushCapped(
        l,
        { id: slamId, text: `${event.value}!`, sub: big ? levelTitle(event.value) : undefined },
        1
      )
    );
    setBursts((l) => pushCapped(l, { id: burstId, x: w / 2, y: h / 2, big: true }, 5));
    shake(big ? 10 : 6);
    punchCard(big ? 1.06 : 1.035);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  // tudo é dimensionado pelo lado menor do quadrado desta pessoa
  const min = Math.min(size.w, size.h);
  const countSize = Math.max(40, min * 0.32);
  const nameSize = Math.min(24, Math.max(14, min * 0.1));
  const emojiSize = Math.max(44, min * 0.45);
  const rippleDiameter = Math.max(48, min * 0.5);
  const burstReach = Math.max(60, min * 0.38);
  const particleSize = Math.max(16, min * 0.09);
  const floatSize = Math.max(20, min * 0.12);
  const slamSize = Math.max(48, min * 0.42);
  const crownSize = Math.max(22, min * 0.13);
  const comboSize = Math.max(12, min * 0.065);

  // textos do marco dimensionados pela largura do cartão (o título pode usar 2 linhas)
  const fitSlam = (text: string) =>
    size.w > 0 ? Math.min(slamSize, (size.w - 16) / ([...text].length * 0.62)) : slamSize;
  const fitSub = (sub?: string) => {
    if (!sub) return undefined;
    const byHeight = slamSize * 0.26;
    if (size.w <= 0) return Math.max(11, byHeight);
    const byWidth = ((size.w - 28) * 2) / ([...sub].length * 0.72);
    return Math.max(11, Math.min(byHeight, byWidth));
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { w: width, h: height };
    setSize({ w: width, h: height });
  };

  const handlePress = (e: GestureResponderEvent) => {
    onIncrement();
    const native = e.nativeEvent as { locationX?: number; locationY?: number };
    const x = native.locationX ?? size.w / 2;
    const y = native.locationY ?? size.h / 2;
    // sorteia um dos ícones do rodízio escolhido para este pop
    const popEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    const pop = { id: uid(), emoji: popEmoji };
    const rings = [0, 120, 240].map((delay) => ({ id: uid(), x, y, delay }));
    const burst = { id: uid(), x, y, big: false };
    const plus = { id: uid(), x, y: y - 10, text: '+1', color };
    setPops((l) => pushCapped(l, pop, 4));
    setRipples((l) => [...l, ...rings].slice(-9));
    setBursts((l) => pushCapped(l, burst, 5));
    setFloats((l) => pushCapped(l, plus, 5));
    timeouts.current.push(setTimeout(() => setDisplayCount(countRef.current), COUNT_UPDATE_MS));
  };

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateX: shakeX }, { scale: cardScale }] }]}>
      <Pressable
        onLayout={handleLayout}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          { borderColor: color, borderWidth: leader ? 3 : 2 },
          pressed && styles.pressed,
        ]}
      >
        <BorderDots color={color} />
        <Crown visible={leader} size={crownSize} />
        <Text style={[styles.name, { color, fontSize: nameSize }]} numberOfLines={1}>
          {name}
        </Text>
        <Animated.Text
          style={[
            styles.count,
            { fontSize: countSize, transform: [{ scale: countScale }] },
            hideCount && { color: colors.sub },
          ]}
        >
          {hideCount ? '?' : displayCount}
        </Animated.Text>
        <Text style={styles.hint}>toque para +1 {emoji}</Text>

        {flashes.map((f) => (
          <Flash
            key={f.id}
            color={f.color}
            peak={f.peak}
            onDone={() => setFlashes((l) => l.filter((it) => it.id !== f.id))}
          />
        ))}
        {ripples.map((r) => (
          <RippleRing
            key={r.id}
            x={r.x}
            y={r.y}
            diameter={rippleDiameter}
            color={color}
            delay={r.delay}
            onDone={() => setRipples((l) => l.filter((it) => it.id !== r.id))}
          />
        ))}
        {pops.map((p) => (
          <EmojiPop
            key={p.id}
            emoji={p.emoji}
            fontSize={emojiSize}
            onDone={() => setPops((l) => l.filter((it) => it.id !== p.id))}
          />
        ))}
        {bursts.map((b) => (
          <Burst
            key={b.id}
            x={b.x}
            y={b.y}
            glyphs={emojiPool}
            colors={b.big ? CONFETTI_COLORS : [color]}
            count={b.big ? 16 : 6}
            reach={b.big ? burstReach * 1.7 : burstReach}
            size={b.big ? particleSize * 1.3 : particleSize}
            duration={b.big ? 1000 : 720}
            onDone={() => setBursts((l) => l.filter((it) => it.id !== b.id))}
          />
        ))}
        {floats.map((f) => (
          <FloatText
            key={f.id}
            x={f.x}
            y={f.y}
            text={f.text}
            color={f.color}
            size={floatSize}
            onDone={() => setFloats((l) => l.filter((it) => it.id !== f.id))}
          />
        ))}
        {slams.map((s) => (
          <Slam
            key={s.id}
            text={s.text}
            sub={s.sub}
            color="#ffffff"
            size={fitSlam(s.text)}
            subSize={fitSub(s.sub)}
            onDone={() => setSlams((l) => l.filter((it) => it.id !== s.id))}
          />
        ))}

        <ComboBadge combo={combo} color={color} size={comboSize} />
        <Pressable onPress={onDecrement} hitSlop={10} style={styles.undoBtn}>
          <Text style={styles.undoText}>−1</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
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
  wrap: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
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

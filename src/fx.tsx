import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { fonts } from './theme';

// Biblioteca de efeitos visuais ("juice"): partículas, textos que batem na tela,
// confete, combo, coroa, contagem regressiva. Tudo com Animated + native driver.

const NATIVE = Platform.OS !== 'web';
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export const CONFETTI_COLORS = ['#ff5470', '#3ec1d3', '#ffb020', '#8c6ef2', '#7ddc6f', '#ffffff'];

/** Adiciona um efeito mantendo no máximo `max` vivos (descarta os mais antigos). */
export function pushCapped<T>(list: T[], item: T, max: number): T[] {
  const next = [...list, item];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** Escala que "dá um soco" e volta com mola. */
export function usePunch() {
  const value = useRef(new Animated.Value(1)).current;
  const punch = (amount = 1.3) => {
    value.stopAnimation();
    value.setValue(amount);
    Animated.spring(value, { toValue: 1, friction: 4, tension: 220, useNativeDriver: NATIVE }).start();
  };
  return [value, punch] as const;
}

/** Tremida horizontal curta (impacto). */
export function useShake() {
  const value = useRef(new Animated.Value(0)).current;
  const shake = (intensity = 6) => {
    value.stopAnimation();
    value.setValue(0);
    const step = (to: number) =>
      Animated.timing(value, { toValue: to, duration: 38, useNativeDriver: NATIVE });
    Animated.sequence([
      step(intensity),
      step(-intensity),
      step(intensity * 0.6),
      step(-intensity * 0.6),
      step(intensity * 0.25),
      step(0),
    ]).start();
  };
  return [value, shake] as const;
}

/* ———————————— Explosão de partículas com gravidade ———————————— */

type Particle = {
  glyph: string | null;
  color: string;
  dx: number;
  ys: number[];
  spin: number;
  size: number;
};

export function Burst({
  x,
  y,
  glyphs,
  colors = [],
  count = 8,
  reach = 90,
  size = 22,
  duration = 760,
  onDone,
}: {
  x: number;
  y: number;
  glyphs: string[];
  colors?: string[];
  count?: number;
  reach?: number;
  size?: number;
  duration?: number;
  onDone: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  const parts = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + rnd(-0.45, 0.45);
        const speed = reach * rnd(0.55, 1.1);
        const vy = Math.sin(angle) * speed - reach * 0.75; // viés para cima
        const gravity = reach * 1.9;
        const dot = colors.length > 0 && i % 3 === 0;
        return {
          glyph: dot ? null : glyphs[Math.floor(Math.random() * glyphs.length)],
          color: colors.length ? colors[i % colors.length] : '#ffffff',
          dx: Math.cos(angle) * speed,
          // parábola amostrada em 5 pontos (interpolação linear entre eles)
          ys: [0, 0.25, 0.5, 0.75, 1].map((s) => vy * s + gravity * s * s),
          spin: rnd(-420, 420),
          size: size * rnd(0.7, 1.15),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: NATIVE,
    }).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: x - p.size / 2,
            top: y - p.size / 2,
            opacity: progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: p.ys,
                }),
              },
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${p.spin}deg`],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 0.12, 1],
                  outputRange: [0.2, 1.2, 0.75],
                }),
              },
            ],
          }}
        >
          {p.glyph ? (
            <Text style={{ fontSize: p.size }}>{p.glyph}</Text>
          ) : (
            <View
              style={{
                width: p.size * 0.5,
                height: p.size * 0.5,
                borderRadius: p.size,
                backgroundColor: p.color,
              }}
            />
          )}
        </Animated.View>
      ))}
    </View>
  );
}

/* ———————————— Texto que sobe e some ("+1") ———————————— */

export function FloatText({
  x,
  y,
  text,
  color,
  size = 26,
  rise = 70,
  onDone,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  size?: number;
  rise?: number;
  onDone: () => void;
}) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 820,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - 60,
        top: y - size,
        width: 120,
        alignItems: 'center',
        pointerEvents: 'none',
        opacity: p.interpolate({ inputRange: [0, 0.1, 0.65, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) },
          { scale: p.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.4, 1.3, 1] }) },
        ],
      }}
    >
      <Text style={[fx.float, { color, fontSize: size }]}>{text}</Text>
    </Animated.View>
  );
}

/* ———————————— Texto gigante que "bate" na tela ———————————— */

export function Slam({
  text,
  sub,
  color,
  size,
  subSize,
  onDone,
}: {
  text: string;
  sub?: string;
  color: string;
  size: number;
  subSize?: number; // dimensionado pela largura do cartão, para nunca vazar
  onDone: () => void;
}) {
  const scale = useRef(new Animated.Value(2.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: NATIVE }),
        Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: NATIVE }),
        Animated.sequence([
          Animated.timing(tilt, { toValue: 1, duration: 70, useNativeDriver: NATIVE }),
          Animated.timing(tilt, { toValue: -1, duration: 90, useNativeDriver: NATIVE }),
          Animated.timing(tilt, { toValue: 0, duration: 90, useNativeDriver: NATIVE }),
        ]),
      ]),
      Animated.delay(450),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: NATIVE }),
        Animated.timing(scale, { toValue: 1.35, duration: 260, useNativeDriver: NATIVE }),
      ]),
    ]).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        fx.center,
        {
          pointerEvents: 'none',
          opacity,
          transform: [
            { scale },
            { rotate: tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] }) },
          ],
        },
      ]}
    >
      <Text style={[fx.slam, { color, fontSize: size }]}>{text}</Text>
      {sub ? (
        <Text
          numberOfLines={2}
          style={[fx.slamSub, { fontSize: subSize ?? Math.max(12, size * 0.26) }]}
        >
          {sub}
        </Text>
      ) : null}
    </Animated.View>
  );
}

/* ———————————— Clarão ———————————— */

export function Flash({
  color = '#ffffff',
  peak = 0.5,
  onDone,
}: {
  color?: string;
  peak?: number;
  onDone: () => void;
}) {
  const o = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(o, { toValue: peak, duration: 60, useNativeDriver: NATIVE }),
      Animated.timing(o, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: NATIVE,
      }),
    ]).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: o, pointerEvents: 'none' }]}
    />
  );
}

/* ———————————— Chuva de confete ———————————— */

export function Confetti({
  width,
  height,
  count = 70,
  glyphs = [],
  onDone,
}: {
  width: number;
  height: number;
  count?: number;
  glyphs?: string[];
  onDone: () => void;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        v: new Animated.Value(0),
        x: rnd(0, width),
        delay: rnd(0, 900),
        duration: rnd(2100, 3300),
        sway: rnd(12, 42) * (Math.random() < 0.5 ? -1 : 1),
        spin: rnd(360, 1080) * (Math.random() < 0.5 ? -1 : 1),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        glyph: glyphs.length > 0 && i % 5 === 0 ? glyphs[i % glyphs.length] : null,
        w: rnd(7, 11),
        h: rnd(12, 18),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.v, {
            toValue: 1,
            duration: p.duration,
            easing: Easing.in(Easing.sin),
            useNativeDriver: NATIVE,
          }),
        ])
      )
    ).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: -30,
            left: p.x,
            opacity: p.v.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, height + 60] }) },
              {
                translateX: p.v.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [0, p.sway, 0, -p.sway, 0],
                }),
              },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        >
          {p.glyph ? (
            <Text style={{ fontSize: 22 }}>{p.glyph}</Text>
          ) : (
            <View style={{ width: p.w, height: p.h, borderRadius: 2, backgroundColor: p.color }} />
          )}
        </Animated.View>
      ))}
    </View>
  );
}

/* ———————————— Selo de combo ———————————— */

export function ComboBadge({ combo, color, size }: { combo: number; color: string; size: number }) {
  const [label, setLabel] = useState(combo);
  const opacity = useRef(new Animated.Value(0)).current;
  const [scale, punch] = usePunch();

  useEffect(() => {
    if (combo >= 2) {
      setLabel(combo);
      Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: NATIVE }).start();
      punch(1.55);
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: NATIVE }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo]);

  // nunca houve combo: nada no DOM (evita um "x0" invisível lido por leitores de tela)
  if (label < 2) return null;

  const hype = label >= 10 ? ' ⚡' : label >= 6 ? ' 🔥🔥' : label >= 4 ? ' 🔥' : '';

  return (
    <Animated.View
      style={[
        fx.combo,
        {
          backgroundColor: color,
          opacity,
          pointerEvents: 'none',
          transform: [{ scale }, { rotate: '-8deg' }],
        },
      ]}
    >
      <Text style={[fx.comboText, { fontSize: size }]}>
        x{label}
        {hype}
      </Text>
    </Animated.View>
  );
}

/* ———————————— Coroa do líder ———————————— */

export function Crown({ visible, size }: { visible: boolean; size: number }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      v.setValue(0);
      Animated.spring(v, { toValue: 1, friction: 4, tension: 120, useNativeDriver: NATIVE }).start();
    } else {
      Animated.timing(v, { toValue: 0, duration: 200, useNativeDriver: NATIVE }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 4,
        pointerEvents: 'none',
        opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-size, 0] }) },
          { scale: v },
          { rotate: '-10deg' },
        ],
      }}
    >
      <Text style={{ fontSize: size }}>👑</Text>
    </Animated.View>
  );
}

/* ———————————— Faixa de anúncio (ex.: nova liderança) ———————————— */

export function Banner({
  text,
  color,
  onDone,
}: {
  text: string;
  color: string;
  onDone: () => void;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(v, { toValue: 1, friction: 6, tension: 90, useNativeDriver: NATIVE }),
      Animated.delay(1300),
      Animated.timing(v, { toValue: 0, duration: 260, useNativeDriver: NATIVE }),
    ]).start(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        fx.banner,
        {
          backgroundColor: color,
          pointerEvents: 'none',
          opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ],
        },
      ]}
    >
      <Text style={fx.bannerText} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}

/* ———————————— Contagem regressiva 3-2-1-VALENDO! ———————————— */

const COUNTDOWN = ['3', '2', '1', 'VALENDO!'];
const COUNTDOWN_FADE_MS = 240;

export function Countdown({
  color,
  onStep,
  onDone,
}: {
  color: string;
  onStep: (step: number) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (doneTimer.current) clearTimeout(doneTimer.current);
    },
    []
  );

  useEffect(() => {
    onStep(step);
    const last = step === COUNTDOWN.length - 1;
    const id = setTimeout(
      () => {
        if (!last) {
          setStep((s) => s + 1);
          return;
        }
        Animated.timing(fade, {
          toValue: 0,
          duration: COUNTDOWN_FADE_MS,
          useNativeDriver: NATIVE,
        }).start();
        // libera o tabuleiro por timer: se a animação pausar, o jogo não fica travado
        doneTimer.current = setTimeout(onDone, COUNTDOWN_FADE_MS + 10);
      },
      last ? 700 : 640
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const go = step === COUNTDOWN.length - 1;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fx.center, fx.backdrop, { opacity: fade }]}>
      <CountStep key={step} text={COUNTDOWN[step]} color={go ? color : '#ffffff'} size={go ? 62 : 132} />
    </Animated.View>
  );
}

function CountStep({ text, color, size }: { text: string; color: string; size: number }) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 5, tension: 160, useNativeDriver: NATIVE }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.Text
      style={[
        fx.countStep,
        {
          color,
          fontSize: size,
          opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
          transform: [
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] }) },
          ],
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

/* ———————————— Utilitários de entrada/idle ———————————— */

/** Entra deslizando de baixo com leve "passada do ponto". */
export function Appear({
  children,
  delay = 0,
  from = 18,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: NATIVE,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Flutua suavemente em loop (elementos "vivos" em repouso). */
export function Floaty({
  children,
  delay = 0,
  amplitude = 8,
  duration = 1700,
}: {
  children: React.ReactNode;
  delay?: number;
  amplitude?: number;
  duration?: number;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const half = duration / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ])
    );
    const id = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(id);
      loop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amplitude] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const fx = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(10, 8, 16, 0.78)',
    zIndex: 50,
  },
  float: {
    fontFamily: fonts.heading,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  slam: {
    fontFamily: fonts.heading,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  slamSub: {
    fontFamily: fonts.bodyBold,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: -4,
    paddingHorizontal: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  combo: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  comboText: {
    fontFamily: fonts.heading,
    color: '#1a1426',
  },
  // sobre o relógio, para nunca esconder os botões dos cartões
  banner: {
    position: 'absolute',
    top: 4,
    left: 20,
    right: 20,
    zIndex: 30,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    elevation: 12,
  },
  bannerText: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: '#1a1426',
  },
  countStep: {
    fontFamily: fonts.heading,
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 18,
  },
});

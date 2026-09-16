import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { haptic } from './haptics';
import { SoundName, useSfx } from './sfx';
import { Theme, useTheme } from './theme';

const NATIVE = Platform.OS !== 'web';

// Alert.alert não existe na web; usa window.confirm quando rodando no navegador
export function confirmDialog(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string,
  onConfirm: () => void
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

type Variant = 'primary' | 'ghost' | 'danger';

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
  sound?: SoundName | null; // som ao tocar (padrão: "bloop"); null = mudo
};

// bolinhas espalhadas pela borda do cartão (um pouco para dentro, para não cortar)
type DotSpot = {
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
};

const DOT_SPOTS: DotSpot[] = [
  { left: '12%', top: 6 },
  { left: '36%', top: 6 },
  { left: '62%', top: 6 },
  { left: '86%', top: 6 },
  { left: '8%', bottom: 6 },
  { left: '32%', bottom: 6 },
  { left: '58%', bottom: 6 },
  { left: '84%', bottom: 6 },
  { left: 6, top: '32%' },
  { left: 6, top: '68%' },
  { right: 6, top: '24%' },
  { right: 6, top: '60%' },
];

function PulseDot({ color, spot }: { color: string; spot: DotSpot }) {
  const scale = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    // ciclo completo (crescer + encolher) sorteado entre 2 e 4 segundos
    const cycle = 2000 + Math.random() * 2000;
    const delay = Math.random() * 1500;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, { toValue: 1, duration: cycle / 2, useNativeDriver: NATIVE }),
        Animated.timing(scale, { toValue: 0.35, duration: cycle / 2, useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[fx.dot, spot as ViewStyle, { backgroundColor: color, transform: [{ scale }] }]}
    />
  );
}

// camada de bolinhas pulsantes para a borda dos cartões dos jogadores
export function BorderDots({ color }: { color: string }) {
  return (
    <View style={fx.dotLayer} pointerEvents="none">
      {DOT_SPOTS.map((spot, i) => (
        <PulseDot key={i} color={color} spot={spot} />
      ))}
    </View>
  );
}

export function Btn({ label, onPress, variant = 'primary', style, sound = 'click' }: BtnProps) {
  const t = useTheme();
  const s = useMemo(() => makeBtnStyles(t), [t]);
  const sfx = useSfx();
  const scale = useRef(new Animated.Value(1)).current;
  const glossy = variant === 'primary' && t.isDark; // degradê + brilho só no escuro

  // o botão "afunda" ao encostar e volta com mola ao soltar
  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.94, friction: 6, tension: 320, useNativeDriver: NATIVE }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3.5, tension: 220, useNativeDriver: NATIVE }).start();
  };
  const press = () => {
    if (sound) sfx.play(sound, 0.8);
    haptic.selection();
    onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={press}
        style={[
          s.base,
          variant === 'primary' && s.primary,
          variant === 'ghost' && s.ghost,
          variant === 'danger' && s.danger,
        ]}
      >
        {glossy && (
          <LinearGradient
            colors={['#ffc961', t.accent, '#ff8a2a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {glossy && <View style={s.innerStroke} />}
        <Text
          style={[
            s.label,
            variant === 'primary' && { color: t.accentText },
            variant === 'ghost' && { color: t.text },
            variant === 'danger' && { color: t.danger },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const makeBtnStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    primary: {
      backgroundColor: t.accent,
      shadowColor: t.accent,
      shadowOpacity: t.isDark ? 0.45 : 0.3,
      shadowRadius: t.isDark ? 14 : 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    ghost: {
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    danger: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.danger,
    },
    innerStroke: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      margin: 3,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.45)',
      pointerEvents: 'none',
    },
    // fonte original dos botões (sistema, em negrito), a pedido do usuário
    label: {
      fontSize: 17,
      fontWeight: '700',
    },
  });

// geometria fixa das bolinhas (cor vem por prop)
const fx = StyleSheet.create({
  dotLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dot: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: -1,
    marginTop: -1,
  },
});

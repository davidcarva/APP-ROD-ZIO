import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
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
import { colors } from './theme';

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
      style={[
        styles.dot,
        spot as ViewStyle,
        { backgroundColor: color, transform: [{ scale }] },
      ]}
    />
  );
}

// camada de bolinhas pulsantes para a borda dos cartões dos jogadores
export function BorderDots({ color }: { color: string }) {
  return (
    <View style={styles.dotLayer} pointerEvents="none">
      {DOT_SPOTS.map((spot, i) => (
        <PulseDot key={i} color={color} spot={spot} />
      ))}
    </View>
  );
}

export function Btn({ label, onPress, variant = 'primary', style }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.dangerBtn,
        variant === 'primary' && styles.primaryShadow,
        pressed && styles.pressed,
        style,
      ]}
    >
      {variant === 'primary' && (
        <LinearGradient
          colors={['#ffc961', colors.accent, '#ff8a2a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* filete de brilho interno acompanhando a borda */}
      <View
        style={[
          styles.innerStroke,
          {
            borderColor:
              variant === 'primary' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.08)',
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          variant === 'primary' && { color: colors.accentText },
          variant === 'ghost' && { color: colors.text },
          variant === 'danger' && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryShadow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  ghost: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dangerBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
    pointerEvents: 'none',
  },
  // fonte original dos botões (sistema, em negrito), a pedido do usuário
  label: {
    fontSize: 17,
    fontWeight: '700',
  },
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

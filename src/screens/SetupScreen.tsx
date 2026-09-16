import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Appear, usePunch } from '../fx';
import { haptic } from '../haptics';
import { useSfx } from '../sfx';
import { fonts, Theme, useTheme } from '../theme';
import { FOOD_TYPES, FoodType, MatchConfig } from '../types';
import { Btn } from '../ui';

type Props = {
  onBack: () => void;
  onStart: (config: MatchConfig) => void;
};

type Styles = ReturnType<typeof makeStyles>;

const DURATIONS: { label: string; min: number | null }[] = [
  { label: 'Livre', min: null },
  { label: '30 min', min: 30 },
  { label: '1h', min: 60 },
  { label: '1h30', min: 90 },
  { label: '2h', min: 120 },
];

const MAX_PLAYERS = 4;

// chip que pula ao ser escolhido, com tique e vibração de seleção
function Chip({
  active,
  emoji,
  label,
  onPress,
  styles,
}: {
  active: boolean;
  emoji?: string;
  label: string;
  onPress: () => void;
  styles: Styles;
}) {
  const sfx = useSfx();
  const [scale, punch] = usePunch();

  const press = () => {
    sfx.play('tick', 0.7);
    haptic.selection();
    punch(active ? 0.9 : 1.14);
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={press} style={[styles.chip, active && styles.chipActive]}>
        {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function SetupScreen({ onBack, onStart }: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const sfx = useSfx();
  const [food, setFood] = useState<FoodType>(FOOD_TYPES[0]);
  const [customFood, setCustomFood] = useState('');
  // id estável por pessoa: só a linha nova anima ao adicionar
  const [players, setPlayers] = useState([
    { id: 0, name: '' },
    { id: 1, name: '' },
  ]);
  const nextPlayerId = useRef(2);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [blind, setBlind] = useState(false);

  const setName = (id: number, value: string) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: value } : p)));
  };

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;
    sfx.play('click', 0.8);
    haptic.tap();
    setPlayers((prev) => [...prev, { id: nextPlayerId.current++, name: '' }]);
  };

  const removePlayer = (id: number) => {
    if (players.length <= 1) return;
    sfx.play('undo', 0.7);
    haptic.soft();
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const start = () => {
    const playerNames = players.map((p, i) => p.name.trim() || `Jogador ${i + 1}`);
    const chosenFood =
      food.id === 'outro' && customFood.trim()
        ? { ...food, name: customFood.trim() }
        : food;
    onStart({ food: chosenFood, playerNames, durationMin, blind });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Appear>
          <Text style={styles.heading}>Novo rodízio</Text>
        </Appear>

        <Text style={styles.label}>Qual é o rodízio?</Text>
        <View style={styles.chipRow}>
          {FOOD_TYPES.map((f) => (
            <Chip
              key={f.id}
              active={food.id === f.id}
              emoji={f.emoji}
              label={f.name}
              onPress={() => setFood(f)}
              styles={styles}
            />
          ))}
        </View>
        {food.id === 'outro' && (
          <Appear>
            <TextInput
              style={styles.input}
              placeholder="Nome do rodízio (ex.: Pastel)"
              placeholderTextColor={t.sub}
              value={customFood}
              onChangeText={setCustomFood}
            />
          </Appear>
        )}

        <Text style={styles.label}>
          Quem vai competir? ({players.length}/{MAX_PLAYERS})
        </Text>
        <View>
          {players.map((p, i) => (
            <Appear key={p.id} style={styles.playerRow}>
              <TextInput
                style={[styles.input, styles.playerInput]}
                placeholder={`Jogador ${i + 1}`}
                placeholderTextColor={t.sub}
                value={p.name}
                onChangeText={(v) => setName(p.id, v)}
                maxLength={20}
              />
              {players.length > 1 && (
                <Pressable onPress={() => removePlayer(p.id)} style={styles.removeBtn} hitSlop={8}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              )}
            </Appear>
          ))}
        </View>
        {players.length < MAX_PLAYERS && (
          <Pressable onPress={addPlayer} style={styles.addBtn}>
            <Text style={styles.addText}>+ Adicionar pessoa</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Modo de jogo</Text>
        <View style={styles.chipRow}>
          <Chip
            active={!blind}
            emoji="👀"
            label="Placar visível"
            onPress={() => setBlind(false)}
            styles={styles}
          />
          <Chip
            active={blind}
            emoji="🙈"
            label="Cegueira"
            onPress={() => setBlind(true)}
            styles={styles}
          />
        </View>
        {blind && (
          <Appear>
            <Text style={styles.hint}>
              No modo Cegueira ninguém vê o placar durante o rodízio — cada um só marca as suas
              peças. Quem comeu mais? Só descobre no resultado final. 😈
            </Text>
          </Appear>
        )}

        <Text style={styles.label}>Tempo da disputa</Text>
        <View style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <Chip
              key={d.label}
              active={durationMin === d.min}
              label={d.label}
              onPress={() => setDurationMin(d.min)}
              styles={styles}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          No modo Livre, vocês encerram quando quiserem. Com tempo definido, o rodízio termina
          sozinho quando o relógio zerar.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Btn label="Voltar" variant="ghost" onPress={onBack} style={{ flex: 1 }} />
        <Btn label="Valendo! 🔥" sound="whoosh" onPress={start} style={{ flex: 2 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      padding: 24,
      paddingBottom: 12,
    },
    heading: {
      fontSize: 32,
      fontFamily: fonts.heading,
      color: t.text,
      marginBottom: 8,
    },
    label: {
      fontSize: 16,
      fontFamily: fonts.bodyBold,
      color: t.sub,
      marginTop: 24,
      marginBottom: 10,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    chipActive: {
      backgroundColor: t.accent,
      borderColor: t.accent,
    },
    chipEmoji: {
      fontSize: 18,
    },
    chipText: {
      fontSize: 15,
      fontFamily: fonts.bodyBold,
      color: t.text,
    },
    chipTextActive: {
      color: t.accentText,
    },
    input: {
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: fonts.bodySemi,
      color: t.text,
      marginTop: 10,
    },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    playerInput: {
      flex: 1,
    },
    removeBtn: {
      marginTop: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeText: {
      color: t.danger,
      fontSize: 16,
      fontFamily: fonts.bodyBold,
    },
    addBtn: {
      marginTop: 12,
      alignSelf: 'flex-start',
    },
    addText: {
      color: t.accent,
      fontSize: 16,
      fontFamily: fonts.bodyBold,
    },
    hint: {
      marginTop: 12,
      fontSize: 13,
      fontFamily: fonts.body,
      color: t.sub,
      lineHeight: 19,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      padding: 24,
      paddingTop: 12,
    },
  });

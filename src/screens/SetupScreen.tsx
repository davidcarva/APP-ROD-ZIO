import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts } from '../theme';
import { FOOD_TYPES, FoodType, MatchConfig } from '../types';
import { Btn } from '../ui';

type Props = {
  onBack: () => void;
  onStart: (config: MatchConfig) => void;
};

const DURATIONS: { label: string; min: number | null }[] = [
  { label: 'Livre', min: null },
  { label: '30 min', min: 30 },
  { label: '1h', min: 60 },
  { label: '1h30', min: 90 },
  { label: '2h', min: 120 },
];

const MAX_PLAYERS = 4;

export function SetupScreen({ onBack, onStart }: Props) {
  const [food, setFood] = useState<FoodType>(FOOD_TYPES[0]);
  const [customFood, setCustomFood] = useState('');
  const [names, setNames] = useState<string[]>(['', '']);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  const setName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const addPlayer = () => {
    if (names.length < MAX_PLAYERS) setNames((prev) => [...prev, '']);
  };

  const removePlayer = (index: number) => {
    if (names.length > 1) setNames((prev) => prev.filter((_, i) => i !== index));
  };

  const start = () => {
    const playerNames = names.map((n, i) => n.trim() || `Jogador ${i + 1}`);
    const chosenFood =
      food.id === 'outro' && customFood.trim()
        ? { ...food, name: customFood.trim() }
        : food;
    onStart({ food: chosenFood, playerNames, durationMin });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Novo rodízio</Text>

        <Text style={styles.label}>Qual é o rodízio?</Text>
        <View style={styles.chipRow}>
          {FOOD_TYPES.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFood(f)}
              style={[styles.chip, food.id === f.id && styles.chipActive]}
            >
              <Text style={styles.chipEmoji}>{f.emoji}</Text>
              <Text style={[styles.chipText, food.id === f.id && styles.chipTextActive]}>
                {f.name}
              </Text>
            </Pressable>
          ))}
        </View>
        {food.id === 'outro' && (
          <TextInput
            style={styles.input}
            placeholder="Nome do rodízio (ex.: Pastel)"
            placeholderTextColor={colors.sub}
            value={customFood}
            onChangeText={setCustomFood}
          />
        )}

        <Text style={styles.label}>Quem vai competir? ({names.length}/{MAX_PLAYERS})</Text>
        <View style={styles.players}>
          {names.map((name, i) => (
            <View key={i} style={styles.playerRow}>
              <TextInput
                style={[styles.input, styles.playerInput]}
                placeholder={`Jogador ${i + 1}`}
                placeholderTextColor={colors.sub}
                value={name}
                onChangeText={(v) => setName(i, v)}
                maxLength={20}
              />
              {names.length > 1 && (
                <Pressable onPress={() => removePlayer(i)} style={styles.removeBtn} hitSlop={8}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
        {names.length < MAX_PLAYERS && (
          <Pressable onPress={addPlayer} style={styles.addBtn}>
            <Text style={styles.addText}>+ Adicionar pessoa</Text>
          </Pressable>
        )}

        <Text style={styles.label}>Tempo da disputa</Text>
        <View style={styles.chipRow}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d.label}
              onPress={() => setDurationMin(d.min)}
              style={[styles.chip, durationMin === d.min && styles.chipActive]}
            >
              <Text style={[styles.chipText, durationMin === d.min && styles.chipTextActive]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>
          No modo Livre, vocês encerram quando quiserem. Com tempo definido, o rodízio termina
          sozinho quando o relógio zerar.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Btn label="Voltar" variant="ghost" onPress={onBack} style={{ flex: 1 }} />
        <Btn label="Valendo! 🔥" onPress={start} style={{ flex: 2 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    color: colors.text,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.sub,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipText: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.accentText,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.bodySemi,
    color: colors.text,
    marginTop: 10,
  },
  players: {
    gap: 0,
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.danger,
    fontSize: 16,
    fontFamily: fonts.bodyBold,
  },
  addBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addText: {
    color: colors.accent,
    fontSize: 16,
    fontFamily: fonts.bodyBold,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.sub,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 12,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Btn } from '../ui';

type Props = {
  onStart: () => void;
  onHistory: () => void;
};

export function HomeScreen({ onStart, onHistory }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🍣🥩🍕</Text>
        <Text style={styles.title}>manda +1</Text>
        <Text style={styles.subtitle}>Quem aguenta mais peças esta noite?</Text>
      </View>
      <View style={styles.actions}>
        <Btn label="Começar rodízio" onPress={onStart} />
        <Btn label="Histórico" variant="ghost" onPress={onHistory} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 56,
  },
  title: {
    fontSize: 52,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: fonts.body,
    color: colors.sub,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
});

import {
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import {
  SofiaSans_700Bold,
  SofiaSans_800ExtraBold,
} from '@expo-google-fonts/sofia-sans';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { saveMatch } from './src/storage';
import { colors } from './src/theme';
import { MatchConfig, MatchRecord } from './src/types';

type Screen = 'home' | 'setup' | 'match' | 'results' | 'history';

export default function App() {
  const [fontsLoaded] = useFonts({
    SofiaSans_700Bold,
    SofiaSans_800ExtraBold,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });
  const [screen, setScreen] = useState<Screen>('home');
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [lastRecord, setLastRecord] = useState<MatchRecord | null>(null);
  const [matchKey, setMatchKey] = useState(0);

  const startMatch = (newConfig: MatchConfig) => {
    setConfig(newConfig);
    setMatchKey((k) => k + 1);
    setScreen('match');
  };

  const finishMatch = (record: MatchRecord) => {
    setLastRecord(record);
    saveMatch(record); // salva em segundo plano; a tela de resultado não depende disso
    setScreen('results');
  };

  const rematch = () => {
    setMatchKey((k) => k + 1);
    setScreen('match');
  };

  if (!fontsLoaded) {
    return <View style={styles.safe} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.app}>
          {screen === 'home' && (
            <HomeScreen
              onStart={() => setScreen('setup')}
              onHistory={() => setScreen('history')}
            />
          )}
          {screen === 'setup' && (
            <SetupScreen onBack={() => setScreen('home')} onStart={startMatch} />
          )}
          {screen === 'match' && config && (
            <MatchScreen
              key={matchKey}
              config={config}
              onFinish={finishMatch}
              onCancel={() => setScreen('home')}
            />
          )}
          {screen === 'results' && lastRecord && (
            <ResultsScreen
              record={lastRecord}
              onRematch={rematch}
              onNewMatch={() => setScreen('setup')}
              onHome={() => setScreen('home')}
            />
          )}
          {screen === 'history' && <HistoryScreen onBack={() => setScreen('home')} />}
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  app: {
    flex: 1,
  },
});

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
import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MatchScreen } from './src/screens/MatchScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { SfxProvider } from './src/sfx';
import {
  clearOngoingMatch,
  loadOngoingMatch,
  loadSoundPref,
  loadThemePref,
  saveMatch,
  saveSoundPref,
  saveThemePref,
} from './src/storage';
import { darkColors, lightColors, ThemeContext } from './src/theme';
import { confirmDialog } from './src/ui';
import { MatchConfig, MatchRecord, OngoingMatch } from './src/types';

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
  const [ongoing, setOngoing] = useState<OngoingMatch | null>(null);
  const [resume, setResume] = useState<{ counts: number[]; startedAt: number } | null>(null);
  const [themeName, setThemeName] = useState<'light' | 'dark'>('light');
  const [soundOn, setSoundOn] = useState(true);

  // ao abrir o app: partida interrompida e preferências salvas
  useEffect(() => {
    loadOngoingMatch().then(setOngoing);
    loadThemePref().then((pref) => {
      if (pref) setThemeName(pref);
    });
    loadSoundPref().then((pref) => {
      if (pref !== null) setSoundOn(pref);
    });
  }, []);

  const toggleTheme = () => {
    setThemeName((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      saveThemePref(next);
      return next;
    });
  };

  const toggleSound = () => {
    setSoundOn((prev) => {
      saveSoundPref(!prev);
      return !prev;
    });
  };

  // o tabuleiro da partida é sempre escuro (contraste máximo para tocar rápido);
  // as demais telas seguem o tema escolhido
  const shellTheme = themeName === 'light' ? lightColors : darkColors;
  const activeTheme = screen === 'match' ? darkColors : shellTheme;

  const startMatch = (newConfig: MatchConfig) => {
    setConfig(newConfig);
    setResume(null);
    setOngoing(null);
    setMatchKey((k) => k + 1);
    setScreen('match');
  };

  const resumeMatch = () => {
    if (!ongoing) return;
    setConfig(ongoing.config);
    setResume({ counts: ongoing.counts, startedAt: ongoing.startedAt });
    setOngoing(null);
    setMatchKey((k) => k + 1);
    setScreen('match');
  };

  const finishMatch = (record: MatchRecord) => {
    setLastRecord(record);
    saveMatch(record); // salva em segundo plano; a tela de resultado não depende disso
    clearOngoingMatch();
    setScreen('results');
  };

  const cancelMatch = () => {
    clearOngoingMatch();
    setScreen('home');
  };

  const rematch = () => {
    setResume(null);
    setMatchKey((k) => k + 1);
    setScreen('match');
  };

  // botão "voltar" do Android: navega entre telas em vez de fechar o app
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'setup' || screen === 'history' || screen === 'results') {
        setScreen('home');
        return true;
      }
      if (screen === 'match') {
        confirmDialog(
          'Abandonar rodízio?',
          'A partida atual será descartada sem salvar.',
          'Abandonar',
          'Voltar à partida',
          cancelMatch
        );
        return true;
      }
      return false; // na tela inicial, comportamento padrão (sair do app)
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  if (!fontsLoaded) {
    return <View style={[styles.safe, { backgroundColor: activeTheme.bg }]} />;
  }

  return (
    <ThemeContext.Provider value={activeTheme}>
      <SfxProvider enabled={soundOn}>
        <SafeAreaProvider>
          <SafeAreaView style={[styles.safe, { backgroundColor: activeTheme.bg }]}>
            <View style={styles.app}>
              {screen === 'home' && (
                <HomeScreen
                  ongoing={ongoing}
                  isDark={themeName === 'dark'}
                  onToggleTheme={toggleTheme}
                  onResume={resumeMatch}
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
                  initial={resume ?? undefined}
                  soundOn={soundOn}
                  onToggleSound={toggleSound}
                  onFinish={finishMatch}
                  onCancel={cancelMatch}
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
            <StatusBar style={activeTheme.isDark ? 'light' : 'dark'} />
          </SafeAreaView>
        </SafeAreaProvider>
      </SfxProvider>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  app: {
    flex: 1,
  },
});

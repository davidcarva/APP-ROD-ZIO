import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';

// Paleta sonora sintetizada (assets/sfx, gerada por script — sem áudio de terceiros).
const SOURCES = {
  tap1: require('../assets/sfx/tap1.wav'),
  tap2: require('../assets/sfx/tap2.wav'),
  tap3: require('../assets/sfx/tap3.wav'),
  tap4: require('../assets/sfx/tap4.wav'),
  tap5: require('../assets/sfx/tap5.wav'),
  milestone: require('../assets/sfx/milestone.wav'),
  levelup: require('../assets/sfx/levelup.wav'),
  combo: require('../assets/sfx/combo.wav'),
  lead: require('../assets/sfx/lead.wav'),
  click: require('../assets/sfx/click.wav'),
  tick: require('../assets/sfx/tick.wav'),
  undo: require('../assets/sfx/undo.wav'),
  drumroll: require('../assets/sfx/drumroll.wav'),
  reveal: require('../assets/sfx/reveal.wav'),
  whoosh: require('../assets/sfx/whoosh.wav'),
  fanfare: require('../assets/sfx/fanfare.wav'),
};

export type SoundName = keyof typeof SOURCES;

// notas que sobem rumo ao marco de 5 peças
export const TAP_NOTES: SoundName[] = ['tap1', 'tap2', 'tap3', 'tap4', 'tap5'];

const LONG_SOUNDS: SoundName[] = ['drumroll', 'reveal', 'fanfare', 'levelup'];

type Player = ReturnType<typeof useAudioPlayer>;

export type Sfx = {
  play: (name: SoundName, volume?: number) => void;
  stop: (name: SoundName) => void;
};

const SfxContext = createContext<Sfx>({ play: () => {}, stop: () => {} });
export const useSfx = () => useContext(SfxContext);

/** Carrega todos os sons uma única vez e disponibiliza para o app inteiro. */
export function SfxProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  // um player por som (ordem fixa de hooks); sons diferentes podem se sobrepor
  const players: Record<SoundName, Player> = {
    tap1: useAudioPlayer(SOURCES.tap1),
    tap2: useAudioPlayer(SOURCES.tap2),
    tap3: useAudioPlayer(SOURCES.tap3),
    tap4: useAudioPlayer(SOURCES.tap4),
    tap5: useAudioPlayer(SOURCES.tap5),
    milestone: useAudioPlayer(SOURCES.milestone),
    levelup: useAudioPlayer(SOURCES.levelup),
    combo: useAudioPlayer(SOURCES.combo),
    lead: useAudioPlayer(SOURCES.lead),
    click: useAudioPlayer(SOURCES.click),
    tick: useAudioPlayer(SOURCES.tick),
    undo: useAudioPlayer(SOURCES.undo),
    drumroll: useAudioPlayer(SOURCES.drumroll),
    reveal: useAudioPlayer(SOURCES.reveal),
    whoosh: useAudioPlayer(SOURCES.whoosh),
    fanfare: useAudioPlayer(SOURCES.fanfare),
  };
  const playersRef = useRef(players);
  playersRef.current = players;
  // lido na hora de tocar: sequências agendadas respeitam o mudo ligado depois
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (enabled) return;
    for (const name of LONG_SOUNDS) {
      try {
        playersRef.current[name].pause();
      } catch {
        // player ainda carregando
      }
    }
  }, [enabled]);

  const value = useMemo<Sfx>(
    () => ({
      play: (name, volume = 1) => {
        if (!enabledRef.current) return;
        const player = playersRef.current[name];
        try {
          player.volume = volume;
          const seek = player.seekTo(0) as unknown as Promise<void> | undefined;
          seek?.catch?.(() => {});
          player.play();
        } catch {
          // som é enfeite: falha de áudio nunca interrompe o jogo
        }
      },
      stop: (name) => {
        try {
          playersRef.current[name].pause();
        } catch {
          // idem
        }
      },
    }),
    []
  );

  return React.createElement(SfxContext.Provider, { value }, children);
}

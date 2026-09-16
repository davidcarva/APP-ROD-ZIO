import { createContext, useContext } from 'react';

// Sofia Sans (equivalente gratuita da Sofia Pro) para títulos, botões e números;
// Quicksand (caligrafia arredondada, bem diferente) para os demais textos
export const fonts = {
  heading: 'SofiaSans_800ExtraBold',
  headingBold: 'SofiaSans_700Bold',
  body: 'Quicksand_500Medium',
  bodySemi: 'Quicksand_600SemiBold',
  bodyBold: 'Quicksand_700Bold',
};

export type Theme = {
  isDark: boolean;
  bg: string;
  bgAlt: string; // painel de destaque (hero)
  card: string;
  cardBorder: string;
  text: string;
  sub: string;
  accent: string;
  accentText: string; // cor do texto sobre o accent
  danger: string;
  players: string[]; // cores por jogador (usadas só no tabuleiro escuro)
};

export const darkColors: Theme = {
  isDark: true,
  bg: '#131019',
  bgAlt: '#1b1526',
  card: '#1f1a2b',
  cardBorder: '#332b47',
  text: '#f7f4ff',
  sub: '#a89fc7',
  accent: '#ffb020',
  accentText: '#2b1d00',
  danger: '#ff5470',
  players: ['#ff5470', '#3ec1d3', '#ffb020', '#8c6ef2'],
};

// Tema claro inspirado na estética "warm light": creme, cartões brancos, laranja terracota
export const lightColors: Theme = {
  isDark: false,
  bg: '#F1E7D6',
  bgAlt: '#F5DFD7',
  card: '#FFFFFF',
  cardBorder: '#ECE2D3',
  text: '#28241F',
  sub: '#8C857B',
  accent: '#E37E3C',
  accentText: '#FFFFFF',
  danger: '#E5544B',
  players: ['#ff5470', '#3ec1d3', '#ffb020', '#8c6ef2'],
};

// compat: as telas do "tabuleiro" (partida) continuam sempre no escuro
export const colors = darkColors;

export const ThemeContext = createContext<Theme>(darkColors);
export const useTheme = () => useContext(ThemeContext);

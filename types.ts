
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  background: string;
  cardBg: string;
}

export type GameType = 'adventure' | 'investigation' | 'custom';

export interface Attraction {
  name: string;
  gameType?: GameType;
}

export interface Area {
  name: string;
  attractions: Attraction[];
  themeColors?: ThemeColors;
}

export interface Park {
  id: string;
  name: string;
  areas: Area[];
}

// Types pour le jeu d'enquête
export interface InvestigationMessage {
    id: number;
    sender: 'system' | 'contact' | 'player';
    contactName?: string; // e.g., "Arthur Weasley"
    text: string;
    choices?: string[];
}

export interface InvestigationEvidence {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
}

export interface InvestigationLocation {
    id: string;
    name: string;
    description: string;
    isUnlocked: boolean;
}

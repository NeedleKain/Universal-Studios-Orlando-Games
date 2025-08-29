import React, { useState, useMemo } from 'react';
import type { ThemeColors } from '../types';
import { useDynamicTheme } from '../hooks/useDynamicTheme';
import { InvestigationGame } from './investigation/InvestigationGame';

interface MinistryOfMagicGameProps {
  onBack: () => void;
}

const MINISTRY_THEME: ThemeColors = {
  primary: '#4b5563', // gray-600
  secondary: '#166534', // green-800
  accent: '#22c55e', // green-500
  textPrimary: '#e5e7eb', // gray-200
  textSecondary: '#9ca3af', // gray-400
  background: '#111827', // gray-900
  cardBg: '#1f2937', // gray-800
};

export interface InvestigationCase {
  id: string;
  title: string;
  description: string;
  systemInstruction: string;
  startPrompt: string;
}

const BASE_SYSTEM_INSTRUCTION = `You are a Game Master for a text-based investigation game set in the Harry Potter universe. The player is an 'Unspeakable', a secret agent for the Department of Mysteries. Your tone should be mysterious, magical, and suspenseful. The entire game is in FRENCH. You need to manage the game state and respond to player actions. Your response MUST be a JSON object following the provided schema. Player actions can be: replying to a memo, traveling to a new location, or searching the archives. Based on the player's action, you will generate new memos, unlock evidence, or reveal new locations.`;

const CASES: Omit<InvestigationCase, 'systemInstruction'>[] = [
  {
    id: "prophecy",
    title: "L'affaire de la Prophétie Volée",
    description: "Une précieuse prophétie a disparu de la Salle des Prophéties. Le Ministère craint qu'elle ne tombe entre de mauvaises mains.",
    startPrompt: "Débuter l'enquête sur la prophétie volée.",
  },
  {
    id: "brain",
    title: "Le Mystère du Cerveau Ensorcelé",
    description: "Un des cerveaux de la Salle des Cerveaux agit de manière agressive, projetant des pensées dangereuses.",
    startPrompt: "Enquêter sur l'incident de la Salle des Cerveaux.",
  },
  {
    id: "time-turner",
    title: "Le Sabotage des Retourneurs de Temps",
    description: "Quelqu'un a altéré la collection de Retourneurs de Temps, créant de petites bulles temporelles instables.",
    startPrompt: "Commencer l'investigation sur le sabotage des Retourneurs de Temps.",
  },
];

const createGameSetup = (): InvestigationCase => {
    const caseTemplate = CASES[Math.floor(Math.random() * CASES.length)];
    const systemInstruction = `${BASE_SYSTEM_INSTRUCTION} The current case is "${caseTemplate.title}". The player must investigate discreetly to find the culprit and solve the mystery. The game begins as the player, an Unspeakable, receives their assignment.`;
    return { ...caseTemplate, systemInstruction };
};

export const MinistryOfMagicGame: React.FC<MinistryOfMagicGameProps> = ({ onBack }) => {
  useDynamicTheme(MINISTRY_THEME);
  const [caseSetup] = useState(createGameSetup);

  return (
    <InvestigationGame
      key={caseSetup.id} // Ensure the component re-mounts for a new game
      onBack={onBack}
      gameCase={caseSetup}
      theme={MINISTRY_THEME}
    />
  );
};

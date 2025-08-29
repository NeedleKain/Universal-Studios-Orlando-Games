import React, { useState } from 'react';
import { AdventureGame } from './AdventureGame';
import type { ThemeColors } from '../types';

interface HagridMagicalCreatureGameProps {
  onBack: () => void;
}

const HAGRID_THEME: ThemeColors = {
  primary: '#5d4037',     // Dark Brown (Wood)
  secondary: '#f57c00',   // Orange (Lantern light)
  accent: '#8d6e63',      // Lighter Brown
  textPrimary: '#efebe9', // Off-white
  textSecondary: '#bcaaa4',// Light Brown
  background: '#2d1e1a',  // Very dark, earthy brown
  cardBg: '#4e342e',      // Rich brown for cards
};

const CREATURES = ['Hippogriffe', 'Niffleur', 'Scroutt à Pétard', 'Botruc', 'Sombral'];

const createGameSetup = () => {
  const creatureName = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  const systemInstruction = `Tu es Rubeus Hagrid, le Gardien des Clés et des Lieux à Poudlard. Tu animes un cours sur les Soins aux Créatures Magiques. Tu es amical, un peu maladroit, et tu adores toutes les créatures, même les plus dangereuses. Tu vas présenter une créature spécifique au joueur : un ${creatureName}. Ton objectif est de décrire la créature et de guider le joueur à travers 2 ou 3 interactions pour l'étudier. Conclus la leçon après ces interactions. Le ton doit être émerveillé et éducatif. Fournis une 'sceneDescription' et des 'choices' en FRANÇAIS. Le champ 'imagePrompt' doit être une invite détaillée en ANGLAIS. Indique si c'est une fin de leçon ('isGameOver').`;
  const startPrompt = `Bonjour ! Bienvenue à mon cours. Aujourd'hui, on va étudier une créature fascinante : un ${creatureName} ! Approchez, n'ayez pas peur !`;

  return { systemInstruction, startPrompt };
};

export const HagridMagicalCreatureGame: React.FC<HagridMagicalCreatureGameProps> = ({ onBack }) => {
  const [gameSetup] = useState(createGameSetup);

  return (
    <AdventureGame
      onBack={onBack}
      gameTitle="Le Paddock des Créatures"
      attractionName="Hagrid’s Magical Creatures Motorbike Adventure™"
      theme={HAGRID_THEME}
      systemInstruction={gameSetup.systemInstruction}
      startPrompt={gameSetup.startPrompt}
      readyScreen={{
        title: "Leçon de Soins aux Créatures Magiques",
        description: `Hagrid vous fait signe de le rejoindre près d'un enclos à la lisière de la Forêt Interdite. Une créature mystérieuse vous y attend. Prêt pour votre leçon ?`,
        buttonText: "COMMENCER LA LEÇON"
      }}
      backButtonText="Retourner au château"
      loadingText="Hagrid prépare la créature..."
    />
  );
};

import React from 'react';
import { AdventureGame } from './AdventureGame';
import type { ThemeColors } from '../types';

interface MummyAdventureGameProps {
  onBack: () => void;
}

const MUMMY_THEME: ThemeColors = {
  primary: '#a1887f',     // Dark sandy color
  secondary: '#fbc02d',   // Gold/yellow
  accent: '#4dd0e1',      // Turquoise
  textPrimary: '#f5f5f5', // Off-white
  textSecondary: '#d7ccc8',// Lighter sandy color
  background: '#212121',  // Very dark brown/black
  cardBg: '#37322f',      // Dark tomb-wall color
};

const systemInstruction = `Tu es un maître conteur créant un jeu d'aventure textuel en FRANÇAIS basé sur le film d'action-aventure "La Momie" (1999). Le joueur est un aventurier comme Rick O'Connell. Le ton doit être palpitant, mystérieux et parfois humoristique. À chaque tour, fournis une 'sceneDescription' et des 'choices' en FRANÇAIS. Le champ 'imagePrompt' doit être une invite détaillée en ANGLAIS pour un modèle de génération d'images. Indique également si c'est un état de fin de partie ('isGameOver'). Le jeu doit commencer à l'entrée d'un tombeau fraîchement découvert à Hamunaptra.`;

export const MummyAdventureGame: React.FC<MummyAdventureGameProps> = ({ onBack }) => {
  return (
    <AdventureGame
      onBack={onBack}
      gameTitle="La Malédiction de la Momie"
      attractionName="Revenge of the Mummy"
      theme={MUMMY_THEME}
      systemInstruction={systemInstruction}
      startPrompt="Entrons dans le tombeau."
      readyScreen={{
        title: "La Malédiction de la Momie",
        description: "Vous avez trouvé la cité perdue d'Hamunaptra. Richesses et gloire vous attendent, mais d'anciens maux y sommeillent. Oserez-vous entrer ?",
        buttonText: "COMMENCER L'AVENTURE"
      }}
      backButtonText="Fuir le tombeau"
    />
  );
};


import React from 'react';
import type { Attraction } from '../types';
import { BackButton } from './BackButton';

interface GamePlaceholderProps {
  attraction: Attraction;
  onBack: () => void;
}

export const GamePlaceholder: React.FC<GamePlaceholderProps> = ({ attraction, onBack }) => {
  return (
    <div className="text-center p-8 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border border-[--color-accent]">
      <h2 className="text-4xl font-bold text-[--color-secondary] mb-4">
        Prêt à jouer !
      </h2>
      <p className="text-2xl text-[--color-text-primary] mb-2">
        Jeu pour:
      </p>
      <p className="text-3xl font-semibold text-[--color-text-secondary] mb-8">
        {attraction.name}
      </p>
      <div className="bg-[--color-background] p-6 rounded-md">
        <p className="text-lg text-[--color-text-primary]">
          Le jeu pour cette attraction est en cours de développement. Revenez bientôt !
        </p>
      </div>
      <BackButton onClick={onBack} text="Choisir une autre attraction" />
    </div>
  );
};

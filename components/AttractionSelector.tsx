
import React from 'react';
import type { Area, Attraction } from '../types';
import { BackButton } from './BackButton';
import { Card } from './Card';

interface AttractionSelectorProps {
  area: Area;
  onSelect: (attraction: Attraction) => void;
  onBack: () => void;
}

export const AttractionSelector: React.FC<AttractionSelectorProps> = ({ area, onSelect, onBack }) => {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-[--color-text-secondary] mb-2">
        {area.name}
      </h2>
      <p className="text-xl text-[--color-text-primary] mb-8">
        Choisissez une attraction pour jouer
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {area.attractions.map((attraction) => (
           <Card 
            key={attraction.name}
            title={attraction.name}
            onClick={() => onSelect(attraction)}
          />
        ))}
      </div>
      <BackButton onClick={onBack} text="Retour aux zones" />
    </div>
  );
};

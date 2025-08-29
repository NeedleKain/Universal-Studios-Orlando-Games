
import React from 'react';
import type { Park } from '../types';
import { PARKS_DATA } from '../constants';
import { Card } from './Card';

interface ParkSelectorProps {
  onSelect: (park: Park) => void;
}

export const ParkSelector: React.FC<ParkSelectorProps> = ({ onSelect }) => {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-[--color-text-secondary] mb-8">
        Choisissez votre parc
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PARKS_DATA.map((park) => (
          <Card 
            key={park.id}
            title={park.name}
            onClick={() => onSelect(park)}
          />
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import type { Park, Area } from '../types';
import { BackButton } from './BackButton';
import { Card } from './Card';

interface AreaSelectorProps {
  park: Park;
  onSelect: (area: Area) => void;
  onBack: () => void;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({ park, onSelect, onBack }) => {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-[--color-text-secondary] mb-2">
        {park.name}
      </h2>
      <p className="text-xl text-[--color-text-primary] mb-8">
        Choisissez une zone
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {park.areas.map((area) => {
          const customStyle = area.themeColors ? {
            '--card-bg-override': area.themeColors.primary,
            '--card-text-override': area.themeColors.textPrimary,
            '--card-border-hover-override': area.themeColors.accent,
            '--card-text-hover-override': area.themeColors.textPrimary,
            '--card-accent-override': area.themeColors.accent,
          } as React.CSSProperties : {};

          return (
            <Card 
              key={area.name}
              title={area.name}
              onClick={() => onSelect(area)}
              style={customStyle}
            />
          );
        })}
      </div>
      <BackButton onClick={onBack} text="Retour aux parcs" />
    </div>
  );
};

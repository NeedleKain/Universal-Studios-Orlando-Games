import React from 'react';
import type { InvestigationLocation } from '../../types';

interface MapViewProps {
  locations: InvestigationLocation[];
  onTravel: (locationId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({ locations, onTravel }) => {
    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Carte du Ministère</h3>
            <div className="space-y-3">
                {locations.map(loc => (
                    <div key={loc.id} className={`p-4 rounded-lg transition-all duration-300 ${loc.isUnlocked ? 'bg-gray-700' : 'bg-gray-800 opacity-60'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-lg">{loc.name}</h4>
                                <p className="text-sm text-gray-400">{loc.description}</p>
                            </div>
                            {loc.isUnlocked && (
                                <button onClick={() => onTravel(loc.id)} className="px-4 py-2 bg-[--color-accent] text-black font-bold rounded hover:brightness-110 transition-transform hover:scale-105">
                                    S'y rendre
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

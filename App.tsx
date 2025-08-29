import React, { useState } from 'react';
import type { Park, Area, Attraction } from './types';
import { Header } from './components/Header';
import { ParkSelector } from './components/ParkSelector';
import { AreaSelector } from './components/AreaSelector';
import { AttractionSelector } from './components/AttractionSelector';
import { GamePlaceholder } from './components/GamePlaceholder';
import { MarioKartPitStopGame } from './components/MarioKartPitStopGame';
import { MummyAdventureGame } from './components/MummyAdventureGame';
import { MinistryOfMagicGame } from './components/MinistryOfMagicGame';
import { JurassicParkPowerGame } from './components/JurassicParkPowerGame';
import { YoshiFruitFeastGame } from './components/YoshiFruitFeastGame';
import { HagridMagicalCreatureGame } from './components/HagridMagicalCreatureGame';
import { StarlightCatcherGame } from './components/StarlightCatcherGame';
import { FastFuriousTakedownGame } from './components/FastFuriousTakedownGame';
import { MIBCheckpointGame } from './components/MIBCheckpointGame';

const App: React.FC = () => {
    const [selectedPark, setSelectedPark] = useState<Park | null>(null);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);

    const handleParkSelect = (park: Park) => {
        setSelectedPark(park);
    };

    const handleAreaSelect = (area: Area) => {
        setSelectedArea(area);
    };

    const handleAttractionSelect = (attraction: Attraction) => {
        setSelectedAttraction(attraction);
    };

    const resetToParks = () => {
        setSelectedPark(null);
        setSelectedArea(null);
        setSelectedAttraction(null);
    };

    const resetToAreas = () => {
        setSelectedArea(null);
        setSelectedAttraction(null);
    };

    const resetToAttractions = () => {
        setSelectedAttraction(null);
    };

    const renderContent = () => {
        if (selectedAttraction) {
            // New logic for investigation game
            if (selectedAttraction.gameType === 'investigation') {
                 return <MinistryOfMagicGame onBack={resetToAttractions} />;
            }

            // Existing game logic
            if (selectedAttraction.name === 'Mario Kart™: Bowser’s Challenge') {
                return <MarioKartPitStopGame onBack={resetToAttractions} />;
            }
            if (selectedAttraction.name === 'Revenge of the Mummy') {
                return <MummyAdventureGame onBack={resetToAttractions} />;
            }
            if (selectedAttraction.name === 'Jurassic Park River Adventure') {
                return <JurassicParkPowerGame onBack={resetToAttractions} />;
            }
            if (selectedAttraction.name === "Yoshi's Adventure") {
                return <YoshiFruitFeastGame onBack={resetToAttractions} />;
            }
            if (selectedAttraction.name === "Hagrid’s Magical Creatures Motorbike Adventure™") {
                return <HagridMagicalCreatureGame onBack={resetToAttractions} />;
            }
            if (selectedAttraction.name === 'Stardust Racers') {
                return <StarlightCatcherGame onBack={resetToAttractions} />;
            }
            if (selectedAttraction.name === 'Fast & Furious – Supercharged') {
                return <FastFuriousTakedownGame onBack={resetToAttractions} />;
            }
            if (selectedAttraction.name === 'MEN IN BLACK™ Alien Attack™') {
                return <MIBCheckpointGame onBack={resetToAttractions} />;
            }
            return <GamePlaceholder attraction={selectedAttraction} onBack={resetToAttractions} />;
        }
        if (selectedArea) {
            return <AttractionSelector area={selectedArea} onSelect={handleAttractionSelect} onBack={resetToAreas} />;
        }
        if (selectedPark) {
            return <AreaSelector park={selectedPark} onSelect={handleAreaSelect} onBack={resetToParks} />;
        }
        return <ParkSelector onSelect={handleParkSelect} />;
    };

    return (
        <div className="relative min-h-screen text-[--color-text-primary] p-4 md:p-8">
            <div className="container mx-auto max-w-6xl">
                <Header />
                <main className="mt-8">
                    {renderContent()}
                </main>
                 <footer className="text-center mt-12 py-4 text-sm text-[--color-text-secondary] opacity-60">
                    <p>Universal elements and all related indicia TM & © 2024 Universal Studios. All rights reserved.</p>
                    <p>Ce site est un projet de fan non officiel et n'est pas affilié à Universal Parks & Resorts.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;
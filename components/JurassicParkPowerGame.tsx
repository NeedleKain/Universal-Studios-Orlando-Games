import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from './BackButton';
import { Spinner } from './Spinner';
import type { ThemeColors } from '../types';
import { useDynamicTheme } from '../hooks/useDynamicTheme';

interface JurassicParkPowerGameProps {
  onBack: () => void;
}

const JP_THEME: ThemeColors = {
  primary: '#eab308',   // yellow-500 (Warning)
  secondary: '#dc2626', // red-600 (Danger)
  accent: '#a1a1aa',    // zinc-400 (Metal)
  textPrimary: '#f4f4f5', // zinc-100
  textSecondary: '#d4d4d8',// zinc-300
  background: '#18181b',  // zinc-900 (Dark background)
  cardBg: '#27272a',      // zinc-800 (Panel background)
};

const LEVELS_CONFIG = [
    { sequenceLength: 3, memorizeTime: 3000, raptorSpeed: 0.8 },
    { sequenceLength: 4, memorizeTime: 3500, raptorSpeed: 1.0 },
    { sequenceLength: 5, memorizeTime: 4000, raptorSpeed: 1.3 },
];
const TOTAL_SWITCHES = 8;
const MISTAKE_PENALTY = 15; // Raptor proximity increase on mistake

type GameState = 'ready' | 'memorize' | 'playing' | 'lost' | 'won' | 'level_transition';

export const JurassicParkPowerGame: React.FC<JurassicParkPowerGameProps> = ({ onBack }) => {
    useDynamicTheme(JP_THEME);
    const [gameState, setGameState] = useState<GameState>('ready');
    const [level, setLevel] = useState(0);
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerInput, setPlayerInput] = useState<number[]>([]);
    const [raptorProximity, setRaptorProximity] = useState(0);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [errorSwitch, setErrorSwitch] = useState<number | null>(null);

    const raptorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const memorizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const highlightIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const cleanupTimers = useCallback(() => {
        if (raptorIntervalRef.current) clearInterval(raptorIntervalRef.current);
        if (memorizeTimeoutRef.current) clearTimeout(memorizeTimeoutRef.current);
        if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
    }, []);

    useEffect(() => {
      if (raptorProximity >= 100 && gameState === 'playing') {
          setGameState('lost');
          cleanupTimers();
      }
    }, [raptorProximity, gameState, cleanupTimers]);

    useEffect(() => {
        return cleanupTimers;
    }, [cleanupTimers]);

    const generateSequence = useCallback(() => {
        const { sequenceLength } = LEVELS_CONFIG[level];
        const newSequence: number[] = [];
        const availableSwitches = Array.from({ length: TOTAL_SWITCHES }, (_, i) => i);
        for (let i = 0; i < sequenceLength; i++) {
            const randomIndex = Math.floor(Math.random() * availableSwitches.length);
            newSequence.push(availableSwitches.splice(randomIndex, 1)[0]);
        }
        setSequence(newSequence);
    }, [level]);

    const startLevel = useCallback(() => {
        setGameState('memorize');
        setPlayerInput([]);
        setErrorSwitch(null);
        setHighlightIndex(0);
        generateSequence();

        highlightIntervalRef.current = setInterval(() => {
            setHighlightIndex(prev => prev + 1);
        }, 1000);

        memorizeTimeoutRef.current = setTimeout(() => {
            if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
            setHighlightIndex(-1); // Turn off all highlights
            setGameState('playing');
            raptorIntervalRef.current = setInterval(() => {
                setRaptorProximity(prev => Math.min(prev + LEVELS_CONFIG[level].raptorSpeed, 100));
            }, 100);
        }, LEVELS_CONFIG[level].memorizeTime + 1000);
    }, [level, generateSequence]);

    const startGame = () => {
        setLevel(0);
        setRaptorProximity(0);
        startLevel();
    };

    const handleSwitchClick = (switchIndex: number) => {
        if (gameState !== 'playing') return;

        const newPlayerInput = [...playerInput, switchIndex];
        const correctSwitch = sequence[newPlayerInput.length - 1];

        if (switchIndex !== correctSwitch) {
            setRaptorProximity(prev => Math.min(prev + MISTAKE_PENALTY, 100));
            setErrorSwitch(switchIndex);
            setTimeout(() => setErrorSwitch(null), 500);
            setPlayerInput([]); // Reset input on mistake
        } else {
            setPlayerInput(newPlayerInput);
            if (newPlayerInput.length === sequence.length) {
                cleanupTimers();
                if (level < LEVELS_CONFIG.length - 1) {
                    setGameState('level_transition');
                    setTimeout(() => {
                        setLevel(prev => prev + 1);
                        startLevel();
                    }, 2500);
                } else {
                    setGameState('won');
                }
            }
        }
    };
    
    const resetGame = () => {
      setGameState('ready');
      setRaptorProximity(0);
      setPlayerInput([]);
      setLevel(0);
      cleanupTimers();
    }

    const RaptorProximityMeter = () => (
      <div className="w-full my-4">
          <div className="flex justify-between items-center text-sm font-bold mb-1 text-[--color-text-secondary]">
              <span>DANGER: PROXIMITÉ DU RAPTOR</span>
              <span className="text-[--color-primary]">{Math.floor(raptorProximity)}%</span>
          </div>
          <div className="w-full bg-black/50 rounded-full h-6 border-2 border-[--color-accent]/50 overflow-hidden">
              <div
                  className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-600 h-full rounded-full transition-all duration-100"
                  style={{ width: `${raptorProximity}%` }}
              />
          </div>
          {errorSwitch !== null && (
            <div className="flex items-center justify-center gap-2 mt-2 text-red-500 animate-pulse font-bold">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              <span>MAUVAIS DISJONCTEUR ! SÉQUENCE RÉINITIALISÉE.</span>
            </div>
          )}
      </div>
    );
    
    const renderSwitchPanel = () => (
        <div className="p-4 bg-zinc-900 border-4 border-zinc-700 rounded-lg shadow-inner">
            <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: TOTAL_SWITCHES }).map((_, i) => {
                    const isMemorizeHighlight = gameState === 'memorize' && sequence[highlightIndex] === i;
                    const isFlipped = playerInput.includes(i);
                    const isError = errorSwitch === i;
                    const isDisabled = gameState !== 'playing' || isFlipped;

                    return (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => handleSwitchClick(i)}
                                disabled={isDisabled}
                                aria-label={`Disjoncteur ${i + 1}`}
                                className={`relative w-16 h-24 rounded-md transition-all duration-200
                                    ${isFlipped ? 'bg-green-800 border-t-8 border-b-0 border-green-500' : 'bg-zinc-600 border-b-8 border-zinc-800'}
                                    ${isDisabled && !isFlipped ? 'cursor-not-allowed opacity-70' : ''}
                                    ${isMemorizeHighlight ? 'animate-pulse bg-yellow-400' : ''}
                                    ${isError ? 'animate-pulse bg-red-600' : ''}
                                    ${gameState === 'playing' ? 'hover:bg-zinc-500' : ''}
                                `}
                            >
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 w-12 h-16 rounded shadow-inner
                                    ${isFlipped ? 'bg-green-600 -translate-y-[calc(50%+4px)]' : 'bg-zinc-700 -translate-y-1/2'}
                                    transition-transform duration-100`}
                                >
                                    <div className="w-full h-1 bg-zinc-800 mt-7"></div>
                                </div>
                                {gameState === 'memorize' && sequence.includes(i) && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      {sequence.indexOf(i) < highlightIndex && (
                                         <span className="text-4xl font-black text-white text-shadow-lg">
                                            {sequence.indexOf(i) + 1}
                                        </span>
                                      )}
                                  </div>
                                )}
                            </button>
                            <span className="text-xs font-bold text-zinc-400">SYS-{i + 1}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderContent = () => {
        switch (gameState) {
            case 'ready':
                return (
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2 text-[--color-text-primary]">Panne de courant</h3>
                    <p className="text-lg text-[--color-text-secondary] mb-6 max-w-md mx-auto">Les raptors sont en liberté ! Atteignez le hangar et restaurez le courant. Mémorisez la séquence, soyez rapide et ne vous faites pas attraper.</p>
                    <button onClick={startGame} className="px-8 py-4 bg-[--color-secondary] text-white rounded-lg font-black text-2xl shadow-lg hover:brightness-110 transition-transform hover:scale-105 transform">
                      COMMENCER LA MISSION
                    </button>
                  </div>
                );
            case 'memorize':
                return(
                  <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <h3 className="text-2xl font-bold text-[--color-primary] animate-pulse">MÉMORISEZ L'ORDRE... (NIVEAU {level + 1})</h3>
                    {renderSwitchPanel()}
                    <Spinner />
                  </div>
                );
            case 'playing':
                 return(
                  <div className="flex flex-col items-center gap-4 w-full max-w-lg animate-fade-in">
                    <h3 className="text-2xl font-bold text-white">REPRODUISEZ LA SÉQUENCE !</h3>
                    {renderSwitchPanel()}
                    <RaptorProximityMeter />
                  </div>
                );
            case 'level_transition':
                return(
                  <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
                      <h3 className="text-3xl font-bold text-green-500">SYSTÈME {level} RESTAURÉ</h3>
                      <p className="text-xl text-white">Préparation pour le niveau {level + 1}...</p>
                      <Spinner />
                  </div>
                );
            case 'won':
                 return(
                  <div className="text-center animate-fade-in">
                    <h3 className="text-3xl font-bold text-green-400">COURANT RESTAURÉ !</h3>
                    <p className="text-xl text-[--color-text-primary] mt-4 mb-6">Vous l'avez fait ! Les systèmes du parc sont de nouveau en ligne.</p>
                    <button onClick={resetGame} className="px-6 py-3 bg-[--color-primary] text-[--color-background] rounded-lg font-bold text-lg shadow-lg hover:brightness-110 transition">
                      Rejouer
                    </button>
                  </div>
                );
            case 'lost':
                return(
                  <div className="text-center animate-fade-in">
                    <div className="text-9xl mb-4">🦖</div>
                    <h3 className="text-4xl font-black text-red-500">VOUS AVEZ ÉTÉ ATTRAPÉ !</h3>
                    <p className="text-xl text-white mt-4 mb-6">Trop lent... Un bruit dans l'ombre, puis plus rien.</p>
                    <button onClick={resetGame} className="px-6 py-3 bg-[--color-primary] text-[--color-background] rounded-lg font-bold text-lg shadow-lg hover:brightness-110 transition">
                      Réessayer
                    </button>
                  </div>
                );
        }
    };

    return (
        <div className="text-center p-4 md:p-6 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border-4 border-zinc-700" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.1), rgba(0,0,0,0.1) 1px, transparent 1px, transparent 20px)"}}>
            <div className="mb-6">
                <h2 className="text-4xl font-black text-[--color-primary] drop-shadow-lg tracking-tighter" style={{ fontFamily: "'Arial Black', Gadget, sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
                    Power Grid Restore
                </h2>
                <p className="text-xl text-[--color-text-primary]">
                    Jurassic Park River Adventure
                </p>
            </div>
            <div className="min-h-[400px] flex items-center justify-center">
                {renderContent()}
            </div>
            <BackButton onClick={onBack} text="Quitter le hangar" />
        </div>
    );
};


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from './BackButton';

interface MarioKartPitStopGameProps {
  onBack: () => void;
}

type GameState = 'ready' | 'playing' | 'finished';
type PitStopTask = 'refueling' | 'item-box' | `wheel-${number}`;
type WheelSubPhase = 'unscrewing' | 'wheel-swap' | 'screwing' | 'transition';


const NUM_NUTS = 5;
const TOTAL_WHEELS = 4;
const FUEL_TARGET_MIN = 65;
const FUEL_TARGET_MAX = 75;
const FUEL_FILL_RATE = 0.4;
const PENALTY_TIME_MS = 3000;

const ITEMS: { [key: string]: string } = {
    '🍄': 'Champignon',
    '🍌': 'Banane',
    '🐢': 'Carapace Verte',
    '💣': 'Bob-omb',
    '⭐': 'Super Étoile'
};
const ITEM_KEYS = Object.keys(ITEMS);
const NUM_ITEM_CHOICES = 3;

export const MarioKartPitStopGame: React.FC<MarioKartPitStopGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>('ready');
  const [phase, setPhase] = useState<PitStopTask | null>(null);
  const [wheelSubPhase, setWheelSubPhase] = useState<WheelSubPhase | null>(null);
  
  const [gamePhases, setGamePhases] = useState<PitStopTask[]>([]);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  
  const [completedWheels, setCompletedWheels] = useState<Set<number>>(new Set());
  const [removedNuts, setRemovedNuts] = useState<Set<number>>(new Set());
  const [screwedNuts, setScrewedNuts] = useState<Set<number>>(new Set());
  const [time, setTime] = useState(0);
  const [fuelLevel, setFuelLevel] = useState(0);
  const [penaltyMessage, setPenaltyMessage] = useState<string | null>(null);
  const [isInPenalty, setIsInPenalty] = useState(false);

  const [targetItem, setTargetItem] = useState<string>(ITEM_KEYS[0]);
  const [itemChoices, setItemChoices] = useState<string[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const penaltyMs = useRef(0);
  const fuelAnimationRef = useRef<number | null>(null);
  const isPressingFuel = useRef(false);
  const fuelLevelOnRelease = useRef(0);

  const setupItemBox = useCallback(() => {
    const newTarget = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
    setTargetItem(newTarget);

    const choices = new Set<string>();
    choices.add(newTarget);
    while (choices.size < NUM_ITEM_CHOICES) {
        choices.add(ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)]);
    }
    setItemChoices(Array.from(choices).sort(() => Math.random() - 0.5));
  }, []);

  const goToNextPhase = useCallback(() => {
    if (phase && phase.startsWith('wheel')) {
        const wheelIndex = parseInt(phase.split('-')[1], 10);
        setCompletedWheels(prev => new Set(prev).add(wheelIndex));
    }

    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex >= gamePhases.length) {
        setGameState('finished');
    } else {
        setCurrentPhaseIndex(nextIndex);
        const nextPhase = gamePhases[nextIndex];
        setPhase(nextPhase);

        if (nextPhase.startsWith('wheel')) {
            setRemovedNuts(new Set());
            setScrewedNuts(new Set());
            setWheelSubPhase('unscrewing');
        } else {
            setWheelSubPhase(null);
            if (nextPhase === 'item-box') {
                setupItemBox();
            }
        }
    }
  }, [currentPhaseIndex, gamePhases, phase, setupItemBox]);


  useEffect(() => {
    if (gameState === 'playing') {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setTime(Date.now() - startTime + penaltyMs.current);
      }, 10);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (wheelSubPhase === 'unscrewing' && removedNuts.size === NUM_NUTS) {
        setWheelSubPhase('wheel-swap');
        setTimeout(() => {
            setWheelSubPhase('screwing');
        }, 800);
    } else if (wheelSubPhase === 'screwing' && screwedNuts.size === NUM_NUTS) {
        setWheelSubPhase('transition');
        setTimeout(() => {
            goToNextPhase();
        }, 1000);
    }
  }, [removedNuts, screwedNuts, wheelSubPhase, goToNextPhase]);

  const startGame = () => {
    const wheelTasks: PitStopTask[] = Array.from({ length: TOTAL_WHEELS }, (_, i) => `wheel-${i}` as PitStopTask);
    const otherTasks: PitStopTask[] = ['refueling', 'item-box'];
    const allTasks: PitStopTask[] = [...wheelTasks, ...otherTasks];
    const shuffledTasks = allTasks.sort(() => Math.random() - 0.5);

    setGamePhases(shuffledTasks);
    setCurrentPhaseIndex(0);
    
    setGameState('playing');
    setCompletedWheels(new Set());
    setRemovedNuts(new Set());
    setScrewedNuts(new Set());
    setTime(0);
    penaltyMs.current = 0;
    setFuelLevel(0);
    fuelLevelOnRelease.current = 0;
    setPenaltyMessage(null);
    setIsInPenalty(false);
    
    const firstPhase = shuffledTasks[0];
    setPhase(firstPhase);
    if (firstPhase.startsWith('wheel')) {
        setWheelSubPhase('unscrewing');
    } else {
        setWheelSubPhase(null);
        if (firstPhase === 'item-box') {
            setupItemBox();
        }
    }
  };

  const resetGame = () => {
    setGameState('ready');
    setPhase(null);
  };

  const handleUnscrew = (nutId: number) => {
    if (gameState !== 'playing' || wheelSubPhase !== 'unscrewing') return;
    setRemovedNuts(prev => new Set(prev).add(nutId));
  };

  const handleScrew = (slotId: number) => {
    if (gameState !== 'playing' || wheelSubPhase !== 'screwing') return;
    setScrewedNuts(prev => new Set(prev).add(slotId));
  };
  
  const handleFuelButtonPress = () => {
    if (phase !== 'refueling' || isPressingFuel.current || isInPenalty) return;
    isPressingFuel.current = true;
    if (fuelAnimationRef.current) cancelAnimationFrame(fuelAnimationRef.current);

    const fill = () => {
        setFuelLevel(prev => {
            const newLevel = prev + FUEL_FILL_RATE;
            if (newLevel >= 100) {
                fuelLevelOnRelease.current = 100;
                handleFuelButtonRelease();
                return 100;
            }
            fuelLevelOnRelease.current = newLevel;
            fuelAnimationRef.current = requestAnimationFrame(fill);
            return newLevel;
        });
    };
    fuelAnimationRef.current = requestAnimationFrame(fill);
  };

  const handleFuelButtonRelease = () => {
      if (!isPressingFuel.current) return;
      isPressingFuel.current = false;
      if (fuelAnimationRef.current) {
          cancelAnimationFrame(fuelAnimationRef.current);
          fuelAnimationRef.current = null;
      }

      const finalFuelLevel = fuelLevelOnRelease.current;
      
      if (finalFuelLevel >= FUEL_TARGET_MIN && finalFuelLevel <= FUEL_TARGET_MAX) {
          goToNextPhase();
      } else {
          penaltyMs.current += PENALTY_TIME_MS;
          const message = finalFuelLevel > FUEL_TARGET_MAX ? 'Trop plein ! Pénalité de 3s.' : 'Pas assez ! Pénalité de 3s.';
          setPenaltyMessage(message);
          setIsInPenalty(true);
          setTimeout(() => {
              setFuelLevel(0);
              fuelLevelOnRelease.current = 0;
              setPenaltyMessage(null);
              setIsInPenalty(false);
          }, 2000);
      }
  };

  const handleItemSelect = (selectedItem: string) => {
    if (phase !== 'item-box' || isInPenalty) return;

    if (selectedItem === targetItem) {
        goToNextPhase();
    } else {
        penaltyMs.current += PENALTY_TIME_MS;
        setPenaltyMessage('Mauvais objet ! Pénalité de 3s.');
        setIsInPenalty(true);
        setTimeout(() => {
            setupItemBox();
            setPenaltyMessage(null);
            setIsInPenalty(false);
        }, 2000);
    }
  };


  const formatTime = (ms: number) => (ms / 1000).toFixed(2);
  
  const WheelProgressIndicator = () => (
    <div className="flex justify-center items-center gap-3 md:gap-4 mb-4">
        <span className="font-bold text-lg text-[--color-text-secondary]">ROUES :</span>
        {Array.from({ length: TOTAL_WHEELS }).map((_, i) => {
            const isCompleted = completedWheels.has(i);
            const isCurrent = phase === `wheel-${i}`;
            return (
                <div
                    key={i}
                    aria-label={`Roue ${i + 1} ${isCompleted ? 'terminée' : isCurrent ? 'en cours' : 'en attente'}`}
                    className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center font-bold
                        ${isCompleted ? 'bg-green-500 border-green-300 text-white' : ''}
                        ${isCurrent ? 'bg-yellow-500 border-yellow-300 scale-110 animate-pulse' : ''}
                        ${!isCompleted && !isCurrent ? 'bg-gray-600 border-gray-400' : ''}
                    `}
                >
                  {isCompleted && <span className="text-sm">✓</span>}
                </div>
            );
        })}
    </div>
  );
  
  const renderWheelChangeArea = () => {
    if (!phase || !phase.startsWith('wheel') || !wheelSubPhase) return null;

    const wheelIndex = parseInt(phase.split('-')[1], 10);
    
    const instructions: Record<WheelSubPhase, string> = {
      unscrewing: `Roue ${wheelIndex + 1}: Dévisser !`,
      'wheel-swap': "Changement de roue...",
      screwing: `Roue ${wheelIndex + 1}: Visser !`,
      'transition': `Roue ${wheelIndex + 1} terminée ! Prêt pour la suite...`,
    };

    const nutPositions = Array.from({ length: NUM_NUTS }).map((_, i) => {
      const angle = (i / NUM_NUTS) * 2 * Math.PI - Math.PI / 2;
      const radius = 45;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      return { top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)` };
    });
    
    const wheelBaseClasses = "absolute w-64 h-64 md:w-72 md:h-72 rounded-full flex items-center justify-center transition-all duration-700";
    const tireStyle = { background: "radial-gradient(circle, #4a4a4a 0%, #2b2b2b 70%, #1a1a1a 100%)", boxShadow: "inset 0 0 20px rgba(0,0,0,0.7), 0 0 15px rgba(0,0,0,0.5)"};
    const cleanRimStyle = { background: "radial-gradient(circle, #888888, #666666, #444444)", boxShadow: "inset 0 0 10px rgba(0,0,0,0.6)"};
    const rustyRimStyle = { 
        background: "radial-gradient(circle at 30% 30%, #8b4513 5%, transparent 25%), radial-gradient(circle at 75% 65%, #a0522d 8%, transparent 30%), radial-gradient(circle, #6a6a6a, #555555, #3b3b3b)",
        boxShadow: "inset 0 0 15px rgba(0,0,0,0.8)"
    };
    
    const isSwapping = wheelSubPhase === 'wheel-swap' || wheelSubPhase === 'transition';

    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="flex justify-between items-center w-full px-2 md:px-4">
          <p className="text-lg md:text-xl font-bold text-center text-[--color-text-primary] flex-1">
            {instructions[wheelSubPhase]}
          </p>
          <p className="text-4xl font-black text-[--color-accent] tracking-tighter w-32 text-right">{formatTime(time)}s</p>
        </div>
        
        <WheelProgressIndicator />

        <div className="relative w-full h-80 flex items-center justify-center overflow-hidden">
           {isSwapping && (
            <div className="absolute inset-0 flex items-center justify-center bg-[--color-card-bg] bg-opacity-80 z-20">
                <p className="text-3xl font-bold text-white animate-pulse">{instructions[wheelSubPhase]}</p>
            </div>
          )}
          {/* Old Wheel */}
          <div className={`${wheelBaseClasses} ${wheelSubPhase !== 'unscrewing' ? 'transform translate-y-[150%] rotate-[-45deg] opacity-0 ease-in' : 'transform translate-y-0 opacity-100'}`} style={tireStyle}>
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-full" style={rustyRimStyle}>
              {wheelSubPhase === 'unscrewing' && Array.from({ length: NUM_NUTS }).map((_, i) => {
                const isRemoved = removedNuts.has(i);
                return (
                  <button key={i} onClick={() => handleUnscrew(i)} disabled={isRemoved || isSwapping}
                    className={`absolute w-8 h-8 bg-gray-300 clip-hexagon transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${isRemoved ? 'opacity-0 scale-50 rotate-[-720deg]' : 'hover:scale-110 hover:bg-yellow-400 cursor-pointer'}`}
                    style={nutPositions[i]} aria-label={`Dévisser l'écrou ${i + 1}`}
                  />
                );
              })}
            </div>
          </div>

          {/* New Wheel */}
          <div className={`${wheelBaseClasses} ease-out ${wheelSubPhase === 'screwing' ? 'transform translate-x-0 opacity-100' : 'transform translate-x-full opacity-0'}`} style={tireStyle}>
             <div className="w-48 h-48 md:w-56 md:h-56 rounded-full" style={cleanRimStyle}>
                {wheelSubPhase === 'screwing' && Array.from({ length: NUM_NUTS }).map((_, i) => {
                  const isScrewed = screwedNuts.has(i);
                  return (
                    <button key={i} onClick={() => handleScrew(i)} disabled={isScrewed || isSwapping}
                      className={`absolute w-10 h-10 clip-hexagon transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${!isScrewed ? 'bg-gray-800 bg-opacity-50 border-2 border-dashed border-gray-500 cursor-pointer hover:bg-opacity-75' : ''}`}
                      style={nutPositions[i]} aria-label={`Visser l'écrou ${i + 1}`}
                    >
                      <div className={`w-8 h-8 bg-gray-300 clip-hexagon transform transition-all duration-500 ${isScrewed ? 'scale-100 opacity-100 rotate-[720deg]' : 'scale-0 opacity-0'}`}></div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderRefuelArea = () => {
    const instructions = isInPenalty ? penaltyMessage : 'Faites le plein ! Maintenez pour remplir.';
    return (
        <div className="flex flex-col items-center gap-4 w-full h-full justify-around">
            <div className="flex justify-between items-center w-full px-4">
                <p className={`text-lg md:text-xl font-bold text-center flex-1 ${isInPenalty ? 'text-red-500 animate-pulse' : 'text-[--color-text-primary]'}`}>
                    {instructions}
                </p>
                <p className="text-4xl font-black text-[--color-accent] tracking-tighter w-32 text-right">{formatTime(time)}s</p>
            </div>

            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 py-8">
                <div className="relative w-24 h-64 bg-gray-800 rounded-lg border-2 border-gray-600 overflow-hidden flex flex-col-reverse shadow-inner">
                    <div className="absolute top-0 left-0 w-full h-full z-10 flex flex-col-reverse">
                        <div className="absolute w-full bg-green-500 bg-opacity-40" style={{ height: `${FUEL_TARGET_MAX - FUEL_TARGET_MIN}%`, bottom: `${FUEL_TARGET_MIN}%` }}></div>
                        <div className="absolute w-full h-0.5 bg-green-300" style={{ bottom: `${FUEL_TARGET_MAX}%` }}></div>
                        <div className="absolute w-full h-0.5 bg-green-300" style={{ bottom: `${FUEL_TARGET_MIN}%` }}></div>
                    </div>
                    <div 
                        className="w-full bg-yellow-400"
                        style={{ height: `${fuelLevel}%` }}
                    ></div>
                </div>

                <div className="flex flex-col items-center">
                    <button
                        onMouseDown={handleFuelButtonPress}
                        onMouseUp={handleFuelButtonRelease}
                        onMouseLeave={handleFuelButtonRelease}
                        onTouchStart={(e) => { e.preventDefault(); handleFuelButtonPress(); }}
                        onTouchEnd={(e) => { e.preventDefault(); handleFuelButtonRelease(); }}
                        disabled={isInPenalty}
                        className="w-40 h-40 rounded-full bg-red-600 text-white font-black text-3xl shadow-lg flex items-center justify-center select-none transform transition-transform active:scale-95 disabled:bg-red-800 disabled:cursor-not-allowed"
                        aria-label="Maintenir pour faire le plein"
                    >
                        GO
                    </button>
                    <p className="mt-4 text-lg text-[--color-text-secondary]">Relâchez dans la zone verte !</p>
                </div>
            </div>
        </div>
    );
  };

  const renderItemBoxArea = () => {
    const instructions = isInPenalty ? penaltyMessage : `Vite ! Prends un(e) ${ITEMS[targetItem]} !`;
    return (
        <div className="flex flex-col items-center gap-4 w-full h-full justify-around animate-fade-in">
            <div className="flex justify-between items-center w-full px-4">
                <p className={`text-lg md:text-xl font-bold text-center flex-1 ${isInPenalty ? 'text-red-500 animate-pulse' : 'text-[--color-text-primary]'}`}>
                    {instructions}
                </p>
                <p className="text-4xl font-black text-[--color-accent] tracking-tighter w-32 text-right">{formatTime(time)}s</p>
            </div>

            <div className="relative w-48 h-48 md:w-56 md:h-56 bg-yellow-400 flex items-center justify-center rounded-2xl shadow-2xl border-4 border-yellow-200" style={{backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 10px, transparent 10px, transparent 20px)"}}>
                <div className="absolute text-8xl font-black text-white" style={{textShadow: "0 0 15px rgba(0,0,0,0.5)"}}>?</div>
            </div>
            
            <p className="font-semibold text-lg text-[--color-text-secondary]">Choisissez le bon objet :</p>

            <div className="flex justify-center items-center gap-4 md:gap-8">
                {itemChoices.map(item => (
                    <button
                        key={item}
                        onClick={() => handleItemSelect(item)}
                        disabled={isInPenalty}
                        aria-label={`Choisir ${ITEMS[item]}`}
                        className="p-4 bg-[--color-card-bg] rounded-full shadow-lg border-2 border-[--color-primary] transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 ring-[--color-accent] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="text-4xl md:text-5xl">{item}</span>
                    </button>
                ))}
            </div>
        </div>
    );
  };

  const renderGameArea = () => {
    if (!phase) return null;
    if (phase.startsWith('wheel')) {
        return renderWheelChangeArea();
    }
    switch (phase) {
        case 'refueling':
            return renderRefuelArea();
        case 'item-box':
            return renderItemBoxArea();
        default:
            return null;
    }
  };

  const renderContent = () => {
    switch (gameState) {
      case 'ready':
        return (
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2 text-[--color-text-primary]">Arrêt au stand complet !</h3>
            <p className="text-lg text-[--color-text-secondary] mb-6 max-w-md mx-auto mt-4">L'ordre des 6 tâches de l'arrêt au stand est aléatoire ! Accomplissez-les le plus vite possible pour gagner.</p>
            <button onClick={startGame} className="w-full max-w-xs px-8 py-4 bg-green-500 text-white rounded-lg font-black text-2xl shadow-lg hover:bg-green-600 transition-transform hover:scale-105 transform">
              COMMENCER
            </button>
          </div>
        );
      case 'playing':
        return renderGameArea();
      case 'finished':
        return (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-[--color-text-primary]">Arrêt au stand terminé !</h3>
            <p className="text-6xl font-black text-[--color-secondary] my-4">{formatTime(time)}s</p>
            <p className="text-xl text-[--color-text-secondary] mb-8">Excellent travail d'équipe ! Vous êtes prêt à retourner sur la piste.</p>
            <button onClick={resetGame} className="px-6 py-3 bg-[--color-accent] text-[--color-background] rounded-lg font-bold text-lg shadow-lg hover:brightness-110 transition">
              Rejouer
            </button>
          </div>
        );
    }
  };

  return (
    <div className="relative p-4 md:p-8 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border-2 border-[--color-primary]">
      <BackButton onClick={onBack} text="Quitter le stand" />
      <div className="text-center mb-6">
        <div className="inline-block">
            <h2 className="text-4xl font-black text-[--color-secondary] drop-shadow-lg tracking-tighter">
            Arrêt au Stand Mario Kart
            </h2>
            <p className="text-xl text-[--color-text-primary]">
                Mario Kart™: Bowser’s Challenge
            </p>
        </div>
      </div>
      <div className="min-h-[450px] flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
};

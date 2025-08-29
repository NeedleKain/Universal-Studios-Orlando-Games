import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from './BackButton';

interface YoshiFruitFeastGameProps {
  onBack: () => void;
}

type GameState = 'ready' | 'playing' | 'finished';
type ItemType = 'apple' | 'banana' | 'melon' | 'shyguy' | 'piranhaplant' | 'clock' | 'star';
interface GameItem {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  element: React.ReactNode;
}
interface TongueState {
  isActive: boolean;
  targetX: number;
  targetY: number;
  angle: number;
  length: number;
}

const GAME_DURATION = 60;
const ITEM_SPAWN_RATE_MS = 800;
const ITEM_LIFESPAN_MS = 2500;
const STAR_POWER_DURATION_MS = 5000;
const TIME_BONUS_S = 5;

const ITEM_PROBABILITY = {
  apple: 0.4,
  banana: 0.3,
  melon: 0.1,
  shyguy: 0.1,
  piranhaplant: 0.05,
  clock: 0.025,
  star: 0.025,
};

const ITEM_POINTS = {
  apple: 10,
  banana: 15,
  melon: 50,
  shyguy: -25,
  piranhaplant: -50,
  enemy_eaten: 30,
};

// SVG components for items
const Apple = () => <div className="text-4xl">🍎</div>;
const Banana = () => <div className="text-4xl">🍌</div>;
const Melon = () => <div className="text-4xl">🍉</div>;
const ShyGuy = () => <div className="text-4xl">👻</div>;
const PiranhaPlant = () => <div className="text-4xl">🌺</div>;
const Clock = () => <div className="text-4xl">⏰</div>;
const Star = () => <div className="text-4xl animate-pulse">🌟</div>;

const itemElements: Record<ItemType, React.ReactNode> = {
  apple: <Apple />,
  banana: <Banana />,
  melon: <Melon />,
  shyguy: <ShyGuy />,
  piranhaplant: <PiranhaPlant />,
  clock: <Clock />,
  star: <Star />,
};

export const YoshiFruitFeastGame: React.FC<YoshiFruitFeastGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [items, setItems] = useState<GameItem[]>([]);
  const [combo, setCombo] = useState(0);
  const [isInvincible, setIsInvincible] = useState(false);
  const [tongue, setTongue] = useState<TongueState>({ isActive: false, targetX: 0, targetY: 0, angle: 0, length: 0 });

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const yoshiRef = useRef<HTMLDivElement>(null);

  const cleanupTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  useEffect(() => {
    return cleanupTimers;
  }, [cleanupTimers]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      timersRef.current.add(timer);
    } else if (timeLeft <= 0 && gameState === 'playing') {
      setGameState('finished');
      cleanupTimers();
    }
  }, [timeLeft, gameState, cleanupTimers]);

  const spawnItem = useCallback(() => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;
    
    const gameArea = gameAreaRef.current.getBoundingClientRect();
    const rand = Math.random();
    let cumulativeProb = 0;
    let chosenType: ItemType = 'apple';

    for (const [type, prob] of Object.entries(ITEM_PROBABILITY)) {
      cumulativeProb += prob;
      if (rand <= cumulativeProb) {
        chosenType = type as ItemType;
        break;
      }
    }

    const newItem: GameItem = {
      id: Date.now() + Math.random(),
      type: chosenType,
      x: Math.random() * (gameArea.width - 60) + 30,
      y: Math.random() * (gameArea.height - 100) + 30,
      element: itemElements[chosenType],
    };

    setItems(currentItems => [...currentItems, newItem]);

    // Timer to remove the item if not clicked
    const removalTimer = setTimeout(() => {
        setItems(its => its.filter(it => it.id !== newItem.id));
    }, ITEM_LIFESPAN_MS);
    timersRef.current.add(removalTimer);

  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      const spawnInterval = setInterval(spawnItem, ITEM_SPAWN_RATE_MS);
      return () => clearInterval(spawnInterval);
    }
  }, [gameState, spawnItem]);


  const handleItemClick = (item: GameItem) => {
    // Remove item immediately
    setItems(its => its.filter(it => it.id !== item.id));
    
    // Animate tongue
    if(yoshiRef.current && gameAreaRef.current) {
        const yoshiRect = yoshiRef.current.getBoundingClientRect();
        const gameAreaRect = gameAreaRef.current.getBoundingClientRect();
        const yoshiCenterX = yoshiRect.left - gameAreaRect.left + yoshiRect.width / 2;
        const yoshiCenterY = yoshiRect.top - gameAreaRect.top + yoshiRect.height / 2;
        
        const deltaX = item.x - yoshiCenterX;
        const deltaY = item.y - yoshiCenterY;

        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        setTongue({ isActive: true, targetX: item.x, targetY: item.y, angle, length });
        setTimeout(() => setTongue(t => ({...t, isActive: false})), 200);
    }

    // Handle item logic
    const isFruit = ['apple', 'banana', 'melon'].includes(item.type);
    const isEnemy = ['shyguy', 'piranhaplant'].includes(item.type);

    if(isFruit) {
        const comboMultiplier = 1 + combo * 0.1;
        setScore(s => s + Math.floor(ITEM_POINTS[item.type as 'apple'] * comboMultiplier));
        setCombo(c => c + 1);
    } else if (isEnemy) {
        if (isInvincible) {
            setScore(s => s + ITEM_POINTS.enemy_eaten);
        } else {
            setScore(s => Math.max(0, s + ITEM_POINTS[item.type as 'shyguy']));
            setCombo(0);
        }
    } else if (item.type === 'clock') {
        setTimeLeft(t => t + TIME_BONUS_S);
    } else if (item.type === 'star') {
        setIsInvincible(true);
        const starTimer = setTimeout(() => setIsInvincible(false), STAR_POWER_DURATION_MS);
        timersRef.current.add(starTimer);
    }
  };
  
  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    setItems([]);
    setIsInvincible(false);
    cleanupTimers();
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('ready');
  };
  
  const Yoshi = () => (
    <div ref={yoshiRef} className={`absolute bottom-4 left-1/2 -translate-x-1/2 text-7xl transition-transform duration-300 ${isInvincible ? 'animate-bounce' : ''}`}>
        {combo > 5 ? '😋' : '😀'}
    </div>
  );

  const Tongue = () => {
    if(!tongue.isActive) return null;
    return (
        <div 
          className="absolute bg-red-500 h-2 rounded-full origin-left transition-all duration-100 ease-linear"
          style={{
            left: yoshiRef.current ? (yoshiRef.current.offsetLeft + yoshiRef.current.offsetWidth/2) : '50%',
            top: yoshiRef.current ? (yoshiRef.current.offsetTop + yoshiRef.current.offsetHeight/2) : '100%',
            width: `${tongue.length}px`,
            transform: `rotate(${tongue.angle}deg)`,
          }}
        />
    )
  }

  const renderContent = () => {
    switch (gameState) {
      case 'ready':
        return (
          <div className="text-center">
            <h3 className="text-3xl font-bold mb-2 text-white">La Fête des Fruits de Yoshi</h3>
            <p className="text-lg text-gray-200 mb-6 max-w-md mx-auto">Aidez Yoshi à manger un maximum de fruits en 60 secondes ! Évitez les ennemis et utilisez les bonus.</p>
            <button onClick={startGame} className="w-full max-w-xs px-8 py-4 bg-green-500 text-white rounded-lg font-black text-2xl shadow-lg hover:bg-green-600 transition-transform hover:scale-105 transform">
              JOUER !
            </button>
          </div>
        );
      case 'playing':
        return (
          <div ref={gameAreaRef} className="relative w-full h-full cursor-pointer overflow-hidden bg-blue-300 border-8 border-white rounded-lg" style={{
            backgroundImage: "url('https://www.transparenttextures.com/patterns/stitched-wool.png')",
            backgroundBlendMode: 'overlay'
          }}>
            {items.map(item => (
                <div key={item.id}
                     className="absolute transition-transform duration-200 hover:scale-125"
                     style={{ left: item.x, top: item.y, transform: 'translate(-50%, -50%)' }}
                     onClick={() => handleItemClick(item)}
                     role="button"
                     aria-label={`Attraper ${item.type}`}
                >
                    {item.element}
                </div>
            ))}
            <Yoshi />
            <Tongue />
            {isInvincible && <div className="absolute inset-0 bg-yellow-300 opacity-30 pointer-events-none animate-pulse"></div>}
          </div>
        );
      case 'finished':
        return (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white">Temps écoulé !</h3>
            <p className="text-6xl font-black text-yellow-400 my-4">{score.toLocaleString()}</p>
            <p className="text-xl text-gray-200 mb-8">Bravo ! Yoshi est rassasié.</p>
            <button onClick={startGame} className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold text-lg shadow-lg hover:bg-green-600 transition">
              Rejouer
            </button>
          </div>
        );
    }
  };
  
  const renderHUD = () => (
    <div className="flex justify-between items-center w-full mb-4 text-white font-bold text-2xl bg-black/30 p-3 rounded-lg">
        <div>Score: <span className="text-yellow-400">{score.toLocaleString()}</span></div>
        <div>Temps: <span className="text-green-400">{timeLeft}</span></div>
        <div>Combo: <span className="text-red-400">x{combo}</span></div>
    </div>
  );

  return (
    <div className="text-center p-4 md:p-6 bg-[#60a5fa] rounded-lg shadow-2xl animate-fade-in border-4 border-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="mb-4">
        <h2 className="text-4xl font-black text-white drop-shadow-lg tracking-tight">
            La Fête des Fruits de Yoshi
        </h2>
      </div>
      {gameState === 'playing' && renderHUD()}
      <div className="min-h-[400px] flex items-center justify-center">
        {renderContent()}
      </div>
      <BackButton onClick={onBack} text="Quitter l'aventure" />
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BackButton } from './BackButton';
import type { ThemeColors } from '../types';
import { useDynamicTheme } from '../hooks/useDynamicTheme';
import { PARKS_DATA } from '../constants';

type GameState = 'ready' | 'playing' | 'finished';
type FallingObjectType = 'star' | 'comet' | 'blackhole';

interface FallingObject {
  id: number;
  type: FallingObjectType;
  colorKey: string;
  x: number;
  y: number;
  speed: number;
  points: number;
  rotation: number;
}

interface Feedback {
    id: number;
    text: string;
    x: number;
    y: number;
    color: string;
}

const GAME_DURATION = 60;
const STAR_COLORS: { [key: string]: string } = {
  blue: 'var(--color-accent)',
  yellow: 'var(--color-secondary)',
  white: 'var(--color-text-primary)',
};
const COLOR_KEYS = Object.keys(STAR_COLORS);
const CATCHER_LINE_Y = 88;

export const StarlightCatcherGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const celestialParkTheme = PARKS_DATA.find(p => p.id === 'epic-universe')?.areas.find(a => a.name === 'Celestial Park')?.themeColors;
  useDynamicTheme(celestialParkTheme!);

  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [fallingObjects, setFallingObjects] = useState<FallingObject[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [activeCatchers, setActiveCatchers] = useState<Record<string, boolean>>({});

  const gameLoopRef = useRef<number | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const lastSpawnTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      timersRef.current.add(timer);
    } else if (timeLeft <= 0 && gameState === 'playing') {
      setGameState('finished');
      cleanup();
    }
  }, [timeLeft, gameState, cleanup]);

  const showFeedback = useCallback((text: string, x: number, y: number, color: string) => {
    const id = Date.now() + Math.random();
    setFeedbackList(prev => [...prev, { id, text, x, y, color }]);
    const timer = setTimeout(() => {
      setFeedbackList(f => f.filter(fb => fb.id !== id));
    }, 1000);
    timersRef.current.add(timer);
  }, []);

  const spawnObject = useCallback(() => {
    const rand = Math.random();
    let type: FallingObjectType;
    if (rand < 0.05) type = 'blackhole';
    else if (rand < 0.20) type = 'comet';
    else type = 'star';

    const colorKey = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    const speed = type === 'comet' ? 25 : type === 'blackhole' ? 10 : 15;

    const newObject: FallingObject = {
      id: Date.now() + Math.random(),
      type,
      colorKey,
      x: 10 + Math.random() * 80,
      y: -10,
      speed: speed + (Math.random() - 0.5) * 4,
      points: type === 'comet' ? 50 : 10,
      rotation: Math.random() * 360,
    };
    setFallingObjects(prev => [...prev, newObject]);
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (gameState !== 'playing') return;

    if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
    }
    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;
    
    const spawnInterval = 800 - (GAME_DURATION - timeLeft) * 8;
    if (timestamp - lastSpawnTimeRef.current > Math.max(200, spawnInterval)) {
      lastSpawnTimeRef.current = timestamp;
      spawnObject();
    }

    setFallingObjects(prev => {
        const keptObjects: FallingObject[] = [];
        const missedObjects: FallingObject[] = [];

        for (const obj of prev) {
            if (obj.y > 105) {
                missedObjects.push(obj);
            } else {
                keptObjects.push(obj);
            }
        }
        
        missedObjects.forEach(obj => {
            if (obj.type !== 'blackhole') {
                setScore(s => Math.max(0, s - 5));
                showFeedback('-5', obj.x, CATCHER_LINE_Y, '#f87171');
            }
        });
        
        return keptObjects.map(obj => ({ ...obj, y: obj.y + obj.speed * (deltaTime / 100) }));
    });
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, timeLeft, spawnObject, showFeedback]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setFallingObjects([]);
    setFeedbackList([]);
    cleanup();
    lastFrameTimeRef.current = 0;
    setGameState('playing');
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const handleCatcherClick = (clickedColorKey: string) => {
    if (gameState !== 'playing') return;

    setActiveCatchers({ [clickedColorKey]: true });
    const timer = setTimeout(() => setActiveCatchers({}), 150);
    timersRef.current.add(timer);
    
    const objectsAtLine = fallingObjects.filter(obj => obj.y >= CATCHER_LINE_Y - 8 && obj.y <= CATCHER_LINE_Y + 5);
    const objectsToRemove = new Set<number>();
    let totalPointsChange = 0;
    let successfulCatch = false;

    objectsAtLine.forEach(obj => {
      let interaction = false;
      if (obj.type === 'blackhole') {
        totalPointsChange -= 25;
        showFeedback('-25', obj.x, obj.y, '#f87171');
        interaction = true;
      } else if (obj.colorKey === clickedColorKey) {
        totalPointsChange += obj.points;
        showFeedback(`+${obj.points}`, obj.x, obj.y, '#4ade80');
        interaction = true;
      }

      if (interaction) {
        objectsToRemove.add(obj.id);
        successfulCatch = true;
      }
    });

    if (!successfulCatch && objectsAtLine.length === 0) {
      totalPointsChange -= 2;
      const catcherIndex = COLOR_KEYS.indexOf(clickedColorKey);
      const feedbackX = (catcherIndex + 0.5) * (100 / COLOR_KEYS.length);
      showFeedback('-2', feedbackX, CATCHER_LINE_Y + 2, '#f87171');
    }
    
    if (totalPointsChange !== 0) {
      setScore(s => Math.max(0, s + totalPointsChange));
    }

    if (objectsToRemove.size > 0) {
      setFallingObjects(prev => prev.filter(obj => !objectsToRemove.has(obj.id)));
    }
  };

  const Star = ({ object }: { object: FallingObject }) => {
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${object.x}%`,
        top: `${object.y}%`,
        transform: `translate(-50%, -50%) rotate(${object.rotation}deg)`,
        width: object.type === 'comet' ? '3rem' : '2.5rem',
        height: object.type === 'comet' ? '3rem' : '2.5rem',
    };
    
    if (object.type === 'blackhole') {
        return <div style={style} className="text-4xl">🕳️</div>
    }
    
    return (
        <div style={{ ...style, color: STAR_COLORS[object.colorKey], filter: `drop-shadow(0 0 8px ${STAR_COLORS[object.colorKey]})`}}>
             <svg viewBox="0 0 24 24" fill="currentColor" className={object.type === 'comet' ? 'animate-spin' : ''}>
                <path d="M12,17.27L18.18,21L17,14.64L22,9.73L15.45,8.82L12,2.5L8.55,8.82L2,9.73L7,14.64L5.82,21L12,17.27Z" />
             </svg>
             {object.type === 'comet' && <div className="absolute inset-0 bg-white opacity-50 rounded-full blur-xl" />}
        </div>
    );
  }

  const renderContent = () => {
    switch (gameState) {
      case 'ready':
        return (
          <div className="text-center animate-fade-in">
            <h3 className="text-2xl font-bold mb-2 text-[--color-text-primary]">Starlight Catcher</h3>
            <p className="text-lg text-[--color-text-secondary] mb-6 max-w-md mx-auto">Attrapez les étoiles filantes avec les capteurs de couleur correspondants. Les comètes sont plus rapides mais valent plus de points. Évitez les trous noirs !</p>
            <button onClick={startGame} className="px-8 py-4 bg-[--color-secondary] text-[--color-background] rounded-lg font-black text-2xl shadow-lg hover:brightness-110 transition-transform hover:scale-105 transform">
              COMMENCER
            </button>
          </div>
        );
      case 'finished':
        return (
          <div className="text-center animate-fade-in">
            <h3 className="text-2xl font-bold text-white">Course Terminée !</h3>
            <p className="text-6xl font-black text-[--color-secondary] my-4">{score.toLocaleString()}</p>
            <p className="text-xl text-[--color-text-secondary] mb-8">Un score cosmique ! Prêt pour une autre course ?</p>
            <button onClick={startGame} className="px-6 py-3 bg-[--color-accent] text-[--color-background] rounded-lg font-bold text-lg shadow-lg hover:brightness-110 transition">
              Rejouer
            </button>
          </div>
        );
      case 'playing':
        return (
            <div className="relative w-full h-full">
                {/* Game HUD */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-xl font-bold bg-black/20 z-10">
                    <div>Score: <span className="text-[--color-secondary]">{score}</span></div>
                    <div>Temps: <span className="text-[--color-accent]">{timeLeft}</span></div>
                </div>

                {/* Falling Objects */}
                {fallingObjects.map(obj => <Star key={obj.id} object={obj} />)}
                
                {/* Feedback Text */}
                {feedbackList.map(fb => (
                    <div key={fb.id} className="absolute text-2xl font-black animate-ping-fade-out" style={{ left: `${fb.x}%`, top: `${fb.y}%`, color: fb.color, transform: 'translate(-50%, -50%)', textShadow: '0 0 5px black', pointerEvents: 'none' }}>
                        {fb.text}
                    </div>
                ))}

                {/* Catchers */}
                <div className="absolute bottom-0 left-0 right-0 h-24 flex">
                    {COLOR_KEYS.map((colorKey) => (
                        <button
                            key={colorKey}
                            onClick={() => handleCatcherClick(colorKey)}
                            aria-label={`Catcher ${colorKey}`}
                            className="flex-1 h-full transition-all duration-150 relative"
                            style={{ backgroundColor: `${STAR_COLORS[colorKey]}1A`, borderTop: `4px solid ${STAR_COLORS[colorKey]}` }}
                        >
                            <div className={`absolute inset-0 w-full h-full opacity-30 hover:opacity-60 transition-opacity ${activeCatchers[colorKey] ? '!opacity-70' : ''}`} style={{background: `radial-gradient(ellipse at 50% 0%, ${STAR_COLORS[colorKey]}, transparent 70%)`}}></div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }
  };

  return (
    <div className="text-center p-2 md:p-4 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border-2 border-[--color-primary]">
      <style>{`
          @keyframes ping-fade-out {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              100% { transform: translate(-50%, -150%) scale(1.5); opacity: 0; }
          }
          .animate-ping-fade-out {
              animation: ping-fade-out 1s ease-out forwards;
          }
      `}</style>
      <header className="mb-4">
        <h2 className="text-4xl font-black text-[--color-secondary] drop-shadow-lg tracking-tighter" style={{ fontFamily: "'Cinzel', serif" }}>
          Starlight Catcher
        </h2>
        <p className="text-xl text-[--color-text-primary]">Stardust Racers</p>
      </header>
      <main className="aspect-[9/16] w-full max-w-md mx-auto bg-[--color-background] rounded-lg overflow-hidden relative shadow-inner" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "1rem 1rem"}}>
        {renderContent()}
      </main>
      <BackButton onClick={onBack} text="Quitter la course" />
    </div>
  );
};

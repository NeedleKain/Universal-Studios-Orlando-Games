import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { BackButton } from './BackButton';
import type { ThemeColors } from '../types';
import { useDynamicTheme } from '../hooks/useDynamicTheme';
import { PARKS_DATA } from '../constants';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GAME_DURATION_S = 90;
const PLAYER_HEALTH_MAX = 100;
const ENEMY_HEALTH_MAX = 30;

// Game object types
interface GameObject {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  speed: number;
  health: number;
  maxHealth: number;
}
interface Player extends GameObject {}
interface Enemy extends GameObject {}
interface Bullet extends Pick<GameObject, 'id' | 'x' | 'y' | 'angle'> {}
interface Explosion {
  id: number;
  x: number;
  y: number;
}

interface GameState {
  status: 'ready' | 'playing' | 'finished';
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  explosions: Explosion[];
  score: number;
  timeLeft: number;
}

type GameAction =
  | { type: 'TICK'; payload: { inputs: InputState; deltaTime: number } }
  | { type: 'START_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'END_GAME' }
  | { type: 'TIME_TICK' };

const sanFranciscoArea = PARKS_DATA.find(p => p.id === 'universal-studios')?.areas.find(a => a.name === 'San Francisco');

const initialState: GameState = {
  status: 'ready',
  player: {
    id: 0,
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 60,
    width: 30,
    height: 50,
    angle: -Math.PI / 2,
    speed: 2.5,
    health: PLAYER_HEALTH_MAX,
    maxHealth: PLAYER_HEALTH_MAX,
  },
  enemies: [],
  bullets: [],
  explosions: [],
  score: 0,
  timeLeft: GAME_DURATION_S,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...initialState,
        status: 'playing',
      };
    case 'RESET_GAME':
      return initialState;
    case 'END_GAME':
        return { ...state, status: 'finished'};
    case 'TIME_TICK':
        if (state.status !== 'playing') return state;
        const newTimeLeft = state.timeLeft - 1;
        if (newTimeLeft <= 0) {
            return { ...state, status: 'finished', timeLeft: 0 };
        }
        return { ...state, timeLeft: newTimeLeft };
    case 'TICK':
      if (state.status !== 'playing') return state;
      const { inputs, deltaTime } = action.payload;
      const { player, enemies, bullets } = state;

      // Player movement
      const turnSpeed = 0.05;
      let newAngle = player.angle;
      if (inputs.left) newAngle -= turnSpeed;
      if (inputs.right) newAngle += turnSpeed;

      const newPlayerX = Math.max(player.width/2, Math.min(GAME_WIDTH - player.width/2, player.x + Math.cos(newAngle) * player.speed));
      const newPlayerY = Math.max(player.height/2, Math.min(GAME_HEIGHT - player.height/2, player.y + Math.sin(newAngle) * player.speed));

      // Player shooting
      let newBullets = [...bullets];
      if (inputs.shoot && (inputs.lastShotTime === 0 || deltaTime - inputs.lastShotTime > 200)) {
        newBullets.push({ id: Math.random(), x: player.x, y: player.y, angle: newAngle });
        inputs.lastShotTime = deltaTime;
      }

      // Move bullets
      newBullets = newBullets
        .map(b => ({ ...b, x: b.x + Math.cos(b.angle) * 10, y: b.y + Math.sin(b.angle) * 10 }))
        .filter(b => b.x > 0 && b.x < GAME_WIDTH && b.y > 0 && b.y < GAME_HEIGHT);

      // Spawn enemies
      let newEnemies = [...enemies];
      if (Math.random() < 0.02) {
          newEnemies.push({
              id: Math.random(),
              x: Math.random() * (GAME_WIDTH - 20) + 10,
              y: -30,
              width: 28,
              height: 45,
              angle: Math.PI / 2,
              speed: 1 + Math.random(),
              health: ENEMY_HEALTH_MAX,
              maxHealth: ENEMY_HEALTH_MAX,
          });
      }

      // Move enemies
      newEnemies = newEnemies.map(e => ({...e, y: e.y + e.speed})).filter(e => e.y < GAME_HEIGHT + 50);

      // Collisions
      const newExplosions = [...state.explosions];
      let newScore = state.score;
      let newPlayerHealth = player.health;

      // Bullet vs Enemy
      for (const bullet of newBullets) {
        for (const enemy of newEnemies) {
          if (Math.abs(bullet.x - enemy.x) < enemy.width / 2 && Math.abs(bullet.y - enemy.y) < enemy.height / 2) {
            enemy.health -= 15;
            bullet.x = -1000; // Mark for removal
          }
        }
      }
      
      // Player vs Enemy
      for (const enemy of newEnemies) {
         if (Math.abs(player.x - enemy.x) < (player.width + enemy.width)/2 && Math.abs(player.y - enemy.y) < (player.height + enemy.height)/2) {
             enemy.health = 0; // Ram destroys them
             newPlayerHealth -= 10;
             newExplosions.push({id: Math.random(), x: enemy.x, y: enemy.y});
         }
      }

      newEnemies.forEach(e => {
          if (e.health <= 0) {
              newScore += 100;
              newExplosions.push({id: Math.random(), x: e.x, y: e.y});
          }
      });
      
      const updatedEnemies = newEnemies.filter(e => e.health > 0);
      const updatedBullets = newBullets.filter(b => b.x > -100);

      if (newPlayerHealth <= 0) {
        return { ...state, status: 'finished', player: { ...player, health: 0 }};
      }

      return {
        ...state,
        player: { ...player, x: newPlayerX, y: newPlayerY, angle: newAngle, health: newPlayerHealth },
        enemies: updatedEnemies,
        bullets: updatedBullets,
        explosions: newExplosions,
        score: newScore,
      };
    default:
      return state;
  }
}

interface InputState {
    left: boolean;
    right: boolean;
    shoot: boolean;
    lastShotTime: number;
}
const useGameLoop = (dispatch: React.Dispatch<GameAction>) => {
    const loopRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const inputsRef = useRef<InputState>({ left: false, right: false, shoot: false, lastShotTime: 0 });

    const loop = useCallback((time: number) => {
        if (lastTimeRef.current === 0) {
            lastTimeRef.current = time;
        }
        dispatch({ type: 'TICK', payload: { inputs: inputsRef.current, deltaTime: time } });
        loopRef.current = requestAnimationFrame(loop);
    }, [dispatch]);

    useEffect(() => {
        loopRef.current = requestAnimationFrame(loop);
        return () => {
            if (loopRef.current) cancelAnimationFrame(loopRef.current);
        };
    }, [loop]);

    return inputsRef;
};


export const FastFuriousTakedownGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  useDynamicTheme(sanFranciscoArea?.themeColors!);
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { player, enemies, bullets, explosions, score, timeLeft, status } = state;
  const inputsRef = useGameLoop(dispatch);
  
  useEffect(() => {
    if (status !== 'playing') {
      return;
    }

    const timer = setInterval(() => {
        dispatch({ type: 'TIME_TICK' });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, dispatch]);


  const startGame = () => dispatch({ type: 'START_GAME' });
  const resetGame = () => dispatch({ type: 'RESET_GAME' });

  const renderGameArea = () => (
    <div className="relative w-full h-full bg-slate-600 overflow-hidden" style={{ width: GAME_WIDTH, height: GAME_HEIGHT, backgroundImage: 'linear-gradient(#4a5568 1px, transparent 1px), linear-gradient(90deg, #4a5568 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        {/* Player */}
        <div style={{ position: 'absolute', width: player.width, height: player.height, left: player.x, top: player.y, transform: `translate(-50%, -50%) rotate(${player.angle + Math.PI / 2}rad)` }}>
            <div className="w-full h-full bg-orange-500 rounded-md border-2 border-black">
                <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-slate-800 rounded-sm"></div>
            </div>
        </div>
        {/* Enemies */}
        {enemies.map(e => (
            <div key={e.id} style={{ position: 'absolute', width: e.width, height: e.height, left: e.x, top: e.y, transform: `translate(-50%, -50%) rotate(${e.angle + Math.PI / 2}rad)`}}>
                 <div className="w-full h-full bg-slate-400 rounded-md border-2 border-black">
                    <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-slate-900 rounded-sm"></div>
                 </div>
            </div>
        ))}
        {/* Bullets */}
        {bullets.map(b => <div key={b.id} className="absolute w-1 h-3 bg-yellow-300 rounded-full" style={{ left: b.x, top: b.y, transform: 'translate(-50%, -50%)' }} />)}
        {/* Explosions */}
        {explosions.map(ex => <div key={ex.id} className="absolute w-16 h-16 bg-yellow-400 rounded-full animate-ping" style={{ left: ex.x, top: ex.y, transform: 'translate(-50%, -50%)' }} />)}
    </div>
  );
  
  const ControlButton: React.FC<{onInteraction: (active: boolean) => void, children: React.ReactNode, className?: string}> = ({onInteraction, children, className}) => (
      <button 
        onMouseDown={() => onInteraction(true)}
        onMouseUp={() => onInteraction(false)}
        onMouseLeave={() => onInteraction(false)}
        onTouchStart={(e) => { e.preventDefault(); onInteraction(true); }}
        onTouchEnd={(e) => { e.preventDefault(); onInteraction(false); }}
        className={`w-20 h-20 md:w-24 md:h-24 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-3xl select-none active:bg-red-700 ${className}`}
      >
          {children}
      </button>
  );

  return (
    <div className="text-center p-2 md:p-4 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border-2 border-[--color-primary]">
       <header className="mb-4">
        <h2 className="text-4xl font-black text-[--color-secondary] drop-shadow-lg tracking-tighter" style={{ fontFamily: "'Cinzel', serif" }}>
          Fast & Furious: Takedown
        </h2>
        <p className="text-xl text-[--color-text-primary]">Fast & Furious – Supercharged</p>
      </header>
      <main className="mx-auto bg-[--color-background] rounded-lg overflow-hidden relative shadow-inner flex flex-col items-center" style={{ width: GAME_WIDTH, height: GAME_HEIGHT + 150}}>
        {status === 'playing' && (
          <div className="w-full p-2 bg-black/50 z-10 text-white flex justify-between font-bold text-lg">
              <span>Score: {score}</span>
               <div className="w-32 bg-gray-500 rounded-full h-6 border-2 border-black"><div className="bg-green-500 h-full rounded-full" style={{width: `${(player.health/player.maxHealth) * 100}%`}}></div></div>
              <span>Temps: {state.timeLeft}</span>
          </div>
        )}
        <div className="relative" style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
            {status === 'ready' && <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center z-20 text-center p-4">
                <h3 className="text-2xl font-bold mb-2 text-white">Préparez-vous au chaos.</h3>
                <p className="text-lg text-slate-300 mb-6">Détruisez autant de véhicules ennemis que possible en 90 secondes. Tirez ou foncez-leur dedans !</p>
                <button onClick={startGame} className="px-8 py-4 bg-[--color-secondary] text-black rounded-lg font-black text-2xl shadow-lg hover:brightness-110">DÉMARRER</button>
            </div>}
            {status === 'finished' && <div className="absolute inset-0 bg-black/70 flex flex-col justify-center items-center z-20 text-center p-4">
                <h3 className="text-2xl font-bold text-white">Mission terminée</h3>
                <p className="text-6xl font-black text-orange-500 my-4">{score}</p>
                <button onClick={resetGame} className="px-8 py-4 bg-[--color-accent] text-black rounded-lg font-black text-2xl shadow-lg hover:brightness-110">REJOUER</button>
            </div>}
            {renderGameArea()}
        </div>
         {status === 'playing' && (
            <div className="w-full flex justify-between items-center p-4 z-10">
                <ControlButton onInteraction={(active) => inputsRef.current.left = active}>◀</ControlButton>
                <ControlButton onInteraction={(active) => inputsRef.current.shoot = active} className="bg-orange-500 active:bg-orange-600">💥</ControlButton>
                <ControlButton onInteraction={(active) => inputsRef.current.right = active}>▶</ControlButton>
            </div>
        )}
      </main>
      <BackButton onClick={onBack} text="Quitter le garage" />
    </div>
  );
};
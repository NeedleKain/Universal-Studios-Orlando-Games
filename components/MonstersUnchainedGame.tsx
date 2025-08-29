
import React, { useState, useReducer, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { BackButton } from './BackButton';
import { Spinner } from './Spinner';
import { useDynamicTheme } from '../hooks/useDynamicTheme';
import { PARKS_DATA } from '../constants';

// --- TYPES ---
interface MonstersUnchainedGameProps {
  onBack: () => void;
}

type GameStatus = 'ready' | 'loading' | 'playing' | 'won' | 'lost' | 'error';

interface Reagent {
    name: string;
    type: 'SWAP' | 'INVERT' | 'REPLACE';
    description: string;
}

interface GeneticNode {
    name: string;
    description: string;
    initialDNA: string[];
    targetDNA: string[];
    unstableGeneSymbol: string | null;
    optimalMoveCount: number;
}

interface MonsterCurePlan {
    monsterName: string;
    curseStory: string;
    imagePrompt: string;
    availableReagents: Reagent[];
    geneticMap: GeneticNode[];
}

interface GameState {
    status: GameStatus;
    curePlan: MonsterCurePlan | null;
    monsterImage: string | null;
    score: number;
    currentStageIndex: number;
    serumLevel: number;
    patientStability: number;
    error: string | null;
}

type GameAction =
    | { type: 'START_GAME' }
    | { type: 'CURE_PLAN_FETCH_SUCCESS'; payload: { plan: MonsterCurePlan; image: string; } }
    | { type: 'API_ERROR'; payload: string }
    | { type: 'APPLY_REAGENT'; payload: { serumCost: number; stabilityCost: number; } }
    | { type: 'ATTEMPT_CURE'; payload: { isCorrect: boolean; moveCount: number; } }
    | { type: 'STABILIZE' }
    | { type: 'SET_GAME_OVER'; payload: { won: boolean } };

// --- CONSTANTS & API ---
const DNA_SYMBOLS = ['A', 'T', 'C', 'G'];
const STABILIZER_SERUM_COST = 30;
const STABILIZER_HEAL_AMOUNT = 20;
const UNSTABLE_GENE_PENALTY = 5;
const BASE_SERUM_COST = 5;

const systemInstruction = `You are a Game Master for "Monsters Unchained: Genetic Cure," a puzzle game. Your task is to generate a complete, multi-stage cure plan for a single monster (Frankenstein's Monster, Bride, Dracula, The Wolf Man, The Mummy, The Werewolf, Creature from the Black Lagoon). Your response MUST be a valid JSON object following the provided schema. All text content for the player must be in FRENCH. The image prompt must be in ENGLISH.

- monsterName/curseStory: Provide a backstory for the monster.
- availableReagents: Provide 2-3 unique reagent tools from the allowed types.
- geneticMap: Create an array of 3-4 'GeneticNode' objects. Each node is a stage of the cure (e.g., 'Chromosome de Rage'). For each node:
  - 'initialDNA': A sequence of 4-6 symbols from [A, T, C, G].
  - 'targetDNA': The result of applying 2-4 mutations to the 'initialDNA'.
  - 'unstableGeneSymbol': Optionally, pick ONE symbol ('A','T','C','G') to be "unstable" for this stage. If so, provide the symbol. Otherwise, provide null. Manipulating this gene should be risky.
  - 'optimalMoveCount': Provide an integer representing the minimum number of reagent applications to solve this stage's puzzle.
  - The puzzle for each node MUST be solvable using ONLY the 'availableReagents'.`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        monsterName: { type: Type.STRING },
        curseStory: { type: Type.STRING },
        imagePrompt: { type: Type.STRING },
        availableReagents: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING, enum: ['SWAP', 'INVERT', 'REPLACE'] }, description: { type: Type.STRING } }, required: ['name', 'type', 'description'] } },
        geneticMap: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    initialDNA: { type: Type.ARRAY, items: { type: Type.STRING, enum: DNA_SYMBOLS } },
                    targetDNA: { type: Type.ARRAY, items: { type: Type.STRING, enum: DNA_SYMBOLS } },
                    unstableGeneSymbol: { type: Type.STRING, nullable: true },
                    optimalMoveCount: { type: Type.INTEGER }
                },
                required: ['name', 'description', 'initialDNA', 'targetDNA', 'unstableGeneSymbol', 'optimalMoveCount']
            }
        }
    },
    required: ['monsterName', 'curseStory', 'imagePrompt', 'availableReagents', 'geneticMap']
};


// --- REDUCER ---
const initialState: GameState = {
    status: 'ready',
    curePlan: null,
    monsterImage: null,
    score: 0,
    currentStageIndex: 0,
    serumLevel: 100,
    patientStability: 100,
    error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_GAME':
            return { ...initialState, status: 'loading' };
        case 'CURE_PLAN_FETCH_SUCCESS':
            return { ...state, status: 'playing', curePlan: action.payload.plan, monsterImage: action.payload.image };
        case 'API_ERROR':
            return { ...state, status: 'error', error: action.payload };
        case 'APPLY_REAGENT':
            const { serumCost, stabilityCost } = action.payload;
            const nextSerum = state.serumLevel - serumCost;
            const nextStability = state.patientStability - stabilityCost;
            if (nextSerum < 0 || nextStability <= 0) {
                return { ...state, status: 'lost', patientStability: Math.max(0, nextStability), serumLevel: Math.max(0, nextSerum) };
            }
            return { ...state, serumLevel: nextSerum, patientStability: nextStability };
        case 'ATTEMPT_CURE':
            const { isCorrect, moveCount } = action.payload;
            if (isCorrect) {
                const currentNode = state.curePlan!.geneticMap[state.currentStageIndex];
                const isPure = moveCount <= currentNode.optimalMoveCount;
                const purityBonus = isPure ? 50 : 0;
                const serumBonus = isPure ? 25 : 15;
                const stabilityBonus = isPure ? 30 : 25;

                const nextStageIndex = state.currentStageIndex + 1;
                const newScore = state.score + 100 + state.serumLevel + purityBonus;
                const newStability = Math.min(100, state.patientStability + stabilityBonus);

                if (nextStageIndex >= (state.curePlan?.geneticMap.length ?? 0)) {
                    return { ...state, status: 'won', score: newScore, patientStability: newStability };
                }
                return { ...state, currentStageIndex: nextStageIndex, score: newScore, patientStability: newStability, serumLevel: Math.min(100, state.serumLevel + serumBonus) };
            } else {
                const newStability = state.patientStability - 35;
                if (newStability <= 0) {
                    return { ...state, status: 'lost', patientStability: 0 };
                }
                return { ...state, patientStability: newStability };
            }
        case 'STABILIZE':
            if (state.serumLevel < STABILIZER_SERUM_COST) return state;
            return {
                ...state,
                serumLevel: state.serumLevel - STABILIZER_SERUM_COST,
                patientStability: Math.min(100, state.patientStability + STABILIZER_HEAL_AMOUNT)
            };
        case 'SET_GAME_OVER':
            return { ...state, status: action.payload.won ? 'won' : 'lost' };
        default:
            return state;
    }
}

// --- PUZZLE SOLVER COMPONENT ---
const PuzzleSolver: React.FC<{
    node: GeneticNode;
    reagents: Reagent[];
    dispatch: React.Dispatch<GameAction>;
    pulseKey: number;
}> = ({ node, reagents, dispatch, pulseKey }) => {
    const [playerDNA, setPlayerDNA] = useState<string[]>(node.initialDNA);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [activeReagent, setActiveReagent] = useState<Reagent | null>(null);
    const [moveCount, setMoveCount] = useState(0);

    useEffect(() => {
        setPlayerDNA(node.initialDNA);
        setSelectedIndices([]);
        setActiveReagent(null);
        setMoveCount(0);
    }, [node]);

    const applyManipulation = (newDNA: string[], manipulatedIndices: number[]) => {
        let stabilityCost = 0;
        if (node.unstableGeneSymbol) {
            manipulatedIndices.forEach(index => {
                if (playerDNA[index] === node.unstableGeneSymbol) {
                    stabilityCost += UNSTABLE_GENE_PENALTY;
                }
            });
        }
        dispatch({ type: 'APPLY_REAGENT', payload: { serumCost: BASE_SERUM_COST, stabilityCost } });
        setPlayerDNA(newDNA);
        setMoveCount(m => m + 1);
        resetSelection();
    };

    const handleGeneClick = (index: number) => {
        if (!activeReagent) return;

        let newSelected = [...selectedIndices, index];

        if (activeReagent.type === 'SWAP' && newSelected.length === 2) {
            const newDNA = [...playerDNA];
            [newDNA[newSelected[0]], newDNA[newSelected[1]]] = [newDNA[newSelected[1]], newDNA[newSelected[0]]];
            applyManipulation(newDNA, newSelected);
        } else if (activeReagent.type === 'INVERT' && newSelected.length === 2) {
            const newDNA = [...playerDNA];
            const start = Math.min(newSelected[0], newSelected[1]);
            const end = Math.max(newSelected[0], newSelected[1]);
            const segment = newDNA.slice(start, end + 1).reverse();
            newDNA.splice(start, segment.length, ...segment);
            applyManipulation(newDNA, Array.from({length: end - start + 1}, (_, i) => start + i));
        } else if (activeReagent.type === 'REPLACE' && newSelected.length === 1) {
            const newDNA = [...playerDNA];
            const currentGene = newDNA[newSelected[0]];
            const nextGeneIndex = (DNA_SYMBOLS.indexOf(currentGene) + 1) % DNA_SYMBOLS.length;
            newDNA[newSelected[0]] = DNA_SYMBOLS[nextGeneIndex];
            applyManipulation(newDNA, newSelected);
        } else {
            setSelectedIndices(newSelected);
        }
    };

    const resetSelection = () => {
        setSelectedIndices([]);
        setActiveReagent(null);
    };

    const handleAttemptCure = () => {
        const isCorrect = JSON.stringify(playerDNA) === JSON.stringify(node.targetDNA);
        dispatch({type: 'ATTEMPT_CURE', payload: {isCorrect, moveCount}});
    };

    const GeneTile: React.FC<{ gene: string; index: number; onClick: (i:number) => void; isSelected: boolean; isUnstable: boolean;}> = ({gene, index, onClick, isSelected, isUnstable}) => {
      const colorMap: Record<string, string> = { 'A': 'bg-red-500', 'T': 'bg-blue-500', 'C': 'bg-green-500', 'G': 'bg-yellow-500'};
      return <button onClick={() => onClick(index)} className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-xl md:text-3xl font-black rounded-md transition-all duration-200 relative ${colorMap[gene]} ${isSelected ? 'ring-4 ring-purple-400 scale-110' : 'hover:scale-105'}`}>
          {isUnstable && <div className="absolute inset-0 bg-red-500 opacity-75 rounded-md animate-pulse-unstable" />}
          <span className="relative z-10">{gene}</span>
        </button>
    };

    return (
        <div className="w-full h-full flex flex-col justify-between items-center p-2 md:p-4">
            <div>
                <div className="text-center mb-2">
                    <p className="font-semibold text-xs text-gray-400">SÉQUENCE CIBLE</p>
                    <div className="flex justify-center gap-1 my-1">{node.targetDNA.map((g, i) => <div key={i} className={`w-6 h-6 flex items-center justify-center text-sm font-black rounded-sm ${ { 'A': 'bg-red-800', 'T': 'bg-blue-800', 'C': 'bg-green-800', 'G': 'bg-yellow-800'}[g]}`}>{g}</div>)}</div>
                </div>
                 <div className="text-center text-xs font-bold text-gray-400">
                    <span>COUPS : {moveCount}</span> / <span className="text-purple-400">PAR : {node.optimalMoveCount}</span>
                </div>
            </div>
            
            <div className="flex-grow flex flex-col justify-center items-center">
                 <p className="font-semibold text-center text-white text-base md:text-lg mb-2">SÉQUENCE ACTUELLE :</p>
                <div key={pulseKey} className="flex justify-center gap-2 my-2 animate-pulse-reagent">{playerDNA.map((g, i) => <GeneTile key={i} gene={g} index={i} onClick={handleGeneClick} isSelected={selectedIndices.includes(i)} isUnstable={g === node.unstableGeneSymbol} />)}</div>
            </div>

            <div>
                 <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {reagents.map(r => (
                        <button key={r.name} onClick={() => { setActiveReagent(r); setSelectedIndices([]); }}
                            className={`px-3 py-2 border-2 rounded-lg text-sm ${activeReagent?.name === r.name ? 'bg-purple-600 border-purple-300' : 'bg-neutral-800 border-neutral-600 hover:border-purple-500'}`}
                            title={r.description}
                        >
                            {r.name}
                        </button>
                    ))}
                    <button onClick={() => dispatch({type: 'STABILIZE'})}
                        className="px-3 py-2 border-2 rounded-lg text-sm bg-sky-800 border-sky-600 hover:border-sky-400"
                        title={`Consomme ${STABILIZER_SERUM_COST} sérum pour restaurer ${STABILIZER_HEAL_AMOUNT} stabilité.`}
                    >
                        Stabilisateur
                    </button>
                </div>
                <button onClick={handleAttemptCure} className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-black text-xl md:text-2xl shadow-lg hover:bg-green-500 transition-transform hover:scale-105 transform">
                    INJECTER
                </button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export const MonstersUnchainedGame: React.FC<MonstersUnchainedGameProps> = ({ onBack }) => {
    const darkUniverseTheme = PARKS_DATA.find(p => p.id === 'epic-universe')?.areas.find(a => a.name === 'Dark Universe')?.themeColors;
    useDynamicTheme(darkUniverseTheme!);

    const [state, dispatch] = useReducer(gameReducer, initialState);
    const [showSuccessFlash, setShowSuccessFlash] = useState(false);
    const [pulseKey, setPulseKey] = useState(0);
    const ai = useRef<GoogleGenAI | null>(null);

    const prevStageIndex = useRef(state.currentStageIndex);

    useEffect(() => {
        if (state.status === 'playing' && state.currentStageIndex > prevStageIndex.current) {
            setShowSuccessFlash(true);
            const timer = setTimeout(() => setShowSuccessFlash(false), 500);
            return () => clearTimeout(timer);
        }
        prevStageIndex.current = state.currentStageIndex;
    }, [state.currentStageIndex, state.status]);

    const fetchCurePlan = useCallback(async () => {
        if (!ai.current) {
            ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        }
        try {
            const dataResponse = await ai.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: "Génère un nouveau plan de guérison.",
                config: { systemInstruction, responseMimeType: "application/json", responseSchema }
            });
            const plan = JSON.parse(dataResponse.text) as MonsterCurePlan;

            const imageResponse = await ai.current.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: plan.imagePrompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' }
            });
            const monsterImage = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
            
            dispatch({ type: 'CURE_PLAN_FETCH_SUCCESS', payload: { plan, image: monsterImage } });
        } catch (e) {
            console.error(e);
            dispatch({ type: 'API_ERROR', payload: "Une surtension a grillé les moniteurs. Veuillez réessayer." });
        }
    }, []);

    useEffect(() => {
        if (state.status === 'loading') {
            if (!process.env.API_KEY) {
                dispatch({ type: 'API_ERROR', payload: "Clé API non configurée. Impossible de contacter le laboratoire." });
                return;
            }
            fetchCurePlan();
        }
    }, [state.status, fetchCurePlan]);
    
    const StatusBar: React.FC<{label: string; value: number; color: string;}> = ({label, value, color}) => (
        <div className="w-full">
            <div className="flex justify-between text-sm font-bold mb-1">
                <span>{label}</span>
                <span>{Math.round(value)}%</span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-4 border-2 border-neutral-600 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{width: `${value}%`, backgroundColor: color}} />
            </div>
        </div>
    );

    const renderContent = () => {
        switch (state.status) {
            case 'ready':
                return (
                    <div className="text-center p-4">
                        <h3 className="text-2xl font-bold mb-2">Laboratoire Génétique</h3>
                        <p className="text-lg text-[--color-text-secondary] mb-6 max-w-md mx-auto">Le Dr. Frankenstein vous confie ses patients. Leur ADN est corrompu par d'anciennes malédictions. Manipulez leurs gènes pour les guérir, mais attention aux ressources et à la stabilité du patient.</p>
                        <button onClick={() => dispatch({type: 'START_GAME'})} className="px-8 py-4 bg-purple-600 text-white rounded-lg font-black text-2xl shadow-lg hover:bg-purple-500 transition-transform hover:scale-105 transform">
                            COMMENCER L'EXPÉRIENCE
                        </button>
                    </div>
                );
            case 'loading':
                return <div className="flex flex-col items-center justify-center gap-4"><Spinner /><p className="text-xl text-purple-400 animate-pulse">Analyse du patient...</p></div>;
            case 'error':
                return <div className="text-center text-red-400 p-4"><h3 className="text-2xl font-bold mb-4">Erreur Critique !</h3><p>{state.error}</p><button onClick={() => dispatch({type: 'START_GAME'})} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded">Réessayer</button></div>;
            case 'won':
            case 'lost':
                const isWon = state.status === 'won';
                return (
                    <div className="text-center p-4 animate-fade-in">
                        <h3 className={`text-5xl font-black mb-4 ${isWon ? 'text-green-400' : 'text-red-500'}`}>{isWon ? "GUÉRISON RÉUSSIE !" : "ÉCHEC CATASTROPHIQUE"}</h3>
                        <p className="text-lg text-white mb-2">{isWon ? "Vous avez maîtrisé la science de la vie ! Le patient est humain à nouveau." : "La séquence génétique s'est effondrée. Le patient est perdu..."}</p>
                        <p className="text-4xl font-bold text-purple-400 my-4">Score final : {state.score}</p>
                        <button onClick={() => dispatch({type: 'START_GAME'})} className="px-8 py-4 bg-purple-600 text-white rounded-lg font-black text-2xl shadow-lg hover:bg-purple-500 transition-transform hover:scale-105 transform">
                            NOUVELLE EXPÉRIENCE
                        </button>
                    </div>
                );
            case 'playing':
                if (!state.curePlan || !state.monsterImage) return <Spinner />;
                const currentNode = state.curePlan.geneticMap[state.currentStageIndex];
                return (
                     <div className="w-full h-full flex flex-col md:flex-row gap-4 p-2 animate-fade-in">
                        {/* Left Panel: Monitor */}
                        <div className="w-full md:w-1/3 flex flex-col gap-4 bg-black/30 rounded-lg p-4 border border-purple-800">
                           <img src={state.monsterImage} alt={state.curePlan.monsterName} className="w-full h-auto object-cover rounded" />
                           <div className="text-center flex-grow flex flex-col justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-purple-400">{state.curePlan.monsterName}</h3>
                                    <p className="text-xs text-gray-400 mt-1 italic">"{state.curePlan.curseStory}"</p>
                                </div>
                                <div className="space-y-3 mt-4">
                                    <StatusBar label="Stabilité du Patient" value={state.patientStability} color="#4ade80" />
                                    <StatusBar label="Sérum Catalyseur" value={state.serumLevel} color="#a855f7" />
                                </div>
                           </div>
                        </div>

                        {/* Right Panel: Puzzle */}
                        <div className="w-full md:w-2/3 flex flex-col justify-between gap-2 bg-black/30 rounded-lg p-2 border border-purple-800">
                           <div className="text-center p-2 bg-neutral-900 rounded-t-md">
                            <p className="text-sm font-bold text-gray-400">ÉTAPE {state.currentStageIndex + 1} / {state.curePlan.geneticMap.length}</p>
                            <h4 className="text-lg font-bold text-purple-300">{currentNode.name}</h4>
                           </div>
                           <div className="flex-grow">
                             <PuzzleSolver 
                                node={currentNode} 
                                reagents={state.curePlan.availableReagents}
                                dispatch={(action) => {
                                    if(action.type === 'APPLY_REAGENT') setPulseKey(k => k + 1);
                                    dispatch(action);
                                }}
                                pulseKey={pulseKey}
                             />
                           </div>
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="relative p-2 md:p-4 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border-4 border-neutral-600 w-full max-w-6xl mx-auto">
             <style>{`
                @keyframes flash-out { 0% { opacity: 0.7; } 100% { opacity: 0; } }
                .animate-flash-out { animation: flash-out 0.5s ease-out forwards; }
                @keyframes pulse-reagent { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                .animate-pulse-reagent { animation: pulse-reagent 0.3s ease-in-out; }
                @keyframes pulse-unstable { 0% { box-shadow: 0 0 10px 2px rgba(239, 68, 68, 0.7); } 50% { box-shadow: 0 0 15px 5px rgba(239, 68, 68, 0.3); } 100% { box-shadow: 0 0 10px 2px rgba(239, 68, 68, 0.7); } }
                .animate-pulse-unstable { animation: pulse-unstable 1.5s infinite; }
             `}</style>
            {showSuccessFlash && <div className="absolute inset-0 bg-white z-50 animate-flash-out pointer-events-none" />}

             <header className="mb-4 text-center">
                <h2 className="text-4xl font-black text-purple-500 drop-shadow-lg" style={{fontFamily: "'Cinzel', serif"}}>Monsters Unchained: Guérison Génétique</h2>
                <span className="text-lg font-bold text-white">Score: <span className="text-purple-300">{state.score}</span></span>
            </header>
            <main className="min-h-[70vh] flex items-center justify-center bg-[--color-background] rounded-md shadow-inner">
                {renderContent()}
            </main>
            <BackButton onClick={onBack} text="Fuir le laboratoire" />
        </div>
    );
};

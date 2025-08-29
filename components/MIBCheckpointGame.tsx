import React, { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { BackButton } from './BackButton';
import { Spinner } from './Spinner';
import { useDynamicTheme } from '../hooks/useDynamicTheme';
import { PARKS_DATA } from '../constants';

// --- TYPES ---
interface MIBCheckpointGameProps {
  onBack: () => void;
}

type GameStatus = 'ready' | 'loading' | 'inspecting' | 'result' | 'error';
type Decision = 'APPROVE' | 'DENY' | 'ALERT';
type ActiveScan = 'none' | 'contraband' | 'weapon';

interface AlienData {
    name: string;
    planet: string;
    appearanceDescription: string;
    imagePrompt: string;
    passportData: { name: string; planet: string; expiryDate: string; };
    statedPurpose: string;
    secret: { truePurpose: string; hiddenItem: { name: string; type: string; }; };
    dialogue: { question: string; answer: string; isLie: boolean; }[];
    correctDecision: Decision;
}

interface GameState {
    status: GameStatus;
    alienData: AlienData | null;
    alienImage: string | null;
    score: number;
    aliensProcessed: number;
    lastDecision: { correct: boolean; message: string; } | null;
    error: string | null;
}

type GameAction =
    | { type: 'START_SHIFT' }
    | { type: 'ALIEN_FETCH_SUCCESS'; payload: { data: AlienData; image: string; } }
    | { type: 'API_ERROR'; payload: string }
    | { type: 'MAKE_DECISION'; payload: Decision }
    | { type: 'NEXT_ALIEN' };

// --- REDUCER ---
const initialState: GameState = {
    status: 'ready',
    alienData: null,
    alienImage: null,
    score: 0,
    aliensProcessed: 0,
    lastDecision: null,
    error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_SHIFT':
            return { ...initialState, status: 'loading' };
        case 'ALIEN_FETCH_SUCCESS':
            return {
                ...state,
                status: 'inspecting',
                alienData: action.payload.data,
                alienImage: action.payload.image,
                lastDecision: null,
            };
        case 'API_ERROR':
            return { ...state, status: 'error', error: action.payload };
        case 'MAKE_DECISION':
            if (!state.alienData) return state;
            const isCorrect = action.payload === state.alienData.correctDecision;
            let message = '';
            if(isCorrect) {
                message = "Bonne décision, agent. Le QG est en sécurité grâce à vous."
            } else {
                message = `ERREUR, Agent ! La bonne décision était ${state.alienData.correctDecision}. Un(e) ${state.alienData.secret.truePurpose} vient de s'infiltrer !`
            }
            return {
                ...state,
                status: 'result',
                score: state.score + (isCorrect ? 100 : -50),
                aliensProcessed: state.aliensProcessed + 1,
                lastDecision: { correct: isCorrect, message: message }
            };
        case 'NEXT_ALIEN':
            return { ...state, status: 'loading', alienData: null, alienImage: null };
        default:
            return state;
    }
}

// --- API & SCHEMA ---
const systemInstruction = `You are the Game Master for "MIB: Agent au Tri", a "Papers, Please" style game. The player is a rookie MIB agent screening aliens. Your task is to generate a complete, self-contained case file for one alien. The alien might be a simple tourist, a smuggler, a spy, or something else. You must create inconsistencies, lies, or hidden items for the player to find. The 'hiddenItem' object must contain a 'name' (e.g., 'Un Pistolet à Criquets') and a 'type' ('weapon', 'contraband', or 'none'). Your response MUST be a valid JSON object following the provided schema. All text content for the player (names, planets, purposes, dialogue) must be in FRENCH. The image prompt must be in ENGLISH.`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Alien's full name (e.g., Zorp Glorbax)." },
        planet: { type: Type.STRING, description: "Alien's home planet (e.g., Xylos-7)." },
        appearanceDescription: { type: Type.STRING, description: "A brief physical description of the alien in French." },
        imagePrompt: { type: Type.STRING, description: "Detailed ENGLISH prompt for a cinematic passport photo of the alien." },
        passportData: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "Name on passport. Might have a typo." },
                planet: { type: Type.STRING, description: "Planet on passport. Might be different." },
                expiryDate: { type: Type.STRING, description: "Date in YYYY-MM-DD format. Might be expired." },
            },
            required: ['name', 'planet', 'expiryDate']
        },
        statedPurpose: { type: Type.STRING, description: "The reason they give for visiting Earth, in French." },
        secret: {
            type: Type.OBJECT,
            properties: {
                truePurpose: { type: Type.STRING, description: "The alien's real goal in French (e.g., 'touriste honnête', 'contrebandier', 'espion')." },
                hiddenItem: {
                    type: Type.OBJECT,
                    description: "Details about a specific hidden item.",
                    properties: {
                        name: { type: Type.STRING, description: "Name of the hidden item in French (e.g., 'Un Pistolet à Criquets'). Must be 'rien d'inhabituel' if nothing is hidden." },
                        type: { type: Type.STRING, description: "The type of item. Must be 'weapon', 'contraband', or 'none'."}
                    },
                    required: ['name', 'type']
                },
            },
            required: ['truePurpose', 'hiddenItem']
        },
        dialogue: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "A question the player can ask, in French." },
                    answer: { type: Type.STRING, description: "The alien's response, in French." },
                    isLie: { type: Type.BOOLEAN }
                },
                required: ['question', 'answer', 'isLie']
            }
        },
        correctDecision: { type: Type.STRING, description: "The single correct action: 'APPROVE', 'DENY', or 'ALERT'." }
    },
    required: ['name', 'planet', 'appearanceDescription', 'imagePrompt', 'passportData', 'statedPurpose', 'secret', 'dialogue', 'correctDecision']
};


// --- MAIN COMPONENT ---
export const MIBCheckpointGame: React.FC<MIBCheckpointGameProps> = ({ onBack }) => {
    const mibTheme = PARKS_DATA.find(p => p.id === 'universal-studios')?.areas.find(a => a.name === 'World Expo')?.themeColors;
    useDynamicTheme(mibTheme!);

    const [state, dispatch] = useReducer(gameReducer, initialState);
    const ai = useRef<GoogleGenAI | null>(null);
    const prefetchedAlien = useRef<{ data: AlienData; image: string; } | null>(null);

    const [activeTab, setActiveTab] = useState('passport');
    const [activeScan, setActiveScan] = useState<ActiveScan>('none');
    
    const fetchAlienCase = useCallback(async (): Promise<{ data: AlienData; image: string; }> => {
        if (!ai.current) {
            ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        }
        try {
            const dataResponse = await ai.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: "Génère un nouveau cas d'alien pour l'agent.",
                config: { systemInstruction, responseMimeType: "application/json", responseSchema }
            });
            const alienData = JSON.parse(dataResponse.text) as AlienData;

            const imageResponse = await ai.current.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: alienData.imagePrompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' }
            });
            const alienImage = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
            
            return { data: alienData, image: alienImage };
        } catch (e) {
            console.error(e);
            throw new Error("La connexion avec le QG a été perdue. Réessayez.");
        }
    }, []);

    // Initial load
    useEffect(() => {
        if (state.status === 'loading' && state.aliensProcessed === 0) {
            if (!process.env.API_KEY) {
                dispatch({ type: 'API_ERROR', payload: "Clé API non configurée. Impossible de contacter le QG." });
                return;
            }
            fetchAlienCase()
                .then(payload => dispatch({ type: 'ALIEN_FETCH_SUCCESS', payload }))
                .catch(err => dispatch({ type: 'API_ERROR', payload: err.message }));
        }
    }, [state.status, state.aliensProcessed, fetchAlienCase]);

    // Pre-fetching logic
    useEffect(() => {
        if (state.status === 'inspecting' && !prefetchedAlien.current) {
            fetchAlienCase().then(result => {
                prefetchedAlien.current = result;
            }).catch(e => {
                console.warn("Pre-fetch failed:", e.message);
                prefetchedAlien.current = null;
            });
        }
    }, [state.status, fetchAlienCase]);

    const handleDecision = (decision: Decision) => {
        dispatch({ type: 'MAKE_DECISION', payload: decision });
    };

    const handleNextAlien = useCallback(() => {
        if (prefetchedAlien.current) {
            dispatch({ type: 'ALIEN_FETCH_SUCCESS', payload: prefetchedAlien.current });
            prefetchedAlien.current = null;
        } else {
            dispatch({ type: 'NEXT_ALIEN' });
            fetchAlienCase()
                .then(payload => dispatch({ type: 'ALIEN_FETCH_SUCCESS', payload }))
                .catch(err => dispatch({ type: 'API_ERROR', payload: err.message }));
        }
    }, [fetchAlienCase]);

    const renderContent = () => {
        switch (state.status) {
            case 'ready':
                return (
                    <div className="text-center">
                        <h3 className="text-2xl font-bold mb-2">Prise de service</h3>
                        <p className="text-lg text-[--color-text-secondary] mb-6">Protégez la Terre de la vermine de l'univers. Inspectez, interrogez, décidez.</p>
                        <button onClick={() => dispatch({type: 'START_SHIFT'})} className="px-8 py-4 bg-[--color-secondary] text-[--color-background] rounded-lg font-black text-2xl shadow-lg hover:brightness-110">
                            COMMENCER LE SERVICE
                        </button>
                    </div>
                );
            case 'loading':
                return <div className="flex flex-col items-center justify-center gap-4"><Spinner /><p className="text-xl text-[--color-accent] animate-pulse">Appel du prochain visiteur...</p></div>;
            case 'error':
                return <div className="text-center text-red-400"><h3 className="text-2xl font-bold mb-4">Erreur de connexion !</h3><p>{state.error}</p></div>;
            case 'result':
                return (
                    <div className="text-center animate-fade-in flex flex-col items-center justify-center p-4">
                        <div className={`p-4 rounded-lg border-4 w-full mb-6 ${state.lastDecision?.correct ? 'border-green-500' : 'border-red-500'}`}>
                            <h3 className={`text-4xl font-black ${state.lastDecision?.correct ? 'text-green-400' : 'text-red-400'}`}>
                                {state.lastDecision?.correct ? 'CORRECT' : 'INCORRECT'}
                            </h3>
                            <p className="text-lg text-white mt-4">{state.lastDecision?.message}</p>
                        </div>
                        <button onClick={handleNextAlien} className="px-8 py-4 bg-[--color-accent] text-[--color-background] rounded-lg font-black text-2xl shadow-lg hover:brightness-110 transition-transform hover:scale-105 transform">
                            Appeler le prochain visiteur
                        </button>
                    </div>
                );
            case 'inspecting':
                if (!state.alienData || !state.alienImage) return <Spinner />;
                return (
                    <div className="w-full h-full flex flex-col md:flex-row gap-4">
                        {/* Left Panel: Image & Description */}
                        <div className="w-full md:w-1/3 flex flex-col gap-4">
                            <div className="bg-black/30 rounded-lg p-4 flex-grow">
                                <h3 className="font-bold text-[--color-secondary]">PORTRAIT</h3>
                                <img src={state.alienImage} alt="Alien" className="w-full h-auto object-cover rounded my-2" />
                                <h3 className="font-bold text-[--color-secondary] mt-4">DESCRIPTION</h3>
                                <p className="text-sm">{state.alienData.appearanceDescription}</p>
                            </div>
                            <DecisionPanel onDecision={handleDecision} />
                        </div>

                        {/* Right Panel: Terminal */}
                        <div className="w-full md:w-2/3 bg-black/30 rounded-lg p-4 flex flex-col">
                            <div className="flex border-b-2 border-[--color-primary] mb-2">
                                <TabButton label="Passeport" active={activeTab === 'passport'} onClick={() => setActiveTab('passport')} />
                                <TabButton label="Scanner" active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} />
                                <TabButton label="Interrogatoire" active={activeTab === 'interrogate'} onClick={() => setActiveTab('interrogate')} />
                            </div>
                            <div className="flex-grow overflow-y-auto relative">
                                {activeTab === 'passport' && <PassportView data={state.alienData.passportData} />}
                                {activeTab === 'scan' && <ScannerView secret={state.alienData.secret} activeScan={activeScan} setActiveScan={setActiveScan} />}
                                {activeTab === 'interrogate' && <InterrogationView dialogue={state.alienData.dialogue} />}
                            </div>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="p-2 md:p-4 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border-4 border-[--color-primary] w-full max-w-6xl mx-auto">
            <header className="mb-4 text-center">
                <h2 className="text-4xl font-black text-[--color-secondary]" style={{fontFamily: "'Cinzel', serif"}}>MIB: Agent au Tri</h2>
                <div className="flex justify-around items-center text-lg font-bold">
                    <span>Score: <span className="text-white">{state.score}</span></span>
                    <span>Aliens Traités: <span className="text-white">{state.aliensProcessed}</span></span>
                </div>
            </header>
            <main className="min-h-[60vh] flex items-center justify-center p-2 bg-[--color-background] rounded-md shadow-inner">
                {renderContent()}
            </main>
            <BackButton onClick={onBack} text="Quitter le service" />
        </div>
    );
};

// --- SUB-COMPONENTS ---
const TabButton: React.FC<{label: string, active: boolean, onClick: () => void}> = ({label, active, onClick}) => (
    <button onClick={onClick} className={`px-4 py-2 font-bold transition-colors duration-200 border-b-4 ${active ? 'border-[--color-secondary] text-[--color-secondary]' : 'border-transparent text-[--color-text-secondary] hover:text-white'}`}>
        {label}
    </button>
);

const PassportView: React.FC<{data: AlienData['passportData']}> = ({ data }) => (
    <div className="animate-fade-in p-4 bg-gray-900/50 rounded">
        <h4 className="text-xl font-bold text-cyan-300 mb-4">Passeport Intergalactique</h4>
        <div className="grid grid-cols-2 gap-4 text-lg">
            <span className="font-semibold text-gray-400">Nom:</span><span className="font-mono text-white">{data.name}</span>
            <span className="font-semibold text-gray-400">Planète:</span><span className="font-mono text-white">{data.planet}</span>
            <span className="font-semibold text-gray-400">Expiration:</span><span className="font-mono text-white">{data.expiryDate}</span>
        </div>
    </div>
);

const ScannerView: React.FC<{secret: AlienData['secret'], activeScan: ActiveScan, setActiveScan: (s: ActiveScan) => void}> = ({ secret, activeScan, setActiveScan }) => {
    const renderResult = () => {
        if (activeScan === 'none') return <p className="text-gray-400">Sélectionnez un mode de balayage.</p>;
        
        let itemFound = '...';

        if (activeScan === 'weapon') {
            itemFound = secret.hiddenItem.type === 'weapon' 
                ? secret.hiddenItem.name 
                : "Aucune arme détectée";
        } else if (activeScan === 'contraband') {
            itemFound = secret.hiddenItem.type === 'contraband'
                ? secret.hiddenItem.name
                : "Aucune contrebande détectée";
        }
        
        return <p className="text-2xl font-mono animate-pulse text-yellow-300">{itemFound}</p>;
    };
    return (
        <div className="animate-fade-in p-4 flex flex-col gap-4">
             <div className="flex gap-2">
                <button onClick={() => setActiveScan('weapon')} className={`flex-1 p-2 rounded font-bold ${activeScan === 'weapon' ? 'bg-red-500' : 'bg-gray-700'}`}>Scan Armes</button>
                <button onClick={() => setActiveScan('contraband')} className={`flex-1 p-2 rounded font-bold ${activeScan === 'contraband' ? 'bg-purple-500' : 'bg-gray-700'}`}>Scan Contrebande</button>
             </div>
            <div className="bg-black p-4 rounded-lg min-h-[100px] flex items-center justify-center text-center">{renderResult()}</div>
        </div>
    );
};

const InterrogationView: React.FC<{dialogue: AlienData['dialogue']}> = ({ dialogue }) => {
    const [currentQuestion, setCurrentQuestion] = useState<AlienData['dialogue'][0] | null>(null);
    return(
        <div className="animate-fade-in p-4 flex flex-col gap-4">
            <div>
                <h4 className="font-bold text-lg mb-2">Questions disponibles :</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dialogue.map(d => <button key={d.question} onClick={() => setCurrentQuestion(d)} className="p-2 bg-gray-700 rounded text-left hover:bg-gray-600">{d.question}</button>)}
                </div>
            </div>
            {currentQuestion && (
                <div className="bg-black p-4 rounded-lg">
                    <p className="font-semibold text-gray-400">{currentQuestion.question}</p>
                    <div className="flex items-center gap-4">
                        <p className="text-xl text-white font-mono mt-2">"{currentQuestion.answer}"</p>
                         {currentQuestion.isLie && <span className="text-red-500 font-bold animate-pulse">MENSONGE DÉTECTÉ</span>}
                    </div>
                </div>
            )}
        </div>
    );
};

const DecisionPanel: React.FC<{onDecision: (d: Decision) => void}> = ({ onDecision }) => (
    <div className="grid grid-cols-3 gap-2">
        <button onClick={() => onDecision('APPROVE')} className="p-4 bg-green-600 text-white font-black text-lg rounded hover:bg-green-500 transition-colors">APPROUVÉ</button>
        <button onClick={() => onDecision('DENY')} className="p-4 bg-yellow-600 text-white font-black text-lg rounded hover:bg-yellow-500 transition-colors">REFUSÉ</button>
        <button onClick={() => onDecision('ALERT')} className="p-4 bg-rose-600 text-white font-black text-lg rounded hover:bg-rose-500 transition-colors">ALERTE</button>
    </div>
);

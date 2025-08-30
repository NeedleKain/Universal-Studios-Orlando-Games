import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { BackButton } from '../BackButton';
import { Spinner } from '../Spinner';
import type { InvestigationMessage, InvestigationEvidence, InvestigationLocation, ThemeColors } from '../../types';
import type { InvestigationCase } from '../MinistryOfMagicGame';

import { MemoView } from './MemoView';
import { EvidenceView } from './EvidenceView';
import { MapView } from './MapView';
import { ArchivesView } from './ArchivesView';

interface InvestigationGameProps {
  onBack: () => void;
  gameCase: InvestigationCase;
  theme: ThemeColors;
}

type View = 'memos' | 'evidence' | 'map' | 'archives';

const initialLocations: InvestigationLocation[] = [
    { id: 'unspeakable_office', name: 'Bureau des Indicibles', description: "Votre bureau sécurisé au cœur du Département des Mystères.", isUnlocked: true },
    { id: 'atrium', name: 'Atrium Principal', description: "Le hall principal animé du Ministère.", isUnlocked: true },
    { id: 'prophecy_hall', name: 'Salle des Prophéties', description: "Des rangées infinies d'orbes de verre poussiéreux.", isUnlocked: false },
    { id: 'brain_room', name: 'Salle des Cerveaux', description: "Des cerveaux flottent dans une étrange potion verte.", isUnlocked: false },
    { id: 'time_chamber', name: 'Chambre du Temps', description: "Le tic-tac assourdissant des horloges et des Retourneurs de Temps.", isUnlocked: false },
];

export const InvestigationGame: React.FC<InvestigationGameProps> = ({ onBack, gameCase }) => {
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'error' | 'finished'>('loading');
    const [activeView, setActiveView] = useState<View>('memos');
    
    const [messages, setMessages] = useState<InvestigationMessage[]>([]);
    const [evidence, setEvidence] = useState<InvestigationEvidence[]>([]);
    const [locations, setLocations] = useState<InvestigationLocation[]>(initialLocations);

    const [error, setError] = useState<string | null>(null);
    const ai = useRef<GoogleGenAI | null>(null);

    useEffect(() => {
        if (!process.env.API_KEY) {
            setError("La clé API est manquante.");
            setGameState('error');
            return;
        }
        ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        processAction('start_game', gameCase.startPrompt);
    }, []);

    const processAction = useCallback(async (action: string, payload: string) => {
        if (!ai.current) return;
        setGameState('loading');
        
        const history = messages.map(m => `${m.contactName || m.sender}: ${m.text}`).join('\n');
        const prompt = `Historique: ${history}\n\nAction du joueur: ${action}\nDétail: "${payload}"\n\nDonne la suite de l'enquête.`;
        
        try {
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    newMemo: { type: Type.OBJECT, properties: { contactName: { type: Type.STRING }, text: { type: Type.STRING } }, description: "Nouveau message reçu d'un contact." },
                    playerChoices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Les choix de réponse du joueur au nouveau mémo." },
                    newEvidence: { type: Type.OBJECT, properties: { id: {type: Type.STRING}, title: {type: Type.STRING}, description: {type: Type.STRING}, imagePrompt: {type: Type.STRING} }, description: "Nouvelle preuve découverte."},
                    unlockLocationId: { type: Type.STRING, description: "L'ID d'un nouveau lieu débloqué." },
                    isGameOver: { type: Type.BOOLEAN, description: "Vrai si l'enquête est terminée." },
                    archiveResponse: { type: Type.STRING, description: "Résultat de la recherche dans les archives."}
                },
            };

            const response = await ai.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { systemInstruction: gameCase.systemInstruction, responseMimeType: "application/json", responseSchema }
            });

            const data = JSON.parse(response.text);

            let newMessages: InvestigationMessage[] = [];
            if (data.newMemo) {
                newMessages.push({ id: Date.now(), sender: 'contact', contactName: data.newMemo.contactName, text: data.newMemo.text, choices: data.playerChoices });
            }
             if (data.archiveResponse) {
                newMessages.push({ id: Date.now(), sender: 'system', text: `Résultat des Archives : ${data.archiveResponse}` });
            }

            setMessages(prev => [...prev, ...newMessages]);

            if (data.unlockLocationId) {
                setLocations(prev => prev.map(loc => loc.id === data.unlockLocationId ? { ...loc, isUnlocked: true } : loc));
            }
            
            if (data.newEvidence) {
                const imageResponse = await ai.current.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: data.newEvidence.imagePrompt,
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
                });
                const imageUrl = imageResponse.generatedImages?.[0]?.image?.imageBytes 
                    ? `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`
                    : ''; // Handle failed image
                setEvidence(prev => [...prev, { ...data.newEvidence, imageUrl }]);
            }

            setGameState(data.isGameOver ? 'finished' : 'playing');

        } catch (e) {
            console.error(e);
            setError("Une interférence magique a brouillé les communications.");
            setGameState('error');
        }

    }, [messages, gameCase.systemInstruction]);
    
    const handlePlayerAction = (action: string, payload: string) => {
        if (action === 'send_reply') {
             setMessages(prev => [...prev, {id: Date.now(), sender: 'player', text: payload}]);
        }
        processAction(action, payload);
    };

    const renderMainView = () => {
        switch (activeView) {
            case 'memos': return <MemoView messages={messages} onSendReply={(reply) => handlePlayerAction('send_reply', reply)} />;
            case 'evidence': return <EvidenceView evidence={evidence} />;
            case 'map': return <MapView locations={locations} onTravel={(locationId) => handlePlayerAction('travel', locationId)} />;
            case 'archives': return <ArchivesView onSearch={(query) => handlePlayerAction('search_archives', query)} />;
            default: return null;
        }
    };
    
    const NavButton: React.FC<{view: View, label: string, icon: string}> = ({view, label, icon}) => (
        <button
            onClick={() => setActiveView(view)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 w-20 ${activeView === view ? 'bg-[--color-accent] text-black' : 'hover:bg-[--color-primary]'}`}
        >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-bold">{label}</span>
        </button>
    );

    return (
        <div className="p-2 md:p-4 bg-[#1f2937] rounded-lg shadow-2xl animate-fade-in border-2 border-[#4b5563] flex flex-col h-[75vh] min-h-[600px]">
            <header className="mb-2 text-center">
                <h2 className="text-2xl font-black text-[--color-secondary]" style={{fontFamily: "'Cinzel', serif"}}>{gameCase.title}</h2>
                <p className="text-sm text-[--color-text-secondary]">Terminal d'Investigation - Département des Mystères</p>
            </header>
            
            <div className="flex-grow flex gap-2 overflow-hidden">
                <nav className="flex flex-col gap-2">
                    <NavButton view="memos" label="Mémos" icon="✉️" />
                    <NavButton view="evidence" label="Preuves" icon="📁" />
                    <NavButton view="map" label="Carte" icon="🗺️" />
                    <NavButton view="archives" label="Archives" icon="📚" />
                </nav>
                <main className="flex-grow bg-black/30 rounded-lg p-2 md:p-4 overflow-y-auto relative">
                   {gameState === 'loading' && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"><Spinner /></div>}
                   {gameState === 'error' && <p className="text-red-500">{error}</p>}
                   {renderMainView()}
                </main>
            </div>
             <BackButton onClick={onBack} text="Quitter le Ministère" />
        </div>
    );
};
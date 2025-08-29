import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { BackButton } from './BackButton';
import { Spinner } from './Spinner';
import type { ThemeColors } from '../types';
import { useDynamicTheme } from '../hooks/useDynamicTheme';

type GameState = 'ready' | 'loading' | 'playing' | 'error' | 'finished';
interface Scene {
  description: string;
  image: string | null | 'failed';
  choices: string[];
  isGameOver: boolean;
}

interface AdventureGameProps {
  onBack: () => void;
  gameTitle: string;
  attractionName: string;
  theme: ThemeColors;
  systemInstruction: string;
  startPrompt: string;
  readyScreen: {
    title: string;
    description: string;
    buttonText: string;
  };
  backButtonText: string;
  loadingText?: string;
}

export const AdventureGame: React.FC<AdventureGameProps> = ({
  onBack,
  gameTitle,
  attractionName,
  theme,
  systemInstruction,
  startPrompt,
  readyScreen,
  backButtonText,
  loadingText = "Chargement de l'aventure...",
}) => {
  useDynamicTheme(theme);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [scene, setScene] = useState<Scene | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prefetchCache, setPrefetchCache] = useState<Map<string, Scene>>(new Map());

  const ai = useRef<GoogleGenAI | null>(null);
  
  useEffect(() => {
    if (!process.env.API_KEY) {
        setError("La clé API est manquante. Veuillez la configurer pour jouer.");
        setGameState('error');
        return;
    }
    ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }, []);

  const prefetchScene = useCallback(async (playerInput: string, currentHistory: string[]) => {
    if (!ai.current) return;

    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                sceneDescription: { type: Type.STRING, description: 'Une description détaillée et engageante de la scène actuelle en français (2-4 phrases).' },
                imagePrompt: { type: Type.STRING, description: `A vivid, detailed prompt in ENGLISH for an image generation model. Style: cinematic, atmospheric, high detail, 4k.` },
                choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Un tableau de 2-3 choix courts et orientés vers l'action pour le joueur, en français." },
                isGameOver: { type: Type.BOOLEAN, description: "Vrai si c'est une scène de conclusion (victoire ou défaite)." }
            },
            required: ['sceneDescription', 'imagePrompt', 'choices', 'isGameOver']
        };
        const fullPrompt = `L'histoire jusqu'à présent : ${currentHistory.join('. ')}\nLe joueur a choisi : "${playerInput}"\nQue se passe-t-il ensuite ?`;

        const storyResponse = await ai.current.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: { systemInstruction, responseMimeType: "application/json", responseSchema }
        });
        
        let content;
        try {
            content = JSON.parse(storyResponse.text);
        } catch(e) {
            console.error("Prefetch JSON parse failed for choice:", playerInput);
            return;
        }

        const imageResponse = await ai.current.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: content.imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' }
        });
        
        const imageUrl = (imageResponse.generatedImages && imageResponse.generatedImages.length > 0 && imageResponse.generatedImages[0].image?.imageBytes)
            ? `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`
            : 'failed';

        const prefetchedScene: Scene = {
            description: content.sceneDescription,
            image: imageUrl,
            choices: content.choices,
            isGameOver: content.isGameOver,
        };

        setPrefetchCache(prevCache => {
            const newCache = new Map(prevCache);
            newCache.set(playerInput, prefetchedScene);
            return newCache;
        });

    } catch (e) {
        console.error(`Failed to prefetch scene for choice "${playerInput}":`, e);
    }
  }, [systemInstruction]);

  const fetchNextScene = useCallback(async (playerInput: string, currentHistory: string[]) => {
    if (!ai.current) return;
    setGameState('loading');
    setError(null);
    
    try {
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                sceneDescription: { type: Type.STRING, description: 'Une description détaillée et engageante de la scène actuelle en français (2-4 phrases).' },
                imagePrompt: { type: Type.STRING, description: `A vivid, detailed prompt in ENGLISH for an image generation model. Style: cinematic, atmospheric, high detail, 4k.` },
                choices: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Un tableau de 2-3 choix courts et orientés vers l'action pour le joueur, en français." },
                isGameOver: { type: Type.BOOLEAN, description: "Vrai si c'est une scène de conclusion (victoire ou défaite)." }
            },
            required: ['sceneDescription', 'imagePrompt', 'choices', 'isGameOver']
        };
        const fullPrompt = `L'histoire jusqu'à présent : ${currentHistory.join('. ')}\nLe joueur a choisi : "${playerInput}"\nQue se passe-t-il ensuite ?`;

        const storyResponse = await ai.current.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: { systemInstruction, responseMimeType: "application/json", responseSchema }
        });
        
        let content;
        try {
            content = JSON.parse(storyResponse.text);
        } catch(e) {
            console.error("Failed to parse JSON:", storyResponse.text);
            setError("Une erreur de communication s'est produite. Veuillez réessayer.");
            setGameState('error');
            return;
        }

        const newScenePartial: Scene = {
            description: content.sceneDescription,
            image: null,
            choices: content.choices,
            isGameOver: content.isGameOver,
        };

        setScene(newScenePartial);
        setGameState(newScenePartial.isGameOver ? 'finished' : 'playing');

        try {
            const imageResponse = await ai.current.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: content.imagePrompt,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' }
            });
            
            if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0 && imageResponse.generatedImages[0].image?.imageBytes) {
                const imageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
                setScene(currentScene => currentScene ? { ...currentScene, image: imageUrl } : null);
            } else {
                console.warn("Image generation returned no images for prompt:", content.imagePrompt);
                setScene(currentScene => currentScene ? { ...currentScene, image: 'failed' } : null);
            }
        } catch (imageError) {
            console.error("Image generation failed:", imageError);
            setScene(currentScene => currentScene ? { ...currentScene, image: 'failed' } : null);
        }

    } catch (e) {
        console.error(e);
        setError("Une force mystérieuse a interféré avec notre connexion. Veuillez réessayer.");
        setGameState('error');
    }
  }, [systemInstruction]);

  const startGame = useCallback(() => {
    setHistory([]);
    setPrefetchCache(new Map());
    fetchNextScene(startPrompt, []);
  }, [fetchNextScene, startPrompt]);

  const handleChoice = (choice: string) => {
    const newHistory = [...history, scene?.description ?? '', `J'ai choisi de ${choice}`];
    
    const cachedScene = prefetchCache.get(choice);
    if (cachedScene) {
        setHistory(newHistory);
        setScene(cachedScene);
        setGameState(cachedScene.isGameOver ? 'finished' : 'playing');
    } else {
        console.warn(`Cache miss for "${choice}". Fetching on demand.`);
        setHistory(newHistory);
        fetchNextScene(choice, newHistory);
    }
  };
  
  const resetGame = () => {
    setGameState('ready');
    setScene(null);
    setHistory([]);
    setError(null);
  };

  useEffect(() => {
    if (scene && gameState === 'playing' && !scene.isGameOver && scene.choices.length > 0) {
      const historyForPrefetch = [...history, scene.description];
      setPrefetchCache(new Map());
      for (const choice of scene.choices) {
        prefetchScene(choice, historyForPrefetch);
      }
    }
  }, [scene, gameState, history, prefetchScene]);

  const renderContent = () => {
    switch (gameState) {
      case 'ready':
        return (
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2 text-[--color-text-primary]">{readyScreen.title}</h3>
            <p className="text-lg text-[--color-text-secondary] mb-6 max-w-md mx-auto">{readyScreen.description}</p>
            <button onClick={startGame} className="px-8 py-4 bg-[--color-secondary] text-[--color-background] rounded-lg font-black text-2xl shadow-lg hover:brightness-110 transition-transform hover:scale-105 transform">
              {readyScreen.buttonText}
            </button>
          </div>
        );

      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center gap-4">
            <Spinner />
            <p className="text-xl text-[--color-accent] animate-pulse">{loadingText}</p>
          </div>
        );

      case 'error':
         return (
          <div className="text-center text-red-400">
            <h3 className="text-2xl font-bold mb-4">Oh non !</h3>
            <p className="text-lg mb-6">{error}</p>
            <button onClick={resetGame} className="px-6 py-3 bg-[--color-accent] text-[--color-background] rounded-lg font-bold text-lg shadow-lg hover:brightness-110 transition">
              Réessayer
            </button>
          </div>
        );

      case 'playing':
      case 'finished':
        if (!scene) return null;
        return (
          <div className="w-full flex flex-col gap-6 animate-fade-in">
            <div className="aspect-video w-full bg-[--color-background] rounded-lg shadow-2xl overflow-hidden border-2 border-[--color-primary] flex items-center justify-center">
              {scene.image === null ? (
                <Spinner />
              ) : scene.image === 'failed' ? (
                <div className="text-center text-gray-400 flex flex-col items-center justify-center gap-2 p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1-1m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">Image non disponible</span>
                </div>
              ) : (
                <img src={scene.image} alt="Scène de l'aventure" className="w-full h-full object-cover animate-fade-in" />
              )}
            </div>
            <div className="bg-black bg-opacity-30 p-4 rounded-md">
                <p className="text-lg md:text-xl text-[--color-text-secondary] leading-relaxed">{scene.description}</p>
            </div>
            {gameState === 'finished' ? (
                 <div className="text-center mt-4">
                    <button onClick={resetGame} className="px-8 py-3 bg-[--color-secondary] text-[--color-background] rounded-lg font-bold text-lg shadow-lg hover:brightness-110 transition">
                        Rejouer
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    {scene.choices.map((choice, index) => (
                        <button key={index} onClick={() => handleChoice(choice)} className="p-4 bg-[--color-card-bg] border-2 border-[--color-primary] rounded-lg text-left text-lg text-[--color-text-primary] font-semibold hover:bg-[--color-primary] hover:border-[--color-secondary] transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[--color-accent]">
                            {choice}
                        </button>
                    ))}
                </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="text-center p-4 md:p-6 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border-4 border-[--color-primary]">
      <div className="mb-6">
        <h2 className="text-4xl font-black text-[--color-secondary] drop-shadow-lg tracking-tighter" style={{fontFamily: "'Cinzel', serif", textShadow: '2px 2px 4px rgba(0,0,0,0.7)'}}>
            {gameTitle}
        </h2>
        <p className="text-xl text-[--color-text-primary]">
            {attractionName}
        </p>
      </div>
      <div className="min-h-[500px] flex items-center justify-center">
        {renderContent()}
      </div>
       <BackButton onClick={onBack} text={backButtonText} />
    </div>
  );
};
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { BackButton } from './BackButton';
import { Spinner } from './Spinner';
import { useDynamicTheme } from '../hooks/useDynamicTheme';
import { PARKS_DATA } from '../constants';

interface SpiderManHeadlineGameProps {
  onBack: () => void;
}

type GameState = 'ready' | 'loading' | 'writing' | 'scoring' | 'results' | 'error';
interface Photo {
  url: string;
  prompt: string;
}
interface HeadlineResult {
  score: number;
  feedback: string;
  rating: string;
}

const VILLAINS = ["Green Goblin", "Doctor Octopus", "Sandman", "Vulture", "Mysterio", "Venom", "Electro", "The Lizard"];
const ACTIONS = ["causing mayhem in Times Square", "robbing a bank vault", "dangling a cable car from a bridge", "attacking a subway train", "escaping from The Raft prison", "unleashing a toxic gas"];

export const SpiderManHeadlineGame: React.FC<SpiderManHeadlineGameProps> = ({ onBack }) => {
  const marvelTheme = PARKS_DATA.find(p => p.id === 'islands-of-adventure')?.areas.find(a => a.name === 'Marvel Super Hero Island®')?.themeColors;
  useDynamicTheme(marvelTheme!);

  const [gameState, setGameState] = useState<GameState>('ready');
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [headline, setHeadline] = useState('');
  const [result, setResult] = useState<HeadlineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Animation states
  const [animatedScore, setAnimatedScore] = useState(0);
  const [typedFeedback, setTypedFeedback] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const ai = useRef<GoogleGenAI | null>(null);
  const nextPhoto = useRef<Photo | null>(null);

  const fetchPhoto = useCallback(async (): Promise<Photo> => {
    if (!ai.current) throw new Error("AI not initialized");

    const villain = VILLAINS[Math.floor(Math.random() * VILLAINS.length)];
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const imagePrompt = `In the art style of the 1990s Spider-Man animated series, a dynamic action shot of Spider-Man fighting ${villain} as they are ${action} in New York City. Vibrant colors, bold lines, cel-shaded animation look.`;

    try {
      const imageResponse = await ai.current.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: imagePrompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '4:3' }
      });

      if (!imageResponse.generatedImages?.[0]?.image?.imageBytes) {
        throw new Error("Image generation failed to return data.");
      }
      
      const imageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
      return { url: imageUrl, prompt: imagePrompt };
    } catch (e) {
      console.error("Image generation error:", e);
      throw new Error("Le labo photo de Parker a un problème. Réessayez.");
    }
  }, []);

  const prefetchNextPhoto = useCallback(() => {
    fetchPhoto().then(photo => {
      nextPhoto.current = photo;
    }).catch(e => {
      console.warn("Prefetch failed:", e.message);
    });
  }, [fetchPhoto]);
  
  const loadNextRound = useCallback(() => {
    setGameState('loading');
    setHeadline('');
    setResult(null);
    setAnimatedScore(0);
    setTypedFeedback('');
    setIsTyping(false);

    const loadTask = nextPhoto.current ? Promise.resolve(nextPhoto.current) : fetchPhoto();
    
    loadTask.then(photo => {
      setCurrentPhoto(photo);
      setGameState('writing');
      nextPhoto.current = null;
      prefetchNextPhoto();
    }).catch(err => {
      setError(err.message);
      setGameState('error');
    });
  }, [fetchPhoto, prefetchNextPhoto]);


  useEffect(() => {
    if (!process.env.API_KEY) {
      setError("Clé API manquante. Impossible de contacter le Daily Bugle.");
      setGameState('error');
      return;
    }
    ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }, []);

  const handleSubmitHeadline = async () => {
    if (!headline.trim() || !currentPhoto) return;
    setGameState('scoring');

    const systemInstruction = `You are J. Jonah Jameson, the editor-in-chief of the Daily Bugle. You are grading a headline written by a rookie reporter for a photo of Spider-Man. The photo was described as: "${currentPhoto.prompt}". The reporter's headline is: "${headline}". Your response MUST be a JSON object. Be harsh but fair, in character. All your text output must be in FRENCH.`;
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.INTEGER, description: "An integer from 0 to 100. 100 is front page material. 0 is garbage." },
            feedback: { type: Type.STRING, description: "A short, snappy critique (2-3 sentences max) explaining the score. Is it punchy? Does it sell papers? Does it properly paint Spider-Man as a menace?" },
            rating: { type: Type.STRING, description: "A short, one or two-word title for the score (e.g., \"Manchette !\", \"Pas Mal, Gamin\", \"Page 3\", \"Poubelle !\")." }
        },
        required: ['score', 'feedback', 'rating']
    };

    try {
        const response = await ai.current!.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Évaluez ce titre.",
            config: { systemInstruction, responseMimeType: "application/json", responseSchema }
        });
        const resultData = JSON.parse(response.text);
        setResult(resultData);
        setGameState('results');
    } catch (e) {
        console.error("Headline evaluation error:", e);
        setError("J.J.J. est trop occupé à hurler pour lire votre titre. Réessayez.");
        setGameState('error');
    }
  };

  // Score counting animation
  useEffect(() => {
    if (gameState === 'results' && result) {
      const animationDuration = 1000; // ms
      const startTimestamp = performance.now();
      const startScore = 0;
      const endScore = result.score;
      
      const animate = (currentTime: number) => {
          const elapsedTime = currentTime - startTimestamp;
          const progress = Math.min(elapsedTime / animationDuration, 1);
          const currentScore = Math.floor(progress * (endScore - startScore) + startScore);
          setAnimatedScore(currentScore);

          if (progress < 1) {
              requestAnimationFrame(animate);
          }
      };
      requestAnimationFrame(animate);
    }
  }, [gameState, result]);

  // Feedback typing animation
  useEffect(() => {
      if (gameState === 'results' && result && result.feedback) {
          setIsTyping(true);
          let i = 0;
          const text = result.feedback;
          const timer = setInterval(() => {
              setTypedFeedback(text.slice(0, i + 1));
              i++;
              if (i === text.length) {
                  clearInterval(timer);
                  setIsTyping(false);
              }
          }, 30);
          return () => clearInterval(timer);
      }
  }, [gameState, result]);


  const renderContent = () => {
    switch (gameState) {
      case 'ready':
        return (
          <div className="text-center">
            <h3 className="text-4xl font-black mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Daily Bugle: Édition Spéciale</h3>
            <p className="text-lg text-[--color-text-secondary] mb-8 max-w-md mx-auto">Parker nous a encore ramené une photo de l'araignée ! C'est à vous de trouver le titre qui fera la une. Soyez percutant, vendeur, et n'oubliez pas : Spider-Man est une menace !</p>
            <button onClick={loadNextRound} className="px-8 py-4 bg-[--color-secondary] text-black rounded-lg font-black text-2xl shadow-lg hover:brightness-110 transition-transform hover:scale-105 transform animate-pulse">
              PRENDRE LA PHOTO
            </button>
          </div>
        );
      case 'loading':
        return <div className="flex flex-col items-center justify-center gap-4"><Spinner /><p className="text-xl text-[--color-accent] animate-pulse">Développement de la photo de Parker...</p></div>;
      case 'scoring':
        return <div className="flex flex-col items-center justify-center gap-4"><Spinner /><p className="text-xl text-[--color-accent] animate-pulse">J. Jonah Jameson relit votre titre...</p></div>;
      case 'error':
        return <div className="text-center text-red-400 p-4"><h3 className="text-2xl font-bold mb-4">ARRÊTEZ LES PRESSES !</h3><p className="text-lg">{error}</p><button onClick={loadNextRound} className="mt-6 px-6 py-3 bg-[--color-accent] text-black rounded-lg font-bold text-lg">Réessayer</button></div>;
      case 'writing':
        return (
          <div className="w-full flex flex-col items-center gap-4">
            <img src={currentPhoto?.url} alt="Photo de Spider-Man" className="w-full max-w-lg rounded-lg shadow-lg border-4 border-white fade-in-item" style={{ animationDelay: '0s' }} />
            <textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Votre titre ici..."
              maxLength={100}
              className="w-full max-w-lg p-3 text-2xl font-bold text-center bg-gray-100 text-black rounded-md border-2 border-gray-400 focus:outline-none focus:ring-4 focus:ring-[--color-accent] fade-in-item"
              style={{ animationDelay: '0.2s' }}
            />
            <button onClick={handleSubmitHeadline} disabled={!headline.trim()} className="px-10 py-4 bg-green-600 text-white rounded-lg font-black text-2xl shadow-lg hover:bg-green-500 transition-transform hover:scale-105 transform disabled:bg-gray-500 disabled:cursor-not-allowed fade-in-item" style={{ animationDelay: '0.4s' }}>
              IMPRIMER !
            </button>
          </div>
        );
      case 'results':
        return (
            <div className="w-full flex flex-col items-center gap-6">
                <div className="w-full max-w-lg bg-stone-200 text-black p-4 shadow-2xl border-2 border-black animate-newspaper-in" style={{fontFamily: "'Times New Roman', Times, serif"}}>
                    <h1 className="text-5xl font-black text-center border-b-4 border-black pb-2">THE DAILY BUGLE</h1>
                    <div className="my-4">
                        <img src={currentPhoto?.url} alt="Photo de Spider-Man" className="w-full border-2 border-black"/>
                        <p className="text-xs text-right italic mt-1">Photo: P. Parker</p>
                    </div>
                    <h2 className="text-4xl font-bold text-center leading-tight my-4">{headline}</h2>
                    <div className="mt-6 p-3 bg-stone-300 border-t-2 border-dashed border-stone-500">
                        <h4 className="text-xl font-bold text-red-800">Note de l'Éditeur : <span className="animate-stamp-in">"{result?.rating}"</span></h4>
                        <p className="text-lg italic my-2 min-h-[72px]">"{typedFeedback}"{isTyping && <span className="animate-pulse">|</span>}</p>
                        <p className="text-2xl font-black text-right">Score: <span className="text-blue-800">{animatedScore}/100</span></p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={loadNextRound} className="px-6 py-3 bg-[--color-accent] text-black rounded-lg font-bold text-lg shadow-lg hover:brightness-110">PHOTO SUIVANTE</button>
                    <button onClick={onBack} className="px-6 py-3 bg-[--color-card-bg] text-white rounded-lg font-bold text-lg shadow-lg hover:bg-opacity-80">TERMINER LE REPORTAGE</button>
                </div>
            </div>
        );
    }
  };

  return (
    <div className="p-2 md:p-4 bg-[--color-card-bg] rounded-lg shadow-2xl animate-fade-in border-4 border-[--color-primary] w-full max-w-4xl mx-auto">
      <style>{`
        @keyframes newspaper-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-newspaper-in { animation: newspaper-in 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        
        @keyframes stamp-in {
          0% { transform: scale(3) rotate(-15deg); opacity: 0; }
          60% { transform: scale(0.9) rotate(5deg); opacity: 1; }
          80% { transform: scale(1.1) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .animate-stamp-in {
          display: inline-block;
          animation: stamp-in 0.5s ease-out forwards;
          animation-delay: 0.8s;
        }
    
        @keyframes fade-in-stagger {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-item {
          opacity: 0;
          animation: fade-in-stagger 0.5s ease-out forwards;
        }
      `}</style>
      <header className="mb-4 text-center">
        <h2 className="text-4xl font-black text-[--color-secondary] drop-shadow-lg tracking-tight">
          Daily Bugle: Chasse aux Titres
        </h2>
      </header>
      <main className="min-h-[60vh] flex items-center justify-center p-2 bg-[--color-background] rounded-md shadow-inner">
        {renderContent()}
      </main>
      <BackButton onClick={onBack} text="Quitter la rédaction" />
    </div>
  );
};

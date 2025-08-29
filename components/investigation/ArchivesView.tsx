import React, { useState } from 'react';

interface ArchivesViewProps {
  onSearch: (query: string) => void;
}

export const ArchivesView: React.FC<ArchivesViewProps> = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
            setQuery('');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-full max-w-lg">
                <h3 className="text-xl font-bold text-white mb-2">Archives du Ministère</h3>
                <p className="text-gray-400 mb-6">Recherchez des informations sur des personnes, des lieux ou des objets. Utilisez les mots-clés que vous découvrez au cours de votre enquête.</p>
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ex: Borgin, Prophétie, Retourneur de Temps..."
                        className="flex-grow p-3 bg-gray-900 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:border-[--color-accent]"
                    />
                    <button type="submit" className="px-6 py-3 bg-[--color-accent] text-black font-bold rounded-lg hover:brightness-110 transition-transform hover:scale-105">
                        Rechercher
                    </button>
                </form>
            </div>
        </div>
    );
};


import React from 'react';

export const Header: React.FC = () => {
    return (
        <header className="py-6 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-[--color-secondary] drop-shadow-lg tracking-tighter">
                Universal Studios Orlando
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-[--color-text-primary] mt-2 tracking-wide">
                Jeux de File d'Attente
            </h2>
        </header>
    );
};
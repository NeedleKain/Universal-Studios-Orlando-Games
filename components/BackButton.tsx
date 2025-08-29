import React from 'react';

interface BackButtonProps {
    onClick: () => void;
    text?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, text = "Retour" }) => {
    return (
        <button
            onClick={onClick}
            aria-label={text}
            className="group absolute top-4 left-4 md:top-8 md:left-8 z-50 flex items-center gap-2 px-4 py-2 bg-[--color-card-bg] bg-opacity-70 backdrop-blur-sm border-2 border-[--color-accent] text-[--color-accent] rounded-full font-semibold hover:bg-[--color-accent] hover:text-[--color-background] transition-all duration-300 shadow-lg"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">{text}</span>
        </button>
    );
};
import React from 'react';

interface CardProps {
    title: string;
    onClick?: () => void;
    disabled?: boolean;
    style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ title, onClick, disabled = false, style }) => {
    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!disabled && onClick && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            handleClick();
        }
    };

    return (
        <div
            onClick={!disabled ? handleClick : undefined}
            onKeyDown={handleKeyDown}
            role={!disabled ? "button" : undefined}
            tabIndex={!disabled ? 0 : -1}
            aria-disabled={disabled}
            style={style}
            className={`group bg-[var(--card-bg-override,var(--color-card-bg))] rounded-lg shadow-lg transition-all duration-300 border-2 border-transparent animate-fade-in flex items-center justify-center p-6 min-h-[160px] ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer transform hover:-translate-y-2 hover:border-[var(--card-border-hover-override,var(--color-secondary))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[--color-background] focus:ring-[var(--card-accent-override,var(--color-accent))]'}`}
        >
            <h3 className={`text-xl font-bold text-center text-[var(--card-text-override,var(--color-text-primary))] transition-colors duration-300 ${disabled ? '' : 'group-hover:text-[var(--card-text-hover-override,var(--color-secondary))]'}`}>
                {title}
            </h3>
        </div>
    );
};

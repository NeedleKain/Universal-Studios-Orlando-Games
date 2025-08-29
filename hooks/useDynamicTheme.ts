import { useEffect, useRef } from 'react';
import type { ThemeColors } from '../types';
import { DEFAULT_THEME } from '../constants';

export const useDynamicTheme = (theme: ThemeColors) => {
    const originalStyles = useRef<{ [key: string]: string }>({});

    useEffect(() => {
        const root = document.documentElement;

        // Save original styles before applying new ones
        Object.keys(DEFAULT_THEME).forEach(key => {
            const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            originalStyles.current[cssVarName] = root.style.getPropertyValue(cssVarName);
        });

        // Apply new theme
        Object.entries(theme).forEach(([key, value]) => {
            const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVarName, value);
        });

        // Cleanup function to restore original styles
        return () => {
            Object.entries(originalStyles.current).forEach(([cssVarName, value]) => {
                if (value) {
                    root.style.setProperty(cssVarName, value);
                } else {
                    // If there was no style before, remove the property
                    root.style.removeProperty(cssVarName);
                }
            });
        };
    }, [theme]); // Rerun effect if the theme object changes
};

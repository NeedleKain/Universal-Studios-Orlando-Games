

import type { Park, ThemeColors } from './types';

export const PARKS_DATA: Park[] = [
  {
    id: 'universal-studios',
    name: 'Universal Studios Florida',
    areas: [
      {
        name: 'Minion Land',
        attractions: [
          { name: 'Despicable Me Minion Mayhem™' },
          { name: "Villain-Con Minion Blast" },
        ],
      },
      {
        name: 'New York',
        attractions: [
            { name: 'Revenge of the Mummy' },
            { name: 'Race Through New York Starring Jimmy Fallon' },
        ],
      },
      {
        name: 'San Francisco',
        themeColors: {
          primary: '#475569', // slate-600
          secondary: '#f97316', // orange-500
          accent: '#ef4444', // red-500
          textPrimary: '#f1f5f9', // slate-100
          textSecondary: '#94a3b8', // slate-400
          background: '#1e293b', // slate-800
          cardBg: '#334155', // slate-700
        },
        attractions: [
            { name: 'Fast & Furious – Supercharged' },
        ],
      },
      {
        name: 'Diagon Alley',
        attractions: [
          { name: 'Harry Potter and the Escape from Gringotts™' },
          { name: 'Hogwarts™ Express' },
        ],
      },
      {
        name: 'World Expo',
        themeColors: {
          primary: '#0e7490', // cyan-700
          secondary: '#67e8f9', // cyan-300
          accent: '#f43f5e', // rose-500 (Alert Red)
          textPrimary: '#f8fafc', // slate-50
          textSecondary: '#cbd5e1', // slate-300
          background: '#0f172a', // slate-900
          cardBg: '#1e293b', // slate-800
        },
        attractions: [{ name: 'MEN IN BLACK™ Alien Attack™' }],
      },
      {
        name: 'Springfield',
        attractions: [{ name: 'The Simpsons Ride™' }],
      },
      {
        name: 'Dreamworks Land',
        attractions: [
            { name: 'Trolls Trollercoaster' },
            { name: "Shrek's Swamp for Little Ogres" }
        ],
      },
      {
        name: 'Hollywood',
        attractions: [
            { name: 'The Bourne Stuntacular' },
            { name: 'Universal Horror Unleashed' },
        ],
      }
    ],
  },
  {
    id: 'islands-of-adventure',
    name: 'Islands of Adventure',
    areas: [
      {
        name: "The Wizarding World of Harry Potter™ - Hogsmeade™",
        attractions: [
          { name: "Harry Potter and the Forbidden Journey™" },
          { name: "Hagrid’s Magical Creatures Motorbike Adventure™" },
          { name: "Flight of the Hippogriff™" },
        ],
      },
      {
        name: 'Jurassic Park',
        attractions: [
          { name: 'Jurassic World VelociCoaster' },
          { name: 'Jurassic Park River Adventure' },
        ],
      },
      {
        name: 'Marvel Super Hero Island®',
        attractions: [
          { name: 'The Incredible Hulk Coaster®' },
          { name: 'The Amazing Adventures of Spider-Man®' },
        ],
      },
    ],
  },
  {
    id: 'epic-universe',
    name: 'Epic Universe',
    areas: [
      {
        name: 'Celestial Park',
        themeColors: {
          primary: '#0c4a6e', // sky-800 (Dark Blue)
          secondary: '#facc15', // yellow-400 (Gold)
          accent: '#f59e0b', // amber-500 (Bright Gold)
          textPrimary: '#f0f9ff', // sky-50
          textSecondary: '#e0f2fe', // sky-100
          background: '#081326', // Deep dark blue
          cardBg: '#0f172a', // slate-900
        },
        attractions: [
            { name: 'Stardust Racers' }, 
            { name: 'Constellation Carousel' }
        ],
      },
      {
        name: 'The Wizarding World of Harry Potter™ — Ministry of Magic™',
        themeColors: {
          primary: '#4b5563', // gray-600
          secondary: '#166534', // green-800
          accent: '#22c55e', // green-500
          textPrimary: '#e5e7eb', // gray-200
          textSecondary: '#9ca3af', // gray-400
          background: '#111827', // gray-900
          cardBg: '#1f2937', // gray-800
        },
        attractions: [{ name: 'Le Ministère des Mystères', gameType: 'investigation' }],
      },
      {
        name: 'Super Nintendo World™',
        themeColors: {
          primary: '#3b82f6', // blue-500
          secondary: '#ef4444', // red-500
          accent: '#facc15', // yellow-400
          textPrimary: '#ffffff', // white
          textSecondary: '#93c5fd', // blue-300
          background: '#1d4ed8', // blue-700
          cardBg: '#1e40af', // blue-800
        },
        attractions: [
            { name: 'Mario Kart™: Bowser’s Challenge' }, 
            { name: "Yoshi's Adventure" }
        ],
      },
      {
        name: 'How to Train Your Dragon — Isle of Berk',
        themeColors: {
          primary: '#78350f', // amber-900
          secondary: '#4d7c0f', // lime-800
          accent: '#a3e635', // lime-400
          textPrimary: '#fefce8', // yellow-50
          textSecondary: '#fef3c7', // amber-100
          background: '#3f3222', // Dark woody brown
          cardBg: '#574531', // Lighter woody brown
        },
        attractions: [{ name: 'Hiccup’s Wing Gliders' }],
      },
      {
        name: 'Dark Universe',
        themeColors: {
          primary: '#16a34a', // green-600
          secondary: '#6b21a8', // purple-800
          accent: '#a855f7', // purple-500
          textPrimary: '#ecfdf5', // green-50
          textSecondary: '#dcfce7', // green-100
          background: '#262626', // neutral-800
          cardBg: '#404040', // neutral-700
        },
        attractions: [{ name: 'Monsters Unchained: The Frankenstein Experiment' }],
      },
    ],
  },
];

export const DEFAULT_THEME: ThemeColors = {
  primary: '#0c4a6e',
  secondary: '#f59e0b',
  accent: '#38bdf8',
  textPrimary: '#ffffff',
  textSecondary: '#e0f2fe',
  background: '#020617',
  cardBg: '#0f172a',
};
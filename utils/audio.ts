
// A map to cache Audio objects
const audioCache = new Map<string, HTMLAudioElement>();

/**
 * Plays a sound from a given URL.
 * Caches the Audio object for subsequent plays.
 * @param soundUrl The URL of the sound file to play.
 * @param volume The volume to play the sound at (0.0 to 1.0).
 */
export const playSound = (soundUrl: string, volume: number = 0.5): void => {
  // This function is intentionally left empty to disable all sounds.
};

// For looping sounds like the fuel pump
interface LoopSoundControl {
  start: () => void;
  stop: () => void;
}

export const createLoopingSound = (soundUrl: string, volume: number = 0.3): LoopSoundControl => {
    // Return a no-op object to disable looping sounds.
    return {
        start: () => {},
        stop: () => {},
    };
};

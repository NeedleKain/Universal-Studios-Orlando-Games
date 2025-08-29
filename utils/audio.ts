
// A map to cache Audio objects
const audioCache = new Map<string, HTMLAudioElement>();

/**
 * Plays a sound from a given URL.
 * Caches the Audio object for subsequent plays.
 * @param soundUrl The URL of the sound file to play.
 * @param volume The volume to play the sound at (0.0 to 1.0).
 */
export const playSound = (soundUrl: string, volume: number = 0.5): void => {
  try {
    let audio = audioCache.get(soundUrl);
    if (!audio) {
      audio = new Audio(soundUrl);
      audio.volume = volume;
      audioCache.set(soundUrl, audio);
    }
    
    // If the audio is already playing, stop it and play from the start.
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }

    audio.play().catch(error => {
      // Autoplay was prevented. This is common before a user interaction.
      // We can largely ignore this as subsequent plays after a click will work.
      console.warn(`Sound playback failed for ${soundUrl}:`, error);
    });
  } catch (error) {
    console.error("Error playing sound:", error);
  }
};

// For looping sounds like the fuel pump
interface LoopSoundControl {
  start: () => void;
  stop: () => void;
}

export const createLoopingSound = (soundUrl: string, volume: number = 0.3): LoopSoundControl => {
    let audio: HTMLAudioElement | null = null;

    const start = () => {
        if (audio && !audio.paused) return; // Already playing

        if(!audio) {
            audio = new Audio(soundUrl);
            audio.volume = volume;
            audio.loop = true;
        }
        audio.play().catch(error => {
            console.warn(`Looping sound playback failed for ${soundUrl}:`, error);
        });
    };

    const stop = () => {
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    };

    return { start, stop };
};

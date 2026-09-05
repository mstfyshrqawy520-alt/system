/**
 * Audio Notification Service
 * Supports crystal-clear synthesized Web Audio chimes (0-latency, 0-bandwidth)
 * as well as custom MP3 audio files with automatic browser autoplay unlocking.
 */

const SOUND_ENABLED_KEY = 'ashbiliya_notification_sound_enabled';
const SOUND_VOLUME_KEY = 'ashbiliya_notification_sound_volume';

let audioCtx: AudioContext | null = null;

// Initialize or resume AudioContext on first user interaction to satisfy browser autoplay policies
export const initAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    return audioCtx;
  } catch (err) {
    console.warn('AudioContext initialization ignored:', err);
    return null;
  }
};

// Auto-unlock on common user interaction events
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    initAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export const isNotificationSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(SOUND_ENABLED_KEY);
  return saved === null ? true : saved === 'true';
};

export const setNotificationSoundEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('notification-sound-preference-changed', { detail: { enabled } }));
};

export const getNotificationSoundVolume = (): number => {
  if (typeof window === 'undefined') return 0.8;
  const saved = localStorage.getItem(SOUND_VOLUME_KEY);
  return saved ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.8;
};

export const setNotificationSoundVolume = (volume: number): void => {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(1, volume));
  localStorage.setItem(SOUND_VOLUME_KEY, clamped.toString());
};

export type NotificationSoundType = 'default' | 'urgent' | 'success' | 'action';

/**
 * Synthesizes a pleasant modern chime using Web Audio API harmonics
 */
const playSynthesizedChime = (type: NotificationSoundType = 'default', volume = 0.8) => {
  const ctx = initAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume * 0.3, now);
  masterGain.connect(ctx.destination);

  if (type === 'urgent') {
    // Attention chime (3 notes ascending with bright harmonic resonance: G5, B5, E6)
    const notes = [783.99, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.1;
      const duration = 0.45;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } else if (type === 'success') {
    // Soft positive chime (2 harmonious ascending notes: E5 -> A5)
    const notes = [659.25, 880.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.12;
      const duration = 0.5;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.7, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } else {
    // Default crisp corporate chime (D6 -> A6 soft bell chime)
    const notes = [1174.66, 1760.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.09;
      const duration = 0.4;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.75, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
};

/**
 * Plays the notification sound (custom MP3 if available, otherwise synthesized Web Audio chime)
 */
export const playNotificationSound = async (type: NotificationSoundType = 'default'): Promise<void> => {
  if (!isNotificationSoundEnabled()) return;

  const volume = getNotificationSoundVolume();

  try {
    // Try custom mp3 if loaded in public folder
    const customSoundPath = type === 'urgent' ? '/sounds/urgent.mp3' : '/sounds/notification.mp3';
    const audio = new Audio(customSoundPath);
    audio.volume = volume;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to Web Audio synthesized chime if MP3 file is not present or blocked
        playSynthesizedChime(type, volume);
      });
    }
  } catch {
    // Fallback to Web Audio synthesized chime
    playSynthesizedChime(type, volume);
  }
};

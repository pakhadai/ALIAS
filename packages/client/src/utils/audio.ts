
import { SoundPreset } from "../types";

// Singleton AudioContext to prevent "The AudioContext was not allowed to start" or hitting limit
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  return audioCtx;
};

// Helper to create simple oscillator with envelope
const createOsc = (
    ctx: AudioContext, 
    type: OscillatorType, 
    freq: number, 
    start: number, 
    dur: number, 
    vol: number = 0.1,
    ramp: 'linear' | 'exponential' = 'exponential'
) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(vol, start);
    
    if (ramp === 'exponential') {
         gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    } else {
         gain.gain.linearRampToValueAtTime(0.001, start + dur);
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
    return osc;
};

export const playSoundEffect = (type: 'correct' | 'skip' | 'start' | 'end' | 'tick' | 'win' | 'click', preset: SoundPreset = SoundPreset.FUN) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    switch (preset) {
        case SoundPreset.EIGHT_BIT:
            // 8-Bit Style: Square and Sawtooth waves, abrupt endings
            switch (type) {
                case 'click':
                    createOsc(ctx, 'square', 1200, now, 0.03, 0.04, 'linear');
                    createOsc(ctx, 'square', 900, now + 0.03, 0.03, 0.035, 'linear');
                    break;
                case 'correct':
                    createOsc(ctx, 'square', 880, now, 0.1, 0.1, 'linear'); // A5
                    createOsc(ctx, 'square', 1760, now + 0.1, 0.2, 0.1, 'linear'); // A6
                    break;
                case 'skip':
                    createOsc(ctx, 'sawtooth', 220, now, 0.15, 0.15, 'linear'); // Low buzz
                    createOsc(ctx, 'sawtooth', 110, now + 0.15, 0.2, 0.15, 'linear');
                    break;
                case 'start':
                    createOsc(ctx, 'square', 440, now, 0.1, 0.1, 'linear');
                    createOsc(ctx, 'square', 660, now + 0.1, 0.1, 0.1, 'linear');
                    createOsc(ctx, 'square', 880, now + 0.2, 0.4, 0.1, 'linear');
                    break;
                case 'end':
                     // Losing sound 8-bit
                    createOsc(ctx, 'triangle', 440, now, 0.1, 0.2, 'linear');
                    createOsc(ctx, 'triangle', 415, now + 0.1, 0.1, 0.2, 'linear');
                    createOsc(ctx, 'triangle', 392, now + 0.2, 0.4, 0.2, 'linear');
                    break;
                case 'tick':
                    createOsc(ctx, 'square', 1000, now, 0.05, 0.05, 'linear');
                    break;
                case 'win':
                    // Arpeggio
                    [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
                         createOsc(ctx, 'square', freq, now + (i * 0.08), 0.1, 0.1, 'linear');
                    });
                    break;
            }
            break;

        case SoundPreset.MINIMAL:
            // Minimal Style: Sine waves, soft attacks, quiet
            switch (type) {
                case 'click':
                    createOsc(ctx, 'sine', 900, now, 0.03, 0.03);
                    break;
                case 'correct':
                    createOsc(ctx, 'sine', 600, now, 0.2, 0.1);
                    break;
                case 'skip':
                    createOsc(ctx, 'sine', 200, now, 0.3, 0.1);
                    break;
                case 'start':
                    createOsc(ctx, 'sine', 440, now, 0.5, 0.1);
                    break;
                case 'end':
                    createOsc(ctx, 'sine', 300, now, 0.6, 0.1);
                    break;
                case 'tick':
                    createOsc(ctx, 'sine', 800, now, 0.05, 0.02);
                    break;
                case 'win':
                    createOsc(ctx, 'sine', 523, now, 0.3, 0.1);
                    createOsc(ctx, 'sine', 1046, now + 0.2, 0.6, 0.1);
                    break;
            }
            break;

        case SoundPreset.FUN:
        default:
            // Default "Fun" Style: Mixed waves, slides, existing logic
            switch (type) {
                case 'click':
                    createOsc(ctx, 'triangle', 850, now, 0.035, 0.05);
                    break;
                case 'correct':
                    createOsc(ctx, 'sine', 523.25, now, 0.1, 0.1); // C5
                    createOsc(ctx, 'sine', 659.25, now + 0.1, 0.3, 0.1); // E5
                    break;
                case 'skip':
                    // Louder, sharper skip sound
                    createOsc(ctx, 'sawtooth', 150, now, 0.15, 0.2); 
                    createOsc(ctx, 'sawtooth', 100, now + 0.15, 0.2, 0.2);
                    break;
                case 'start':
                    const oscStart = ctx.createOscillator();
                    const gainStart = ctx.createGain();
                    oscStart.frequency.setValueAtTime(400, now);
                    oscStart.frequency.linearRampToValueAtTime(800, now + 0.3);
                    gainStart.gain.setValueAtTime(0.1, now);
                    gainStart.gain.linearRampToValueAtTime(0.01, now + 0.3);
                    oscStart.connect(gainStart);
                    gainStart.connect(ctx.destination);
                    oscStart.start();
                    oscStart.stop(now + 0.3);
                    break;
                case 'end':
                    createOsc(ctx, 'sawtooth', 300, now, 0.4, 0.1);
                    createOsc(ctx, 'sawtooth', 80, now + 0.1, 0.4, 0.1);
                    break;
                case 'tick':
                    createOsc(ctx, 'sine', 800, now, 0.05, 0.05);
                    break;
                case 'win':
                    createOsc(ctx, 'sine', 523.25, now, 0.1, 0.1);
                    createOsc(ctx, 'sine', 659.25, now + 0.1, 0.1, 0.1);
                    createOsc(ctx, 'sine', 783.99, now + 0.2, 0.2, 0.1);
                    createOsc(ctx, 'sine', 1046.50, now + 0.3, 0.4, 0.1);
                    break;
            }
            break;
    }
  } catch (e) {
    console.error("Audio error", e);
  }
};

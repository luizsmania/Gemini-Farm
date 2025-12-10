// Sound service for game actions
// Uses Web Audio API to generate satisfying sounds

class SoundService {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      // Check if user has previously disabled sounds
      const soundEnabled = localStorage.getItem('gemini_farm_sound_enabled');
      this.enabled = soundEnabled !== 'false';
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
    if (!this.enabled) return;
    
    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      // Silently fail if audio context is not available
    }
  }

  private playChord(frequencies: number[], duration: number, type: OscillatorType = 'sine', volume: number = 0.2): void {
    if (!this.enabled) return;
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, duration, type, volume);
      }, index * 20);
    });
  }

  // Plant sound - satisfying "pop" with upward tone
  plant(): void {
    this.playTone(400, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(500, 0.15, 'sine', 0.15), 50);
  }

  // Harvest sound - satisfying "pluck" with coins
  harvest(): void {
    this.playChord([523, 659, 784], 0.2, 'sine', 0.25); // C major chord
  }

  // Water sound - gentle splash
  water(): void {
    this.playTone(200, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(150, 0.2, 'sine', 0.15), 30);
  }

  // Coin sound - satisfying "cha-ching"
  coin(): void {
    this.playChord([523, 659], 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.15), 100);
  }

  // Level up sound - triumphant fanfare
  levelUp(): void {
    this.playChord([523, 659, 784, 1047], 0.3, 'sine', 0.3);
  }

  // Success sound - positive chime
  success(): void {
    this.playChord([659, 784, 988], 0.2, 'sine', 0.25);
  }

  // Click sound - subtle tap
  click(): void {
    this.playTone(800, 0.05, 'sine', 0.1);
  }

  // Toggle sound on/off
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('gemini_farm_sound_enabled', enabled.toString());
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundService = new SoundService();


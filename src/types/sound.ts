export type SoundCategory = 'all' | 'memes' | 'tactical' | 'glitch' | 'horror' | 'cyber' | 'custom';

export type CategoryColor = 'amber' | 'green' | 'red' | 'purple' | 'cyan';

export interface SoundItem {
  id: string;
  name: string;
  category: SoundCategory;
  categoryColor: CategoryColor;
  keybind: string;
  durationSec: number;
  description: string;
  synthPreset: string;
  volume: number; // 0 to 1
  pitchSemitones: number; // -12 to 12
  isLooping?: boolean;
  audioBuffer?: AudioBuffer; // for custom recorded/uploaded sounds
  customDataUrl?: string;
  tags?: string[];
}

export interface FxSettings {
  masterVolume: number; // 0 to 2 (overdrive up to 200%)
  pitchShift: number; // -12 to +12
  distortion: number; // 0 to 100
  reverb: number; // 0 to 100
  delayTime: number; // 0 to 1s
  delayFeedback: number; // 0 to 90%
  filterFreq: number; // 200Hz to 16000Hz
  filterType: 'lowpass' | 'highpass' | 'bandpass';
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  type: 'TRG' | 'PANIC' | 'FX' | 'TIMER' | 'REC' | 'WARN' | 'COMBO';
  soundName?: string;
  message: string;
  bus?: string;
  levelDb?: number;
}

export interface ComboStep {
  id: string;
  soundId: string;
  delayMs: number; // delay before this sound fires
  customPitch?: number;
  customVolume?: number;
}

export interface StealthTrapConfig {
  soundId: string;
  countdownSeconds: number;
  trapType: 'fake_update' | 'touch_sensor' | 'blank_stealth' | 'incoming_call';
  autoVolumeMax: boolean;
  repeatTimes: number;
}

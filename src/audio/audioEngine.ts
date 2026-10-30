/**
 * Cyber Prank Deck - Real-time Web Audio Synthesizer & FX Engine
 */

import { FxSettings } from '../types/sound';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayDryGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isMuted: boolean = false;

  // Active audio sources for instantaneous panic stopping
  private activeSources: Set<{ stop: () => void; id: string }> = new Set();
  
  // Microphone stream & monitor
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micMonitorGain: GainNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Current FX parameters
  public fx: FxSettings = {
    masterVolume: 1.0,
    pitchShift: 0,
    distortion: 0,
    reverb: 15,
    delayTime: 0.25,
    delayFeedback: 0.3,
    filterFreq: 14000,
    filterType: 'lowpass',
  };

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Create Nodes
    this.masterGain = this.ctx.createGain();
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.distortionNode = this.ctx.createWaveShaper();
    this.filterNode = this.ctx.createBiquadFilter();
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedbackGain = this.ctx.createGain();
    this.delayDryGain = this.ctx.createGain();
    this.delayWetGain = this.ctx.createGain();
    this.analyserNode = this.ctx.createAnalyser();

    this.analyserNode.fftSize = 64;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Compressor settings for punch & limiting clip
    this.masterCompressor.threshold.setValueAtTime(-4, this.ctx.currentTime);
    this.masterCompressor.knee.setValueAtTime(8, this.ctx.currentTime);
    this.masterCompressor.ratio.setValueAtTime(10, this.ctx.currentTime);
    this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.masterCompressor.release.setValueAtTime(0.15, this.ctx.currentTime);

    // Initial Distortion curve
    this.updateDistortionCurve(this.fx.distortion);

    // Filter
    this.filterNode.type = this.fx.filterType;
    this.filterNode.frequency.setValueAtTime(this.fx.filterFreq, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);

    // Delay setup
    this.delayNode.delayTime.setValueAtTime(this.fx.delayTime, this.ctx.currentTime);
    this.delayFeedbackGain.gain.setValueAtTime(this.fx.delayFeedback, this.ctx.currentTime);
    this.delayDryGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.delayWetGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Route Delay
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);

    // Chain: Input -> Filter -> Distortion -> [Dry + Wet Delay] -> Compressor -> MasterGain -> Analyser -> Destination
    this.filterNode.connect(this.distortionNode);
    this.distortionNode.connect(this.delayDryGain);
    this.distortionNode.connect(this.delayNode);

    this.delayDryGain.connect(this.masterCompressor);
    this.delayWetGain.connect(this.masterCompressor);

    this.masterCompressor.connect(this.masterGain);
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    this.setMasterVolume(this.fx.masterVolume);
  }

  public ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getContext(): AudioContext | null {
    this.ensureContext();
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public setMasterVolume(vol: number) {
    this.fx.masterVolume = vol;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : vol;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }
  }

  public setDistortion(amount: number) {
    this.fx.distortion = amount;
    this.updateDistortionCurve(amount);
  }

  private updateDistortionCurve(amount: number) {
    if (!this.distortionNode || !this.ctx) return;
    if (amount <= 0) {
      this.distortionNode.curve = null;
      return;
    }
    const k = amount * 4;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortionNode.curve = curve as any;
    this.distortionNode.oversample = '4x';
  }

  public setFilter(freq: number, type: 'lowpass' | 'highpass' | 'bandpass' = 'lowpass') {
    this.fx.filterFreq = freq;
    this.fx.filterType = type;
    if (this.filterNode && this.ctx) {
      this.filterNode.type = type;
      this.filterNode.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    }
  }

  public setDelay(timeSec: number, feedback: number, mix: number) {
    this.fx.delayTime = timeSec;
    this.fx.delayFeedback = feedback;
    if (this.delayNode && this.delayFeedbackGain && this.delayWetGain && this.ctx) {
      this.delayNode.delayTime.setTargetAtTime(timeSec, this.ctx.currentTime, 0.02);
      this.delayFeedbackGain.gain.setTargetAtTime(feedback, this.ctx.currentTime, 0.02);
      this.delayWetGain.gain.setTargetAtTime(mix, this.ctx.currentTime, 0.02);
    }
  }

  public setPitchShift(semitones: number) {
    this.fx.pitchShift = semitones;
  }

  /**
   * Master Panic: Abruptly and safely cut off all audio
   */
  public panicStop(): number {
    this.ensureContext();
    let stoppedCount = 0;
    
    // Stop all tracking sources
    this.activeSources.forEach((item) => {
      try {
        item.stop();
        stoppedCount++;
      } catch {
        // already stopped
      }
    });
    this.activeSources.clear();

    // Momentarily mute master gain to prevent speaker pop
    if (this.masterGain && this.ctx) {
      const prevVol = this.fx.masterVolume;
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(prevVol, this.ctx.currentTime + 0.05);
    }

    return stoppedCount;
  }

  public isPanicActive(): boolean {
    return this.activeSources.size > 0;
  }

  /**
   * Play procedural sound or custom buffer with optional pad-specific pitch/volume/loop
   */
  public playSound(
    soundId: string,
    preset: string,
    options?: {
      volume?: number;
      pitchSemitones?: number;
      loop?: boolean;
      customBuffer?: AudioBuffer;
      onEnd?: () => void;
    }
  ): { stop: () => void } {
    this.ensureContext();
    if (!this.ctx || !this.filterNode) {
      return { stop: () => {} };
    }

    const padVolume = options?.volume ?? 1.0;
    const padPitch = (options?.pitchSemitones ?? 0) + this.fx.pitchShift;
    const pitchFactor = Math.pow(2, padPitch / 12);
    const isLooping = options?.loop ?? false;

    // If custom audio buffer is provided (from mic or uploaded file)
    if (options?.customBuffer) {
      return this.playCustomBuffer(soundId, options.customBuffer, padVolume, pitchFactor, isLooping, options.onEnd);
    }

    // Otherwise generate synthesized procedural prank sound!
    return this.generateProceduralSound(soundId, preset, padVolume, pitchFactor, isLooping, options?.onEnd);
  }

  private playCustomBuffer(
    soundId: string,
    buffer: AudioBuffer,
    volume: number,
    pitchFactor: number,
    loop: boolean,
    onEnd?: () => void
  ) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitchFactor;
    source.loop = loop;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.filterNode!);

    source.start();

    const handleStop = () => {
      try {
        source.stop();
        source.disconnect();
        gain.disconnect();
      } catch {
        // ignore
      }
      this.activeSources.delete(activeItem);
      onEnd?.();
    };

    const activeItem = { stop: handleStop, id: soundId };
    this.activeSources.add(activeItem);

    source.onended = () => {
      this.activeSources.delete(activeItem);
      onEnd?.();
    };

    return { stop: handleStop };
  }

  /**
   * PROCEDURAL SYNTHESIZER MATRIX
   */
  private generateProceduralSound(
    soundId: string,
    preset: string,
    volume: number,
    pitchFactor: number,
    loop: boolean,
    onEnd?: () => void
  ): { stop: () => void } {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(volume, now);
    voiceGain.connect(this.filterNode!);

    const cleanupNodes: { stop?: () => void; disconnect: () => void }[] = [];

    const handleStop = () => {
      try {
        voiceGain.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
        setTimeout(() => {
          cleanupNodes.forEach((node) => {
            try {
              if (node.stop) node.stop();
              node.disconnect();
            } catch {
              // ignore
            }
          });
          voiceGain.disconnect();
        }, 30);
      } catch {
        // ignore
      }
      this.activeSources.delete(activeItem);
      onEnd?.();
    };

    const activeItem = { stop: handleStop, id: soundId };
    this.activeSources.add(activeItem);

    // Master dispatcher for synthesis presets
    switch (preset) {
      case 'air_horn':
        this.synthAirHorn(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop, loop);
        break;
      case 'nuclear_siren':
        this.synthNuclearSiren(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop, loop);
        break;
      case 'metal_pipe':
        this.synthMetalPipe(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'tactical_knock':
        this.synthTacticalKnock(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'bruh':
        this.synthBruh(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'cyber_glitch':
        this.synthGlitchError(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'jump_scare':
        this.synthJumpScare(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'wet_fart':
        this.synthWetFart(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'rickroll':
        this.synthRickroll(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'laser_blaster':
        this.synthLaser(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'police_siren':
        this.synthPoliceSiren(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop, loop);
        break;
      case 'censored_bleep':
        this.synthBleep(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop, loop);
        break;
      case 'alien_beam':
        this.synthAlienBeam(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop, loop);
        break;
      case 'air_raid':
        this.synthAirRaid(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop, loop);
        break;
      case 'sonic_boom':
        this.synthSonicBoom(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'dial_up':
        this.synthDialUp(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'crowd_laugh':
        this.synthCrowdLaugh(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'bonk':
        this.synthBonk(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'discord_ping':
        this.synthDiscordPing(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'mosquito_buzz':
        this.synthMosquito(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop, loop);
        break;
      case 'vine_boom':
        this.synthVineBoom(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'bsod_chime':
        this.synthBsodChime(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'robot_laugh':
        this.synthRobotLaugh(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      case 'creepy_whisper':
        this.synthCreepyWhisper(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop);
        break;
      default:
        this.synthAirHorn(ctx, voiceGain, pitchFactor, cleanupNodes, handleStop, loop);
        break;
    }

    return { stop: handleStop };
  }

  // --- 1. Authentic MLG / Stadium Air Horn ---
  private synthAirHorn(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void, loop = false) {
    const freqs = [233, 293, 349, 466, 587, 700]; // Rich Bb major triad horn brass chord
    const now = ctx.currentTime;
    const dur = loop ? 10.0 : 1.25;

    // Resonant brass horn filter
    const hornFilter = ctx.createBiquadFilter();
    hornFilter.type = 'bandpass';
    hornFilter.frequency.setValueAtTime(950 * pitch, now);
    hornFilter.Q.setValueAtTime(3.8, now);
    hornFilter.connect(dest);

    // Envelope
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.001, now);
    envGain.gain.linearRampToValueAtTime(0.85, now + 0.04);
    envGain.gain.setValueAtTime(0.8, now + dur - 0.15);
    envGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    envGain.connect(hornFilter);

    // Oscillators
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f * pitch, now);
      // Brassy pitch slide-in
      osc.frequency.exponentialRampToValueAtTime((f * 1.02) * pitch, now + 0.08);

      const oscGain = ctx.createGain();
      oscGain.gain.value = 0.25;
      osc.connect(oscGain);
      oscGain.connect(envGain);

      osc.start(now);
      osc.stop(now + dur);
      cleanup.push(osc, oscGain);
    });

    // Sub punch transient
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110 * pitch, now);
    sub.frequency.exponentialRampToValueAtTime(55 * pitch, now + 0.1);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.22);
    cleanup.push(sub, subGain, hornFilter, envGain);

    setTimeout(onEnd, dur * 1000);
  }

  // --- 2. Nuclear Siren / Doppler Alarm ---
  private synthNuclearSiren(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void, loop = false) {
    const now = ctx.currentTime;
    const dur = loop ? 15.0 : 3.8;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    // LFO to sweep siren
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.5, now); // 2 second cycle
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(260 * pitch, now);

    lfo.connect(osc1.frequency);
    lfo.connect(osc2.frequency);

    osc1.frequency.setValueAtTime(580 * pitch, now);
    osc2.frequency.setValueAtTime(585 * pitch, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.75, now + 0.4);
    env.gain.setValueAtTime(0.75, now + dur - 0.4);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc1.connect(env);
    osc2.connect(env);
    env.connect(dest);

    lfo.start(now);
    osc1.start(now);
    osc2.start(now);

    lfo.stop(now + dur);
    osc1.stop(now + dur);
    osc2.stop(now + dur);

    cleanup.push(osc1, osc2, lfo, lfoGain, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 3. Metal Pipe Clank (Iconic Meme) ---
  private synthMetalPipe(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 2.4;

    // Inharmonic modal frequencies of a metal cylinder
    const metalRatios = [1.0, 1.58, 2.31, 3.12, 4.28, 5.7, 7.3, 9.8];
    const baseFreq = 480 * pitch;

    const masterEnv = ctx.createGain();
    masterEnv.gain.setValueAtTime(0.9, now);
    masterEnv.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    masterEnv.connect(dest);

    metalRatios.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);

      const decayTime = Math.max(0.3, dur / (1 + ratio * 0.4));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4 / (i + 1), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

      osc.connect(g);
      g.connect(masterEnv);
      osc.start(now);
      osc.stop(now + decayTime + 0.05);
      cleanup.push(osc, g);
    });

    // Metallic scrape noise burst
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(3500 * pitch, now);

    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.6, now);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseEnv);
    noiseEnv.connect(dest);

    whiteNoise.start(now);
    cleanup.push(whiteNoise, noiseFilter, noiseEnv, masterEnv);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 4. Tactical Knock + FBI Open Up ---
  private synthTacticalKnock(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const knockTimes = [0.0, 0.18, 0.36, 0.54];

    knockTimes.forEach((t) => {
      const kOsc = ctx.createOscillator();
      kOsc.type = 'sine';
      kOsc.frequency.setValueAtTime(140 * pitch, now + t);
      kOsc.frequency.exponentialRampToValueAtTime(45 * pitch, now + t + 0.08);

      const kEnv = ctx.createGain();
      kEnv.gain.setValueAtTime(0.9, now + t);
      kEnv.gain.exponentialRampToValueAtTime(0.001, now + t + 0.09);

      kOsc.connect(kEnv);
      kEnv.connect(dest);

      kOsc.start(now + t);
      kOsc.stop(now + t + 0.1);
      cleanup.push(kOsc, kEnv);
    });

    // Door crash breach explosion at 0.9s
    const breachTime = now + 0.85;
    const noiseDur = 1.2;
    const bufferSize = ctx.sampleRate * noiseDur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.25));
    }
    const breachNoise = ctx.createBufferSource();
    breachNoise.buffer = noiseBuffer;

    const breachFilter = ctx.createBiquadFilter();
    breachFilter.type = 'lowpass';
    breachFilter.frequency.setValueAtTime(800 * pitch, breachTime);

    const breachEnv = ctx.createGain();
    breachEnv.gain.setValueAtTime(1.0, breachTime);
    breachEnv.gain.exponentialRampToValueAtTime(0.001, breachTime + noiseDur);

    breachNoise.connect(breachFilter);
    breachFilter.connect(breachEnv);
    breachEnv.connect(dest);

    breachNoise.start(breachTime);
    cleanup.push(breachNoise, breachFilter, breachEnv);

    setTimeout(onEnd, 2200);
  }

  // --- 5. Wet Bruh Sound Effect ---
  private synthBruh(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 1.1;

    // Vowel formant synthesis for 'BRUH'
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    // Pitch sweeps down from 150Hz to 65Hz
    osc.frequency.setValueAtTime(155 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(68 * pitch, now + dur);

    // Formant 1
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(500 * pitch, now);
    f1.frequency.exponentialRampToValueAtTime(350 * pitch, now + dur);
    f1.Q.setValueAtTime(4.0, now);

    // Formant 2
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1200 * pitch, now);
    f2.frequency.exponentialRampToValueAtTime(800 * pitch, now + dur);
    f2.Q.setValueAtTime(5.0, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, now);
    env.gain.linearRampToValueAtTime(0.9, now + 0.1);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(env);
    f2.connect(env);
    env.connect(dest);

    osc.start(now);
    osc.stop(now + dur + 0.05);

    cleanup.push(osc, f1, f2, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 6. Cyber Glitch / BSOD Error ---
  private synthGlitchError(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const tones = [523.25, 415.3, 311.13, 196.0]; // C5, Ab4, Eb4, G3 Descending error chord

    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq * pitch, now + idx * 0.07);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);

      osc.connect(g);
      g.connect(dest);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.2);
      cleanup.push(osc, g);
    });

    // Harsh glitch noise pulse
    const noiseLen = 0.35;
    const bufferSize = ctx.sampleRate * noiseLen;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = ((i % 24) === 0 ? 1 : -1) * (Math.random() > 0.5 ? 0.8 : -0.8);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.5, now + 0.25);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + noiseLen);

    noise.connect(nGain);
    nGain.connect(dest);
    noise.start(now + 0.25);
    cleanup.push(noise, nGain);

    setTimeout(onEnd, 700);
  }

  // --- 7. Jump Scare Horror Screech & Sub Drop ---
  private synthJumpScare(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 2.0;

    // Piercing dissonant cluster (tritone & minor 2nds)
    const clusterFreqs = [1864, 1975, 2093, 2793];
    clusterFreqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * pitch, now);

      // Tremolo screech
      const tremolo = ctx.createOscillator();
      tremolo.frequency.setValueAtTime(28, now);
      const tremGain = ctx.createGain();
      tremGain.gain.value = 80;
      tremolo.connect(osc.frequency);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(g);
      g.connect(dest);

      tremolo.start(now);
      osc.start(now);
      tremolo.stop(now + 0.75);
      osc.stop(now + 0.75);
      cleanup.push(osc, tremolo, tremGain, g);
    });

    // Massive cinematic sub drop
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140 * pitch, now);
    sub.frequency.exponentialRampToValueAtTime(32 * pitch, now + dur);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(now);
    sub.stop(now + dur + 0.05);

    cleanup.push(sub, subGain);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 8. Wet Fart / Sub-Harmonic Flutter ---
  private synthWetFart(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 0.9;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85 * pitch, now);

    // Chaotic pitch flutter LFO
    const flutter = ctx.createOscillator();
    flutter.type = 'square';
    flutter.frequency.setValueAtTime(26, now);
    const flutterGain = ctx.createGain();
    flutterGain.gain.setValueAtTime(45 * pitch, now);
    flutter.connect(osc.frequency);

    // Resonant squelch filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450 * pitch, now);
    filter.frequency.linearRampToValueAtTime(180 * pitch, now + dur);
    filter.Q.setValueAtTime(6.0, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.85, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(env);
    env.connect(dest);

    flutter.start(now);
    osc.start(now);
    flutter.stop(now + dur);
    osc.stop(now + dur);

    cleanup.push(osc, flutter, flutterGain, filter, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 9. Rickroll 8-bit Riff ---
  private synthRickroll(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    // Classic Rick Astley intro riff: F4, G4, Bb4, G4, D5, D5, C5
    const notes = [
      { f: 349.23, d: 0.16 },
      { f: 392.00, d: 0.16 },
      { f: 466.16, d: 0.22 },
      { f: 392.00, d: 0.16 },
      { f: 587.33, d: 0.35 },
      { f: 587.33, d: 0.35 },
      { f: 523.25, d: 0.55 },
    ];

    let t = 0;
    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f * pitch, now + t);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.4, now + t);
      env.gain.exponentialRampToValueAtTime(0.001, now + t + note.d);

      osc.connect(env);
      env.connect(dest);

      osc.start(now + t);
      osc.stop(now + t + note.d + 0.05);

      cleanup.push(osc, env);
      t += note.d + 0.04;
    });

    setTimeout(onEnd, (t + 0.1) * 1000);
  }

  // --- 10. Laser Blaster ---
  private synthLaser(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 0.35;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(90 * pitch, now + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.8, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(env);
    env.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    cleanup.push(osc, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 11. Police Siren ---
  private synthPoliceSiren(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void, loop = false) {
    const now = ctx.currentTime;
    const dur = loop ? 12.0 : 3.0;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';

    // Alternating between 650Hz and 920Hz every 0.35s
    const steps = Math.floor(dur / 0.35);
    for (let i = 0; i < steps; i++) {
      const freq = (i % 2 === 0 ? 650 : 920) * pitch;
      osc.frequency.setValueAtTime(freq, now + i * 0.35);
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.6, now);
    env.gain.setValueAtTime(0.6, now + dur - 0.2);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(env);
    env.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.05);

    cleanup.push(osc, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 12. Censored Bleep ---
  private synthBleep(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void, loop = false) {
    const now = ctx.currentTime;
    const dur = loop ? 10.0 : 1.4;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000 * pitch, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.7, now);
    env.gain.setValueAtTime(0.7, now + dur - 0.05);
    env.gain.linearRampToValueAtTime(0.001, now + dur);

    osc.connect(env);
    env.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    cleanup.push(osc, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 13. Alien Abduction Beam ---
  private synthAlienBeam(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void, loop = false) {
    const now = ctx.currentTime;
    const dur = loop ? 15.0 : 3.2;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440 * pitch, now);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(7.5, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(120 * pitch, now);

    lfo.connect(osc.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, now);
    env.gain.linearRampToValueAtTime(0.65, now + 0.3);
    env.gain.setValueAtTime(0.65, now + dur - 0.3);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(env);
    env.connect(dest);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + dur);
    osc.stop(now + dur);

    cleanup.push(osc, lfo, lfoGain, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 14. Air Raid Mechanical Siren ---
  private synthAirRaid(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void, loop = false) {
    const now = ctx.currentTime;
    const dur = loop ? 15.0 : 4.5;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(480 * pitch, now + 2.0);
    osc.frequency.setValueAtTime(480 * pitch, now + dur - 1.5);
    osc.frequency.exponentialRampToValueAtTime(220 * pitch, now + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, now);
    env.gain.linearRampToValueAtTime(0.8, now + 1.0);
    env.gain.setValueAtTime(0.8, now + dur - 1.0);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(env);
    env.connect(dest);
    osc.start(now);
    osc.stop(now + dur);

    cleanup.push(osc, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 15. Sonic Boom / Sub Blast ---
  private synthSonicBoom(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 2.2;

    const bufferSize = ctx.sampleRate * dur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 * pitch, now);
    filter.frequency.exponentialRampToValueAtTime(35 * pitch, now + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(1.0, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(env);
    env.connect(dest);

    // Initial shockwave crack
    const crack = ctx.createOscillator();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(450 * pitch, now);
    crack.frequency.exponentialRampToValueAtTime(40 * pitch, now + 0.15);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(1.0, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    crack.connect(crackGain);
    crackGain.connect(dest);
    crack.start(now);
    crack.stop(now + 0.16);

    noise.start(now);
    cleanup.push(noise, filter, env, crack, crackGain);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 16. Dial-up Modem Handshake ---
  private synthDialUp(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 3.2;

    // Dual-tone high pitch negotiation
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(1300 * pitch, now);
    osc2.frequency.setValueAtTime(2100 * pitch, now);

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0.35, now);
    toneGain.gain.setValueAtTime(0.35, now + 1.2);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    osc1.connect(toneGain);
    osc2.connect(toneGain);
    toneGain.connect(dest);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.3);
    osc2.stop(now + 1.3);

    // Noise static handshake at 1.2s
    const noiseStart = now + 1.2;
    const noiseDur = 2.0;
    const bufferSize = ctx.sampleRate * noiseDur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = ((i % 12) === 0 ? 0.9 : -0.9) * (Math.random() > 0.4 ? 1 : -1);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1800 * pitch, noiseStart);
    bandpass.Q.setValueAtTime(4.0, noiseStart);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.5, noiseStart);
    nGain.gain.exponentialRampToValueAtTime(0.001, noiseStart + noiseDur);

    noise.connect(bandpass);
    bandpass.connect(nGain);
    nGain.connect(dest);

    noise.start(noiseStart);
    cleanup.push(osc1, osc2, toneGain, noise, bandpass, nGain);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 17. Crowd Laugh Track ---
  private synthCrowdLaugh(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 2.5;

    // Rhythmic filtered noise bursts mimicking laughter
    const bufferSize = ctx.sampleRate * dur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650 * pitch, now);
    filter.Q.setValueAtTime(2.5, now);

    // Laughter pulsing envelope
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(4.5, now); // ~4.5 chuckles per second

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, now);
    env.gain.linearRampToValueAtTime(0.65, now + 0.3);
    env.gain.setValueAtTime(0.65, now + dur - 0.5);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(env);
    env.connect(dest);

    noise.start(now);
    cleanup.push(noise, filter, env, lfo);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 18. Cartoon Bonk / Clobber ---
  private synthBonk(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 0.5;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(110 * pitch, now + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.9, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(env);
    env.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    cleanup.push(osc, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 19. Discord Ping ---
  private synthDiscordPing(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    // Two clean bells: E6 (1318.5Hz) -> G#6 (1661.2Hz)
    const notes = [
      { f: 1318.5, t: 0.0 },
      { f: 1661.2, t: 0.08 },
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f * pitch, now + n.t);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.55, now + n.t);
      env.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.45);

      osc.connect(env);
      env.connect(dest);
      osc.start(now + n.t);
      osc.stop(now + n.t + 0.48);
      cleanup.push(osc, env);
    });

    setTimeout(onEnd, 600);
  }

  // --- 20. Annoying Mosquito Whine (15.5 kHz) ---
  private synthMosquito(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void, loop = false) {
    const now = ctx.currentTime;
    const dur = loop ? 15.0 : 3.0;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(14800 * pitch, now);

    // Subtle erratic frequency jitter
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(12, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(180, now);
    lfo.connect(osc.frequency);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, now);
    env.gain.setValueAtTime(0.3, now + dur - 0.2);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(env);
    env.connect(dest);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + dur);
    osc.stop(now + dur);

    cleanup.push(osc, lfo, lfoGain, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 21. Vines Boom / 808 Sub Explosion ---
  private synthVineBoom(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 1.8;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(32 * pitch, now + dur);

    // Heavy distortion shaper on the bass
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.makeDistortionCurve(40) as any;

    const env = ctx.createGain();
    env.gain.setValueAtTime(1.0, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(shaper);
    shaper.connect(env);
    env.connect(dest);

    osc.start(now);
    osc.stop(now + dur + 0.05);

    cleanup.push(osc, shaper, env);
    setTimeout(onEnd, dur * 1000);
  }

  // --- 22. Descending BSOD Chime ---
  private synthBsodChime(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const notes = [440, 415.3, 370, 311.13];

    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f * pitch, now + idx * 0.2);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.5, now + idx * 0.2);
      env.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.2 + 0.35);

      osc.connect(env);
      env.connect(dest);
      osc.start(now + idx * 0.2);
      osc.stop(now + idx * 0.2 + 0.38);
      cleanup.push(osc, env);
    });

    setTimeout(onEnd, 1200);
  }

  // --- 23. Robot Laugh Cadence ---
  private synthRobotLaugh(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const laughs = 6;
    const step = 0.18;

    for (let i = 0; i < laughs; i++) {
      const t = now + i * step;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime((320 - i * 15) * pitch, t);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.45, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(env);
      env.connect(dest);
      osc.start(t);
      osc.stop(t + 0.14);
      cleanup.push(osc, env);
    }

    setTimeout(onEnd, laughs * step * 1000);
  }

  // --- 24. Creepy Spectral Whisper ---
  private synthCreepyWhisper(ctx: AudioContext, dest: GainNode, pitch: number, cleanup: any[], onEnd: () => void) {
    const now = ctx.currentTime;
    const dur = 2.2;

    const bufferSize = ctx.sampleRate * dur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 * pitch, now);
    filter.frequency.exponentialRampToValueAtTime(450 * pitch, now + dur);
    filter.Q.setValueAtTime(7.0, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.01, now);
    env.gain.linearRampToValueAtTime(0.7, now + 0.6);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(env);
    env.connect(dest);

    noise.start(now);
    cleanup.push(noise, filter, env);
    setTimeout(onEnd, dur * 1000);
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = amount;
    const n = 22050;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * AUDIO FILE DECODER for custom sound uploads (.mp3, .wav, .ogg, etc.)
   */
  public async decodeAudioFile(file: File): Promise<AudioBuffer> {
    this.ensureContext();
    const arrayBuffer = await file.arrayBuffer();
    return await this.ctx!.decodeAudioData(arrayBuffer);
  }

  /**
   * MICROPHONE RECORDING & LIVE MONITOR
   */
  public async startMicRecording(): Promise<void> {
    this.ensureContext();
    this.recordedChunks = [];
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    this.mediaRecorder = new MediaRecorder(this.micStream);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };
    this.mediaRecorder.start();
  }

  public async stopMicRecording(): Promise<{ buffer: AudioBuffer; blob: Blob }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not started'));
        return;
      }
      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        try {
          const buffer = await this.ctx!.decodeAudioData(arrayBuffer);
          resolve({ buffer, blob });
        } catch (err) {
          reject(err);
        } finally {
          this.micStream?.getTracks().forEach((track) => track.stop());
          this.micStream = null;
        }
      };
      this.mediaRecorder.stop();
    });
  }

  /**
   * LIVE MICROPHONE VOCODER/MONITOR TOGGLE
   */
  public async toggleMicMonitor(enable: boolean, onLevel?: (rms: number) => void): Promise<boolean> {
    this.ensureContext();
    if (!enable) {
      if (this.micSource) {
        this.micSource.disconnect();
        this.micSource = null;
      }
      if (this.micStream) {
        this.micStream.getTracks().forEach((t) => t.stop());
        this.micStream = null;
      }
      return false;
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micSource = this.ctx!.createMediaStreamSource(this.micStream);
      this.micMonitorGain = this.ctx!.createGain();
      this.micMonitorGain.gain.value = 0.8;

      this.micSource.connect(this.micMonitorGain);
      this.micMonitorGain.connect(this.filterNode!);
      return true;
    } catch {
      return false;
    }
  }
}

export const audioEngine = new AudioEngine();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { audioEngine } from './audio/audioEngine';
import { ComboSequencerModal } from './components/ComboSequencerModal';
import { Header } from './components/Header';
import { LeftFxRack } from './components/LeftFxRack';
import { RecordSoundModal } from './components/RecordSoundModal';
import { SoundGrid } from './components/SoundGrid';
import { StealthTrapModal } from './components/StealthTrapModal';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { INITIAL_SOUNDS } from './data/defaultSounds';
import { FxSettings, SoundItem, TelemetryLog } from './types/sound';

export default function App() {
  const [sounds, setSounds] = useState<SoundItem[]>(() => {
    try {
      const saved = localStorage.getItem('cyber_prank_sounds');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with initial sounds to keep presets fresh
        const customOnly = parsed.filter((s: SoundItem) => s.category === 'custom');
        return [...INITIAL_SOUNDS, ...customOnly];
      }
    } catch {
      // fallback
    }
    return INITIAL_SOUNDS;
  });

  const [activeSoundIds, setActiveSoundIds] = useState<Set<string>>(new Set());
  const [activeStopFns, setActiveStopFns] = useState<Map<string, () => void>>(new Map());
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'board' | 'stealth' | 'combos' | 'fx'>('board');

  // Modals
  const [isStealthOpen, setIsStealthOpen] = useState(false);
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);

  // FX settings
  const [fx, setFx] = useState<FxSettings>(audioEngine.fx);

  // Telemetry logs
  const [logs, setLogs] = useState<TelemetryLog[]>([
    {
      id: 'init_1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'TRG',
      message: 'CYBER AUDIO MATRIX INITIALIZED // 24 PRESETS LOADED',
      bus: 'SYS_01',
      levelDb: -12,
    },
    {
      id: 'init_2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'FX',
      message: 'DSP HARDWARE ACCELERATION ENGAGED // BUFFER 1024 SAMPLES',
      bus: 'BUS_L',
    },
  ]);

  const addLog = useCallback((type: TelemetryLog['type'], message: string, bus?: string, levelDb?: number) => {
    const newLog: TelemetryLog = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      bus: bus || 'CH-01',
      levelDb: levelDb ?? (type === 'PANIC' ? -60 : -Math.floor(Math.random() * 12 + 1)),
    };
    setLogs((prev) => [...prev.slice(-90), newLog]);
  }, []);

  // Update volume
  const handleVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.setMasterVolume(vol);
    if (vol > 1.2) {
      addLog('WARN', `OVERDRIVE BOOST ENGAGED [${Math.round(vol * 100)}%]`, 'MAIN_OUT');
    }
  };

  // Trigger Sound Execution
  const triggerSound = useCallback((sound: SoundItem) => {
    // If already playing and looping, stop it
    if (activeSoundIds.has(sound.id) && sound.isLooping) {
      const stopFn = activeStopFns.get(sound.id);
      if (stopFn) stopFn();
      return;
    }

    addLog('TRG', `${sound.name} [VOL: ${Math.round(sound.volume * 100)}%] [KEY: ${sound.keybind}]`, 'VOICE_BUS');

    setActiveSoundIds((prev) => new Set(prev).add(sound.id));

    const { stop } = audioEngine.playSound(sound.id, sound.synthPreset, {
      volume: sound.volume,
      pitchSemitones: sound.pitchSemitones,
      loop: sound.isLooping,
      customBuffer: sound.audioBuffer,
      onEnd: () => {
        setActiveSoundIds((prev) => {
          const next = new Set(prev);
          next.delete(sound.id);
          return next;
        });
        setActiveStopFns((prev) => {
          const next = new Map(prev);
          next.delete(sound.id);
          return next;
        });
      },
    });

    setActiveStopFns((prev) => new Map(prev).set(sound.id, stop));
  }, [activeSoundIds, activeStopFns, addLog]);

  // Stop single sound
  const stopSound = useCallback((sound: SoundItem) => {
    const stopFn = activeStopFns.get(sound.id);
    if (stopFn) {
      stopFn();
    }
    setActiveSoundIds((prev) => {
      const next = new Set(prev);
      next.delete(sound.id);
      return next;
    });
    setActiveStopFns((prev) => {
      const next = new Map(prev);
      next.delete(sound.id);
      return next;
    });
  }, [activeStopFns]);

  // Master Panic Stop
  const handlePanicStop = useCallback(() => {
    const count = audioEngine.panicStop();
    setActiveSoundIds(new Set());
    setActiveStopFns(new Map());
    addLog('PANIC', `EMERGENCY STOP DETONATED // ${count} AUDIO BUFFERS PURGED`, 'MASTER_BUS', -60);
  }, [addLog]);

  // Toggle Looping on a sound
  const handleToggleLoop = (soundId: string) => {
    setSounds((prev) =>
      prev.map((s) => {
        if (s.id === soundId) {
          const nextLoop = !s.isLooping;
          addLog('FX', `${s.name} LOOPING ${nextLoop ? 'ENABLED' : 'DISABLED'}`);
          return { ...s, isLooping: nextLoop };
        }
        return s;
      })
    );
  };

  // Update pad settings (volume, pitch)
  const handleUpdateSoundConfig = (soundId: string, updates: Partial<SoundItem>) => {
    setSounds((prev) =>
      prev.map((s) => {
        if (s.id === soundId) {
          return { ...s, ...updates };
        }
        return s;
      })
    );
  };

  // Add custom recorded sound
  const handleAddCustomSound = (newSound: SoundItem) => {
    setSounds((prev) => {
      const next = [...prev, newSound];
      try {
        // save custom sounds metadata to localStorage (without the large audioBuffer)
        const customOnly = next
          .filter((s) => s.category === 'custom')
          .map((s) => ({ ...s, audioBuffer: undefined }));
        localStorage.setItem('cyber_prank_sounds', JSON.stringify(customOnly));
      } catch {
        // storage quota
      }
      return next;
    });
    addLog('REC', `CUSTOM PRANK PAD CREATED: ${newSound.name} [KEY: ${newSound.keybind}]`);
  };

  // Trigger Random Sound Detonator
  const handleTriggerRandom = useCallback(() => {
    if (sounds.length === 0) return;
    const randomIndex = Math.floor(Math.random() * sounds.length);
    const randomSound = sounds[randomIndex];
    triggerSound(randomSound);
    addLog('TRG', `RANDOM DETONATION: ${randomSound.name}`, 'RND_BUS');
  }, [sounds, triggerSound, addLog]);

  // Global Keyboard Hotkey Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in text input or select
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      // Panic Stop shortcuts: ESC or Space
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        handlePanicStop();
        return;
      }

      // Look up sound with matching keybind
      const pressedKey = e.key.toUpperCase();
      const matchedSound = sounds.find(
        (s) => s.keybind.toUpperCase() === pressedKey
      );

      if (matchedSound) {
        e.preventDefault();
        triggerSound(matchedSound);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sounds, triggerSound, handlePanicStop]);

  // Sync Tab buttons with modals
  const handleTabChange = (tab: 'board' | 'stealth' | 'combos' | 'fx') => {
    setActiveTab(tab);
    if (tab === 'stealth') {
      setIsStealthOpen(true);
    } else if (tab === 'combos') {
      setIsComboOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#DFE2EE] bg-cyber-grid flex flex-col font-sans selection:bg-[#FFB800] selection:text-black">
      
      {/* 1. Header with Master Controls & Panic Button */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        masterVolume={masterVolume}
        onVolumeChange={handleVolumeChange}
        onPanicStop={handlePanicStop}
        activeVoiceCount={activeSoundIds.size}
        onOpenRecordModal={() => setIsRecordOpen(true)}
      />

      {/* 2. Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Rack: Master FX Channels & Voice Modulator (visible on desktop or when 'fx' tab is active on mobile) */}
        <div className={`lg:block ${activeTab === 'fx' ? 'block' : 'hidden lg:block'}`}>
          <LeftFxRack
            fx={fx}
            onFxChange={(updates) => setFx((prev) => ({ ...prev, ...updates }))}
            onResetFx={() => {
              const defaults: FxSettings = {
                masterVolume: 1.0,
                pitchShift: 0,
                distortion: 0,
                reverb: 15,
                delayTime: 0.25,
                delayFeedback: 0.3,
                filterFreq: 14000,
                filterType: 'lowpass',
              };
              setFx(defaults);
              audioEngine.fx = { ...defaults };
              audioEngine.setPitchShift(0);
              audioEngine.setDistortion(0);
              audioEngine.setFilter(14000, 'lowpass');
              audioEngine.setDelay(0.25, 0.3, 0);
              addLog('FX', 'FX CHAIN RESTORED TO FACTORY PRESETS');
            }}
            onOpenRecordModal={() => setIsRecordOpen(true)}
            soundCounts={{
              total: sounds.length,
              custom: sounds.filter((s) => s.category === 'custom').length,
            }}
          />
        </div>

        {/* Soundboard Matrix Grid */}
        <div className={`flex-1 min-w-0 ${activeTab === 'fx' ? 'hidden lg:flex' : 'flex'}`}>
          <SoundGrid
            sounds={sounds}
            activeSoundIds={activeSoundIds}
            onTriggerSound={triggerSound}
            onStopSound={stopSound}
            onToggleLoop={handleToggleLoop}
            onUpdateSoundConfig={handleUpdateSoundConfig}
            onTriggerRandom={handleTriggerRandom}
          />
        </div>

      </main>

      {/* 3. Bottom Monospace Telemetry & Event Log Drawer */}
      <TelemetryDrawer
        logs={logs}
        onClearLogs={() => setLogs([])}
        onRandomDetonate={handleTriggerRandom}
        activeVoiceCount={activeSoundIds.size}
      />

      {/* 4. Modals */}
      <StealthTrapModal
        sounds={sounds}
        isOpen={isStealthOpen}
        onClose={() => {
          setIsStealthOpen(false);
          setActiveTab('board');
        }}
        onDetonate={(sound) => triggerSound(sound)}
        onLogEvent={(type, msg) => addLog(type, msg)}
      />

      <ComboSequencerModal
        sounds={sounds}
        isOpen={isComboOpen}
        onClose={() => {
          setIsComboOpen(false);
          setActiveTab('board');
        }}
        onPlaySound={(sound) => triggerSound(sound)}
        onLogEvent={(type, msg) => addLog(type, msg)}
      />

      <RecordSoundModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        onAddCustomSound={handleAddCustomSound}
      />

    </div>
  );
}

import React, { useState } from 'react';
import {
  Clock,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { ComboStep, SoundItem } from '../types/sound';

interface ComboSequencerModalProps {
  sounds: SoundItem[];
  isOpen: boolean;
  onClose: () => void;
  onPlaySound: (sound: SoundItem) => void;
  onLogEvent: (type: 'COMBO' | 'PANIC', msg: string) => void;
}

export const ComboSequencerModal: React.FC<ComboSequencerModalProps> = ({
  sounds,
  isOpen,
  onClose,
  onPlaySound,
  onLogEvent,
}) => {
  const [steps, setSteps] = useState<ComboStep[]>([
    { id: '1', soundId: 'tactical_knock', delayMs: 0 },
    { id: '2', soundId: 'air_horn', delayMs: 800 },
    { id: '3', soundId: 'vine_boom', delayMs: 600 },
  ]);

  const [isPlayingCombo, setIsPlayingCombo] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const timeoutsRef = React.useRef<NodeJS.Timeout[]>([]);

  if (!isOpen) return null;

  const handleAddStep = () => {
    const newStep: ComboStep = {
      id: Math.random().toString(),
      soundId: sounds[0].id,
      delayMs: 500,
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleUpdateStep = (id: string, updates: Partial<ComboStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const stopCombo = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    setIsPlayingCombo(false);
    setActiveStepIndex(null);
    onLogEvent('PANIC', 'COMBO SEQUENCE STOPPED');
  };

  const playCombo = () => {
    stopCombo();
    setIsPlayingCombo(true);
    onLogEvent('COMBO', `EXECUTING PRANK COMBO (${steps.length} STEPS)`);

    let accumulatedDelay = 0;
    steps.forEach((step, index) => {
      accumulatedDelay += step.delayMs;
      const t = setTimeout(() => {
        setActiveStepIndex(index);
        const targetSound = sounds.find((s) => s.id === step.soundId);
        if (targetSound) {
          onPlaySound(targetSound);
        }
        if (index === steps.length - 1) {
          setTimeout(() => {
            setIsPlayingCombo(false);
            setActiveStepIndex(null);
          }, 1500);
        }
      }, accumulatedDelay);
      timeoutsRef.current.push(t);
    });
  };

  // Preset Combos
  const loadPreset = (presetName: string) => {
    stopCombo();
    if (presetName === 'swat') {
      setSteps([
        { id: '1', soundId: 'tactical_knock', delayMs: 0 },
        { id: '2', soundId: 'nuclear_siren', delayMs: 900 },
        { id: '3', soundId: 'air_horn', delayMs: 1200 },
        { id: '4', soundId: 'vine_boom', delayMs: 800 },
      ]);
    } else if (presetName === 'haunted') {
      setSteps([
        { id: '1', soundId: 'discord_ping', delayMs: 0 },
        { id: '2', soundId: 'creepy_whisper', delayMs: 1200 },
        { id: '3', soundId: 'jump_scare', delayMs: 1500 },
      ]);
    } else if (presetName === 'troll') {
      setSteps([
        { id: '1', soundId: 'wet_fart', delayMs: 0 },
        { id: '2', soundId: 'bruh', delayMs: 800 },
        { id: '3', soundId: 'crowd_laugh', delayMs: 1000 },
        { id: '4', soundId: 'rickroll', delayMs: 1200 },
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl cyber-panel border border-white/20 rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#00FF66]/15 border border-[#00FF66] text-[#00FF66]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white uppercase tracking-wider">
                PRANK COMBO SEQUENCER
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Chain multiple sounds with timed pauses to orchestrate the ultimate audio prank.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCombo();
              onClose();
            }}
            className="text-[#94A3B8] hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Preset Buttons */}
        <div>
          <span className="text-xs font-mono-code text-[#94A3B8] block mb-1.5 uppercase font-bold">
            Quick Load Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadPreset('swat')}
              className="px-3 py-1 bg-red-950/60 border border-red-500 text-xs font-mono-code text-white rounded hover:bg-red-900/60 cursor-pointer"
            >
              🚨 FBI SWAT Breach
            </button>
            <button
              type="button"
              onClick={() => loadPreset('haunted')}
              className="px-3 py-1 bg-purple-950/60 border border-purple-500 text-xs font-mono-code text-white rounded hover:bg-purple-900/60 cursor-pointer"
            >
              👻 Ghost Jumpscare
            </button>
            <button
              type="button"
              onClick={() => loadPreset('troll')}
              className="px-3 py-1 bg-amber-950/60 border border-amber-500 text-xs font-mono-code text-white rounded hover:bg-amber-900/60 cursor-pointer"
            >
              🎭 Classic Meme Troll
            </button>
          </div>
        </div>

        {/* Combo Steps List */}
        <div className="space-y-2.5">
          {steps.map((step, idx) => {
            const isStepActive = activeStepIndex === idx;
            return (
              <div
                key={step.id}
                className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  isStepActive
                    ? 'bg-[#00FF66]/20 border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                    : 'cyber-panel-elevated'
                }`}
              >
                {/* Step number badge */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="w-6 h-6 rounded-full bg-white/10 font-mono-code text-xs font-bold flex items-center justify-center text-white shrink-0">
                    {idx + 1}
                  </span>

                  {/* Sound Selector */}
                  <select
                    value={step.soundId}
                    onChange={(e) => handleUpdateStep(step.id, { soundId: e.target.value })}
                    className="flex-1 bg-[#131B2E] border border-white/20 rounded px-2.5 py-1.5 text-xs text-white font-mono-code focus:outline-none focus:border-[#00FF66] cursor-pointer"
                  >
                    {sounds.map((sound) => (
                      <option key={sound.id} value={sound.id}>
                        {sound.name} ({sound.durationSec}s)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delay Slider */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-mono-code text-[#94A3B8]">
                    <Clock className="w-3.5 h-3.5 text-[#00FF66]" />
                    <span>Pause:</span>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      step="100"
                      value={step.delayMs}
                      onChange={(e) =>
                        handleUpdateStep(step.id, { delayMs: parseInt(e.target.value) || 0 })
                      }
                      className="w-16 bg-black/60 border border-white/20 rounded px-2 py-1 text-right text-white font-mono-code text-xs"
                    />
                    <span>ms</span>
                  </div>

                  {/* Delete button */}
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(step.id)}
                      className="text-[#94A3B8] hover:text-[#FF1E56] p-1.5 rounded cursor-pointer"
                      title="Remove step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Step Button */}
        <button
          type="button"
          onClick={handleAddStep}
          className="w-full py-2 rounded border border-dashed border-white/20 text-[#94A3B8] hover:text-white hover:border-[#00FF66] font-mono-code text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Another Step to Combo
        </button>

        {/* Action Controls */}
        <div className="pt-2 border-t border-white/10 flex items-center gap-3">
          {isPlayingCombo ? (
            <button
              type="button"
              onClick={stopCombo}
              className="flex-1 py-3 px-4 rounded font-heading font-bold text-sm uppercase tracking-wider bg-[#FF1E56] text-white flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,30,86,0.5)]"
            >
              <Square className="w-4 h-4 fill-white" />
              STOP COMBO EXECUTION
            </button>
          ) : (
            <button
              type="button"
              onClick={playCombo}
              className="flex-1 py-3 px-4 rounded font-heading font-bold text-sm uppercase tracking-wider bg-[#00FF66] text-[#003911] hover:bg-[#00FF66]/90 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,255,102,0.4)]"
            >
              <Play className="w-4 h-4 fill-[#003911]" />
              EXECUTE COMBO SEQUENCE NOW
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              stopCombo();
              onClose();
            }}
            className="py-3 px-4 rounded font-mono-code text-xs text-[#94A3B8] hover:text-white bg-white/5 border border-white/10 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Repeat, Sliders, Volume2 } from 'lucide-react';
import { CategoryColor, SoundItem } from '../types/sound';

interface SoundPadProps {
  sound: SoundItem;
  isPlaying: boolean;
  onTrigger: (sound: SoundItem) => void;
  onStop: (sound: SoundItem) => void;
  onToggleLoop: (soundId: string) => void;
  onUpdateSoundConfig: (soundId: string, updates: Partial<SoundItem>) => void;
}

export const SoundPad: React.FC<SoundPadProps> = ({
  sound,
  isPlaying,
  onTrigger,
  onStop,
  onToggleLoop,
  onUpdateSoundConfig,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // If clicking a control inside pad, avoid trigger
    if ((e.target as HTMLElement).closest('.pad-control')) return;

    if (isPlaying && sound.isLooping) {
      onStop(sound);
    } else {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 240);
      onTrigger(sound);
    }
  };

  // Color mappings based on design system
  const getColorStyles = (color: CategoryColor, active: boolean) => {
    switch (color) {
      case 'amber':
        return active
          ? 'border-[#FFB800] bg-[#FFB800]/20 shadow-[0_0_24px_rgba(255,184,0,0.5)] ring-1 ring-[#FFB800]'
          : 'hover:border-[#FFB800]/70 hover:shadow-[0_0_16px_rgba(255,184,0,0.25)]';
      case 'red':
        return active
          ? 'border-[#FF1E56] bg-[#FF1E56]/20 shadow-[0_0_28px_rgba(255,30,86,0.6)] ring-1 ring-[#FF1E56]'
          : 'hover:border-[#FF1E56]/70 hover:shadow-[0_0_16px_rgba(255,30,86,0.25)]';
      case 'purple':
        return active
          ? 'border-[#A855F7] bg-[#A855F7]/20 shadow-[0_0_24px_rgba(168,85,247,0.5)] ring-1 ring-[#A855F7]'
          : 'hover:border-[#A855F7]/70 hover:shadow-[0_0_16px_rgba(168,85,247,0.25)]';
      case 'green':
      default:
        return active
          ? 'border-[#00FF66] bg-[#00FF66]/20 shadow-[0_0_20px_rgba(0,255,102,0.45)] ring-1 ring-[#00FF66]'
          : 'hover:border-[#00FF66]/70 hover:shadow-[0_0_16px_rgba(0,255,102,0.25)]';
    }
  };

  const getAccentColorHex = (color: CategoryColor) => {
    switch (color) {
      case 'amber': return '#FFB800';
      case 'red': return '#FF1E56';
      case 'purple': return '#A855F7';
      case 'green':
      default: return '#00FF66';
    }
  };

  const accentHex = getAccentColorHex(sound.categoryColor);

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleClick}
        className={`relative w-full text-left p-3.5 sm:p-4 rounded-md transition-all duration-150 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[96px] sm:min-h-[110px] select-none
          cyber-panel-elevated
          ${getColorStyles(sound.categoryColor, isPlaying)}
          ${isPlaying ? 'scale-[0.98]' : 'active:scale-[0.97]'}
          ${isGlitching ? 'glitch-active' : ''}
        `}
      >
        {/* Subtle radial glow when active */}
        {isPlaying && (
          <div
            className="absolute inset-0 pointer-events-none opacity-40 blur-xl"
            style={{
              background: `radial-gradient(circle at center, ${accentHex} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Scanline overlay sweep on trigger */}
        {isPlaying && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-pulse pointer-events-none" />
        )}

        {/* Top Header: Category Tag & Keybind Badge */}
        <div className="flex items-center justify-between w-full relative z-10 mb-2">
          <span
            className="text-[10px] font-mono-code font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs"
            style={{
              color: accentHex,
              backgroundColor: `${accentHex}15`,
              border: `1px solid ${accentHex}30`,
            }}
          >
            {sound.category}
          </span>

          <div className="flex items-center gap-1.5">
            {sound.isLooping && (
              <span className="text-[10px] font-mono-code text-[#00FF66] bg-[#00FF66]/10 px-1 py-0.5 rounded-xs flex items-center gap-0.5 border border-[#00FF66]/30">
                <Repeat className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '3s' }} />
                LOOP
              </span>
            )}
            <kbd className="font-mono-code text-xs px-2 py-0.5 rounded bg-black/60 border border-white/20 text-white font-bold shadow-xs">
              [{sound.keybind}]
            </kbd>
          </div>
        </div>

        {/* Sound Title */}
        <div className="relative z-10 my-1">
          <div className="font-heading font-bold text-sm sm:text-base tracking-tight text-white line-clamp-1 group-hover:text-white/95">
            {sound.name}
          </div>
          <div className="text-[11px] text-[#94A3B8] line-clamp-1 mt-0.5 font-normal">
            {sound.description}
          </div>
        </div>

        {/* Bottom Row: Duration, Active Equalizer, & Quick Controls */}
        <div className="flex items-center justify-between w-full relative z-10 mt-2 pt-2 border-t border-white/5">
          <span className="font-mono-code text-[11px] text-[#94A3B8]">
            {sound.durationSec}s
          </span>

          {/* Mini dynamic equalizer bars when active */}
          {isPlaying ? (
            <div className="flex items-end gap-1 h-3.5">
              {[40, 90, 60, 100, 75, 45].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-xs animate-bounce"
                  style={{
                    height: `${h}%`,
                    backgroundColor: accentHex,
                    animationDuration: `${0.3 + (i % 3) * 0.15}s`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pad-control">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLoop(sound.id);
                }}
                title={sound.isLooping ? 'Disable Loop' : 'Enable Loop'}
                className={`p-1 rounded hover:bg-white/10 ${
                  sound.isLooping ? 'text-[#00FF66]' : 'text-[#94A3B8]'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfig(!showConfig);
                }}
                title="Tweak Pad Volume & Pitch"
                className="p-1 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </button>

      {/* Floating Configuration Flyout */}
      {showConfig && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 p-3 bg-[#131B2E] border border-white/20 rounded shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="font-heading font-bold text-xs text-white uppercase tracking-wider">
              {sound.name} Setup
            </span>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="text-[#94A3B8] hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          {/* Volume slider */}
          <div className="mb-2">
            <div className="flex justify-between text-[11px] font-mono-code text-[#94A3B8] mb-1">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Volume
              </span>
              <span>{Math.round(sound.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={sound.volume}
              onChange={(e) =>
                onUpdateSoundConfig(sound.id, { volume: parseFloat(e.target.value) })
              }
              className="w-full accent-[#FFB800] h-1.5 bg-black/40 rounded cursor-pointer"
            />
          </div>

          {/* Pitch Semitone slider */}
          <div>
            <div className="flex justify-between text-[11px] font-mono-code text-[#94A3B8] mb-1">
              <span>Pitch Shift</span>
              <span>
                {sound.pitchSemitones > 0 ? `+${sound.pitchSemitones}` : sound.pitchSemitones} st
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={sound.pitchSemitones}
              onChange={(e) =>
                onUpdateSoundConfig(sound.id, { pitchSemitones: parseInt(e.target.value) })
              }
              className="w-full accent-[#A855F7] h-1.5 bg-black/40 rounded cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

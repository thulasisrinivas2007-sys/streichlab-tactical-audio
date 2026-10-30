import React from 'react';
import { AlertOctagon, Flame, Layers, ShieldAlert, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { VuMeter } from './VuMeter';

interface HeaderProps {
  activeTab: 'board' | 'stealth' | 'combos' | 'fx';
  setActiveTab: (tab: 'board' | 'stealth' | 'combos' | 'fx') => void;
  masterVolume: number;
  onVolumeChange: (vol: number) => void;
  onPanicStop: () => void;
  activeVoiceCount: number;
  onOpenRecordModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  masterVolume,
  onVolumeChange,
  onPanicStop,
  activeVoiceCount,
  onOpenRecordModal,
}) => {
  const isOverdriven = masterVolume > 1.0;

  return (
    <header className="sticky top-0 z-40 w-full cyber-panel border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & System Status */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded bg-[#FFB800]/10 border border-[#FFB800] flex items-center justify-center shadow-[0_0_15px_rgba(255,184,0,0.3)]">
                <Sparkles className="w-5 h-5 text-[#FFB800] animate-pulse" />
              </div>
              {/* Online indicator dot */}
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66] ring-2 ring-[#0B0F17]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-white uppercase flex items-center gap-1.5">
                  CYBER <span className="text-[#FFB800]">PRANK</span> DECK
                </h1>
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 hidden sm:inline-block">
                  v2.6 PRO
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono-code text-[#94A3B8]">
                <span className="text-[#00FF66] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-ping" />
                  ONLINE
                </span>
                <span>•</span>
                <span>DSP: 0.8ms</span>
                <span>•</span>
                <span className={activeVoiceCount > 0 ? 'text-[#FFB800] font-bold' : ''}>
                  VOICES: {activeVoiceCount}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Record on Mobile */}
          <button
            type="button"
            onClick={onOpenRecordModal}
            className="md:hidden px-3 py-1.5 text-xs font-mono-code font-bold bg-[#A855F7]/20 border border-[#A855F7] text-white rounded cursor-pointer"
          >
            + REC
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-black/50 border border-white/10 rounded-md gap-1 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'board'
                ? 'bg-[#FFB800] text-[#412D00] shadow-[0_0_12px_rgba(255,184,0,0.4)]'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            Soundboard
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stealth')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'stealth'
                ? 'bg-[#FF1E56] text-white shadow-[0_0_14px_rgba(255,30,86,0.5)]'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Stealth Traps
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('combos')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'combos'
                ? 'bg-[#00FF66] text-[#003911] shadow-[0_0_12px_rgba(0,255,102,0.4)]'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Combos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fx')}
            className={`md:hidden flex-1 px-3 py-1.5 rounded text-xs font-heading font-semibold uppercase tracking-wider transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'fx'
                ? 'bg-[#A855F7] text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            FX Rack
          </button>
        </div>

        {/* Master Controls: VU Meter, Volume, Panic Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          
          {/* Real-time VU Meter */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[10px] font-mono-code text-[#94A3B8] uppercase">Output</span>
            <VuMeter bars={12} showPeakDb={false} />
          </div>

          {/* Master Volume Slider */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded">
            <button
              type="button"
              onClick={() => onVolumeChange(masterVolume > 0 ? 0 : 1.0)}
              className="text-[#94A3B8] hover:text-white cursor-pointer"
              title="Mute / Unmute"
            >
              {masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#FF1E56]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#FFB800]" />
              )}
            </button>
            
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] font-mono-code">
                <span className="text-[#94A3B8]">VOL</span>
                <span className={isOverdriven ? 'text-[#FF1E56] font-bold flex items-center gap-0.5' : 'text-[#FFB800]'}>
                  {isOverdriven && <Flame className="w-2.5 h-2.5 text-[#FF1E56]" />}
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.8"
                step="0.05"
                value={masterVolume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 sm:w-24 h-1.5 bg-white/20 rounded accent-[#FFB800] cursor-pointer"
                title="Master Output Gain (0% to 180% Overdrive)"
              />
            </div>
          </div>

          {/* MASTER PANIC STOP BUTTON */}
          <button
            type="button"
            onClick={onPanicStop}
            className={`group relative overflow-hidden px-4 py-2 sm:px-5 sm:py-2.5 rounded font-heading font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-150 cursor-pointer flex items-center gap-2 border border-[#FF1E56] text-white shadow-[0_0_20px_rgba(255,30,86,0.4)] hover:shadow-[0_0_30px_rgba(255,30,86,0.8)] active:scale-95 ${
              activeVoiceCount > 0 ? 'animate-pulse bg-[#FF1E56]/40' : 'bg-[#FF1E56]/20'
            }`}
            title="Instant Stop All Audio Buffers [ESC / SPACE]"
          >
            {/* Pulsing warning aura */}
            <div className="absolute inset-0 hazard-stripes opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
            
            <AlertOctagon className="w-4 h-4 text-[#FF1E56] group-hover:rotate-12 transition-transform" />
            <span>PANIC STOP</span>
            <kbd className="hidden sm:inline-block font-mono-code text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white/80 border border-[#FF1E56]/40">
              ESC
            </kbd>
          </button>
        </div>

      </div>
    </header>
  );
};

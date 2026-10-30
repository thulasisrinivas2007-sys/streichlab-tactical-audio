import React, { useState } from 'react';
import {
  Activity,
  AudioLines,
  Disc,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Sliders,
  Zap,
} from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { FxSettings } from '../types/sound';

interface LeftFxRackProps {
  fx: FxSettings;
  onFxChange: (updates: Partial<FxSettings>) => void;
  onResetFx: () => void;
  onOpenRecordModal: () => void;
  soundCounts: { total: number; custom: number };
}

export const LeftFxRack: React.FC<LeftFxRackProps> = ({
  fx,
  onFxChange,
  onResetFx,
  onOpenRecordModal,
  soundCounts,
}) => {
  const [micActive, setMicActive] = useState(false);
  const [micStatus, setMicStatus] = useState<string>('MIC OFF');

  const handleToggleMic = async () => {
    const nextState = !micActive;
    if (nextState) {
      setMicStatus('INITIALIZING...');
      const success = await audioEngine.toggleMicMonitor(true);
      if (success) {
        setMicActive(true);
        setMicStatus('LIVE VOCODER ACTIVE');
      } else {
        setMicActive(false);
        setMicStatus('MIC PERMISSION DENIED');
        setTimeout(() => setMicStatus('MIC OFF'), 3000);
      }
    } else {
      await audioEngine.toggleMicMonitor(false);
      setMicActive(false);
      setMicStatus('MIC OFF');
    }
  };

  return (
    <aside className="w-full lg:w-80 cyber-panel rounded-lg p-4 sm:p-5 flex flex-col gap-5 border border-white/10 shrink-0">
      
      {/* Rack Title & Quick Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#A855F7]" />
          <h2 className="font-heading font-bold text-sm tracking-wider uppercase text-white">
            MASTER FX CHANNELS
          </h2>
        </div>
        <button
          type="button"
          onClick={onResetFx}
          className="text-[11px] font-mono-code text-[#94A3B8] hover:text-[#FFB800] flex items-center gap-1 transition-colors cursor-pointer"
          title="Reset FX to Defaults"
        >
          <RotateCcw className="w-3 h-3" />
          RESET
        </button>
      </div>

      {/* 1. MASTER PITCH TRANSPOSER */}
      <div className="cyber-panel-elevated p-3.5 rounded-md">
        <div className="flex items-center justify-between text-xs font-mono-code mb-2">
          <span className="text-white font-bold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#A855F7]" />
            GLOBAL PITCH
          </span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              fx.pitchShift !== 0 ? 'bg-[#A855F7]/30 text-[#A855F7] border border-[#A855F7]/40' : 'text-[#94A3B8]'
            }`}
          >
            {fx.pitchShift > 0 ? `+${fx.pitchShift}` : fx.pitchShift} ST
          </span>
        </div>
        <input
          type="range"
          min="-12"
          max="12"
          step="1"
          value={fx.pitchShift}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onFxChange({ pitchShift: val });
            audioEngine.setPitchShift(val);
          }}
          className="w-full h-1.5 bg-black/60 rounded accent-[#A855F7] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono-code text-[#94A3B8] mt-1.5">
          <span>-12 (Deep Demon)</span>
          <button
            type="button"
            onClick={() => {
              onFxChange({ pitchShift: 0 });
              audioEngine.setPitchShift(0);
            }}
            className="hover:text-white"
          >
            0 (Neutral)
          </button>
          <span>+12 (Helium)</span>
        </div>
      </div>

      {/* 2. OVERDRIVE & DISTORTION */}
      <div className="cyber-panel-elevated p-3.5 rounded-md">
        <div className="flex items-center justify-between text-xs font-mono-code mb-2">
          <span className="text-white font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#FF1E56]" />
            CRUNCH OVERDRIVE
          </span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
              fx.distortion > 0 ? 'bg-[#FF1E56]/30 text-[#FF1E56] border border-[#FF1E56]/40' : 'text-[#94A3B8]'
            }`}
          >
            {fx.distortion}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={fx.distortion}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onFxChange({ distortion: val });
            audioEngine.setDistortion(val);
          }}
          className="w-full h-1.5 bg-black/60 rounded accent-[#FF1E56] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono-code text-[#94A3B8] mt-1.5">
          <span>Clean Clean</span>
          <span>Saturate</span>
          <span>Nuclear Clip</span>
        </div>
      </div>

      {/* 3. RESONANT FILTER */}
      <div className="cyber-panel-elevated p-3.5 rounded-md">
        <div className="flex items-center justify-between text-xs font-mono-code mb-2">
          <span className="text-white font-bold flex items-center gap-1.5">
            <AudioLines className="w-3.5 h-3.5 text-[#FFB800]" />
            SPECTRAL FILTER
          </span>
          <span className="text-[#FFB800] font-bold text-[11px]">
            {fx.filterFreq > 1000 ? `${(fx.filterFreq / 1000).toFixed(1)}k Hz` : `${fx.filterFreq} Hz`}
          </span>
        </div>
        <input
          type="range"
          min="300"
          max="16000"
          step="200"
          value={fx.filterFreq}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onFxChange({ filterFreq: val });
            audioEngine.setFilter(val, fx.filterType);
          }}
          className="w-full h-1.5 bg-black/60 rounded accent-[#FFB800] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono-code text-[#94A3B8] mt-1.5">
          <span>Muffled Underwater</span>
          <span>Wide Open</span>
        </div>
      </div>

      {/* 4. SPACE ECHO / DELAY */}
      <div className="cyber-panel-elevated p-3.5 rounded-md">
        <div className="flex items-center justify-between text-xs font-mono-code mb-2">
          <span className="text-white font-bold flex items-center gap-1.5">
            <Disc className="w-3.5 h-3.5 text-[#00FF66]" />
            SPACE ECHO DELAY
          </span>
          <span className="text-[#00FF66] font-bold text-[11px]">
            {Math.round(fx.delayFeedback * 100)}% FB
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-1.5">
          <div>
            <span className="text-[10px] font-mono-code text-[#94A3B8] block mb-1">Time</span>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.05"
              value={fx.delayTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onFxChange({ delayTime: val });
                audioEngine.setDelay(val, fx.delayFeedback, fx.delayFeedback > 0 ? 0.35 : 0);
              }}
              className="w-full h-1.5 bg-black/60 rounded accent-[#00FF66] cursor-pointer"
            />
          </div>
          <div>
            <span className="text-[10px] font-mono-code text-[#94A3B8] block mb-1">Feedback</span>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={fx.delayFeedback}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onFxChange({ delayFeedback: val });
                audioEngine.setDelay(fx.delayTime, val, val > 0 ? 0.35 : 0);
              }}
              className="w-full h-1.5 bg-black/60 rounded accent-[#00FF66] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 5. LIVE MIC VOICE MODULATOR */}
      <div className="cyber-panel-elevated p-3.5 rounded-md border border-[#A855F7]/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono-code text-white font-bold flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-[#A855F7]" />
            LIVE MIC MODULATOR
          </span>
          <span
            className={`text-[9px] font-mono-code px-1.5 py-0.5 rounded-xs font-bold ${
              micActive
                ? 'bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40 animate-pulse'
                : 'text-[#94A3B8] bg-black/40'
            }`}
          >
            {micStatus}
          </span>
        </div>
        <p className="text-[11px] text-[#94A3B8] mb-3 leading-relaxed">
          Route your microphone through the pitch shifter and distortion to talk live through the deck!
        </p>
        <button
          type="button"
          onClick={handleToggleMic}
          className={`w-full py-2 px-3 rounded font-mono-code text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            micActive
              ? 'bg-[#FF1E56] text-white shadow-[0_0_15px_rgba(255,30,86,0.5)]'
              : 'bg-[#A855F7]/20 border border-[#A855F7] text-white hover:bg-[#A855F7]/30'
          }`}
        >
          {micActive ? (
            <>
              <MicOff className="w-3.5 h-3.5" />
              DISENGAGE MIC
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              ARM LIVE MIC
            </>
          )}
        </button>
      </div>

      {/* 6. CUSTOM PRANK PAD CREATOR */}
      <div className="pt-2 border-t border-white/10 mt-auto">
        <button
          type="button"
          onClick={onOpenRecordModal}
          className="w-full py-2.5 px-4 rounded font-heading font-bold text-xs uppercase tracking-wider bg-[#FFB800]/15 border border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800] hover:text-[#412D00] transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(255,184,0,0.2)] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          CREATE CUSTOM PRANK PAD
        </button>
        <div className="flex justify-between items-center text-[10px] font-mono-code text-[#94A3B8] mt-2 px-1">
          <span>Active Pads: {soundCounts.total}</span>
          <span>Custom Recorded: {soundCounts.custom}</span>
        </div>
      </div>

    </aside>
  );
};

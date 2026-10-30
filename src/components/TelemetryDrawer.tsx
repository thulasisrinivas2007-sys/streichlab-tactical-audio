import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Cpu,
  Dice5,
  Radio,
  Terminal,
  Trash2,
} from 'lucide-react';
import { TelemetryLog } from '../types/sound';

interface TelemetryDrawerProps {
  logs: TelemetryLog[];
  onClearLogs: () => void;
  onRandomDetonate: () => void;
  activeVoiceCount: number;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  logs,
  onClearLogs,
  onRandomDetonate,
  activeVoiceCount,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs on new event
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] ${l.type} > ${l.message} ${l.bus ? `[${l.bus}]` : ''} ${
            l.levelDb !== undefined ? `[${l.levelDb}dB]` : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PANIC':
        return 'text-[#FF1E56] font-bold bg-[#FF1E56]/15 px-1 rounded-xs';
      case 'TRG':
        return 'text-[#FFB800] font-bold';
      case 'TIMER':
        return 'text-[#00FF66] font-bold';
      case 'FX':
        return 'text-[#A855F7] font-bold';
      case 'COMBO':
        return 'text-[#00FF66] font-bold bg-[#00FF66]/15 px-1 rounded-xs';
      default:
        return 'text-[#94A3B8]';
    }
  };

  return (
    <div className="w-full bg-[#070A0F] border-t border-white/10 text-white font-mono-code z-30 select-text">
      {/* Drawer Control Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between border-b border-white/5 bg-[#0A0E16]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-xs font-bold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-[#00FF66]" />
            <span className="uppercase tracking-wider">TELEMETRY & PRANK EVENT LOGS</span>
            <span className="text-[10px] text-[#00FF66] bg-[#00FF66]/10 px-1.5 py-0.2 rounded-xs border border-[#00FF66]/20">
              {logs.length}
            </span>
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Real-time Hardware Telemetry Badges */}
        <div className="hidden sm:flex items-center gap-4 text-[10px] text-[#94A3B8]">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-[#00FF66] animate-pulse" />
            AUDIO CH: STEREO 32-BIT
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[#FFB800]" />
            ACTIVE VOICES: {activeVoiceCount}
          </span>
          <span>LATENCY: 1.2ms</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRandomDetonate}
            className="px-2.5 py-1 text-[11px] font-bold rounded bg-[#FFB800]/20 border border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800] hover:text-black transition-all flex items-center gap-1 cursor-pointer"
            title="Fire a random prank sound immediately!"
          >
            <Dice5 className="w-3 h-3" />
            <span className="hidden xs:inline">RANDOM DETONATE</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="p-1 text-[#94A3B8] hover:text-white rounded hover:bg-white/5 cursor-pointer"
            title="Copy Logs to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00FF66]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClearLogs}
            className="p-1 text-[#94A3B8] hover:text-[#FF1E56] rounded hover:bg-white/5 cursor-pointer"
            title="Clear Logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recessed Terminal Code Stream */}
      {isOpen && (
        <div
          ref={logContainerRef}
          className="max-w-7xl mx-auto px-4 py-3 h-36 sm:h-44 overflow-y-auto space-y-1 text-xs text-[#94A3B8] font-mono-code scanlines"
        >
          {logs.length === 0 ? (
            <div className="text-white/30 italic text-[11px] py-4 text-center">
              SYSTEM INITIALIZED. Awaiting audio trigger events... Press any key or tap a sound pad.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 hover:bg-white/[0.02] px-1 py-0.5 rounded transition-colors"
              >
                <span className="text-[#475569] text-[10px] shrink-0">[{log.timestamp}]</span>
                <span className={`text-[10px] shrink-0 ${getTypeColor(log.type)}`}>
                  {log.type}
                </span>
                <span className="text-white/80 break-all flex-1">{log.message}</span>
                {log.bus && (
                  <span className="text-[10px] text-[#475569] shrink-0 hidden md:inline">
                    [{log.bus}]
                  </span>
                )}
                {log.levelDb !== undefined && (
                  <span
                    className={`text-[10px] shrink-0 ${
                      log.levelDb > -3 ? 'text-[#FF1E56]' : 'text-[#00FF66]'
                    }`}
                  >
                    {log.levelDb}dB
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

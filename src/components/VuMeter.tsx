import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/audioEngine';

interface VuMeterProps {
  orientation?: 'horizontal' | 'vertical';
  bars?: number;
  className?: string;
  showPeakDb?: boolean;
}

export const VuMeter: React.FC<VuMeterProps> = ({
  orientation = 'horizontal',
  bars = 16,
  className = '',
  showPeakDb = true,
}) => {
  const [levels, setLevels] = useState<number[]>(new Array(bars).fill(0));
  const [peakDb, setPeakDb] = useState<number>(-60);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateMeter = () => {
      const analyser = audioEngine.getAnalyser();
      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Group into bars
        const step = Math.floor(bufferLength / bars) || 1;
        const newLevels: number[] = [];
        let maxVal = 0;

        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            const idx = i * step + j;
            if (idx < bufferLength) {
              sum += dataArray[idx];
            }
          }
          const avg = sum / step;
          const normalized = Math.min(1, Math.max(0, avg / 255));
          newLevels.push(normalized);
          if (avg > maxVal) maxVal = avg;
        }

        // Calculate approximate peak dB (-60 to 0)
        const peakRatio = maxVal / 255;
        const db = peakRatio > 0.001 ? Math.round(20 * Math.log10(peakRatio)) : -60;
        setPeakDb(db);
        setLevels(newLevels);
      } else {
        setLevels(new Array(bars).fill(0));
      }

      animFrameRef.current = requestAnimationFrame(updateMeter);
    };

    animFrameRef.current = requestAnimationFrame(updateMeter);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [bars]);

  // Determine color based on threshold (Radioactive green -> Electric amber -> Cyber red)
  const getSegmentColor = (indexRatio: number, isActive: boolean) => {
    if (!isActive) return 'bg-white/[0.06] border-transparent';
    if (indexRatio > 0.85) return 'bg-[#FF1E56] shadow-[0_0_8px_#FF1E56] border-[#FF1E56]'; // Peak clip
    if (indexRatio > 0.6) return 'bg-[#FFB800] shadow-[0_0_6px_#FFB800] border-[#FFB800]'; // Amber warning
    return 'bg-[#00FF66] shadow-[0_0_6px_#00FF66] border-[#00FF66]'; // Radioactive green
  };

  if (orientation === 'vertical') {
    return (
      <div className={`flex items-end gap-1 ${className}`}>
        {levels.map((lvl, i) => {
          const ratio = (i + 1) / bars;
          const isActive = lvl > 0.05;
          const heightPercent = Math.max(8, Math.round(lvl * 100));
          return (
            <div
              key={i}
              className="w-1.5 bg-black/40 rounded-xs flex flex-col justify-end overflow-hidden h-12"
            >
              <div
                className={`w-full transition-all duration-75 rounded-xs ${getSegmentColor(ratio, isActive)}`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal segmented bar
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5 p-1 bg-black/60 rounded border border-white/10">
        {levels.map((lvl, i) => {
          const ratio = (i + 1) / bars;
          const isActive = lvl >= ratio * 0.8;
          return (
            <div
              key={i}
              className={`w-1.5 h-3.5 rounded-xs transition-colors duration-75 ${getSegmentColor(ratio, isActive)}`}
            />
          );
        })}
      </div>
      {showPeakDb && (
        <span
          className={`font-mono-code text-[10px] tracking-wider font-semibold min-w-[42px] text-right ${
            peakDb > -6 ? 'text-[#FF1E56]' : peakDb > -18 ? 'text-[#FFB800]' : 'text-[#00FF66]'
          }`}
        >
          {peakDb > -60 ? `${peakDb} dB` : '-INF'}
        </span>
      )}
    </div>
  );
};

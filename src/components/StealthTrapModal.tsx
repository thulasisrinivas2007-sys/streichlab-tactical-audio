import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Eye,
  Flame,
  PhoneCall,
  Play,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  X,
} from 'lucide-react';
import { SoundItem } from '../types/sound';

interface StealthTrapModalProps {
  sounds: SoundItem[];
  isOpen: boolean;
  onClose: () => void;
  onDetonate: (sound: SoundItem) => void;
  onLogEvent: (type: 'TIMER' | 'TRG' | 'PANIC', msg: string) => void;
}

export const StealthTrapModal: React.FC<StealthTrapModalProps> = ({
  sounds,
  isOpen,
  onClose,
  onDetonate,
  onLogEvent,
}) => {
  const [selectedSoundId, setSelectedSoundId] = useState<string>('air_horn');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(10);
  const [trapType, setTrapType] = useState<'fake_update' | 'touch_sensor' | 'stealth_blackout' | 'fake_call'>('fake_update');
  const [isArmed, setIsArmed] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(10);
  const [hasDetonated, setHasDetonated] = useState(false);

  const selectedSound = sounds.find((s) => s.id === selectedSoundId) || sounds[0];

  // Armed Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isArmed && !hasDetonated) {
      interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            triggerDetonation('TIMER EXPIRATION');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isArmed, hasDetonated]);

  const triggerDetonation = (cause: string) => {
    setHasDetonated(true);
    onLogEvent('TIMER', `STEALTH TRAP DETONATED via ${cause} [SOUND: ${selectedSound.name}]`);
    onDetonate(selectedSound);
  };

  const handleArmTrap = () => {
    setRemainingTime(countdownSeconds);
    setHasDetonated(false);
    setIsArmed(true);
    onLogEvent('TIMER', `STEALTH TRAP ARMED [${countdownSeconds}s] [DISGUISE: ${trapType.toUpperCase()}]`);
  };

  const handleDisarm = () => {
    setIsArmed(false);
    setHasDetonated(false);
    onLogEvent('PANIC', 'STEALTH TRAP DISARMED SAFELY');
  };

  if (!isOpen) return null;

  // --- FULL SCREEN ARMED TRAP VIEW ---
  if (isArmed) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
        onClick={() => {
          if (!hasDetonated) {
            triggerDetonation('SCREEN TOUCH SENSOR TRIGGER');
          }
        }}
      >
        {/* DETONATION STATE */}
        {hasDetonated ? (
          <div className="absolute inset-0 bg-[#FF1E56] text-white flex flex-col items-center justify-center p-6 animate-ping-once text-center">
            <div className="text-6xl sm:text-8xl font-heading font-black tracking-widest text-black mb-4 glitch-active">
              PRANKED!
            </div>
            <div className="text-xl sm:text-2xl font-mono-code font-bold bg-black text-[#00FF66] px-4 py-2 rounded mb-6">
              DETONATED: {selectedSound.name}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDisarm();
                onClose();
              }}
              className="px-6 py-3 bg-black text-white font-heading font-bold rounded-lg border-2 border-white uppercase tracking-wider text-sm hover:scale-105 transition-transform"
            >
              DISARM & RETURN TO DECK
            </button>
          </div>
        ) : (
          /* DISGUISE TRAP SCREENS */
          <>
            {/* 1. Fake Windows Update Disguise */}
            {trapType === 'fake_update' && (
              <div className="absolute inset-0 bg-[#0078D7] text-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-8" />
                <h2 className="text-2xl sm:text-3xl font-light mb-3">
                  Working on updates 99% complete.
                </h2>
                <p className="text-sm sm:text-base text-white/80">
                  Don't turn off your PC. This will take a while.
                </p>
                <div className="text-xs text-white/40 mt-12">
                  Your device will restart several times.
                </div>
              </div>
            )}

            {/* 2. Motion / Touch Sensor Trap */}
            {trapType === 'touch_sensor' && (
              <div className="absolute inset-0 bg-black text-[#00FF66] font-mono-code flex flex-col items-center justify-center p-6 text-center border-4 border-[#00FF66]/30">
                <ShieldAlert className="w-20 h-20 text-[#FF1E56] mb-4 animate-pulse" />
                <div className="text-xs text-[#94A3B8] tracking-widest uppercase mb-1">
                  TACTICAL LASER TRIPWIRE ARMED
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  DO NOT TOUCH THIS PHONE
                </div>
                <div className="text-xs text-red-400 bg-red-950/60 px-4 py-2 rounded border border-red-500/40">
                  MOTION DETECTOR CALIBRATING... ANY TAP TRIGGERS MAXIMUM AIR SIREN
                </div>
                <div className="text-sm text-[#FFB800] mt-6">
                  T-MINUS: {remainingTime} SECONDS
                </div>
              </div>
            )}

            {/* 3. Pitch Black Stealth Screen */}
            {trapType === 'stealth_blackout' && (
              <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-black hover:text-white/5 transition-colors">
                <span className="text-[10px] font-mono-code opacity-20">
                  [STEALTH BLACKOUT ACTIVE - TAP TO DETONATE]
                </span>
              </div>
            )}

            {/* 4. Fake Incoming Call */}
            {trapType === 'fake_call' && (
              <div className="absolute inset-0 bg-gray-950 text-white flex flex-col justify-between p-8 sm:p-12 items-center">
                <div className="text-center mt-8">
                  <div className="w-24 h-24 rounded-full bg-red-600/30 border-2 border-red-500 mx-auto mb-4 flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.4)]">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold">CYBER POLICE HQ</h3>
                  <p className="text-sm text-gray-400 mt-1">Incoming Priority Video Call...</p>
                </div>

                <div className="flex items-center gap-12 mb-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg animate-pulse">
                      <PhoneCall className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-bounce">
                      <PhoneCall className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Accept Call</span>
                  </div>
                </div>
              </div>
            )}

            {/* Secret Disarm Corner */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDisarm();
              }}
              className="absolute top-4 right-4 text-[10px] font-mono-code bg-black/60 text-white/50 hover:text-white px-2 py-1 rounded border border-white/10 z-50"
            >
              [SECRET DISARM]
            </button>
          </>
        )}
      </div>
    );
  }

  // --- CONFIGURATION MODAL VIEW ---
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl cyber-panel border border-white/20 rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#FF1E56]/15 border border-[#FF1E56] text-[#FF1E56]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white uppercase tracking-wider">
                STEALTH PRANK TRAP
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Arm a countdown trap or touch sensor disguised as an innocent screen!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white p-1 rounded-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Pick Detonation Sound */}
        <div>
          <label className="text-xs font-mono-code text-white font-bold block mb-2 uppercase">
            1. Detonation Payload Sound
          </label>
          <select
            value={selectedSoundId}
            onChange={(e) => setSelectedSoundId(e.target.value)}
            className="w-full bg-[#131B2E] border border-white/20 rounded p-2.5 text-sm text-white font-mono-code focus:outline-none focus:border-[#FFB800] cursor-pointer"
          >
            {sounds.map((sound) => (
              <option key={sound.id} value={sound.id}>
                [{sound.category.toUpperCase()}] {sound.name} ({sound.durationSec}s)
              </option>
            ))}
          </select>
        </div>

        {/* 2. Choose Disguise Screen */}
        <div>
          <label className="text-xs font-mono-code text-white font-bold block mb-2 uppercase">
            2. Trap Screen Disguise
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setTrapType('fake_update')}
              className={`p-3 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                trapType === 'fake_update'
                  ? 'bg-[#0078D7]/30 border-[#0078D7] text-white shadow-[0_0_12px_rgba(0,120,215,0.4)]'
                  : 'bg-black/40 border-white/10 text-[#94A3B8] hover:border-white/30'
              }`}
            >
              <span className="font-heading font-bold text-xs text-white">Fake Windows Update</span>
              <span className="text-[10px] text-[#94A3B8]">99% Complete loading circle</span>
            </button>

            <button
              type="button"
              onClick={() => setTrapType('touch_sensor')}
              className={`p-3 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                trapType === 'touch_sensor'
                  ? 'bg-[#00FF66]/20 border-[#00FF66] text-white shadow-[0_0_12px_rgba(0,255,102,0.3)]'
                  : 'bg-black/40 border-white/10 text-[#94A3B8] hover:border-white/30'
              }`}
            >
              <span className="font-heading font-bold text-xs text-white">Touch Sensor Trap</span>
              <span className="text-[10px] text-[#94A3B8]">Alarm detonates if touched</span>
            </button>

            <button
              type="button"
              onClick={() => setTrapType('stealth_blackout')}
              className={`p-3 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                trapType === 'stealth_blackout'
                  ? 'bg-purple-900/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'bg-black/40 border-white/10 text-[#94A3B8] hover:border-white/30'
              }`}
            >
              <span className="font-heading font-bold text-xs text-white">Stealth Blackout</span>
              <span className="text-[10px] text-[#94A3B8]">Looks like screen is turned off</span>
            </button>

            <button
              type="button"
              onClick={() => setTrapType('fake_call')}
              className={`p-3 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                trapType === 'fake_call'
                  ? 'bg-red-950/60 border-red-500 text-white shadow-[0_0_12px_rgba(255,30,86,0.3)]'
                  : 'bg-black/40 border-white/10 text-[#94A3B8] hover:border-white/30'
              }`}
            >
              <span className="font-heading font-bold text-xs text-white">Fake Police Call</span>
              <span className="text-[10px] text-[#94A3B8]">Urgent incoming call screen</span>
            </button>
          </div>
        </div>

        {/* 3. Countdown Timer */}
        <div>
          <div className="flex justify-between items-center text-xs font-mono-code mb-1.5">
            <span className="text-white font-bold uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FFB800]" />
              3. Delay Timer Before Detonation
            </span>
            <span className="text-[#FFB800] font-bold">{countdownSeconds} Seconds</span>
          </div>
          <div className="flex items-center gap-2">
            {[5, 10, 20, 30, 60].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setCountdownSeconds(sec)}
                className={`flex-1 py-1 text-xs font-mono-code rounded border cursor-pointer ${
                  countdownSeconds === sec
                    ? 'bg-[#FFB800] text-black font-bold border-[#FFB800]'
                    : 'bg-black/40 border-white/10 text-[#94A3B8] hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Arm Trap */}
        <div className="pt-2 border-t border-white/10 flex items-center gap-3">
          <button
            type="button"
            onClick={handleArmTrap}
            className="flex-1 py-3 px-4 rounded font-heading font-bold text-sm uppercase tracking-wider bg-[#FF1E56] text-white hover:bg-[#FF1E56]/90 shadow-[0_0_20px_rgba(255,30,86,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Flame className="w-4 h-4" />
            ARM TRAP & LAUNCH DISGUISE NOW
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded font-mono-code text-xs text-[#94A3B8] hover:text-white bg-white/5 border border-white/10 cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import {
  Check,
  Disc,
  Mic,
  Play,
  RotateCcw,
  Square,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { CategoryColor, SoundCategory, SoundItem } from '../types/sound';

interface RecordSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomSound: (sound: SoundItem) => void;
}

export const RecordSoundModal: React.FC<RecordSoundModalProps> = ({
  isOpen,
  onClose,
  onAddCustomSound,
}) => {
  const [soundName, setSoundName] = useState('');
  const [keybind, setKeybind] = useState('0');
  const [categoryColor, setCategoryColor] = useState<CategoryColor>('amber');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleStartRecord = async () => {
    try {
      setStatusMessage('RECORDING... Speak into microphone');
      setIsRecording(true);
      await audioEngine.startMicRecording();
    } catch {
      setStatusMessage('Microphone access denied');
      setIsRecording(false);
    }
  };

  const handleStopRecord = async () => {
    try {
      setIsRecording(false);
      setStatusMessage('Processing audio buffer...');
      const { buffer } = await audioEngine.stopMicRecording();
      setAudioBuffer(buffer);
      setAudioDuration(parseFloat(buffer.duration.toFixed(2)));
      setStatusMessage(`Recorded ${buffer.duration.toFixed(1)}s sample`);
      if (!soundName) setSoundName('MY CUSTOM PRANK');
    } catch (err: any) {
      setStatusMessage(`Recording error: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatusMessage(`Decoding ${file.name}...`);
      const buffer = await audioEngine.decodeAudioFile(file);
      setAudioBuffer(buffer);
      setAudioDuration(parseFloat(buffer.duration.toFixed(2)));
      setSoundName(file.name.replace(/\.[^/.]+$/, '').toUpperCase().slice(0, 20));
      setStatusMessage(`Loaded ${buffer.duration.toFixed(1)}s audio file`);
    } catch {
      setStatusMessage('Failed to decode audio file. Try .mp3 or .wav');
    }
  };

  const handlePlayPreview = () => {
    if (!audioBuffer) return;
    setIsPlayingPreview(true);
    audioEngine.playSound('preview', '', {
      customBuffer: audioBuffer,
      volume: 1.0,
      onEnd: () => setIsPlayingPreview(false),
    });
  };

  const handleSave = () => {
    if (!audioBuffer) return;
    const newSound: SoundItem = {
      id: `custom_${Date.now()}`,
      name: soundName.trim() || 'CUSTOM PRANK',
      category: 'custom' as SoundCategory,
      categoryColor,
      keybind: keybind.toUpperCase().slice(0, 2) || '0',
      durationSec: audioDuration,
      description: 'Custom recorded audio buffer',
      synthPreset: 'custom',
      volume: 1.0,
      pitchSemitones: 0,
      audioBuffer,
    };
    onAddCustomSound(newSound);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg cyber-panel border border-white/20 rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#A855F7]/15 border border-[#A855F7] text-[#A855F7]">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white uppercase tracking-wider">
                CUSTOM PRANK PAD
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Record audio via microphone or upload any audio file (.mp3, .wav)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Methods: Mic or File */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mic Record Button */}
          <button
            type="button"
            onClick={isRecording ? handleStopRecord : handleStartRecord}
            className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              isRecording
                ? 'bg-[#FF1E56] text-white border-white animate-pulse shadow-[0_0_20px_rgba(255,30,86,0.6)]'
                : 'bg-black/40 border-white/10 text-white hover:border-[#FF1E56] hover:bg-[#FF1E56]/10'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-6 h-6 fill-white" />
                <span className="font-heading font-bold text-xs uppercase">STOP RECORDING</span>
              </>
            ) : (
              <>
                <Mic className="w-6 h-6 text-[#FF1E56]" />
                <span className="font-heading font-bold text-xs uppercase">RECORD WITH MIC</span>
              </>
            )}
          </button>

          {/* Upload Audio File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-lg border bg-black/40 border-white/10 text-white hover:border-[#FFB800] hover:bg-[#FFB800]/10 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-6 h-6 text-[#FFB800]" />
            <span className="font-heading font-bold text-xs uppercase">UPLOAD AUDIO FILE</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </button>
        </div>

        {/* Status indicator */}
        {statusMessage && (
          <div className="text-xs font-mono-code text-[#00FF66] bg-[#00FF66]/10 border border-[#00FF66]/20 p-2 rounded text-center">
            {statusMessage}
          </div>
        )}

        {/* Pad Name & Keybind Configuration */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-mono-code text-[#94A3B8] block mb-1 uppercase font-bold">
              Pad Title
            </label>
            <input
              type="text"
              value={soundName}
              onChange={(e) => setSoundName(e.target.value.toUpperCase())}
              placeholder="E.G. SCREAMING GOAT"
              className="w-full bg-[#131B2E] border border-white/20 rounded p-2 text-sm text-white font-heading font-bold uppercase focus:outline-none focus:border-[#FFB800]"
            />
          </div>

          <div>
            <label className="text-xs font-mono-code text-[#94A3B8] block mb-1 uppercase font-bold">
              Keybind
            </label>
            <input
              type="text"
              maxLength={2}
              value={keybind}
              onChange={(e) => setKeybind(e.target.value.toUpperCase())}
              className="w-full bg-[#131B2E] border border-white/20 rounded p-2 text-sm text-center text-[#FFB800] font-mono-code font-bold focus:outline-none focus:border-[#FFB800]"
            />
          </div>
        </div>

        {/* Color Theme Selector */}
        <div>
          <label className="text-xs font-mono-code text-[#94A3B8] block mb-1.5 uppercase font-bold">
            Glow Theme
          </label>
          <div className="flex gap-2">
            {(['amber', 'green', 'red', 'purple'] as CategoryColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryColor(c)}
                className={`flex-1 py-1.5 rounded text-xs font-mono-code capitalize border cursor-pointer ${
                  categoryColor === c
                    ? 'border-white font-bold bg-white/20 shadow-md'
                    : 'border-white/10 text-[#94A3B8] hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Audio */}
        {audioBuffer && (
          <div className="p-3 bg-black/40 border border-white/10 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#00FF66]" />
              <span className="text-xs font-mono-code text-white">
                Duration: {audioDuration}s
              </span>
            </div>
            <button
              type="button"
              onClick={handlePlayPreview}
              className="px-3 py-1 bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66] font-mono-code text-xs rounded hover:bg-[#00FF66] hover:text-black flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              Preview Sound
            </button>
          </div>
        )}

        {/* Save / Cancel Footer */}
        <div className="pt-2 border-t border-white/10 flex items-center gap-3">
          <button
            type="button"
            disabled={!audioBuffer}
            onClick={handleSave}
            className={`flex-1 py-3 px-4 rounded font-heading font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
              audioBuffer
                ? 'bg-[#FFB800] text-[#412D00] shadow-[0_0_15px_rgba(255,184,0,0.4)] hover:bg-[#FFB800]/90'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            ADD TO SOUNDBOARD MATRIX
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

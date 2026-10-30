import React, { useMemo, useState } from 'react';
import {
  Dice5,
  Flame,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SoundItem, SoundCategory } from '../types/sound';
import { SoundPad } from './SoundPad';

interface SoundGridProps {
  sounds: SoundItem[];
  activeSoundIds: Set<string>;
  onTriggerSound: (sound: SoundItem) => void;
  onStopSound: (sound: SoundItem) => void;
  onToggleLoop: (soundId: string) => void;
  onUpdateSoundConfig: (soundId: string, updates: Partial<SoundItem>) => void;
  onTriggerRandom: () => void;
}

export const SoundGrid: React.FC<SoundGridProps> = ({
  sounds,
  activeSoundIds,
  onTriggerSound,
  onStopSound,
  onToggleLoop,
  onUpdateSoundConfig,
  onTriggerRandom,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { id: SoundCategory; label: string; count: number; colorClass: string }[] = useMemo(() => {
    return [
      {
        id: 'all',
        label: 'ALL SOUNDS',
        count: sounds.length,
        colorClass: 'text-white border-white/20',
      },
      {
        id: 'memes',
        label: 'MEMES & HORNS',
        count: sounds.filter((s) => s.category === 'memes').length,
        colorClass: 'text-[#FFB800] border-[#FFB800]/40',
      },
      {
        id: 'tactical',
        label: 'TACTICAL & SIRENS',
        count: sounds.filter((s) => s.category === 'tactical').length,
        colorClass: 'text-[#FF1E56] border-[#FF1E56]/40',
      },
      {
        id: 'horror',
        label: 'HORROR & JUMPSCARE',
        count: sounds.filter((s) => s.category === 'horror' || s.category === 'glitch').length,
        colorClass: 'text-[#A855F7] border-[#A855F7]/40',
      },
      {
        id: 'cyber',
        label: 'CYBER & SCI-FI',
        count: sounds.filter((s) => s.category === 'cyber').length,
        colorClass: 'text-[#00FF66] border-[#00FF66]/40',
      },
      {
        id: 'custom',
        label: 'MY CUSTOM PADS',
        count: sounds.filter((s) => s.category === 'custom').length,
        colorClass: 'text-[#38BDF8] border-[#38BDF8]/40',
      },
    ];
  }, [sounds]);

  const filteredSounds = useMemo(() => {
    return sounds.filter((sound) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        sound.category === selectedCategory ||
        (selectedCategory === 'horror' && (sound.category === 'horror' || sound.category === 'glitch'));

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        sound.name.toLowerCase().includes(query) ||
        sound.description.toLowerCase().includes(query) ||
        sound.keybind.toLowerCase() === query ||
        sound.tags?.some((t) => t.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [sounds, selectedCategory, searchQuery]);

  return (
    <section className="flex-1 flex flex-col gap-4 min-w-0">
      
      {/* Search & Category Filter Toolbar */}
      <div className="cyber-panel p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/10">
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sounds, tags, keys..."
            className="w-full bg-black/50 border border-white/15 rounded-md pl-9 pr-3 py-2 text-xs font-mono-code text-white placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#FFB800] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded text-[11px] font-mono-code font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-white/15 text-white border-white shadow-xs'
                    : 'bg-black/30 text-[#94A3B8] border-white/5 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-60">({cat.count})</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Grid of Sound Pads */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredSounds.map((sound) => {
          const isPlaying = activeSoundIds.has(sound.id);
          return (
            <SoundPad
              key={sound.id}
              sound={sound}
              isPlaying={isPlaying}
              onTrigger={onTriggerSound}
              onStop={onStopSound}
              onToggleLoop={onToggleLoop}
              onUpdateSoundConfig={onUpdateSoundConfig}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {filteredSounds.length === 0 && (
        <div className="cyber-panel p-12 rounded-lg text-center border border-white/10 flex flex-col items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-[#FFB800]/50" />
          <h3 className="font-heading font-bold text-base text-white uppercase">
            No Prank Sounds Found
          </h3>
          <p className="text-xs text-[#94A3B8] max-w-sm">
            Try adjusting your search terms or category filter, or click "Create Custom Prank Pad" to add your own sound!
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-[#FFB800] text-[#412D00] font-heading font-bold text-xs rounded uppercase tracking-wider cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Hint Bar */}
      <div className="cyber-panel px-4 py-2.5 rounded-lg border border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono-code text-[#94A3B8] gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#FFB800]" />
          <span>FAST KEYBINDS:</span>
          <span className="text-white">Press keys [1-6], [Q-Y], [A-H], [Z-N] to detonate instantly</span>
        </div>
        <div className="flex items-center gap-3">
          <span>[ESC / SPACE]: Emergency Panic Stop</span>
          <button
            type="button"
            onClick={onTriggerRandom}
            className="text-[#FFB800] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Dice5 className="w-3 h-3" />
            Random Trigger
          </button>
        </div>
      </div>

    </section>
  );
};

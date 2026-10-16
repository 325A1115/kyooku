import React from 'react';
import { SongPreset, SongSection } from '../types/music';
import { Play, Pause, Flame, Disc, Radio, RotateCcw } from 'lucide-react';

interface SongSelectorProps {
  presets: SongPreset[];
  selectedSong: SongPreset;
  currentSection: SongSection;
  isPlaying: boolean;
  bpm: number;
  onSelectSong: (song: SongPreset) => void;
  onSelectSection: (section: SongSection) => void;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onReset: () => void;
}

export const SongSelector: React.FC<SongSelectorProps> = ({
  presets,
  selectedSong,
  currentSection,
  isPlaying,
  bpm,
  onSelectSong,
  onSelectSection,
  onTogglePlay,
  onBpmChange,
  onReset,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Bar: Playback Controls & Master Transport */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {/* Main Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold tracking-wider text-sm transition-all select-none shadow-lg active:scale-95 ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25 ring-2 ring-rose-400/40'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30 ring-2 ring-cyan-300/40'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>PAUSE (停止)</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>PLAY (演奏スタート)</span>
              </>
            )}
          </button>

          {/* Reset Playhead */}
          <button
            onClick={onReset}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="先頭に戻す (リセット)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* BPM & Tempo Controls */}
        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-300">TEMPO</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="70"
              max="200"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
              className="w-28 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-lg font-black text-cyan-400">{bpm}</span>
              <span className="text-[10px] font-mono text-slate-500">BPM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Song Cards Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Disc className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
            MASTER FESTIVAL TRACKS (文化祭キラーチューン)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {presets.map((song) => {
            const isSelected = selectedSong.id === song.id;
            return (
              <button
                key={song.id}
                onClick={() => onSelectSong(song)}
                className={`relative text-left p-3.5 rounded-xl border transition-all select-none ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
                    : 'bg-slate-950/60 hover:bg-slate-800/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Active indicator dot */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                    </span>
                    <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase">SELECTED</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-1">
                  <span>{song.genre}</span>
                  <span>·</span>
                  <span className="font-semibold text-slate-300">{song.bpm} BPM</span>
                  <span>·</span>
                  <span className="font-semibold text-slate-300">{song.key}</span>
                </div>

                <div className="font-bold text-white text-sm tracking-wide">
                  {song.titleJp}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {song.title}
                </div>

                <p className="text-[11px] text-slate-400/90 mt-2 line-clamp-2 leading-relaxed">
                  {song.tagline}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Song Section Selector (Intro, Buildup, Drop, Chorus, etc.) */}
      {selectedSong.sections.length > 1 && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            セクション切替:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {selectedSong.sections.map((section) => {
              const isSectionActive = currentSection.id === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => onSelectSection(section)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSectionActive
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {section.nameJp}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

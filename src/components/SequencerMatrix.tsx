import React, { useState } from 'react';
import { PatternData, TrackConfig, TrackId } from '../types/music';
import { audioEngine } from '../audio/AudioEngine';
import { PIANO_ROLL_NOTES } from '../utils/musicTheory';
import { Volume2, VolumeX, Music, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface SequencerMatrixProps {
  pattern: PatternData;
  activeStep: number;
  isPlaying: boolean;
  onPatternChange: (newPattern: PatternData) => void;
  accentColor: string;
}

const DEFAULT_TRACKS: TrackConfig[] = [
  { id: 'kick', name: 'KICK', nameJp: 'キックドラム', category: 'drum', color: '#06b6d4', volume: 0.9, isMuted: false, isSolo: false },
  { id: 'snare', name: 'SNARE', nameJp: 'スネアドラム', category: 'drum', color: '#3b82f6', volume: 0.85, isMuted: false, isSolo: false },
  { id: 'hihatC', name: 'HH CLS', nameJp: 'ハイハット (閉)', category: 'drum', color: '#10b981', volume: 0.7, isMuted: false, isSolo: false },
  { id: 'hihatO', name: 'HH OPN', nameJp: 'ハイハット (開)', category: 'drum', color: '#34d399', volume: 0.75, isMuted: false, isSolo: false },
  { id: 'clap', name: 'CLAP', nameJp: 'ハンドクラップ', category: 'drum', color: '#f59e0b', volume: 0.8, isMuted: false, isSolo: false },
  { id: 'taiko', name: 'TAIKO', nameJp: '和太鼓 (ドスン)', category: 'drum', color: '#f43f5e', volume: 0.9, isMuted: false, isSolo: false },
  { id: 'crash', name: 'CRASH', nameJp: 'クラッシュシンバル', category: 'drum', color: '#eab308', volume: 0.75, isMuted: false, isSolo: false },
  { id: 'bass', name: 'BASS', nameJp: 'サブベース / 808', category: 'melodic', color: '#8b5cf6', volume: 0.85, isMuted: false, isSolo: false },
  { id: 'chords', name: 'CHORDS', nameJp: 'コードシンセ', category: 'melodic', color: '#ec4899', volume: 0.75, isMuted: false, isSolo: false },
  { id: 'lead', name: 'LEAD', nameJp: 'メインリードメロディ', category: 'melodic', color: '#06b6d4', volume: 0.85, isMuted: false, isSolo: false },
  { id: 'arp', name: 'ARP', nameJp: 'アルペジオ', category: 'melodic', color: '#14b8a6', volume: 0.7, isMuted: false, isSolo: false },
];

export const SequencerMatrix: React.FC<SequencerMatrixProps> = ({
  pattern,
  activeStep,
  isPlaying,
  onPatternChange,
}) => {
  const [tracks, setTracks] = useState<TrackConfig[]>(DEFAULT_TRACKS);
  const [expandedPianoRoll, setExpandedPianoRoll] = useState<'lead' | 'bass' | null>(null);

  const toggleDrumStep = (trackId: keyof PatternData, step: number) => {
    const current = (pattern[trackId] as boolean[])[step];
    const updated = [...(pattern[trackId] as boolean[])];
    updated[step] = !current;

    // Instant audio feedback
    if (!current) {
      audioEngine.init();
      const t = 0;
      if (trackId === 'kick') audioEngine.playKick(t);
      else if (trackId === 'snare') audioEngine.playSnare(t);
      else if (trackId === 'hihatC') audioEngine.playHiHat(t, false);
      else if (trackId === 'hihatO') audioEngine.playHiHat(t, true);
      else if (trackId === 'clap') audioEngine.playClap(t);
      else if (trackId === 'taiko') audioEngine.playTaiko(t);
      else if (trackId === 'crash') audioEngine.playCrash(t);
    }

    onPatternChange({
      ...pattern,
      [trackId]: updated,
    });
  };

  const handleMelodicStepClick = (trackId: 'lead' | 'bass', step: number) => {
    const current = pattern[trackId][step];
    if (current) {
      // Clear note
      const updated = [...pattern[trackId]];
      updated[step] = null;
      onPatternChange({
        ...pattern,
        [trackId]: updated,
      });
    } else {
      // Add default note
      const defaultNote = trackId === 'lead' ? 'C5' : 'C2';
      const updated = [...pattern[trackId]];
      updated[step] = defaultNote;

      audioEngine.init();
      if (trackId === 'lead') audioEngine.playLeadNote(defaultNote, 0, 0.2);
      else audioEngine.playBassNote(defaultNote, 0, 0.25);

      onPatternChange({
        ...pattern,
        [trackId]: updated,
      });
    }
  };

  const handlePianoRollNoteClick = (trackId: 'lead' | 'bass', note: string, step: number) => {
    const current = pattern[trackId][step];
    const updated = [...pattern[trackId]];
    if (current === note) {
      updated[step] = null;
    } else {
      updated[step] = note;
      audioEngine.init();
      if (trackId === 'lead') audioEngine.playLeadNote(note, 0, 0.25);
      else audioEngine.playBassNote(note, 0, 0.3);
    }

    onPatternChange({
      ...pattern,
      [trackId]: updated,
    });
  };

  const toggleMute = (trackId: TrackId) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const nextMuted = !t.isMuted;
          audioEngine.setTrackMute(trackId, nextMuted);
          return { ...t, isMuted: nextMuted };
        }
        return t;
      })
    );
  };

  const toggleSolo = (trackId: TrackId) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const nextSolo = !t.isSolo;
          audioEngine.setTrackSolo(trackId, nextSolo);
          return { ...t, isSolo: nextSolo };
        }
        return t;
      })
    );
  };

  const handleVolumeChange = (trackId: TrackId, vol: number) => {
    audioEngine.setTrackVolume(trackId, vol);
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: vol } : t))
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              16-STEP MULTI-TRACK SEQUENCER
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            各ステップをクリックして音を配置・編集。リードやベースはピアノロールで自由な音階を作れます
          </p>
        </div>

        {/* Step indicator tracker */}
        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="text-slate-400">PLAYHEAD:</span>
          <span className="font-bold text-cyan-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            STEP {(activeStep + 1).toString().padStart(2, '0')} / 16
          </span>
        </div>
      </div>

      {/* Sequencer Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[820px]">
          {/* Header Step Numbers */}
          <div className="flex items-center mb-2">
            <div className="w-48 text-[11px] font-mono font-semibold text-slate-500 uppercase px-2">
              TRACK / INSTRUMENT
            </div>
            <div className="flex-1 grid grid-cols-16 gap-1 px-1">
              {Array.from({ length: 16 }).map((_, stepIdx) => {
                const isDownbeat = stepIdx % 4 === 0;
                const isCurrent = isPlaying && activeStep === stepIdx;
                return (
                  <div
                    key={stepIdx}
                    className={`text-center py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/50'
                        : isDownbeat
                        ? 'bg-slate-800/80 text-slate-200'
                        : 'text-slate-500'
                    }`}
                  >
                    {stepIdx + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track Rows */}
          <div className="space-y-1.5">
            {tracks.map((track) => {
              const isLead = track.id === 'lead';
              const isBass = track.id === 'bass';
              const isMelodic = track.category === 'melodic';
              const isExpanded = expandedPianoRoll === track.id;

              return (
                <div key={track.id} className="space-y-1">
                  <div
                    className={`flex items-center py-1.5 px-2 rounded-xl border transition-all ${
                      track.isMuted
                        ? 'bg-slate-950/40 border-slate-900 opacity-60'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Track Header & Controls */}
                    <div className="w-48 flex items-center justify-between pr-3 select-none">
                      <div className="flex items-center gap-1.5 truncate">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: track.color }}
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-white block truncate">
                            {track.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {track.nameJp}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {/* Mute */}
                        <button
                          onClick={() => toggleMute(track.id)}
                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                            track.isMuted
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="ミュート (M)"
                        >
                          M
                        </button>

                        {/* Solo */}
                        <button
                          onClick={() => toggleSolo(track.id)}
                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                            track.isSolo
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="ソロ (S)"
                        >
                          S
                        </button>

                        {/* Piano Roll expander for Lead & Bass */}
                        {(isLead || isBass) && (
                          <button
                            onClick={() =>
                              setExpandedPianoRoll(isExpanded ? null : (track.id as 'lead' | 'bass'))
                            }
                            className={`w-6 h-6 rounded flex items-center justify-center text-[10px] transition-colors ${
                              isExpanded
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="ピアノロール音階エディタを開く"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Step Grid Buttons */}
                    <div className="flex-1 grid grid-cols-16 gap-1 px-1">
                      {Array.from({ length: 16 }).map((_, stepIdx) => {
                        const isCurrentPlayhead = isPlaying && activeStep === stepIdx;
                        const isBeatStart = stepIdx % 4 === 0;

                        if (track.category === 'drum') {
                          const isActive = (pattern[track.id as keyof PatternData] as boolean[])[stepIdx];
                          return (
                            <button
                              key={stepIdx}
                              onClick={() => toggleDrumStep(track.id as keyof PatternData, stepIdx)}
                              className={`h-8 rounded-md transition-all flex items-center justify-center relative select-none ${
                                isActive
                                  ? 'shadow-md scale-95'
                                  : isBeatStart
                                  ? 'bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/40'
                                  : 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/50'
                              } ${isCurrentPlayhead ? 'ring-2 ring-white/60' : ''}`}
                              style={{
                                backgroundColor: isActive ? track.color : undefined,
                              }}
                            >
                              {isActive && (
                                <span className="w-1.5 h-1.5 bg-white rounded-full shadow" />
                              )}
                            </button>
                          );
                        } else if (track.id === 'chords') {
                          const chordNotes = pattern.chords[stepIdx];
                          const hasChord = chordNotes && chordNotes.length > 0;
                          return (
                            <button
                              key={stepIdx}
                              onClick={() => {
                                // Simple chord trigger preview
                                if (hasChord) {
                                  audioEngine.init();
                                  audioEngine.playChord(chordNotes, 0, 0.4);
                                }
                              }}
                              className={`h-8 rounded-md transition-all flex flex-col items-center justify-center relative select-none text-[9px] font-mono ${
                                hasChord
                                  ? 'bg-pink-600/80 text-white font-bold border border-pink-400/50 shadow-md scale-95'
                                  : isBeatStart
                                  ? 'bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/40 text-slate-500'
                                  : 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/50 text-slate-600'
                              } ${isCurrentPlayhead ? 'ring-2 ring-white/60' : ''}`}
                            >
                              {hasChord ? chordNotes[0].replace(/\d/, '') : ''}
                            </button>
                          );
                        } else {
                          // Lead, Bass, Arp
                          const note = (pattern[track.id as 'lead' | 'bass' | 'arp'] as (string | null)[])[stepIdx];
                          const hasNote = !!note;

                          return (
                            <button
                              key={stepIdx}
                              onClick={() => {
                                if (track.id === 'lead' || track.id === 'bass') {
                                  handleMelodicStepClick(track.id, stepIdx);
                                } else if (note) {
                                  audioEngine.init();
                                  audioEngine.playArpNote(note, 0, 0.2);
                                }
                              }}
                              className={`h-8 rounded-md transition-all flex flex-col items-center justify-center relative select-none text-[9px] font-mono ${
                                hasNote
                                  ? 'text-white font-bold border shadow-md scale-95'
                                  : isBeatStart
                                  ? 'bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/40 text-slate-500'
                                  : 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800/50 text-slate-600'
                              } ${isCurrentPlayhead ? 'ring-2 ring-white/60' : ''}`}
                              style={{
                                backgroundColor: hasNote ? track.color : undefined,
                                borderColor: hasNote ? '#ffffff' : undefined,
                              }}
                            >
                              {hasNote ? note : ''}
                            </button>
                          );
                        }
                      })}
                    </div>
                  </div>

                  {/* Expandable Piano Roll */}
                  {isExpanded && (isLead || isBass) && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30 my-2 shadow-inner">
                      <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
                        <span className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          {track.name} PIANO ROLL 音階エディタ (クリックして音階配置)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          上から高音 → 低音
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {PIANO_ROLL_NOTES.slice(isBass ? 12 : 0, isBass ? 32 : 18).map((pNote) => {
                          const isSharp = pNote.includes('#');
                          return (
                            <div key={pNote} className="flex items-center">
                              <div
                                className={`w-14 text-right pr-2 text-[10px] font-mono font-bold ${
                                  isSharp ? 'text-slate-500' : 'text-slate-200'
                                }`}
                              >
                                {pNote}
                              </div>
                              <div className="flex-1 grid grid-cols-16 gap-1 px-1">
                                {Array.from({ length: 16 }).map((_, stepIdx) => {
                                  const currentActiveNote = pattern[track.id as 'lead' | 'bass'][stepIdx];
                                  const isSelected = currentActiveNote === pNote;
                                  const isDownbeat = stepIdx % 4 === 0;

                                  return (
                                    <button
                                      key={stepIdx}
                                      onClick={() => handlePianoRollNoteClick(track.id as 'lead' | 'bass', pNote, stepIdx)}
                                      className={`h-5 rounded text-[8px] font-mono font-bold transition-all ${
                                        isSelected
                                          ? 'bg-cyan-400 text-slate-950 shadow-md ring-1 ring-white'
                                          : isDownbeat
                                          ? 'bg-slate-800/80 hover:bg-slate-700'
                                          : 'bg-slate-900/60 hover:bg-slate-800'
                                      }`}
                                    >
                                      {isSelected ? '●' : ''}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

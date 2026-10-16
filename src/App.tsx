/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PRESET_SONGS } from './data/presetSongs';
import { SongPreset, SongSection, PatternData, MasterFXState } from './types/music';
import { audioEngine } from './audio/AudioEngine';
import { StageVisualizer } from './components/StageVisualizer';
import { SongSelector } from './components/SongSelector';
import { DJPads } from './components/DJPads';
import { SequencerMatrix } from './components/SequencerMatrix';
import { CustomTrackGenerator } from './components/CustomTrackGenerator';
import { WavExporterModal } from './components/WavExporterModal';
import { Sparkles, Download, Github, HelpCircle, Flame } from 'lucide-react';

export default function App() {
  const [selectedSong, setSelectedSong] = useState<SongPreset>(PRESET_SONGS[0]);
  const [currentSection, setCurrentSection] = useState<SongSection>(PRESET_SONGS[0].sections[0]);
  const [currentPattern, setCurrentPattern] = useState<PatternData>(PRESET_SONGS[0].sections[0].pattern);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(PRESET_SONGS[0].bpm);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [fxState, setFxState] = useState<MasterFXState>(audioEngine.getFxState());

  // Modals
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [isExporterOpen, setIsExporterOpen] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Play / Pause Toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      setActiveStep(0);
    } else {
      audioEngine.start(currentPattern, bpm, (step) => {
        setActiveStep(step);
      });
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setActiveStep(0);
  };

  const handleSelectSong = (song: SongPreset) => {
    setSelectedSong(song);
    const initialSection = song.sections[0];
    setCurrentSection(initialSection);
    setCurrentPattern(initialSection.pattern);
    setBpm(song.bpm);

    if (isPlaying) {
      audioEngine.stop();
      audioEngine.start(initialSection.pattern, song.bpm, (step) => {
        setActiveStep(step);
      });
    } else {
      audioEngine.setBpm(song.bpm);
    }
  };

  const handleSelectSection = (section: SongSection) => {
    setCurrentSection(section);
    setCurrentPattern(section.pattern);
    if (isPlaying) {
      audioEngine.updatePattern(section.pattern);
    }
  };

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    audioEngine.setBpm(newBpm);
  };

  const handlePatternChange = (newPattern: PatternData) => {
    setCurrentPattern(newPattern);
    if (isPlaying) {
      audioEngine.updatePattern(newPattern);
    }
  };

  const handleApplyGeneratedTrack = (newPattern: PatternData, newBpm: number, title: string) => {
    setCurrentPattern(newPattern);
    setBpm(newBpm);
    audioEngine.setBpm(newBpm);

    const customSong: SongPreset = {
      id: `custom-${Date.now()}`,
      title: title,
      titleJp: title,
      genre: 'AI / Custom Generator',
      bpm: newBpm,
      key: 'Custom',
      scale: 'Custom Scale',
      mood: 'エネルギッシュ・新曲',
      tagline: '生成されたオリジナル文化祭トラック！',
      accentColor: '#06b6d4',
      sections: [
        {
          id: 'custom-main',
          name: 'Main Section',
          nameJp: 'メインセクション',
          bars: 2,
          pattern: newPattern,
        },
      ],
    };

    setSelectedSong(customSong);
    setCurrentSection(customSong.sections[0]);

    if (!isPlaying) {
      audioEngine.start(newPattern, newBpm, (step) => {
        setActiveStep(step);
      });
      setIsPlaying(true);
    } else {
      audioEngine.updatePattern(newPattern);
    }
  };

  // Keyboard shortcut: Spacebar to toggle Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentPattern, bpm]);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40">
              <Flame className="w-6 h-6 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-white">
                  FESTIVAL BEATS
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-bold">
                  文化祭サウンドスタジオ
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                学園祭・文化祭ステージ用オリジナル楽曲クリエイター & リアルタイム演奏
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-cyan-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">かっこいい新曲を自動作曲</span>
              <span className="sm:hidden">自動作曲</span>
            </button>

            <button
              onClick={() => setIsExporterOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl text-xs border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">WAV書き出し</span>
              <span className="sm:hidden">WAV</span>
            </button>

            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="使い方ガイド"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <a
              href="https://github.com/325A1115/schoolfestival"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden md:inline">325A1115/schoolfestival</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Help Banner if toggled */}
        {showHelp && (
          <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-800/40 rounded-2xl p-4 text-xs text-slate-300 space-y-2 animate-fade-in">
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              文化祭ミュージックスタジオの楽しみ方
            </div>
            <p className="leading-relaxed">
              1. <strong>かっこいい楽曲の試聴・選択:</strong> 上部のカード（サイバーEDM、青春ロック、和風トラップ、シティポップ）から好きな曲を選んで「PLAY (演奏スタート)」を押すと、本格シンセ＆ドラムがリアルタイムに響きます！
            </p>
            <p className="leading-relaxed">
              2. <strong>ライブDJパッド:</strong> キーボードの [1]〜[8] またはパッドをクリックすると、爆音エアホーンや観客歓声、ライザー、MCボイスが鳴り響き、会場を一気にアゲることができます。
            </p>
            <p className="leading-relaxed">
              3. <strong>ステップシーケンサー & ピアノロール:</strong> 各楽器のステップをクリックしてリズムを組み替えたり、リードシンセのピアノロールで音階を自由に作曲できます。
            </p>
            <p className="leading-relaxed">
              4. <strong>WAV高音質書き出し:</strong> 右上の「WAV書き出し」ボタンで、文化祭のステージ音響や動画BGM、オープニングムービーにそのまま使える本物の高音質WAVファイルをワンクリックでダウンロードできます！
            </p>
          </div>
        )}

        {/* 1. 60fps Live Stage Visualizer */}
        <StageVisualizer
          currentSongTitle={selectedSong.titleJp}
          bpm={bpm}
          isPlaying={isPlaying}
          accentColor={selectedSong.accentColor}
        />

        {/* 2. Preset Song & Section Selector & Transport */}
        <SongSelector
          presets={PRESET_SONGS}
          selectedSong={selectedSong}
          currentSection={currentSection}
          isPlaying={isPlaying}
          bpm={bpm}
          onSelectSong={handleSelectSong}
          onSelectSection={handleSelectSection}
          onTogglePlay={handleTogglePlay}
          onBpmChange={handleBpmChange}
          onReset={handleReset}
        />

        {/* 3. Live DJ Pads & Master FX */}
        <DJPads
          fxState={fxState}
          onFxChange={(newFx) => setFxState((prev) => ({ ...prev, ...newFx }))}
          accentColor={selectedSong.accentColor}
        />

        {/* 4. Multi-Track Step Sequencer & Piano Roll */}
        <SequencerMatrix
          pattern={currentPattern}
          activeStep={activeStep}
          isPlaying={isPlaying}
          onPatternChange={handlePatternChange}
          accentColor={selectedSong.accentColor}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <p>Festival Beats · Built for School Festival 2026 · Powered by Web Audio Synthesis & Google AI</p>
        <p className="mt-1 text-[11px] text-slate-600">
          スペースキーで再生/一時停止 · 数字キー [1]-[8] でリアルタイムDJサウンド発火
        </p>
      </footer>

      {/* Modals */}
      <CustomTrackGenerator
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onApplyGeneratedTrack={handleApplyGeneratedTrack}
      />

      <WavExporterModal
        isOpen={isExporterOpen}
        onClose={() => setIsExporterOpen(false)}
        pattern={currentPattern}
        bpm={bpm}
        songTitle={selectedSong.titleJp}
      />
    </div>
  );
}

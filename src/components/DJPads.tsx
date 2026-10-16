import React, { useState, useEffect } from 'react';
import { DJPadConfig, MasterFXState } from '../types/music';
import { audioEngine } from '../audio/AudioEngine';
import { Volume2, Sliders, Waves } from 'lucide-react';

interface DJPadsProps {
  fxState: MasterFXState;
  onFxChange: (newFx: Partial<MasterFXState>) => void;
  accentColor: string;
}

const PAD_CONFIGS: DJPadConfig[] = [
  { id: 'airhorn', label: 'AIRHORN', labelJp: '爆音エアホーン', keyHint: '1', color: 'from-amber-500 to-orange-600', type: 'airhorn' },
  { id: 'cheer', label: 'CHEER', labelJp: '観客歓声 (CHEER)', keyHint: '2', color: 'from-emerald-500 to-teal-600', type: 'cheer' },
  { id: 'riser', label: 'RISER', labelJp: '高揚ライザー', keyHint: '3', color: 'from-cyan-500 to-blue-600', type: 'riser' },
  { id: 'scratch', label: 'SCRATCH', labelJp: 'DJスクラッチ', keyHint: '4', color: 'from-purple-500 to-indigo-600', type: 'scratch' },
  { id: 'wobble', label: 'WOBBLE', labelJp: '極太ワブルベース', keyHint: '5', color: 'from-fuchsia-500 to-pink-600', type: 'wobble' },
  { id: 'taiko', label: 'TAIKO', labelJp: '祭大太鼓ドロップ', keyHint: '6', color: 'from-red-500 to-rose-600', type: 'taiko' },
  { id: 'laser', label: 'LASER', labelJp: 'レーザービーム', keyHint: '7', color: 'from-sky-400 to-cyan-600', type: 'laser' },
  { id: 'mc', label: 'MC SHOUT', labelJp: 'MC煽りボイス', keyHint: '8', color: 'from-yellow-400 to-amber-600', type: 'mc' },
];

export const DJPads: React.FC<DJPadsProps> = ({ fxState, onFxChange }) => {
  const [activePad, setActivePad] = useState<string | null>(null);

  const handlePadTrigger = (pad: DJPadConfig) => {
    setActivePad(pad.id);
    audioEngine.triggerPad(pad.type);
    setTimeout(() => {
      setActivePad((curr) => (curr === pad.id ? null : curr));
    }, 180);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const pad = PAD_CONFIGS.find((p) => p.keyHint === e.key);
      if (pad) {
        handlePadTrigger(pad);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              LIVE STAGE DJ PADS & MASTER FX
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            パッドをクリックまたはキーボード [1]〜[8] でリアルタイムに煽りサウンド・エフェクトを発火
          </p>
        </div>

        {/* Master FX Knobs & Sliders */}
        <div className="flex items-center gap-6">
          {/* DJ Filter */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 mb-1">
              <span className="text-blue-400 font-semibold">LPF</span>
              <span className="text-slate-300 font-bold">DJ FILTER</span>
              <span className="text-rose-400 font-semibold">HPF</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={fxState.filterCutoff}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onFxChange({ filterCutoff: val });
                audioEngine.setFxState({ filterCutoff: val });
              }}
              className="w-32 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              title="左に回すとローパス（こもった重低音）、右に回すとハイパス（スッキリ軽快）"
            />
            <span className="text-[10px] font-mono text-slate-500 mt-1">
              {fxState.filterCutoff < 0.48
                ? 'LOW-PASS 降下'
                : fxState.filterCutoff > 0.52
                ? 'HIGH-PASS 上昇'
                : 'FLAT (クリア)'}
            </span>
          </div>

          {/* Reverb Slider */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 mb-1">
              <span className="text-slate-300 font-bold">REVERB (残響)</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.02"
              value={fxState.reverbAmount}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onFxChange({ reverbAmount: val });
                audioEngine.setFxState({ reverbAmount: val });
              }}
              className="w-24 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <span className="text-[10px] font-mono text-purple-400 mt-1">
              {Math.round(fxState.reverbAmount * 100)}%
            </span>
          </div>

          {/* Master Volume */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full text-[11px] font-mono text-slate-400 mb-1">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-bold ml-1">MASTER</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={fxState.masterVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onFxChange({ masterVolume: val });
                audioEngine.setFxState({ masterVolume: val });
              }}
              className="w-24 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <span className="text-[10px] font-mono text-emerald-400 mt-1">
              {Math.round(fxState.masterVolume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* 8 Drum & FX Pads Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {PAD_CONFIGS.map((pad) => {
          const isActive = activePad === pad.id;
          return (
            <button
              key={pad.id}
              onClick={() => handlePadTrigger(pad)}
              className={`relative group flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all select-none active:scale-95 ${
                isActive
                  ? `bg-gradient-to-br ${pad.color} text-white border-white shadow-lg shadow-cyan-500/30 scale-98 ring-2 ring-white/50`
                  : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-200 hover:border-slate-700 hover:shadow-md'
              }`}
            >
              <div className="absolute top-2 right-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-slate-400 group-hover:text-cyan-300">
                [{pad.keyHint}]
              </div>

              <div className="text-center mt-2">
                <span className="block text-xs font-black tracking-wider uppercase font-mono">
                  {pad.label}
                </span>
                <span className="block text-[11px] text-slate-400 group-hover:text-slate-200 font-medium truncate mt-0.5">
                  {pad.labelJp}
                </span>
              </div>

              {/* Bottom trigger indicator line */}
              <div
                className={`mt-2 w-8 h-1 rounded-full transition-colors ${
                  isActive ? 'bg-white' : 'bg-slate-700 group-hover:bg-cyan-500'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

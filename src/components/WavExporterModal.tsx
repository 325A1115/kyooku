import React, { useState } from 'react';
import { PatternData } from '../types/music';
import { audioEngine } from '../audio/AudioEngine';
import { Download, Disc3, CheckCircle2, Music, Loader2 } from 'lucide-react';

interface WavExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  pattern: PatternData;
  bpm: number;
  songTitle: string;
}

export const WavExporterModal: React.FC<WavExporterModalProps> = ({
  isOpen,
  onClose,
  pattern,
  bpm,
  songTitle,
}) => {
  const [barsCount, setBarsCount] = useState<number>(4);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportFileName, setExportFileName] = useState<string>('');

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(10);
    setDownloadUrl(null);

    try {
      const cleanTitle = songTitle.replace(/[^a-zA-Z0-9_\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '_');
      const filename = `Festival_Beats_${cleanTitle}_${bpm}bpm_${barsCount}bars.wav`;
      setExportFileName(filename);

      const blob = await audioEngine.exportSongToWav(
        pattern,
        bpm,
        barsCount,
        (p) => setProgress(p)
      );

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress(100);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const calculateDurationSeconds = () => {
    const secondsPer16th = (60 / bpm) / 4;
    return Math.round(16 * barsCount * secondsPer16th);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              WAV 高音質書き出し (Export WAV)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            閉じる
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">対象楽曲</span>
            <span className="text-sm font-bold text-white block truncate">{songTitle}</span>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mt-1">
              <span>{bpm} BPM</span>
              <span>·</span>
              <span>44.1kHz 16-bit Stereo PCM</span>
            </div>
          </div>

          {/* Bar count selector */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
              書き出し小節数 (演奏時間)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { bars: 2, label: '2小節', sub: `~${Math.round(32 * (60/bpm)/4)}秒` },
                { bars: 4, label: '4小節', sub: `~${Math.round(64 * (60/bpm)/4)}秒` },
                { bars: 8, label: '8小節', sub: `~${Math.round(128 * (60/bpm)/4)}秒` },
                { bars: 16, label: '16小節', sub: `~${Math.round(256 * (60/bpm)/4)}秒` },
              ].map((opt) => (
                <button
                  key={opt.bars}
                  onClick={() => {
                    setBarsCount(opt.bars);
                    setDownloadUrl(null);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    barsCount === opt.bars
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] opacity-80">{opt.sub}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              ※文化祭ステージ音響PA・動画BGM・プレゼンにそのまま使える本物のWAV音声ファイルです。
            </p>
          </div>

          {/* Progress / Status */}
          {isExporting && (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  オーディオレンダリング中...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Download ready button */}
          {downloadUrl && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>WAVファイルのレンダリングが完了しました！</span>
              </div>

              {/* Preview Audio player */}
              <audio controls src={downloadUrl} className="w-full h-8 rounded" />

              <a
                href={downloadUrl}
                download={exportFileName}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>WAVファイルをダウンロード保存</span>
              </a>
            </div>
          )}

          {/* Action button */}
          {!downloadUrl && !isExporting && (
            <button
              onClick={handleStartExport}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm transition-all active:scale-98"
            >
              <Music className="w-4 h-4" />
              <span>レンダリング開始 (約{calculateDurationSeconds()}秒の音源)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

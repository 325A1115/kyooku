import React, { useState } from 'react';
import { generateAlgorithmicTrack } from '../utils/musicTheory';
import { PatternData } from '../types/music';
import { audioEngine } from '../audio/AudioEngine';
import { Sparkles, Wand2, Mic, Volume2, Check, RefreshCw } from 'lucide-react';

interface CustomTrackGeneratorProps {
  onApplyGeneratedTrack: (newPattern: PatternData, bpm: number, title: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomTrackGenerator: React.FC<CustomTrackGeneratorProps> = ({
  onApplyGeneratedTrack,
  isOpen,
  onClose,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<'edm' | 'rock' | 'matsuri' | 'citypop' | 'dnb'>('edm');
  const [selectedKey, setSelectedKey] = useState<string>('F');
  const [selectedEnergy, setSelectedEnergy] = useState<'high' | 'peak' | 'chill'>('peak');
  const [schoolName, setSchoolName] = useState<string>('文化祭ステージ');

  // AI Lyrics & MC state
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [mcData, setMcData] = useState<{
    mcShout: string;
    lyricsVerse: string;
    countdown: string;
    catchphrase: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleGenerateMusic = () => {
    let bpm = 132;
    let titlePrefix = 'Festival Overdrive';
    if (selectedGenre === 'rock') {
      bpm = 172;
      titlePrefix = 'Seishun Band Anthem';
    } else if (selectedGenre === 'matsuri') {
      bpm = 138;
      titlePrefix = 'Neo Tokyo Matsuri';
    } else if (selectedGenre === 'citypop') {
      bpm = 118;
      titlePrefix = 'Afterschool Twilight';
    } else if (selectedGenre === 'dnb') {
      bpm = 174;
      titlePrefix = 'Cyber DnB Velocity';
    }

    const pattern = generateAlgorithmicTrack(selectedGenre, selectedKey, selectedEnergy);
    const fullTitle = `[新曲] ${titlePrefix} (${selectedKey}m / ${bpm}BPM)`;

    onApplyGeneratedTrack(pattern, bpm, fullTitle);
    onClose();
  };

  const handleGenerateAILyrics = async () => {
    setIsLoadingLyrics(true);
    try {
      const genreLabels = {
        edm: 'EDM / Future Bass',
        rock: '疾走ロック',
        matsuri: '和風サイバートラップ',
        citypop: 'シティポップ',
        dnb: 'ドラムンベース',
      };

      const res = await fetch('/api/generate-festival-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: '文化祭・学園祭メインステージ',
          genre: genreLabels[selectedGenre],
          energy: selectedEnergy === 'peak' ? '最高潮' : 'エネルギッシュ',
          schoolName: schoolName.trim() || 'URAYAMA学園祭',
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        setMcData({
          mcShout: data.mcShout,
          lyricsVerse: data.lyricsVerse,
          countdown: data.countdown,
          catchphrase: data.catchphrase,
        });
      }
    } catch (err) {
      console.error('Failed to generate lyrics:', err);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const handleSpeakMC = () => {
    if (mcData) {
      audioEngine.playMCSpeech(mcData.mcShout);
    } else {
      audioEngine.playMCSpeech();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white tracking-wide">
              かっこいい新曲を作曲・自動生成
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            閉じる
          </button>
        </div>

        {/* Options */}
        <div className="mt-5 space-y-5">
          {/* Genre Selection */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
              1. 音楽ジャンル・スタイルを選択
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'edm', label: '⚡ Hyper Future Bass (132 BPM)', desc: 'フェス開幕・重低音と超絶シンセ' },
                { id: 'rock', label: '🎸 疾走アニソン風ロック (172 BPM)', desc: '体育館を熱狂させるバンドサウンド' },
                { id: 'matsuri', label: '🌸 百花繚乱・和風トラップ (138 BPM)', desc: '和太鼓と琴スケールの電脳祭囃子' },
                { id: 'citypop', label: '🌆 トワイライト・シティポップ (118 BPM)', desc: '放課後のおしゃれなスラップベース' },
                { id: 'dnb', label: '🏎️ 電脳ドラムンベース (174 BPM)', desc: '最高速の疾走ハイパービート' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGenre(g.id as any)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedGenre === g.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{g.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Key and Energy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                2. キー (音階ルート)
              </label>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="F">F (EDM王道・迫力重低音)</option>
                <option value="A">A (エモロック・王道アニソン進行)</option>
                <option value="D">D (和風インセン・ダーククール)</option>
                <option value="C">C (爽快キャッチー)</option>
                <option value="E">E (ブライト・ハイテンション)</option>
                <option value="G">G (フェスティバルアンセム)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                3. エネルギーレベル
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'peak', label: 'PEAK 最高潮' },
                  { id: 'high', label: 'HIGH 疾走' },
                  { id: 'chill', label: 'CHILL チル' },
                ].map((en) => (
                  <button
                    key={en.id}
                    onClick={() => setSelectedEnergy(en.id as any)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedEnergy === en.id
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {en.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Track Button */}
          <button
            onClick={handleGenerateMusic}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm transition-all active:scale-98"
          >
            <Sparkles className="w-5 h-5 fill-current" />
            <span>この設定でかっこいいオリジナル曲を生成して反映！</span>
          </button>

          {/* AI Festival MC & Lyrics Generator Section */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">
                  文化祭ステージ MCシャウト & 歌詞ジェネレーター
                </h4>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="学校名やフェス名 (例: 浦山学園祭, 青春フェス)"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleGenerateAILyrics}
                disabled={isLoadingLyrics}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl border border-slate-700 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isLoadingLyrics ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>MC煽り文を生成</span>
              </button>
            </div>

            {mcData && (
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3 animate-fade-in">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block">
                    ステージMC煽りセリフ:
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5 leading-relaxed">
                    {mcData.mcShout}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase block">
                    サビ歌詞 (LYRICS):
                  </span>
                  <p className="text-xs text-slate-300 whitespace-pre-line mt-0.5 font-medium leading-relaxed">
                    {mcData.lyricsVerse}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <span className="text-xs font-mono text-rose-400 font-bold">
                    COUNTDOWN: {mcData.countdown}
                  </span>
                  <button
                    onClick={handleSpeakMC}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>MCボイスで読み上げ発声</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

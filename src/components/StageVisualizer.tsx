import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { Maximize2, Minimize2, Sparkles, Zap } from 'lucide-react';

interface StageVisualizerProps {
  currentSongTitle: string;
  bpm: number;
  isPlaying: boolean;
  accentColor: string;
}

export const StageVisualizer: React.FC<StageVisualizerProps> = ({
  currentSongTitle,
  bpm,
  isPlaying,
  accentColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [strobeEnabled, setStrobeEnabled] = useState(true);
  const [lasersEnabled, setLasersEnabled] = useState(true);

  // Penlight colors for the crowd
  const penlightColors = ['#06b6d4', '#f43f5e', '#eab308', '#a855f7', '#10b981', '#3b82f6'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      // Dark stage background with subtle gradient
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, width, height);

      const analyser = audioEngine.getAnalyser();
      let bassEnergy = 0;
      let midEnergy = 0;
      let trebleEnergy = 0;

      let freqData: Uint8Array | null = null;
      let timeData: Uint8Array | null = null;

      if (analyser && isPlaying) {
        freqData = new Uint8Array(analyser.frequencyBinCount);
        timeData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData as any);
        analyser.getByteTimeDomainData(timeData as any);

        // Calculate frequency bands
        let bassSum = 0;
        let midSum = 0;
        let trebleSum = 0;
        const binCount = freqData.length;

        for (let i = 0; i < 15; i++) bassSum += freqData[i];
        for (let i = 15; i < 80; i++) midSum += freqData[i];
        for (let i = 80; i < binCount; i++) trebleSum += freqData[i];

        bassEnergy = bassSum / (15 * 255);
        midEnergy = midSum / (65 * 255);
        trebleEnergy = trebleSum / ((binCount - 80) * 255);
      }

      // 1. Stage Laser Beams
      if (lasersEnabled) {
        ctx.save();
        const laserSources = [
          { x: width * 0.15, y: height * 0.1 },
          { x: width * 0.35, y: height * 0.08 },
          { x: width * 0.65, y: height * 0.08 },
          { x: width * 0.85, y: height * 0.1 },
        ];

        laserSources.forEach((src, idx) => {
          const angle = Math.sin(time * 1.5 + idx * 1.2) * 0.8 + Math.PI / 2;
          const beamLength = height * 1.4;
          const targetX = src.x + Math.cos(angle) * beamLength;
          const targetY = src.y + Math.sin(angle) * beamLength;

          const laserColor = idx % 2 === 0 ? accentColor : '#f43f5e';
          const laserAlpha = isPlaying ? 0.35 + bassEnergy * 0.5 : 0.15;

          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(targetX, targetY);
          ctx.strokeStyle = laserColor;
          ctx.lineWidth = isPlaying ? 2 + bassEnergy * 4 : 1.5;
          ctx.globalAlpha = laserAlpha;
          ctx.shadowBlur = 15;
          ctx.shadowColor = laserColor;
          ctx.stroke();

          // Stage spotlight cone
          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(targetX - 45, targetY);
          ctx.lineTo(targetX + 45, targetY);
          ctx.closePath();
          const coneGrad = ctx.createLinearGradient(src.x, src.y, targetX, targetY);
          coneGrad.addColorStop(0, laserColor);
          coneGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = coneGrad;
          ctx.globalAlpha = laserAlpha * 0.25;
          ctx.fill();
        });
        ctx.restore();
      }

      // 2. Central Bass Pulse Circle (Subwoofer visual)
      ctx.save();
      const centerX = width / 2;
      const centerY = height * 0.42;
      const baseRadius = Math.min(width, height) * 0.14;
      const currentRadius = baseRadius + (isPlaying ? bassEnergy * 45 : 0);

      // Outer glow ring
      const ringGrad = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, currentRadius * 1.5);
      ringGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      ringGrad.addColorStop(0.7, `${accentColor}33`);
      ringGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Speaker cone
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = accentColor;
      ctx.stroke();

      // Inner speaker core
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 3. Audio Frequency Bars (EQ Spectrum)
      if (freqData && isPlaying) {
        ctx.save();
        const barCount = 48;
        const barWidth = (width * 0.8) / barCount;
        const startX = width * 0.1;
        const floorY = height * 0.72;

        for (let i = 0; i < barCount; i++) {
          const sampleIndex = Math.floor((i / barCount) * (freqData.length * 0.6));
          const val = freqData[sampleIndex] / 255;
          const barHeight = val * height * 0.35;
          const x = startX + i * barWidth;
          const y = floorY - barHeight;

          const barGrad = ctx.createLinearGradient(0, y, 0, floorY);
          barGrad.addColorStop(0, '#f43f5e');
          barGrad.addColorStop(0.5, accentColor);
          barGrad.addColorStop(1, '#3b82f6');

          ctx.fillStyle = barGrad;
          ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

          // Top peak LED dot
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 2, y - 3, barWidth - 4, 2);
        }
        ctx.restore();
      }

      // 4. Strobe Flash on Massive Bass Hit
      if (strobeEnabled && isPlaying && bassEnergy > 0.75) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = (bassEnergy - 0.75) * 0.35;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 5. School Festival Crowd Silhouette & Glowing Penlights (ペンライト)
      ctx.save();
      const crowdY = height * 0.78;

      // Crowd silhouettes
      ctx.fillStyle = '#05070a';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, crowdY + 20);

      const crowdPeopleCount = Math.floor(width / 24);
      for (let i = 0; i < crowdPeopleCount; i++) {
        const px = (i / crowdPeopleCount) * width;
        const bounce = isPlaying ? Math.sin(time * 8 + i) * (bassEnergy * 14) : 0;
        const headY = crowdY - 10 + bounce + Math.sin(i * 1.5) * 8;

        // Head and shoulders curve
        ctx.lineTo(px, headY + 12);
        ctx.arc(px + 8, headY, 9, 0, Math.PI, true);
        ctx.lineTo(px + 16, headY + 12);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Glowing Penlights waving in the crowd!
      const penlightCount = Math.floor(width / 32);
      for (let j = 0; j < penlightCount; j++) {
        const lx = (j / penlightCount) * width + 12;
        const waveAngle = isPlaying
          ? Math.sin(time * 6 + j * 0.7) * 0.45
          : Math.sin(time * 2 + j) * 0.15;
        const bounce = isPlaying ? Math.abs(Math.sin(time * 8 + j)) * (bassEnergy * 18) : 0;
        const ly = crowdY - 8 - bounce + Math.sin(j * 2) * 6;

        const stickLength = 24;
        const endX = lx + Math.sin(waveAngle) * stickLength;
        const endY = ly - Math.cos(waveAngle) * stickLength;

        const pColor = penlightColors[j % penlightColors.length];

        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = pColor;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 12;
        ctx.shadowColor = pColor;
        ctx.stroke();

        // Glowing tip
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      if (canvas && containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, accentColor, strobeEnabled, lasersEnabled]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl transition-all ${
        isFullscreen ? 'h-screen w-screen rounded-none border-none' : 'h-[360px]'
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Stage Overlay Top Banner */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 pointer-events-auto">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPlaying ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isPlaying ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            />
          </span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            {isPlaying ? 'STAGE LIVE' : 'STANDBY'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-mono text-cyan-400 font-semibold">{bpm} BPM</span>
        </div>

        {/* Visualizer Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setLasersEnabled(!lasersEnabled)}
            className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 backdrop-blur-md ${
              lasersEnabled
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="レーザー演出 切替"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">レーザー</span>
          </button>

          <button
            onClick={() => setStrobeEnabled(!strobeEnabled)}
            className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 backdrop-blur-md ${
              strobeEnabled
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="ストロボ発光 切替"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">ストロボ</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-xs font-medium bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white backdrop-blur-md transition-colors"
            title={isFullscreen ? '通常画面に戻す' : 'ステージ全画面表示'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stage Track Title Lower Banner */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 shadow-lg">
          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">NOW PLAYING</p>
          <p className="text-sm sm:text-base font-bold text-white tracking-wide truncate max-w-[280px] sm:max-w-md">
            {currentSongTitle}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-900/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
          <span>文化祭メインステージ</span>
          <span className="text-slate-600">/</span>
          <span className="text-cyan-400">FESTIVAL AUDIO</span>
        </div>
      </div>
    </div>
  );
};

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client if key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI();
}

// API: Generate Festival MC Hype Lines & Stage Lyrics
app.post('/api/generate-festival-lyrics', async (req: Request, res: Response) => {
  try {
    const { theme = '学園祭・文化祭', genre = 'EDM', energy = '最高潮', schoolName = 'URAYAMA' } = req.body;

    if (!apiKey || !aiClient) {
      // Fallback pre-crafted hype festival MC lines
      return res.json({
        success: true,
        source: 'built-in',
        mcShout: `「${schoolName}フェスへようこそ！最高のステージ、準備はいいかー！？ボリューム上げていくぞー！！」`,
        lyricsVerse: `ネオン光る ステージの真ん中で\n鼓動が加速する 1秒先へ\n今日だけの奇跡を 刻み込め\n最高の瞬間を 始めよう！`,
        countdown: '3, 2, 1, ARE YOU READY?! MAKE SOME NOISE!',
        catchphrase: 'いま、青春の最高到達点へ。',
      });
    }

    const prompt = `あなたは日本屈指の音楽フェス・学園祭・文化祭のプロDJ / 音楽プロデューサーです。
以下のテーマに沿った、会場を最高に盛り上げる「かっこいいMCシャウト」「楽曲用ショート歌詞」「ドロップ前のカウントダウン掛け声」を日本語で作成してください。

【設定】
- イベントテーマ: ${theme}
- 音楽ジャンル: ${genre}
- テンション/エネルギー: ${energy}
- 学校/ステージ名: ${schoolName}

以下のJSON形式のみで回答してください（Markdownコードブロックは不要です）:
{
  "mcShout": "ステージ開始時の煽りMC（2〜3行、熱狂的でかっこいい台詞）",
  "lyricsVerse": "楽曲のサビやボーカルドロップで歌えるエモくてかっこいい日本語歌詞（4行）",
  "countdown": "ドロップ直前の英語混じりのアツいカウントダウン",
  "catchphrase": "この曲と文化祭を表す超かっこいいワンフレーズ"
}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        mcShout: '文化祭ステージ開幕！全員手を挙げろー！！',
        lyricsVerse: '響き渡るビート 重なる声\n二度と来ない この瞬間に飛び込め！',
        countdown: '3, 2, 1, DROP IT!',
        catchphrase: '熱狂と青春のオーバーヒート',
      };
    }

    return res.json({
      success: true,
      source: 'gemini',
      ...parsedData,
    });
  } catch (err: any) {
    console.error('Error in /api/generate-festival-lyrics:', err);
    return res.json({
      success: true,
      source: 'fallback',
      mcShout: '学園祭ステージへようこそ！全員で最高のビートを作ろうぜ！',
      lyricsVerse: '光のシャワー 突き抜けるメロディ\nここで始まる 最高の物語',
      countdown: '3, 2, 1, LET\'S GO!',
      catchphrase: '文化祭最高潮！',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Festival Beats Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

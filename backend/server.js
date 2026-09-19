import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR);
}

app.post('/api/info', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Use yt-dlp to dump JSON info
  const ytDlp = spawn('yt-dlp', ['-J', url]);

  let stdoutData = '';
  let stderrData = '';

  ytDlp.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  ytDlp.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      console.error('yt-dlp error:', stderrData);
      return res.status(500).json({ error: 'Failed to fetch video info', details: stderrData });
    }

    try {
      const info = JSON.parse(stdoutData);
      // Filter out formats without video (unless we want audio only, but we'll show video formats usually)
      const formats = (info.formats || []).filter(f => f.ext === 'mp4' || f.ext === 'webm');
      
      res.json({
        id: info.id,
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        formats: formats.map(f => ({
          format_id: f.format_id,
          ext: f.ext,
          resolution: f.resolution,
          fps: f.fps,
          filesize: f.filesize,
          format_note: f.format_note,
          vcodec: f.vcodec !== 'none',
          acodec: f.acodec !== 'none'
        })).sort((a, b) => (b.filesize || 0) - (a.filesize || 0))
      });
    } catch (e) {
      console.error('JSON Parse error:', e);
      res.status(500).json({ error: 'Failed to parse video info' });
    }
  });
});

app.get('/api/download', (req, res) => {
  const { url, formatId, audioOnly } = req.query;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  // Setup Server-Sent Events (SSE)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendEvent = (type, data) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let ytArgs = [];
  if (audioOnly === 'true') {
    ytArgs = [
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s'),
      url
    ];
  } else {
    // If formatId is provided, use it, otherwise best
    const formatSelection = formatId ? `${formatId}+bestaudio/best` : 'bestvideo+bestaudio/best';
    ytArgs = [
      '-f', formatSelection,
      '--merge-output-format', 'mp4',
      '-o', path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s'),
      url
    ];
  }

  const ytDlp = spawn('yt-dlp', ytArgs);

  // Parse yt-dlp progress output
  // Example output: [download]  23.4% of ~45.34MiB at    3.52MiB/s ETA 00:09
  ytDlp.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.includes('[download]') && line.includes('%')) {
        const percentMatch = line.match(/([\d.]+)%/);
        const speedMatch = line.match(/at\s+([^\s]+)/);
        const etaMatch = line.match(/ETA\s+([\d:]+)/);

        if (percentMatch) {
          sendEvent('progress', {
            percent: parseFloat(percentMatch[1]),
            speed: speedMatch ? speedMatch[1] : null,
            eta: etaMatch ? etaMatch[1] : null
          });
        }
      }
    }
  });

  ytDlp.stderr.on('data', (data) => {
    console.error('yt-dlp stderr:', data.toString());
  });

  ytDlp.on('close', (code) => {
    if (code === 0) {
      sendEvent('complete', { status: 'success' });
    } else {
      sendEvent('error', { error: 'Download failed' });
    }
    res.end();
  });

  // If client closes connection
  req.on('close', () => {
    ytDlp.kill();
  });
});

// Serve static frontend in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

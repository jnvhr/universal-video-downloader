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

  // Use yt-dlp to dump JSON info with no warnings
  const ytDlp = spawn('yt-dlp', ['-J', '--no-warnings', url]);

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

      const parseItem = (item, index) => {
        const rawFormats = item.formats || [];
        // Include formats that have video or are standard mp4/webm
        const formats = rawFormats.filter(f => 
          (f.ext === 'mp4' || f.ext === 'webm') && (f.vcodec !== 'none' || !f.vcodec)
        );

        // Extract best available thumbnail
        let thumb = item.thumbnail || null;
        if (!thumb && Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
          thumb = item.thumbnails[item.thumbnails.length - 1].url;
        }

        return {
          id: item.id || String(index + 1),
          itemIndex: index + 1, // 1-based index for --playlist-items
          title: item.title || `Video ${index + 1}`,
          thumbnail: thumb,
          duration: item.duration || 0,
          formats: formats.map(f => ({
            format_id: f.format_id,
            ext: f.ext,
            resolution: f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : f.format_note || 'Standard'),
            fps: f.fps || null,
            filesize: f.filesize || f.filesize_approx || null,
            format_note: f.format_note || '',
            vcodec: f.vcodec !== 'none',
            acodec: f.acodec !== 'none'
          })).sort((a, b) => (b.filesize || 0) - (a.filesize || 0))
        };
      };

      let items = [];
      if (Array.isArray(info.entries) && info.entries.length > 0) {
        items = info.entries.map((entry, idx) => parseItem(entry, idx));
      } else {
        items = [parseItem(info, 0)];
      }

      res.json({
        id: info.id,
        title: info.title || 'Video',
        isMultiple: items.length > 1,
        count: items.length,
        items
      });
    } catch (e) {
      console.error('JSON Parse error:', e);
      res.status(500).json({ error: 'Failed to parse video info' });
    }
  });
});

app.get('/api/download', (req, res) => {
  const { url, formatId, audioOnly, taskId, itemIndex } = req.query;

  if (!url || !taskId) {
    return res.status(400).send('URL and taskId are required');
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

  let ytArgs = ['--no-warnings'];
  
  if (itemIndex) {
    ytArgs.push('--playlist-items', String(itemIndex));
  }

  // Use taskId to uniquely identify the downloaded file
  const outputPath = path.join(DOWNLOADS_DIR, `${taskId}.%(ext)s`);
  
  if (audioOnly === 'true') {
    ytArgs.push(
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', outputPath,
      url
    );
  } else {
    const formatSelection = formatId ? `${formatId}+bestaudio/best` : 'bestvideo+bestaudio/best';
    ytArgs.push(
      '-f', formatSelection,
      '--merge-output-format', 'mp4',
      '-o', outputPath,
      url
    );
  }

  const ytDlp = spawn('yt-dlp', ytArgs);

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
      // Find the downloaded file
      const files = fs.readdirSync(DOWNLOADS_DIR);
      const downloadedFile = files.find(f => 
        f.startsWith(`${taskId}.`) && !f.endsWith('.part') && !f.endsWith('.ytdl')
      );
      
      if (downloadedFile) {
        sendEvent('complete', { status: 'success', fileId: downloadedFile });
      } else {
        sendEvent('error', { error: 'File not found after download' });
      }
    } else {
      sendEvent('error', { error: 'Download failed' });
    }
    res.end();
  });

  req.on('close', () => {
    ytDlp.kill();
  });
});

app.get('/api/file/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const title = req.query.title || 'video';
  
  // Basic security check to prevent directory traversal
  if (fileId.includes('/') || fileId.includes('..')) {
    return res.status(400).send('Invalid file ID');
  }

  const filePath = path.join(DOWNLOADS_DIR, fileId);
  const ext = path.extname(fileId);
  // Sanitize title for content-disposition header
  const safeTitle = title.replace(/[^a-zA-Z0-9-_\s]/g, '');

  if (fs.existsSync(filePath)) {
    res.download(filePath, `${safeTitle}${ext}`, (err) => {
      // Delete file after download finishes to save disk space
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    });
  } else {
    res.status(404).send('File not found');
  }
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

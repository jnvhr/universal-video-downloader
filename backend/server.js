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

// Ensure Homebrew and standard UNIX binary paths are included in PATH
const extraPaths = ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/bin', '/bin'];
const currentPath = process.env.PATH || '';
process.env.PATH = `${extraPaths.join(':')}:${currentPath}`;

// Regular expression matching known adult / 18+ domains
const ADULT_DOMAINS = /pornhub|xvideos|xnxx|redtube|youporn|xhamster|spankbang|chaturbate|stripchat|onlyfans|fansly|rule34|e-hentai|nhentai|hentaihaven|brazzers|eporner|hqporner|tube8|beeg|tnaflix|drtuber|thumbzilla/i;

// Helper to generate candidate URLs for adult platforms with regional/datacenter 410 blocks
function getExtractionUrls(targetUrl) {
  const urls = [targetUrl];
  if (/pornhub\.(com|org)/i.test(targetUrl)) {
    const phMatch = targetUrl.match(/(?:viewkey=|embed\/|video\/)([\da-z]+)/i);
    if (phMatch) {
      const viewkey = phMatch[1];
      // Thumbzilla is Pornhub's mobile mirror which uses the exact same CDN and IDs but bypasses US state/datacenter 410 blocks
      urls.push(`https://www.thumbzilla.com/video/${viewkey}`);
      urls.push(`https://www.pornhub.net/view_video.php?viewkey=${viewkey}`);
    }
  }
  return urls;
}

function runYtDlpDump(targetUrl) {
  return new Promise((resolve, reject) => {
    const ytArgs = [
      '-J',
      '--no-warnings',
      '--no-update',
      '--geo-bypass',
      '--no-check-certificates',
      '--socket-timeout', '30',
      '--no-playlist',
      targetUrl
    ];

    const ytDlp = spawn('yt-dlp', ytArgs, { env: process.env });

    let stdoutData = '';
    let stderrData = '';

    ytDlp.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    ytDlp.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    ytDlp.on('error', (err) => {
      reject(new Error(`Failed to start yt-dlp: ${err.message}`));
    });

    ytDlp.on('close', (code) => {
      if (code !== 0) {
        const cleanStderr = stderrData.replace(/WARNING:.*\n?/g, '').trim();
        reject(new Error(cleanStderr || stderrData.trim() || `yt-dlp exited with code ${code}`));
        return;
      }

      try {
        const info = JSON.parse(stdoutData);
        resolve(info);
      } catch (e) {
        reject(new Error('Failed to parse video info JSON from yt-dlp'));
      }
    });
  });
}

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Valid URL is required' });
  }

  const cleanUrl = url.trim();
  const urlsToTry = getExtractionUrls(cleanUrl);

  let info = null;
  let resolvedUrl = cleanUrl;
  let lastError = null;

  for (const candidateUrl of urlsToTry) {
    try {
      info = await runYtDlpDump(candidateUrl);
      resolvedUrl = candidateUrl;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`Extraction attempt failed for ${candidateUrl}: ${err.message}. Trying fallback...`);
    }
  }

  if (!info) {
    console.error('All extraction attempts failed for URL:', cleanUrl, lastError);
    return res.status(500).json({
      error: 'Failed to fetch video info',
      details: lastError ? lastError.message : 'yt-dlp exited with an error code.'
    });
  }

  try {
    // Check if URL or metadata denotes 18+ content
    const isAdultUrl = ADULT_DOMAINS.test(cleanUrl) || ADULT_DOMAINS.test(resolvedUrl);
    const isAdultByMeta = Boolean(
      (info.age_limit && info.age_limit >= 18) ||
      (Array.isArray(info.categories) && info.categories.some(c => /adult|porn|nsfw|erotic|18\+/i.test(c))) ||
      (Array.isArray(info.tags) && info.tags.some(t => /porn|nsfw|18\+|hentai|sex|adult/i.test(t))) ||
      (info.extractor && ADULT_DOMAINS.test(info.extractor)) ||
      (info.webpage_url && ADULT_DOMAINS.test(info.webpage_url))
    );
    const isAdult = isAdultUrl || isAdultByMeta;

      const parseItem = (item, index) => {
        const rawFormats = item.formats || [];
        // Include formats that have video or are playable/downloadable streams
        let formats = rawFormats.filter(f => 
          (f.ext === 'mp4' || f.ext === 'webm' || f.ext === 'm3u8' || f.protocol?.includes('m3u8') || f.protocol?.includes('http')) && 
          (f.vcodec !== 'none' || !f.vcodec) &&
          f.resolution !== 'audio only'
        );

        // Fallback: if formats filtered out everything, keep all non-audio-only streams
        if (formats.length === 0 && rawFormats.length > 0) {
          formats = rawFormats.filter(f => f.resolution !== 'audio only' && f.vcodec !== 'none');
        }
        if (formats.length === 0 && rawFormats.length > 0) {
          formats = rawFormats;
        }

        // Extract best available thumbnail
        let thumb = item.thumbnail || null;
        if (!thumb && Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
          thumb = item.thumbnails[item.thumbnails.length - 1].url;
        }

        // Deduplicate formats by resolution label to keep UI clean and sorted by height/bitrate
        const seenResolutions = new Set();
        const mappedFormats = formats
          .map(f => {
            const resLabel = f.resolution || (f.height ? `${f.height}p` : (f.width && f.height ? `${f.width}x${f.height}` : (f.format_note || 'Standard')));
            const height = f.height || parseInt(resLabel) || 0;
            return {
              format_id: f.format_id,
              ext: f.ext === 'm3u8' ? 'mp4' : (f.ext || 'mp4'),
              resolution: resLabel,
              height,
              fps: f.fps || null,
              filesize: f.filesize || f.filesize_approx || null,
              format_note: f.format_note || '',
              vcodec: f.vcodec !== 'none',
              acodec: f.acodec !== 'none'
            };
          })
          .sort((a, b) => {
            if (b.height !== a.height) return b.height - a.height;
            return (b.filesize || 0) - (a.filesize || 0);
          })
          .filter(f => {
            if (seenResolutions.has(f.resolution)) return false;
            seenResolutions.add(f.resolution);
            return true;
          });

        return {
          id: item.id || String(index + 1),
          itemIndex: index + 1, // 1-based index for --playlist-items
          title: item.title || `Video ${index + 1}`,
          thumbnail: thumb,
          duration: item.duration || 0,
          isAdult,
          formats: mappedFormats
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
        isAdult,
        resolvedUrl,
        items
      });
    } catch (e) {
      console.error('JSON Parse error:', e);
      res.status(500).json({ error: 'Failed to parse video info' });
    }
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

  // Resolve download URL to avoid 410 blocks on cloud servers (e.g. Render/AWS)
  let downloadTargetUrl = String(url).trim();
  if (/pornhub\.(com|org)/i.test(downloadTargetUrl)) {
    const phMatch = downloadTargetUrl.match(/(?:viewkey=|embed\/|video\/)([\da-z]+)/i);
    if (phMatch) {
      downloadTargetUrl = `https://www.thumbzilla.com/video/${phMatch[1]}`;
    }
  }

  let ytArgs = [
    '--no-warnings', 
    '--no-update', 
    '--geo-bypass',
    '--no-check-certificates',
    '--socket-timeout', '60'
  ];
  
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
      downloadTargetUrl
    );
  } else {
    // Priority:
    // 1. `${formatId}+bestaudio` (if video-only format)
    // 2. `${formatId}` (if already contains audio, common on adult & mobile sites)
    // 3. Fallback to `bestvideo+bestaudio/best`
    const formatSelection = formatId 
      ? `${formatId}+bestaudio/${formatId}/bestvideo+bestaudio/best` 
      : 'bestvideo+bestaudio/best';
    ytArgs.push(
      '-f', formatSelection,
      '--merge-output-format', 'mp4',
      '-o', outputPath,
      downloadTargetUrl
    );
  }

  const ytDlp = spawn('yt-dlp', ytArgs, { env: process.env });

  ytDlp.on('error', (err) => {
    console.error('yt-dlp download spawn error:', err);
    sendEvent('error', { error: `Failed to launch download: ${err.message}` });
    res.end();
  });

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

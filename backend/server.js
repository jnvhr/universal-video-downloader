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

// Cache for adult direct extraction to prevent redundant network fetches
const extractionCache = new Map();

function getCachedExtraction(key) {
  const cached = extractionCache.get(key);
  if (cached && (Date.now() - cached.timestamp < 15 * 60 * 1000)) {
    return cached.data;
  }
  return null;
}

function setCachedExtraction(key, data) {
  extractionCache.set(key, { timestamp: Date.now(), data });
  if (extractionCache.size > 200) {
    const oldestKey = extractionCache.keys().next().value;
    extractionCache.delete(oldestKey);
  }
}

// Extract viewkey from any adult URL variant (pornhub.com, pornhub.net, pornhub.org, thumbzilla.com, embed links, etc.)
function extractPornhubViewkey(url) {
  if (!url || typeof url !== 'string') return null;
  const phMatch = url.match(/(?:pornhub\.(?:com|net|org|premium\.com).*?(?:viewkey=|embed\/|video\/)([\da-z]+)|thumbzilla\.com\/video\/([\da-z]+)|(?:^|[\W_])viewkey=([\da-z]+))/i);
  return phMatch ? (phMatch[1] || phMatch[2] || phMatch[3]) : null;
}

// Direct Pornhub embed extractor that bypasses 410 Gone datacenter/cloud blocks
async function extractPornhubDirect(viewkey) {
  const cached = getCachedExtraction(viewkey);
  if (cached) return cached;

  const embedUrl = `https://www.pornhub.com/embed/${viewkey}`;
  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  if (!response.ok) {
    throw new Error(`Pornhub embed returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const prefix = 'var flashvars = ';
  const idx = html.indexOf(prefix);
  if (idx === -1) {
    throw new Error('Flashvars not found in embed page');
  }

  const start = idx + prefix.length;
  let depth = 0;
  let inStr = false;
  let escape = false;
  let end = start;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (!inStr) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
  }

  const flashvars = JSON.parse(html.slice(start, end));
  if (flashvars.video_unavailable === 'true') {
    throw new Error('This video is unavailable or has been removed.');
  }

  const rawDefinitions = flashvars.mediaDefinitions || [];
  let formats = [];

  for (const item of rawDefinitions) {
    if (item.remote && item.videoUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const rRes = await fetch(item.videoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': embedUrl
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (rRes.ok) {
          const rItems = await rRes.json();
          for (const m of rItems) {
            if (m.videoUrl) {
              const h = parseInt(m.quality) || m.height || 480;
              formats.push({
                format_id: `mp4-${h}p`,
                streamUrl: m.videoUrl,
                ext: 'mp4',
                resolution: `${h}p`,
                height: h,
                format_note: 'Direct MP4',
                vcodec: true,
                acodec: true
              });
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch remote media definition:', e.message);
      }
    } else if (item.videoUrl) {
      const h = parseInt(item.quality) || item.height || 480;
      const isHls = item.format === 'hls' || item.videoUrl.includes('.m3u8');
      formats.push({
        format_id: isHls ? `hls-${h}p` : `direct-${h}p`,
        streamUrl: item.videoUrl,
        ext: 'mp4',
        resolution: `${h}p`,
        height: h,
        format_note: isHls ? 'HLS Master Stream' : 'Direct Stream',
        vcodec: true,
        acodec: true
      });
    }
  }

  // Deduplicate and sort formats by height descending
  const seen = new Set();
  formats = formats.filter(f => {
    const key = `${f.resolution}-${f.ext}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.height - a.height);

  const result = {
    id: viewkey,
    title: flashvars.video_title || 'Pornhub Video',
    thumbnail: flashvars.image_url || null,
    duration: parseInt(flashvars.video_duration) || 0,
    isAdult: true,
    formats
  };

  setCachedExtraction(viewkey, result);
  return result;
}

// Regular expression matching known adult / 18+ domains
const ADULT_DOMAINS = /pornhub|xvideos|xnxx|redtube|youporn|xhamster|spankbang|chaturbate|stripchat|onlyfans|fansly|rule34|e-hentai|nhentai|hentaihaven|brazzers|eporner|hqporner|tube8|beeg|tnaflix|drtuber|thumbzilla/i;

// Helper to generate candidate URLs for adult platforms with regional/datacenter 410 blocks
function getExtractionUrls(targetUrl) {
  const urls = [targetUrl];
  if (/pornhub\.(com|org)/i.test(targetUrl)) {
    const phMatch = targetUrl.match(/(?:viewkey=|embed\/|video\/)([\da-z]+)/i);
    if (phMatch) {
      const viewkey = phMatch[1];
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
  const phViewkey = extractPornhubViewkey(cleanUrl);

  // 1. If it is a Pornhub URL, try direct embed extraction first to bypass 410 Gone datacenter restrictions
  if (phViewkey) {
    try {
      console.log(`Attempting direct embed extraction for viewkey: ${phViewkey}...`);
      const directData = await extractPornhubDirect(phViewkey);
      if (directData && directData.formats && directData.formats.length > 0) {
        return res.json({
          id: directData.id,
          title: directData.title,
          isMultiple: false,
          count: 1,
          isAdult: true,
          resolvedUrl: cleanUrl,
          items: [{
            id: directData.id,
            itemIndex: 1,
            title: directData.title,
            thumbnail: directData.thumbnail,
            duration: directData.duration,
            isAdult: true,
            formats: directData.formats
          }]
        });
      }
    } catch (directErr) {
      console.warn(`Direct embed extraction failed for ${phViewkey}: ${directErr.message}. Falling back to yt-dlp...`);
    }
  }

  // 2. Standard extraction via yt-dlp (for YouTube, Vimeo, Twitter, Spankbang, XVideos, etc.)
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


app.get('/api/download', async (req, res) => {
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

  let downloadTargetUrl = String(url).trim();
  let isDirectCdnStream = false;

  // If it is a PornHub or adult mirror URL, resolve to direct CDN stream to bypass datacenter 410 blocks
  const phViewkey = extractPornhubViewkey(downloadTargetUrl);
  if (phViewkey) {
    try {
      const directData = await extractPornhubDirect(phViewkey);
      if (directData && directData.formats && directData.formats.length > 0) {
        const chosen = directData.formats.find(f => f.format_id === formatId) || directData.formats[0];
        if (chosen && chosen.streamUrl) {
          downloadTargetUrl = chosen.streamUrl;
          isDirectCdnStream = true;
        }
      }
    } catch (e) {
      console.warn('Failed to resolve direct CDN stream for download, falling back:', e.message);
    }
  }

  let ytArgs = [
    '--no-warnings', 
    '--no-update', 
    '--geo-bypass',
    '--no-check-certificates',
    '--socket-timeout', '60'
  ];

  if (isDirectCdnStream) {
    // Provide referer so phncdn CDN serves video segments without 403/404
    ytArgs.push('--referer', 'https://www.pornhub.com/');
  }
  
  if (itemIndex && !isDirectCdnStream) {
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
    if (isDirectCdnStream) {
      ytArgs.push(
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

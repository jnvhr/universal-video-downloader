import { useState } from 'react';
import { Download, Music, Video, ChevronDown, Check, Layers, Film, X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number | null;
  filesize: number | null;
  format_note: string;
  vcodec: boolean;
  acodec: boolean;
}

export interface VideoItem {
  id: string;
  itemIndex: number;
  title: string;
  thumbnail: string | null;
  duration: number;
  formats: VideoFormat[];
}

export interface VideoInfoResponse {
  id: string;
  title: string;
  isMultiple: boolean;
  count: number;
  items: VideoItem[];
  originalUrl: string;
}

interface VideoItemCardProps {
  item: VideoItem;
  originalUrl: string;
  isSingle: boolean;
  onDownload: (url: string, formatId: string | null, audioOnly: boolean, title: string, itemIndex?: number | null) => void;
}

function VideoItemCard({ item, originalUrl, isSingle, onDownload }: VideoItemCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('best');
  const [audioOnly, setAudioOnly] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const availableFormats = (item.formats || [])
    .filter(f => f.resolution && f.resolution !== 'audio only')
    .slice(0, 10);

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return 'Auto size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleDownload = () => {
    onDownload(
      originalUrl,
      selectedFormat === 'best' ? null : selectedFormat,
      audioOnly,
      item.title,
      isSingle ? null : item.itemIndex
    );
  };

  return (
    <div className="bg-[#111726]/85 backdrop-blur-2xl rounded-2xl p-5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.7)] border border-white/10 hover:border-sky-500/30 transition-all duration-300">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Thumbnail with Neon Cyan Border */}
        <div className="w-full sm:w-44 aspect-video sm:aspect-[16/10] overflow-hidden rounded-xl bg-[#090d16] border border-white/10 relative shrink-0">
          {item.thumbnail ? (
            <img 
              src={item.thumbnail} 
              alt={item.title} 
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <Film className="w-8 h-8 opacity-40" />
            </div>
          )}

          {item.duration > 0 && (
            <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-sky-400 font-mono text-[11px] font-medium px-1.5 py-0.5 rounded-md border border-white/10">
              {formatDuration(item.duration)}
            </span>
          )}

          {!isSingle && (
            <span className="absolute top-2 left-2 bg-rose-500/80 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(244,63,94,0.4)]">
              #{item.itemIndex}
            </span>
          )}
        </div>

        {/* Info & Options */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-[16px] font-bold text-white leading-snug line-clamp-2" title={item.title}>
                {item.title}
              </h4>
            </div>
            {!isSingle && (
              <p className="text-xs text-sky-400/80 mt-1 font-mono font-medium">
                Video #{item.itemIndex} {item.duration ? `• ${formatDuration(item.duration)}` : ''}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {/* Type Selector (Video / Audio) */}
            <div className="flex p-0.5 bg-[#090d16]/90 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setAudioOnly(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  !audioOnly ? "bg-white/10 text-white shadow-sm border border-white/15" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Video className="w-3.5 h-3.5 text-sky-400" />
                Video
              </button>
              <button
                type="button"
                onClick={() => setAudioOnly(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  audioOnly ? "bg-white/10 text-white shadow-sm border border-white/15" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Music className="w-3.5 h-3.5 text-rose-400" />
                Audio (MP3)
              </button>
            </div>

            {/* Quality Selector (if video) */}
            {!audioOnly && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#090d16]/90 border border-white/10 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 cursor-pointer"
                >
                  <span className="truncate">
                    {selectedFormat === 'best' 
                      ? 'Highest Quality (Recommended)' 
                      : (() => {
                          const f = availableFormats.find(f => f.format_id === selectedFormat);
                          return f ? `${f.resolution} • ${f.ext.toUpperCase()} • ${formatBytes(f.filesize)}` : 'Select Quality';
                        })()
                    }
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-2 shrink-0" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#111726] border border-white/15 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto py-1 backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={() => { setSelectedFormat('best'); setIsDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/10 text-slate-200 transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-white">Highest Quality (Recommended)</span>
                        {selectedFormat === 'best' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </button>
                      {availableFormats.map(f => (
                        <button
                          key={f.format_id}
                          type="button"
                          onClick={() => { setSelectedFormat(f.format_id); setIsDropdownOpen(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/10 text-slate-200 transition-colors group cursor-pointer"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-white">{f.resolution} • {f.ext.toUpperCase()}</span>
                            <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-mono">{formatBytes(f.filesize)}</span>
                          </div>
                          {selectedFormat === f.format_id && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download {audioOnly ? 'Audio (MP3)' : (isSingle ? 'Video' : `Video #${item.itemIndex}`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VideoInfoCardProps {
  info: VideoInfoResponse;
  onDownload: (url: string, formatId: string | null, audioOnly: boolean, title: string, itemIndex?: number | null) => void;
  onDismiss: () => void;
}

export function VideoInfoCard({ info, onDownload, onDismiss }: VideoInfoCardProps) {
  const isMultiple = info.items && info.items.length > 1;

  const handleDownloadAll = () => {
    info.items.forEach(item => {
      onDownload(info.originalUrl, null, false, item.title, item.itemIndex);
    });
    onDismiss();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Top Banner when multiple videos exist */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          {isMultiple ? (
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold px-3 py-1 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <Layers className="w-3.5 h-3.5" />
              Found {info.items.length} videos in this post
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Video detected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isMultiple && (
            <button
              type="button"
              onClick={handleDownloadAll}
              className="text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(244,63,94,0.35)] cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Download All ({info.items.length})
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-slate-400 hover:text-white bg-[#111726] hover:bg-white/10 border border-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-4">
        {info.items.map(item => (
          <VideoItemCard
            key={item.id || item.itemIndex}
            item={item}
            originalUrl={info.originalUrl}
            isSingle={!isMultiple}
            onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  );
}

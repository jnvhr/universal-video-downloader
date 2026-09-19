import { useState } from 'react';
import { Download, Music, Video, ChevronDown, Check } from 'lucide-react';
import { cn } from '../utils/cn';

interface Format {
  format_id: string;
  ext: string;
  resolution: string;
  fps: number | null;
  filesize: number | null;
  format_note: string;
  vcodec: boolean;
  acodec: boolean;
}

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  formats: Format[];
  originalUrl: string;
}

interface VideoInfoCardProps {
  info: VideoInfo;
  onDownload: (url: string, formatId: string | null, audioOnly: boolean, title: string) => void;
  onDismiss: () => void;
}

export function VideoInfoCard({ info, onDownload, onDismiss }: VideoInfoCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('best');
  const [audioOnly, setAudioOnly] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter out formats that are too small or not useful for typical users
  const availableFormats = info.formats.filter(f => f.resolution && f.resolution !== 'audio only').slice(0, 10);

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    onDownload(info.originalUrl, selectedFormat === 'best' ? null : selectedFormat, audioOnly, info.title);
    onDismiss();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 bg-mac-panel rounded-2xl p-4 shadow-mac border border-mac-border animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Thumbnail */}
        <div className="w-full sm:w-1/3 aspect-video sm:aspect-square overflow-hidden rounded-xl bg-mac-border relative shrink-0">
          <img 
            src={info.thumbnail} 
            alt={info.title} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info & Actions */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-[17px] font-semibold text-mac-text leading-tight line-clamp-2" title={info.title}>
              {info.title}
            </h3>
            <p className="text-sm text-mac-text-muted mt-1">
              {Math.floor(info.duration / 60)}:{String(info.duration % 60).padStart(2, '0')}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {/* Type Selector (Video / Audio) */}
            <div className="flex p-1 bg-mac-bg rounded-lg">
              <button
                onClick={() => setAudioOnly(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors",
                  !audioOnly ? "bg-white shadow-sm text-mac-text" : "text-mac-text-muted hover:text-mac-text"
                )}
              >
                <Video className="w-4 h-4" />
                Video
              </button>
              <button
                onClick={() => setAudioOnly(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors",
                  audioOnly ? "bg-white shadow-sm text-mac-text" : "text-mac-text-muted hover:text-mac-text"
                )}
              >
                <Music className="w-4 h-4" />
                Audio (MP3)
              </button>
            </div>

            {/* Quality Selector (if video) */}
            {!audioOnly && (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-mac-bg border border-mac-border rounded-lg text-sm text-mac-text focus:outline-none focus:ring-2 focus:ring-mac-accent/20"
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
                  <ChevronDown className="w-4 h-4 text-mac-text-muted ml-2 shrink-0" />
                </button>

                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-mac-border rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto py-1">
                      <button
                        onClick={() => { setSelectedFormat('best'); setIsDropdownOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-mac-accent hover:text-white transition-colors"
                      >
                        Highest Quality (Recommended)
                        {selectedFormat === 'best' && <Check className="w-4 h-4" />}
                      </button>
                      {availableFormats.map(f => (
                        <button
                          key={f.format_id}
                          onClick={() => { setSelectedFormat(f.format_id); setIsDropdownOpen(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-mac-accent hover:text-white transition-colors group"
                        >
                          <div className="flex flex-col items-start">
                            <span>{f.resolution} • {f.ext.toUpperCase()}</span>
                            <span className="text-xs text-mac-text-muted group-hover:text-white/70">{formatBytes(f.filesize)}</span>
                          </div>
                          {selectedFormat === f.format_id && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Download Action */}
            <div className="flex gap-2">
              <button
                onClick={onDismiss}
                className="px-4 py-2.5 text-sm font-medium text-mac-text-muted hover:text-mac-text bg-mac-bg hover:bg-mac-border/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-mac-accent hover:bg-mac-accent-hover text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Download {audioOnly ? 'Audio' : 'Video'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

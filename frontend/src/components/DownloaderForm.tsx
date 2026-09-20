import { useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, Link, AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '../utils/cn';
import { DiscretionModal } from './DiscretionModal';

const ADULT_DOMAINS = /pornhub|xvideos|xnxx|redtube|youporn|xhamster|spankbang|chaturbate|stripchat|onlyfans|fansly|rule34|e-hentai|nhentai|hentaihaven|brazzers|eporner|hqporner|tube8|beeg|tnaflix|drtuber|thumbzilla/i;

interface DownloaderFormProps {
  onInfoFetched: (info: any) => void;
}

export function DownloaderForm({ onInfoFetched }: DownloaderFormProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDiscretionModalOpen, setIsDiscretionModalOpen] = useState(false);
  const [pendingFetchedData, setPendingFetchedData] = useState<any | null>(null);

  const isCurrentUrlAdult = ADULT_DOMAINS.test(url);

  const executeFetch = async (targetUrl: string) => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let message = 'Failed to fetch video info';
        if (errorData.details && errorData.error) {
          message = `${errorData.error}: ${errorData.details}`;
        } else if (errorData.details || errorData.error) {
          message = errorData.details || errorData.error;
        } else if (res.status === 500 || res.status === 504 || res.status === 502) {
          message = `Backend connection failed (${res.status}). Make sure the backend server is running on port 3001.`;
        } else {
          message = `Server returned status ${res.status}`;
        }
        throw new Error(message);
      }

      const data = await res.json();
      const enrichedData = { ...data, originalUrl: targetUrl };

      // If backend detected 18+ content and user hasn't seen modal yet
      if (enrichedData.isAdult && !isCurrentUrlAdult) {
        setPendingFetchedData(enrichedData);
        setIsDiscretionModalOpen(true);
      } else {
        onInfoFetched(enrichedData);
        setUrl('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (isCurrentUrlAdult) {
      // Prompt viewer discretion before fetching
      setIsDiscretionModalOpen(true);
      return;
    }

    await executeFetch(url.trim());
  };

  const handleConfirmDiscretion = () => {
    setIsDiscretionModalOpen(false);
    if (pendingFetchedData) {
      onInfoFetched(pendingFetchedData);
      setPendingFetchedData(null);
      setUrl('');
    } else {
      executeFetch(url.trim());
    }
  };

  const handleCancelDiscretion = () => {
    setIsDiscretionModalOpen(false);
    setPendingFetchedData(null);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <DiscretionModal
        isOpen={isDiscretionModalOpen}
        url={url}
        onConfirm={handleConfirmDiscretion}
        onCancel={handleCancelDiscretion}
      />

      <form onSubmit={handleSubmit} className="relative group flex items-center">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
          <Link className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-sky-400 transition-colors duration-300" />
        </div>
        
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste video or media link here..."
          className={cn(
            "w-full pl-[3.25rem] pr-16 py-4 rounded-[20px] bg-[#111726]/80 backdrop-blur-xl border text-white placeholder:text-slate-500 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 text-[16px] leading-relaxed outline-none",
            isCurrentUrlAdult
              ? "border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.25)] focus:border-rose-400 focus:shadow-[0_0_35px_rgba(244,63,94,0.35)]"
              : "border-white/10 hover:border-white/20 focus:border-sky-500/50 focus:shadow-[0_0_30px_rgba(56,189,248,0.25)]"
          )}
          required
        />
        
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={cn(
            "absolute right-2 px-3.5 py-2.5 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer",
            url.trim() && !isLoading
              ? "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.45)] active:scale-[0.97]"
              : "bg-white/5 text-slate-600 cursor-not-allowed border border-white/5"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* 18+ Live Detection Indicator */}
      {isCurrentUrlAdult && (
        <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs font-medium animate-in fade-in slide-in-from-top-1">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
          <span>🔞 18+ Platform detected • Viewer discretion & personal demo test notice will be requested</span>
        </div>
      )}

      {error && (
        <div className="mt-4 px-4 py-3 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-rose-400 text-sm font-medium flex-1">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

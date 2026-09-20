import { useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, Link } from 'lucide-react';
import { cn } from '../utils/cn';

interface DownloaderFormProps {
  onInfoFetched: (info: any) => void;
}

export function DownloaderForm({ onInfoFetched }: DownloaderFormProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        throw new Error('Failed to fetch video info');
      }

      const data = await res.json();
      onInfoFetched({ ...data, originalUrl: url });
      setUrl('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group flex items-center">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Link className="h-[18px] w-[18px] text-mac-text-muted group-focus-within:text-mac-accent transition-colors duration-300" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a video URL (YouTube, Vimeo, X, etc.)"
          className="w-full pl-[3.25rem] pr-16 py-4 rounded-[20px] bg-white border border-mac-border/60 shadow-mac-sm hover:shadow-mac focus:shadow-mac focus:border-mac-accent/30 transition-all duration-300 text-[16px] leading-relaxed text-mac-text placeholder:text-mac-text-muted/70"
          required
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={cn(
            "absolute right-2 px-3.5 py-2.5 rounded-xl flex items-center justify-center transition-all duration-300",
            url.trim() && !isLoading
              ? "bg-mac-accent text-white hover:bg-mac-accent-hover shadow-sm active:scale-[0.97]"
              : "bg-mac-bg text-mac-text-muted/50 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-mac-accent" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </form>
      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="text-red-500 text-sm mt-0.5 font-medium flex-1">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

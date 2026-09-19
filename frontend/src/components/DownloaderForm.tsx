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
      const res = await fetch('http://localhost:3001/api/info', {
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
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Link className="h-5 w-5 text-mac-text-muted group-focus-within:text-mac-accent transition-colors" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a video URL (YouTube, Vimeo, etc.)"
          className="w-full pl-12 pr-14 py-4 rounded-2xl bg-mac-panel border border-mac-border shadow-sm focus:shadow-mac focus:border-mac-accent/30 transition-all duration-300 text-[15px]"
          required
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className={cn(
            "absolute inset-y-1.5 right-1.5 px-3 rounded-xl flex items-center justify-center transition-all duration-300",
            url.trim() && !isLoading
              ? "bg-mac-accent text-white hover:bg-mac-accent-hover shadow-sm"
              : "bg-mac-border text-mac-text-muted"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-2">
          {error}
        </p>
      )}
    </div>
  );
}

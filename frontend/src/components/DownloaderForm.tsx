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
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
          <Link className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-sky-400 transition-colors duration-300" />
        </div>
        
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste URL (X / Twitter, YouTube, Vimeo, etc.)"
          className="w-full pl-[3.25rem] pr-16 py-4 rounded-[20px] bg-[#111726]/80 backdrop-blur-xl border border-white/10 text-white placeholder:text-slate-500 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.6)] hover:border-white/20 focus:border-sky-500/50 focus:shadow-[0_0_30px_rgba(56,189,248,0.25)] transition-all duration-300 text-[16px] leading-relaxed outline-none"
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

      {error && (
        <div className="mt-4 px-4 py-3 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="text-rose-400 text-sm font-medium flex-1">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

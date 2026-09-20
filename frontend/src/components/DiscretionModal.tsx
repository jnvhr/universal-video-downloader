import { AlertTriangle, ShieldCheck, X, Flame } from 'lucide-react';

interface DiscretionModalProps {
  isOpen: boolean;
  url?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DiscretionModal({ isOpen, url, onConfirm, onCancel }: DiscretionModalProps) {
  if (!isOpen) return null;

  // Extract clean hostname for context display
  let hostname = '';
  try {
    if (url) {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      hostname = parsed.hostname.replace('www.', '');
    }
  } catch {
    hostname = '18+ Platform';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Outer Card with Tokyo Midnight Cyber-Glass Aesthetics */}
      <div 
        className="relative w-full max-w-lg bg-[#0d1322]/95 border border-rose-500/30 rounded-2xl p-6 sm:p-7 shadow-[0_0_50px_rgba(244,63,94,0.25)] backdrop-blur-2xl text-white overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discretion-title"
      >
        {/* Ambient Neon Glows */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <Flame className="w-6 h-6 text-rose-400" />
          </div>

          <div className="flex-1 pr-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-bold tracking-wider uppercase mb-1.5">
              <span>🔞 18+ Content</span>
              {hostname && <span>• {hostname}</span>}
            </div>
            <h3 id="discretion-title" className="text-xl font-extrabold text-white tracking-tight">
              Viewer Discretion Advised
            </h3>
          </div>
        </div>

        {/* Notice & Personal Demo Statement */}
        <div className="mt-5 space-y-3.5">
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-200/90 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-300">Adult Media Classification:</span> You are requesting content from an adult platform. This content may contain explicit mature themes intended exclusively for consenting adults.
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-950/25 border border-sky-500/20 text-slate-300 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-sky-300">Personal Demo & Test Notice:</span> This functionality is provided exclusively for personal evaluation, test, and demo purposes. By proceeding, you confirm that:
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300 text-xs">
                <li>You are at least 18 years of age (or legal age of majority).</li>
                <li>You acknowledge viewer discretion and agree to personal testing use.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 font-medium transition cursor-pointer text-xs sm:text-sm text-center"
          >
            Cancel & Dismiss
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold shadow-[0_0_20px_rgba(244,63,94,0.45)] active:scale-[0.98] transition cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Flame className="w-4 h-4" />
            Acknowledge & Proceed (Demo Test)
          </button>
        </div>
      </div>
    </div>
  );
}

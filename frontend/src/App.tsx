import { useState } from 'react';
import { DownloadCloud, Sparkles } from 'lucide-react';
import { DownloaderForm } from './components/DownloaderForm';
import { VideoInfoCard } from './components/VideoInfoCard';
import { ProgressList, type DownloadTask } from './components/ProgressList';

function App() {
  const [videoInfo, setVideoInfo] = useState<any | null>(null);
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);

  const handleInfoFetched = (info: any) => {
    setVideoInfo(info);
  };

  const handleDownload = (url: string, formatId: string | null, audioOnly: boolean, title: string, itemIndex?: number | null) => {
    const newTask: DownloadTask = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      url,
      title,
      formatId,
      audioOnly,
      itemIndex
    };
    
    setDownloads(prev => [newTask, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f8fafc] flex flex-col font-sans relative overflow-x-hidden selection:bg-rose-500/30 selection:text-white">
      {/* Ambient Neon Atmosphere */}
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] bg-gradient-to-br from-rose-500/10 via-purple-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed top-[15%] right-[15%] w-[450px] h-[450px] bg-gradient-to-bl from-sky-500/10 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
          {/* Logo Badge */}
          <div className="inline-flex items-center justify-center p-0.5 rounded-2xl bg-gradient-to-br from-rose-500 via-purple-500 to-sky-400 shadow-[0_0_30px_rgba(244,63,94,0.25)] mb-6">
            <div className="w-14 h-14 rounded-[14px] bg-[#0d121f] flex items-center justify-center">
              <DownloadCloud className="w-7 h-7 text-rose-400" />
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-rose-500/10 border border-rose-500/25 text-rose-400">
              <Sparkles className="w-3 h-3" />
              Tokyo Midnight
            </span>
          </div>

          <h1 className="text-[40px] sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            Universal Downloader
          </h1>
          <p className="text-[15px] sm:text-[17px] text-slate-400 max-w-lg mx-auto leading-relaxed">
            High-speed video & audio extraction from thousands of platforms with crystal precision.
          </p>
        </div>

        {/* Main Input Form */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 ease-out fill-mode-both">
          <DownloaderForm onInfoFetched={handleInfoFetched} />
        </div>

        {/* Video Info Modal/Card */}
        <div className="mt-8">
          {videoInfo && (
            <VideoInfoCard 
              info={videoInfo} 
              onDownload={handleDownload}
              onDismiss={() => setVideoInfo(null)}
            />
          )}
        </div>

        {/* Progress List */}
        <div className="mt-8">
          <ProgressList tasks={downloads} />
        </div>

      </main>
      
      {/* Footer / Branding */}
      <footer className="py-8 text-center text-xs text-slate-500 font-medium relative z-10">
        <p className="inline-flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <span>Powered by <span className="text-slate-300 font-mono">yt-dlp</span></span>
          <span className="opacity-30">•</span>
          <span>Engineered by <a href="https://github.com/jnvhr?tab=repositories" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 transition-colors font-medium">Jnvhr</a></span>
          <span className="opacity-30">•</span>
          <span>© {new Date().getFullYear()}</span>
        </p>
      </footer>
    </div>
  );
}

export default App;

import { useState } from 'react';
import { DownloadCloud } from 'lucide-react';
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
    <div className="min-h-screen bg-mac-bg flex flex-col font-sans">
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        
        {/* Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-mac-sm border border-mac-border/50 mb-6">
            <DownloadCloud className="w-6 h-6 text-mac-accent" />
          </div>
          <h1 className="text-[40px] sm:text-5xl font-bold tracking-tight text-mac-text mb-4">
            Universal Downloader
          </h1>
          <p className="text-[15px] sm:text-[17px] text-mac-text-muted max-w-lg mx-auto leading-relaxed">
            Download videos and audio from thousands of sites. Paste a link below to get started.
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
      <footer className="py-8 text-center text-xs text-mac-text-muted font-medium">
        <p className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
          Powered by yt-dlp <span className="opacity-40">•</span> Built by 
          <a href="https://github.com/jnvhr?tab=repositories" target="_blank" rel="noopener noreferrer" className="text-mac-text hover:text-mac-accent transition-colors underline decoration-mac-border underline-offset-4">Jnvhr</a> 
          <span className="opacity-40">•</span> © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export default App;

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

  const handleDownload = (url: string, formatId: string | null, audioOnly: boolean, title: string) => {
    const newTask: DownloadTask = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      url,
      title,
      formatId,
      audioOnly
    };
    
    setDownloads(prev => [newTask, ...prev]);
  };

  return (
    <div className="min-h-screen bg-mac-bg py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-mac-panel shadow-sm border border-mac-border mb-6">
            <DownloadCloud className="w-8 h-8 text-mac-accent" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-mac-text mb-3">
            Universal Downloader
          </h1>
          <p className="text-[15px] text-mac-text-muted max-w-md mx-auto leading-relaxed">
            Download videos and audio from thousands of sites. Paste a link below to get started.
          </p>
        </div>

        {/* Main Input Form */}
        <DownloaderForm onInfoFetched={handleInfoFetched} />

        {/* Video Info Modal/Card */}
        {videoInfo && (
          <VideoInfoCard 
            info={videoInfo} 
            onDownload={handleDownload}
            onDismiss={() => setVideoInfo(null)}
          />
        )}

        {/* Progress List */}
        <ProgressList tasks={downloads} />

      </div>
      
      {/* Footer / Branding */}
      <div className="fixed bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-mac-text-muted/60 font-medium">
          Powered by yt-dlp · Built by <a href="https://github.com/jnvhr?tab=repositories" target="_blank" rel="noopener noreferrer" className="no-underline text-mac-text-muted/60 hover:text-mac-accent transition-colors">Jnvhr</a> · © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default App;

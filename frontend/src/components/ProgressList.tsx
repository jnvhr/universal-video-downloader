import { useEffect, useState } from 'react';
import { Film, Music, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  formatId: string | null;
  audioOnly: boolean;
  itemIndex?: number | null;
}

interface ProgressItemProps {
  task: DownloadTask;
}

function ProgressItem({ task }: ProgressItemProps) {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('');
  const [eta, setEta] = useState('');
  const [status, setStatus] = useState<'starting' | 'downloading' | 'completed' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Construct URL for SSE
    const query = new URLSearchParams();
    query.append('url', task.url);
    query.append('taskId', task.id);
    if (task.itemIndex !== undefined && task.itemIndex !== null) {
      query.append('itemIndex', String(task.itemIndex));
    }
    if (task.formatId) query.append('formatId', task.formatId);
    if (task.audioOnly) query.append('audioOnly', 'true');

    const sseUrl = `/api/download?${query.toString()}`;
    const source = new EventSource(sseUrl);

    source.addEventListener('progress', (e) => {
      setStatus('downloading');
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data.percent) setProgress(data.percent);
        if (data.speed) setSpeed(data.speed);
        if (data.eta) setEta(data.eta);
      } catch (err) {}
    });

    source.addEventListener('complete', (e) => {
      setStatus('completed');
      setProgress(100);
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data.fileId) {
          // Trigger browser download
          const downloadUrl = `/api/file/${encodeURIComponent(data.fileId)}?title=${encodeURIComponent(task.title)}`;
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = ''; // Force download
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error('Failed to parse complete event data', err);
      }
      source.close();
    });

    source.addEventListener('error', (e) => {
      if (status !== 'completed') {
        setStatus('error');
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setErrorMsg(data.error || 'Download failed');
        } catch {
          setErrorMsg('Connection error');
        }
      }
      source.close();
    });

    return () => {
      source.close();
    };
  }, [task]);

  return (
    <div className="bg-[#111726]/85 backdrop-blur-2xl rounded-[20px] p-5 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.6)] border border-white/10 flex items-center gap-5 transition-all duration-300 hover:border-sky-500/30 group">
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 border",
        status === 'completed' ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]" :
        status === 'error' ? "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]" :
        "bg-sky-500/15 text-sky-400 border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.25)] group-hover:shadow-[0_0_20px_rgba(56,189,248,0.4)]"
      )}>
        {status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
         status === 'error' ? <XCircle className="w-5 h-5" /> :
         task.audioOnly ? <Music className="w-5 h-5" /> :
         <Film className="w-5 h-5" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-[15px] font-bold text-white truncate pr-4 leading-tight" title={task.title}>
            {task.title}
            {task.itemIndex && (
              <span className="ml-2 text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-full">
                #{task.itemIndex}
              </span>
            )}
          </h4>
          <span className={cn(
            "text-[13px] font-mono font-bold whitespace-nowrap shrink-0 mt-0.5",
            status === 'completed' ? "text-emerald-400" :
            status === 'error' ? "text-rose-400" :
            status === 'starting' ? "text-slate-400" :
            "text-sky-400"
          )}>
            {status === 'completed' ? 'Done' :
             status === 'error' ? 'Failed' :
             status === 'starting' ? 'Starting...' :
             `${progress.toFixed(1)}%`}
          </span>
        </div>
        
        {/* Progress Bar with Glowing Cyber Gradient */}
        <div className="h-2 w-full bg-[#090d16] rounded-full overflow-hidden border border-white/10 relative">
          <div 
            className={cn(
              "h-full transition-all duration-300 ease-out",
              status === 'completed' ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" :
              status === 'error' ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]" :
              "bg-gradient-to-r from-sky-400 via-purple-500 to-rose-500 shadow-[0_0_15px_rgba(56,189,248,0.5)]"
            )}
            style={{ width: `${Math.max(1, progress)}%` }}
          />
        </div>

        {/* Details */}
        <div className="flex justify-between mt-2.5">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            {task.audioOnly ? 'Audio extraction (MP3)' : 'Video stream'}
          </span>
          {status === 'downloading' && (
            <span className="text-xs text-sky-400 font-mono tracking-tight">
              {speed} <span className="mx-1 text-slate-600">•</span> {eta}
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-rose-400 font-medium">
              {errorMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProgressListProps {
  tasks: DownloadTask[];
}

export function ProgressList({ tasks }: ProgressListProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        Downloads Queue
      </h3>
      <div className="flex flex-col gap-3">
        {tasks.map(task => (
          <ProgressItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

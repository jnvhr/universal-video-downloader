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
    <div className="bg-white rounded-xl p-4 shadow-sm border border-mac-border/50 flex items-center gap-4 transition-all hover:shadow-mac">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
        status === 'completed' ? "bg-green-100 text-green-600" :
        status === 'error' ? "bg-red-100 text-red-600" :
        "bg-mac-accent/10 text-mac-accent"
      )}>
        {status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
         status === 'error' ? <XCircle className="w-5 h-5" /> :
         task.audioOnly ? <Music className="w-5 h-5" /> :
         <Film className="w-5 h-5" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-end mb-1.5">
          <h4 className="text-[15px] font-medium text-mac-text truncate pr-4" title={task.title}>
            {task.title}
          </h4>
          <span className="text-xs font-medium text-mac-text-muted whitespace-nowrap shrink-0">
            {status === 'completed' ? 'Done' :
             status === 'error' ? 'Failed' :
             status === 'starting' ? 'Starting...' :
             `${progress.toFixed(1)}%`}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-mac-bg rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-300 ease-out",
              status === 'completed' ? "bg-green-500" :
              status === 'error' ? "bg-red-500" :
              "bg-mac-accent"
            )}
            style={{ width: `${Math.max(2, progress)}%` }}
          />
        </div>

        {/* Details */}
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-mac-text-muted flex items-center gap-1">
            {task.audioOnly ? 'Audio extraction' : 'Video download'}
          </span>
          {status === 'downloading' && (
            <span className="text-[11px] text-mac-text-muted font-mono">
              {speed} • {eta}
            </span>
          )}
          {status === 'error' && (
            <span className="text-[11px] text-red-500">
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
      <h3 className="text-sm font-semibold text-mac-text-muted uppercase tracking-wider mb-3 px-1">
        Downloads
      </h3>
      <div className="flex flex-col gap-3">
        {tasks.map(task => (
          <ProgressItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

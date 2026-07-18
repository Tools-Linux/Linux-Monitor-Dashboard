import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { useLiveData } from '../lib/live';
import type { LogLevel } from '../lib/data';

const levelMeta: Record<LogLevel, { cls: string; dot: string; label: string }> = {
  info: { cls: 'text-brand-300', dot: 'bg-brand-500', label: 'INFO' },
  warn: { cls: 'text-warn-400', dot: 'bg-warn-500', label: 'WARN' },
  error: { cls: 'text-err-400', dot: 'bg-err-500', label: 'ERR' },
  debug: { cls: 'text-ink-400', dot: 'bg-ink-500', label: 'DBG' },
};

type Filter = 'all' | LogLevel;

export function LogsPage() {
  const live = useLiveData();
  const [filter, setFilter] = useState<Filter>('all');
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const logs = live.logs.filter((l) => {
    if (filter !== 'all' && l.level !== filter) return false;
    if (query && !`${l.unit} ${l.message}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [live.logs, paused]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'info', 'warn', 'error', 'debug'] as Filter[]).map((f) => {
          const active = filter === f;
          const label = f === 'all' ? 'Tous' : levelMeta[f as LogLevel].label;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip ring-1 ring-inset transition ${
                active ? 'bg-ink-700 text-white ring-ink-500' : 'bg-ink-850/50 text-ink-300 ring-ink-700 hover:text-white'
              }`}
            >
              {f !== 'all' && <span className={`dot ${levelMeta[f as LogLevel].dot}`} />}
              {label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer les journaux…"
            className="input w-56 py-1.5"
          />
          <button onClick={() => setPaused((p) => !p)} className="btn btn-ghost" title={paused ? 'Reprendre' : 'Pause'}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
            {paused ? 'Live' : 'Pause'}
          </button>
          <button className="btn btn-ghost" title="Effacer"><Trash2 size={15} /></button>
        </div>
      </div>

      <div ref={scrollRef} className="card overflow-hidden" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <div className="border-b border-ink-700/60 px-4 py-2.5 text-xs text-ink-400">
          {logs.length} entrées · {paused ? 'flux en pause' : 'flux en direct'}
        </div>
        <div className="divide-y divide-ink-800/40 font-mono text-xs">
          {logs.map((l) => {
            const m = levelMeta[l.level];
            return (
              <div key={l.id} className="flex items-start gap-3 px-4 py-2.5 table-row-hover">
                <span className="shrink-0 text-ink-500">{l.time}</span>
                <span className={`shrink-0 ${m.cls}`}>
                  <span className={`dot ${m.dot} mr-1.5 align-middle`} />
                  {m.label}
                </span>
                <span className="shrink-0 text-ink-400">{l.unit}</span>
                <span className="text-ink-100">{l.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

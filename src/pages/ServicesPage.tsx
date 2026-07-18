import { useState } from 'react';
import { Pause, Play, RotateCw, Square } from 'lucide-react';
import { useLiveData } from '../lib/live';
import type { ServiceStatus } from '../lib/data';

const statusMeta: Record<ServiceStatus, { label: string; cls: string; dot: string }> = {
  running: { label: 'En marche', cls: 'bg-brand-500/10 text-brand-300 ring-brand-500/30', dot: 'bg-brand-500' },
  stopped: { label: 'Arrêté', cls: 'bg-ink-700/60 text-ink-300 ring-ink-600', dot: 'bg-ink-400' },
  failed: { label: 'Échec', cls: 'bg-err-500/10 text-err-400 ring-err-500/30', dot: 'bg-err-500' },
  degraded: { label: 'Dégradé', cls: 'bg-warn-500/10 text-warn-400 ring-warn-500/30', dot: 'bg-warn-500' },
};

type Filter = 'all' | ServiceStatus;

export function ServicesPage() {
  const live = useLiveData();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const filtered = live.services.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (query && !(`${s.name} ${s.unit} ${s.description}`.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  const counts = {
    all: live.services.length,
    running: live.services.filter((s) => s.status === 'running').length,
    stopped: live.services.filter((s) => s.status === 'stopped').length,
    failed: live.services.filter((s) => s.status === 'failed').length,
    degraded: live.services.filter((s) => s.status === 'degraded').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'running', 'degraded', 'failed', 'stopped'] as Filter[]).map((f) => {
          const active = filter === f;
          const m = f === 'all' ? null : statusMeta[f as ServiceStatus];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip ring-1 ring-inset transition ${
                active ? 'bg-ink-700 text-white ring-ink-500' : 'bg-ink-850/50 text-ink-300 ring-ink-700 hover:text-white'
              }`}
            >
              {m && <span className={`dot ${m.dot}`} />}
              {f === 'all' ? 'Tous' : m!.label}
              <span className="ml-1 rounded-full bg-ink-900/80 px-1.5 text-[10px] text-ink-400">{counts[f]}</span>
            </button>
          );
        })}
        <div className="ml-auto relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer…"
            className="input w-56 py-1.5"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/60 bg-ink-850/40 text-left text-xs uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Activé</th>
                <th className="px-4 py-3 text-right font-medium">CPU</th>
                <th className="px-4 py-3 text-right font-medium">Mémoire</th>
                <th className="px-4 py-3 font-medium">PID</th>
                <th className="px-4 py-3 font-medium">Uptime</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const m = statusMeta[s.status];
                return (
                  <tr key={s.unit} className="border-b border-ink-800/60 table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`dot ${m.dot}`} />
                        <div>
                          <p className="font-medium text-ink-100">{s.name}</p>
                          <p className="font-mono text-[11px] text-ink-400">{s.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip ring-1 ring-inset ${m.cls}`}>{m.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-xs ${s.enabled ? 'text-brand-300' : 'text-ink-400'}`}>
                        {s.enabled ? 'enabled' : 'disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-ink-200">{s.cpu.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-mono text-ink-200">{s.memMB} MB</td>
                    <td className="px-4 py-3 font-mono text-ink-300">{s.pid}</td>
                    <td className="px-4 py-3 text-ink-300">{s.uptime}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.status === 'running' ? (
                          <>
                            <button className="btn btn-ghost px-2 py-1.5" title="Redémarrer"><RotateCw size={14} /></button>
                            <button className="btn btn-ghost px-2 py-1.5" title="Arrêter"><Square size={14} /></button>
                            <button className="btn btn-ghost px-2 py-1.5" title="Suspendre"><Pause size={14} /></button>
                          </>
                        ) : (
                          <button className="btn btn-ghost px-2 py-1.5" title="Démarrer"><Play size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-400">Aucun service ne correspond.</p>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useLiveData } from '../lib/live';

type SortKey = 'cpu' | 'memMB' | 'pid';

const stateMeta: Record<string, string> = {
  R: 'text-brand-300',
  S: 'text-ink-300',
  D: 'text-warn-400',
  Z: 'text-err-400',
  T: 'text-ink-400',
};

export function ProcessesPage() {
  const live = useLiveData();
  const [sort, setSort] = useState<SortKey>('cpu');
  const [query, setQuery] = useState('');

  const rows = [...live.processes]
    .filter((p) => !query || `${p.command} ${p.user} ${p.pid}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b[sort] as number) - (a[sort] as number));

  const totalCpu = live.processes.reduce((a, p) => a + p.cpu, 0);
  const totalMem = live.processes.reduce((a, p) => a + p.memMB, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">Processus</p>
          <p className="mt-1 text-2xl font-semibold text-white">{live.sys.processes}</p>
        </div>
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">Threads</p>
          <p className="mt-1 text-2xl font-semibold text-white">{live.sys.threads}</p>
        </div>
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">CPU (top)</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totalCpu.toFixed(0)}%</p>
        </div>
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">Mémoire (top)</p>
          <p className="mt-1 text-2xl font-semibold text-white">{(totalMem / 1024).toFixed(1)} GB</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Processus actifs</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par commande, PID, utilisateur…"
            className="input w-72 py-1.5"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/60 bg-ink-850/40 text-left text-xs uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3 font-medium">PID</th>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Commande</th>
                <th className="px-4 py-3 font-medium">État</th>
                <SortHead label="CPU" k="cpu" sort={sort} setSort={setSort} />
                <SortHead label="Mémoire" k="memMB" sort={sort} setSort={setSort} />
                <th className="px-4 py-3 font-medium">Démarré</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.pid} className="border-b border-ink-800/60 table-row-hover">
                  <td className="px-4 py-2.5 font-mono text-ink-300">{p.pid}</td>
                  <td className="px-4 py-2.5 text-ink-200">{p.user}</td>
                  <td className="px-4 py-2.5 font-mono text-ink-100 max-w-[360px] truncate">{p.command}</td>
                  <td className={`px-4 py-2.5 font-mono ${stateMeta[p.state]}`}>{p.state}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-200">{p.cpu.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-200">{p.memMB} MB</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-ink-400">{p.started}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortHead({ label, k, sort, setSort }: { label: string; k: SortKey; sort: SortKey; setSort: (k: SortKey) => void }) {
  return (
    <th className="px-4 py-3 text-right font-medium">
      <button onClick={() => setSort(k)} className={`inline-flex items-center gap-1 ${sort === k ? 'text-brand-300' : 'text-ink-400'}`}>
        {label}
        {sort === k && <span>↓</span>}
      </button>
    </th>
  );
}

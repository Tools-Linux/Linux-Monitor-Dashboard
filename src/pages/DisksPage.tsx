import { HardDrive, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDiskSnapshot, type DiskSnapshot } from '../lib/apiService';
import { fmtBytes, pct, usageTone } from '../lib/format';

export function DisksPage() {
  const [disk, setDisk] = useState<DiskSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadDisk = async () => {
      try {
        if (mounted) setError(null);
        const snapshot = await getDiskSnapshot(controller.signal);
        if (mounted) setDisk(snapshot);
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === 'AbortError') return;
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadDisk();
    const refreshId = window.setInterval(() => {
      void loadDisk();
    }, 5000);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(refreshId);
    };
  }, []);

  const totalGb = disk?.totalGb ?? 0;
  const usedGb = disk?.usedGb ?? 0;
  const freeGb = disk?.freeGb ?? 0;
  const usage = disk?.usage ?? 0;
  const usagePercent = disk ? pct(usedGb, totalGb) : usage;
  const tone = usageTone(usagePercent);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">Capacité totale</p>
          <p className="mt-1 text-2xl font-semibold text-white">{disk ? fmtBytes(totalGb) : '—'}</p>
        </div>
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">Espace utilisé</p>
          <p className="mt-1 text-2xl font-semibold text-white">{disk ? fmtBytes(usedGb) : '—'}</p>
        </div>
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">Espace libre</p>
          <p className="mt-1 text-2xl font-semibold text-white">{disk ? fmtBytes(freeGb) : '—'}</p>
        </div>
      </div>

      <div className="card card-pad">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-800 text-ink-200 ring-1 ring-inset ring-ink-700">
              <HardDrive size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Stockage serveur</p>
              <p className="font-mono text-[11px] text-ink-400">http://localhost:5000/api/disk</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-ink-400">Occupation</p>
            <p className={`mt-1 text-2xl font-semibold ${tone.text}`}>{usage.toFixed(1)}%</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs">
            <span className="text-ink-300">Utilisation du disque</span>
            <span className={tone.text}>{usagePercent.toFixed(1)}%</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div className={`h-full rounded-full ${tone.bar} transition-all`} style={{ width: `${usagePercent}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink-400">
            <span>{disk ? fmtBytes(usedGb) : '—'} utilisés</span>
            <span>{disk ? fmtBytes(totalGb) : '—'} total</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric label="Total" value={disk ? fmtBytes(totalGb) : '—'} />
          <Metric label="Utilisé" value={disk ? fmtBytes(usedGb) : '—'} />
          <Metric label="Libre" value={disk ? fmtBytes(freeGb) : '—'} />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5 text-sm">
          <div>
            <p className="font-medium text-ink-100">{loading ? 'Chargement...' : error ? 'Erreur API' : 'Dernière donnée reçue'}</p>
            <p className="text-xs text-ink-400">{error ?? 'Requête vers localhost:5000/api/disk'}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-700/60 bg-ink-800/80 px-3 py-2 text-xs font-medium text-ink-100 transition hover:bg-ink-700"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {error ? (
        <div className="card card-pad border border-err-500/20 bg-err-500/5 text-sm text-err-300">
          Impossible de charger les disques depuis http://localhost:5000/api/disk.
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-700/50 bg-ink-850/40 px-2 py-2.5">
      <div className="text-center text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <p className="mt-1 font-mono text-sm text-ink-100">{value}</p>
    </div>
  );
}

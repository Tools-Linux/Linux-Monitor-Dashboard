import { Network as NetworkIcon, Wifi, WifiOff } from 'lucide-react';
import { useLiveData } from '../lib/live';
import { fmtMbps } from '../lib/format';
import { Sparkline } from '../components/Charts';
import { getNetworkSnapshot } from '../lib/apiService';
import { useEffect, useState } from 'react';

export function NetworkPage() {
  const live = useLiveData();
  const refresh = 1500;

  const [networkInfo, setNetworkInfo] = useState({
    name: live.network?.[0]?.name ?? '',
    ip: live.network?.[0]?.ip ?? '',
    mac: live.network?.[0]?.mac ?? '',
    status: live.network?.[0]?.status ?? 'down',
    rxMbps: live.network?.[0]?.rxMbps ?? 0,
    txMbps: live.network?.[0]?.txMbps ?? 0,
    rxBytes: live.network?.[0]?.rxBytes ?? 0,
    txBytes: live.network?.[0]?.txBytes ?? 0,
  });

  const upIfaces = live.network.filter((n) => n.status === 'up');

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

  const loadNetworkInfo = async () => {
    try {
      const snapshot = await getNetworkSnapshot(controller.signal);

      if (!mounted || !snapshot) return;

      const network = Array.isArray(snapshot)
        ? snapshot.find((n) => n.status === 'up' && n.name !== 'lo') ?? snapshot[0]
        : snapshot;


      setNetworkInfo({
        name: network.name ?? '',
        ip: network.ip ?? '',
        mac: network.mac ?? '',
        status: network.status ?? 'down',
        rxMbps: network.rxMbps ?? 0,
        txMbps: network.txMbps ?? 0,
        rxBytes: network.rxBytes ?? 0,
        txBytes: network.txBytes ?? 0,
      });

    } catch (error) {
      if (mounted) {
        console.error('Erreur réseau:', error);
      }
    }
  };

  void loadNetworkInfo();

    const timer = window.setInterval(loadNetworkInfo, refresh);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Trafic réseau global
              </h2>
              <p className="text-xs text-ink-400">
                Débit instantané agrégé
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-brand-300">
                <span className="dot bg-brand-500" /> Reçu
              </span>
              <span className="flex items-center gap-1.5 text-accent-400">
                <span className="dot bg-accent-500" /> Émis
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-300">
                <span>↓ Téléchargement</span>
                <span className="font-mono text-brand-300">
                  {fmtMbps(live.sys.netRxMbps)}
                </span>
              </div>
              <Sparkline data={live.netRxHistory} color="#10b981" height={64} max={650} />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-300">
                <span>↑ Envoi</span>
                <span className="font-mono text-accent-400">
                  {fmtMbps(live.sys.netTxMbps)}
                </span>
              </div>
              <Sparkline data={live.netTxHistory} color="#0ea5e9" height={64} max={350} />
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="text-sm font-semibold text-white">
            Totaux transférés
          </h2>

          <div className="mt-4 space-y-3">
            <Total label="Total reçu" value={`${live.sys.netRxTotalGB} GB`} tone="text-brand-300" />
            <Total label="Total émis" value={`${live.sys.netTxTotalGB} GB`} tone="text-accent-400" />
            <Total label="Interfaces actives" value={`${upIfaces.length}/${live.network.length}`} tone="text-ink-100" />
            <Total
              label="Vitesse cumulée"
              value={`${upIfaces.reduce((a, n) => a + (n.speedGbps ?? 0), 0)} Gbps`}
              tone="text-ink-100"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-700/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            Interfaces réseau
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/60 bg-ink-850/40 text-left text-xs uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3">Interface</th>
                <th className="px-4 py-3">Adresse IP</th>
                <th className="px-4 py-3">MAC</th>
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3 text-right">Vitesse</th>
                <th className="px-4 py-3 text-right">↓ Reçu</th>
                <th className="px-4 py-3 text-right">↑ Émis</th>
              </tr>
            </thead>

            <tbody>
              {live.network.map((n) => (
                <tr key={n.name} className="border-b border-ink-800/60 table-row-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg ${
                        n.status === 'up'
                          ? 'bg-brand-500/10 text-brand-300'
                          : 'bg-ink-800 text-ink-400'
                      }`}>
                        {n.status === 'up' ? <Wifi size={15} /> : <WifiOff size={15} />}
                      </span>

                      <span className="font-mono text-ink-100">
                        {n.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-ink-200">{n.ip}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink-400">{n.mac}</td>

                  <td className="px-4 py-3">
                    <span className={`chip ring-1 ring-inset ${
                      n.status === 'up'
                        ? 'bg-brand-500/10 text-brand-300 ring-brand-500/30'
                        : 'bg-ink-700/60 text-ink-300 ring-ink-600'
                    }`}>
                      {n.status === 'up' ? 'UP' : 'DOWN'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-ink-200">
                    {n.speedGbps ?? 0} Gbps
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-brand-300">
                    {n.status === 'up' ? fmtMbps(n.rxMbps) : '—'}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-accent-400">
                    {n.status === 'up' ? fmtMbps(n.txMbps) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <NetworkIcon size={16} className="text-brand-300" />
          Connexions actives (échantillon)
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-2">
          {[
            'tcp  10.0.42.10:22   → 10.0.42.51:51824 ESTAB',
            'tcp  10.0.42.10:443  → 198.51.100.7:44012 ESTAB',
            'tcp  10.0.42.10:5432 → 127.0.0.1:39812 ESTAB',
            'tcp6 :::80           → 203.0.113.45:51402 TIME_WAIT',
          ].map((c, i) => (
            <div key={i} className="rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2 text-ink-200">
              {c}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Total({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
      <span className="text-sm text-ink-300">{label}</span>
      <span className={`font-mono text-sm font-semibold ${tone}`}>
        {value}
      </span>
    </div>
  );
}
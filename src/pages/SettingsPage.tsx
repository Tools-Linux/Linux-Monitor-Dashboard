import { Network as NetworkIcon, Wifi, WifiOff } from 'lucide-react';
import { useLiveData } from '../lib/live';
import { fmtMbps } from '../lib/format';
import { Sparkline } from '../components/Charts';
import { getNetworkSnapshot } from '../lib/apiService';
import { useEffect, useState } from 'react';

type NetworkInterface = {
  name: string;
  ip: string;
  mac: string;
  status: 'up' | 'down';
  speedMbps: number;
  rxMbps: number;
  txMbps: number;
  rxBytes: number;
  txBytes: number;
};

export function NetworkPage() {
  const live = useLiveData();
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const loadNetwork = async () => {
      try {
        const snapshot = await getNetworkSnapshot(controller.signal);

        if (Array.isArray(snapshot)) {
          setInterfaces(snapshot);
        }
      } catch (error) {
        console.error('Erreur chargement interfaces réseau:', error);
      }
    };

    void loadNetwork();

    const timer = window.setInterval(loadNetwork, 3000);

    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  const upIfaces = interfaces.filter((n) => n.status === 'up');

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

            <div className="flex gap-4 text-xs">
              <span className="text-brand-300">● Reçu</span>
              <span className="text-accent-400">● Émis</span>
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

              <Sparkline
                data={live.netRxHistory}
                color="#10b981"
                height={64}
                max={650}
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-300">
                <span>↑ Envoi</span>
                <span className="font-mono text-accent-400">
                  {fmtMbps(live.sys.netTxMbps)}
                </span>
              </div>

              <Sparkline
                data={live.netTxHistory}
                color="#0ea5e9"
                height={64}
                max={350}
              />
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="text-sm font-semibold text-white">
            Totaux transférés
          </h2>

          <div className="mt-4 space-y-3">
            <Total
              label="Total reçu"
              value={`${live.sys.netRxTotalGB} GB`}
              tone="text-brand-300"
            />

            <Total
              label="Total émis"
              value={`${live.sys.netTxTotalGB} GB`}
              tone="text-accent-400"
            />

            <Total
              label="Interfaces actives"
              value={`${upIfaces.length}/${interfaces.length}`}
              tone="text-ink-100"
            />

            <Total
              label="Vitesse cumulée"
              value={`${upIfaces.reduce((a, n) => a + n.speedMbps, 0)} Mbps`}
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
              <tr className="border-b border-ink-700/60 bg-ink-850/40 text-left text-xs uppercase text-ink-400">
                <th className="px-4 py-3">Interface</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">MAC</th>
                <th className="px-4 py-3">Etat</th>
                <th className="px-4 py-3 text-right">Vitesse</th>
                <th className="px-4 py-3 text-right">Reçu</th>
                <th className="px-4 py-3 text-right">Emis</th>
              </tr>
            </thead>

            <tbody>
              {interfaces.map((n) => (
                <tr key={n.name} className="border-b border-ink-800/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {n.status === 'up' ? (
                        <Wifi size={15} />
                      ) : (
                        <WifiOff size={15} />
                      )}

                      <span className="font-mono">{n.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono">{n.ip}</td>
                  <td className="px-4 py-3 font-mono text-xs">{n.mac}</td>
                  <td className="px-4 py-3">{n.status.toUpperCase()}</td>
                  <td className="px-4 py-3 text-right">
                    {n.speedMbps} Mbps
                  </td>
                  <td className="px-4 py-3 text-right text-brand-300">
                    {fmtMbps(n.rxMbps)}
                  </td>
                  <td className="px-4 py-3 text-right text-accent-400">
                    {fmtMbps(n.txMbps)}
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
          Connexions actives
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
    <div className="flex justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
      <span className="text-ink-300">{label}</span>
      <span className={`font-mono font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
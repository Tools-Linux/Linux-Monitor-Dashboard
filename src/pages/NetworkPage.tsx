import { Network as NetworkIcon, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Sparkline } from "../components/Charts";
import { useLiveData } from "../lib/live";
import { fmtMbps } from "../lib/format";
import { WS_BASE_URL } from "../lib/apiService";

type NetworkInterface = {
  name: string;
  ip: string;
  mac: string;
  status: "up" | "down";
  speedMbps: number;
  rxMbps: number;
  txMbps: number;
  rxBytes: number;
  txBytes: number;
};

function fmtGB(bytes: number) {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function NetworkPage() {
  const live = useLiveData();

  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [networkUpdatedAt, setNetworkUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const socket = new WebSocket(`${WS_BASE_URL}/dashboard`);

    socket.onopen = () => {
      console.log("Dashboard WebSocket connecté");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type !== "dashboard") return;

      if (!Array.isArray(message.network)) return;

      setInterfaces(
        message.network.map((n: any) => ({
          name: n.name,
          ip: n.ip,
          mac: n.mac,
          status: n.status,
          speedMbps: Number(n.speedMbps ?? 0),
          rxMbps: Number(n.rxMbps ?? 0),
          txMbps: Number(n.txMbps ?? 0),
          rxBytes: Number(n.rxBytes ?? 0),
          txBytes: Number(n.txBytes ?? 0),
        }))
      );

      setNetworkUpdatedAt(new Date().toLocaleTimeString());
    };

    socket.onerror = (err) => {
      console.error("WebSocket Network :", err);
    };

    socket.onclose = () => {
      console.log("Dashboard WebSocket fermé");
    };

    return () => socket.close();
  }, []);

  const upIfaces = interfaces.filter((n) => n.status === "up");

  const totalSpeed = upIfaces.reduce((a, n) => a + n.speedMbps, 0);

  const totalRxGB = interfaces.reduce((a, n) => a + n.rxBytes, 0);

  const totalTxGB = interfaces.reduce((a, n) => a + n.txBytes, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Stat
          label="Téléchargement"
          value={fmtMbps(live.sys.netRxMbps)}
          sub={`Total ${live.sys.netRxTotalGB} GB`}
          tone="text-brand-300"
        />

        <Stat
          label="Envoi"
          value={fmtMbps(live.sys.netTxMbps)}
          sub={`Total ${live.sys.netTxTotalGB} GB`}
          tone="text-accent-400"
        />

        <Stat
          label="Interfaces actives"
          value={`${upIfaces.length}/${interfaces.length}`}
          sub="Interfaces UP"
          tone="text-ink-100"
        />

        <Stat
          label="Vitesse cumulée"
          value={`${totalSpeed} Mbps`}
          sub={networkUpdatedAt ? `WS ${networkUpdatedAt}` : "En attente"}
          tone="text-ink-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Trafic réseau global
              </h2>
              <p className="text-xs text-ink-400">
                Débit instantané
              </p>
            </div>

            <div className="flex gap-4 text-xs">
              <span className="text-brand-300">● Reçu</span>
              <span className="text-accent-400">● Émis</span>
            </div>
          </div>

          <div className="mt-4 space-y-5">
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
                height={60}
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
                height={60}
                max={350}
              />
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="flex items-center gap-2">
            <NetworkIcon size={18} className="text-brand-300" />
            <h2 className="text-sm font-semibold text-white">
              Totaux transférés
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            <Total
              label="Reçu"
              value={fmtGB(totalRxGB)}
              tone="text-brand-300"
            />

            <Total
              label="Émis"
              value={fmtGB(totalTxGB)}
              tone="text-accent-400"
            />

            <Total
              label="Vitesse"
              value={`${totalSpeed} Mbps`}
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
                <th className="px-4 py-3">État</th>
                <th className="px-4 py-3 text-right">Vitesse</th>
                <th className="px-4 py-3 text-right">Reçu</th>
                <th className="px-4 py-3 text-right">Émis</th>
              </tr>
            </thead>

            <tbody>
              {interfaces.map((n) => (
                <tr
                  key={n.name}
                  className="border-b border-ink-800/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {n.status === "up" ? (
                        <Wifi
                          size={15}
                          className="text-brand-300"
                        />
                      ) : (
                        <WifiOff
                          size={15}
                          className="text-err-400"
                        />
                      )}

                      <span className="font-mono">{n.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono">
                    {n.ip}
                  </td>

                  <td className="px-4 py-3 font-mono text-xs">
                    {n.mac}
                  </td>

                  <td className="px-4 py-3">
                    {n.status.toUpperCase()}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {n.speedMbps} Mbps
                  </td>

                  <td className="px-4 py-3 text-right text-brand-300">
                    {fmtGB(n.rxBytes)}
                  </td>

                  <td className="px-4 py-3 text-right text-accent-400">
                    {fmtGB(n.txBytes)}
                  </td>
                </tr>
              ))}

              {interfaces.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-ink-400"
                  >
                    En attente des données du WebSocket...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="card card-pad">
      <p className="text-xs uppercase text-ink-400">{label}</p>
      <p className={`mt-2 font-mono text-xl font-semibold ${tone}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-500">{sub}</p>
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
      <span className={`font-mono font-semibold ${tone}`}>
        {value}
      </span>
    </div>
  );
}
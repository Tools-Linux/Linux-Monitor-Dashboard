import { HardDrive, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { type DiskSnapshot } from "../lib/apiService";
import { fmtBytes, pct, usageTone } from "../lib/format";

const WS_URL = "ws://localhost:5000/ws/disk";

export function DisksPage() {
  const [disk, setDisk] = useState<DiskSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log("WebSocket Disk connecté");
      setConnected(true);
    };

    socket.onclose = () => {
      console.log("WebSocket Disk déconnecté");
      setConnected(false);
    };

    socket.onerror = (err) => {
      console.error(err);
      setConnected(false);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      console.log("WS Disk :", message);

      // Si ton serveur envoie :
      // { type:"disk", disk:{...} }
      const data = message.disk ?? message;

      setDisk({
        totalGb: Number(data.totalGb ?? data.TotalGb ?? 0),
        usedGb: Number(data.usedGb ?? data.UsedGb ?? 0),
        freeGb: Number(data.freeGb ?? data.FreeGb ?? 0),
        usage: Number(data.usage ?? data.Usage ?? 0),
      });
    };

    return () => socket.close();
  }, []);

  const totalGb = disk?.totalGb ?? 0;
  const usedGb = disk?.usedGb ?? 0;
  const freeGb = disk?.freeGb ?? 0;
  const usage = disk?.usage ?? 0;

  const usagePercent = pct(usedGb, totalGb);
  const tone = usageTone(usagePercent);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">
            Capacité totale
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {fmtBytes(totalGb)}
          </p>
        </div>

        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">
            Espace utilisé
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {fmtBytes(usedGb)}
          </p>
        </div>

        <div className="card card-pad">
          <p className="text-xs uppercase tracking-wider text-ink-400">
            Espace libre
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {fmtBytes(freeGb)}
          </p>
        </div>
      </div>

      <div className="card card-pad">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-800">
              <HardDrive size={18} />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Stockage serveur
              </p>

              <p className="font-mono text-[11px] text-ink-400">
                {WS_URL}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-ink-400">
              Occupation
            </p>

            <p className={`mt-1 text-2xl font-semibold ${tone.text}`}>
              {usage.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs">
            <span className="text-ink-300">Utilisation du disque</span>
            <span className={tone.text}>
              {usagePercent.toFixed(1)}%
            </span>
          </div>

          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div
              className={`h-full rounded-full ${tone.bar} transition-all`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
          <div>
            <p className="font-medium text-ink-100">
              {connected
                ? "Connecté au WebSocket"
                : "Déconnecté"}
            </p>

            <p className="text-xs text-ink-400">
              {WS_URL}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-700/60 bg-ink-800/80 px-3 py-2 text-xs font-medium text-ink-100 hover:bg-ink-700"
          >
            <RefreshCw size={14} />
            Reconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  Power,
  Server,
  Thermometer,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCpuSnapshot, getMemorySnapshot } from '../lib/apiService';
import { useLiveData } from '../lib/live';
import { fmtBytes, fmtMbps, pct, usageTone } from '../lib/format';
import { Ring, Sparkline } from '../components/Charts';
import { StatTile } from '../components/StatTile';
import type { ServiceStatus } from '../lib/data';

const statusMeta: Record<ServiceStatus, { label: string; cls: string; dot: string }> = {
  running: { label: 'En marche', cls: 'bg-brand-500/10 text-brand-300 ring-brand-500/30', dot: 'bg-brand-500' },
  stopped: { label: 'Arrêté', cls: 'bg-ink-700/60 text-ink-300 ring-ink-600', dot: 'bg-ink-400' },
  failed: { label: 'Échec', cls: 'bg-err-500/10 text-err-400 ring-err-500/30', dot: 'bg-err-500' },
  degraded: { label: 'Dégradé', cls: 'bg-warn-500/10 text-warn-400 ring-warn-500/30', dot: 'bg-warn-500' },
};

export function DashboardPage() {
  const live = useLiveData();
  const [fallbackCpuPct] = useState(() => live.cpuHistory[live.cpuHistory.length - 1] ?? 0);
  const [cpuPct, setCpuPct] = useState(fallbackCpuPct);
  const [cpuName, setCpuName] = useState(live.sys.cpuModel);
  const [cpuCore, setCpuCore] = useState(String(live.sys.cores));
  const [cpuHistory, setCpuHistory] = useState<number[]>(() => live.cpuHistory.slice(-48));
  const [cpuUpdatedAt, setCpuUpdatedAt] = useState<string | null>(null);
  const [fallbackMemPct] = useState(() => pct(live.sys.memUsedGB, live.sys.memTotalGB));
  const [memPct, setMemPct] = useState(fallbackMemPct);
  const [memHistory, setMemHistory] = useState<number[]>(() => live.memHistory.slice(-48));
  const [memUpdatedAt, setMemUpdatedAt] = useState<string | null>(null);

  const swapPct = pct(live.sys.swapUsedGB, live.sys.swapTotalGB);
  const totalDiskGB = live.disks.reduce((a, d) => a + d.sizeGB, 0);
  const usedDiskGB = live.disks.reduce((a, d) => a + d.usedGB, 0);

  const runningServices = live.services.filter((s) => s.status === 'running').length;
  const failedServices = live.services.filter((s) => s.status === 'failed').length;

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadCpu = async () => {
      try {
        const snapshot = await getCpuSnapshot(controller.signal);
        if (!mounted) return;

        setCpuPct(snapshot.usage);
        setCpuName(snapshot.name);
        setCpuCore(snapshot.core);
        setCpuHistory((prev) => [...prev.slice(1), snapshot.usage]);
        setCpuUpdatedAt(new Date().toLocaleTimeString());
      } catch {
        if (mounted) {
          setCpuPct(fallbackCpuPct);
          setCpuName(live.sys.cpuModel);
          setCpuCore(String(live.sys.cores));
        }
      }
    };

    void loadCpu();
    const refreshId = window.setInterval(() => {
      void loadCpu();
    }, 5000);

    const loadMemory = async () => {
      try {
        const snapshot = await getMemorySnapshot(controller.signal);
        if (!mounted) return;

        setMemPct(snapshot.usage);
        setMemHistory((prev) => [...prev.slice(1), snapshot.usage]);
        setMemUpdatedAt(new Date().toLocaleTimeString());
      } catch {
        if (mounted) setMemPct(fallbackMemPct);
      }
    };

    void loadMemory();
    const memoryRefreshId = window.setInterval(() => {
      void loadMemory();
    }, 5000);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(refreshId);
      window.clearInterval(memoryRefreshId);
    };
  }, [fallbackCpuPct]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Charge CPU"
          value={`${cpuPct.toFixed(1)}%`}
          sub={`${cpuName} · core ${cpuCore}`}
          icon={<Cpu size={18} />}
          accent="bg-brand-500"
        />
        <StatTile
          label="Mémoire RAM"
          value={`${memPct.toFixed(1)}%`}
          sub={`API /memory${memUpdatedAt ? ` · ${memUpdatedAt}` : ''}`}
          icon={<Server size={18} />}
          accent="bg-accent-500"
        />
        <StatTile
          label="Stockage"
          value={fmtBytes(usedDiskGB)}
          sub={`${live.disks.length} volumes montés`}
          used={usedDiskGB}
          total={totalDiskGB}
          icon={<HardDrive size={18} />}
          accent="bg-warn-500"
        />
        <StatTile
          label="Réseau"
          value={fmtMbps(live.sys.netRxMbps)}
          sub={`↑ ${fmtMbps(live.sys.netTxMbps)} · total ↓ ${live.sys.netRxTotalGB} GB`}
          icon={<Network size={18} />}
          accent="bg-accent-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Activité CPU & Mémoire</h2>
              <p className="text-xs text-ink-400">API CPU toutes les 5s · fond de page mis à jour en continu</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-brand-300">
                <span className="dot bg-brand-500" /> CPU
              </span>
              <span className="flex items-center gap-1.5 text-accent-400">
                <span className="dot bg-accent-500" /> RAM
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-300">
                <span>CPU</span>
                <span className="font-mono text-brand-300">{cpuPct.toFixed(2)}%</span>
              </div>
              <Sparkline data={cpuHistory} color="#10b981" height={56} max={100} />
              <p className="mt-2 text-[11px] text-ink-500">
                Dernière API : {cpuUpdatedAt ?? 'en attente...'}
              </p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-300">
                <span>RAM</span>
                <span className="font-mono text-accent-400">{memPct.toFixed(2)}%</span>
              </div>
              <Sparkline data={memHistory} color="#0ea5e9" height={56} max={100} />
              <p className="mt-2 text-[11px] text-ink-500">Dernière API : {memUpdatedAt ?? 'en attente...'}</p>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="text-sm font-semibold text-white">Synthèse système</h2>
          <div className="mt-4 flex flex-col items-center gap-4">
            <Ring value={cpuPct} color="#10b981" sublabel="CPU" />
            <div className="grid w-full grid-cols-2 gap-3">
              <Ring value={memPct} size={92} stroke={8} color="#0ea5e9" sublabel="RAM" />
              <Ring value={swapPct} size={92} stroke={8} color="#f59e0b" sublabel="SWAP" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card card-pad lg:col-span-2">
          <h2 className="text-sm font-semibold text-white">Informations système</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Info label="Hôte" value={live.sys.hostname} />
            <Info label="OS" value={live.sys.os} />
            <Info label="Noyau" value={live.sys.kernel} mono />
            <Info label="Architecture" value={live.sys.arch} mono />
            <Info label="Uptime" value={live.sys.uptime} />
            <Info label="Processus" value={`${live.sys.processes} (${live.sys.threads} threads)`} />
            <Info label="CPU" value={cpuName} span={3} />
            <Info label="Core API" value={cpuCore} mono />
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="text-sm font-semibold text-white">Capteurs</h2>
          <div className="mt-4 space-y-3">
            <Sensor
              icon={<Thermometer size={16} />}
              label="Temp. CPU"
              value={`${live.sys.tempCpu.toFixed(0)}°C`}
              tone={live.sys.tempCpu > 70 ? 'text-err-400' : 'text-brand-300'}
            />
            <Sensor icon={<Thermometer size={16} />} label="Temp. GPU" value={`${live.sys.tempGpu.toFixed(0)}°C`} tone="text-accent-400" />
            <Sensor icon={<Zap size={16} />} label="Consommation" value={`${live.sys.powerWatts.toFixed(0)} W`} tone="text-warn-400" />
            <Sensor
              icon={<Power size={16} />}
              label="Disques sains"
              value={`${live.disks.filter((d) => d.health === 'ok').length}/${live.disks.length}`}
              tone="text-brand-300"
            />
            <Sensor
              icon={<Activity size={16} />}
              label="Services actifs"
              value={`${runningServices}/${live.services.length}`}
              tone={failedServices > 0 ? 'text-warn-400' : 'text-brand-300'}
            />
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Charge par cœur</h2>
          <span className="text-xs text-ink-400">{live.sys.cores} cœurs logiques</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {live.sys.cpuCores.map((c) => {
            const tone = usageTone(c.usage);
            return (
              <div key={c.id} className="rounded-xl border border-ink-700/70 bg-ink-850/60 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">C{c.id}</span>
                  <span className="font-mono text-ink-100">{c.usage.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                  <div className={`h-full rounded-full ${tone.bar} transition-all`} style={{ width: `${c.usage}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-ink-400">
                  <span>{c.freqGHz.toFixed(1)} GHz</span>
                  <span>{c.tempC}°C</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <h2 className="text-sm font-semibold text-white">État des services</h2>
          <div className="mt-4 space-y-2">
            {live.services.slice(0, 6).map((s) => {
              const m = statusMeta[s.status];
              return (
                <div key={s.unit} className="flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`dot ${m.dot}`} />
                    <div>
                      <p className="text-sm font-medium text-ink-100">{s.name}</p>
                      <p className="font-mono text-[11px] text-ink-400">{s.unit}</p>
                    </div>
                  </div>
                  <span className={`chip ring-1 ring-inset ${m.cls}`}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="text-sm font-semibold text-white">Occupation des disques</h2>
          <div className="mt-4 space-y-3">
            {live.disks.map((d) => {
              const p = pct(d.usedGB, d.sizeGB);
              const tone = usageTone(p);
              return (
                <div key={d.device}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-ink-200">{d.mount}</span>
                    <span className="text-ink-400">
                      {d.usedGB.toFixed(0)} / {d.sizeGB} GB
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-700">
                    <div className={`h-full rounded-full ${tone.bar} transition-all`} style={{ width: `${p}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-ink-500">
                    <span>
                      {d.device} · {d.fstype}
                    </span>
                    <span className={tone.text}>{p.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono, span }: { label: string; value: string; mono?: boolean; span?: number }) {
  return (
    <div className={span === 3 ? 'col-span-2 sm:col-span-3' : ''}>
      <p className="text-[11px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-0.5 text-sm text-ink-100 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function Sensor({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-ink-300">
        <span className="text-ink-400">{icon}</span>
        {label}
      </span>
      <span className={`font-mono text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
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
import { getCpuSnapshot, getDiskSnapshot, getMemorySnapshot, getServicesSnapshot, type ServiceItem, type ServicesSnapshot } from '../lib/apiService';
import { useLiveData } from '../lib/live';
import { fmtBytes, fmtMbps, pct, usageTone } from '../lib/format';
import { Ring, Sparkline } from '../components/Charts';
import { StatTile } from '../components/StatTile';

const serviceStateMeta: Record<string, { label: string; cls: string; dot: string }> = {
  enabled: { label: 'Activé', cls: 'bg-brand-500/10 text-brand-300 ring-brand-500/30', dot: 'bg-brand-500' },
  disabled: { label: 'Désactivé', cls: 'bg-ink-700/60 text-ink-300 ring-ink-600', dot: 'bg-ink-400' },
  static: { label: 'Statique', cls: 'bg-accent-500/10 text-accent-300 ring-accent-500/30', dot: 'bg-accent-500' },
};

const diskHealthMeta: Record<string, { cls: string; text: string }> = {
  ok: { cls: 'bg-brand-500/10 text-brand-300 ring-brand-500/30', text: 'Sain' },
  warn: { cls: 'bg-warn-500/10 text-warn-300 ring-warn-500/30', text: 'Attention' },
  critical: { cls: 'bg-err-500/10 text-err-300 ring-err-500/30', text: 'Critique' },
};

function describeServiceState(state: string) {
  return serviceStateMeta[state] ?? { label: state, cls: 'bg-ink-700/60 text-ink-300 ring-ink-600', dot: 'bg-ink-500' };
}

function toFallbackServices(services: Array<{ name: string; enabled: boolean }>): ServiceItem[] {
  return services.map((service) => ({
    name: service.name,
    state: service.enabled ? 'enabled' : 'disabled',
  }));
}

function summarizeServices(snapshot: ServicesSnapshot | null, fallback: ServiceItem[]) {
  const list = snapshot?.list ?? fallback;
  const total = snapshot?.total ?? list.length;
  const enabled = snapshot?.enabled ?? list.filter((service) => service.state === 'enabled').length;
  const disabled = snapshot?.disabled ?? list.filter((service) => service.state === 'disabled').length;

  return { total, enabled, disabled, list };
}

export function DashboardPage() {
  const live = useLiveData();
  const [fallbackCpuPct] = useState(() => live.cpuHistory[live.cpuHistory.length - 1] ?? 0);
  const [cpuPct, setCpuPct] = useState(fallbackCpuPct);
  const [cpuName, setCpuName] = useState(live.sys.cpuModel);
  const [cpuCore, setCpuCore] = useState(String(live.sys.cores));
  const [cpuArch, setCpuArch] = useState(live.sys.arch);
  const [cpuProcessorCount, setCpuProcessorCount] = useState(live.sys.processes);
  const [cpuThreads, setCpuThreads] = useState(live.sys.threads);
  const [hostname, setHostname] = useState(live.sys.hostname);
  const [osname, setOsname] = useState(live.sys.os);
  const [kernel, setKernel] = useState(live.sys.kernel);
  const [cpuTemp, setCpuTemp] = useState(live.sys.tempCpu);
  const [uptime, setUptime] = useState(live.informations[0]?.time);
  const [servicesSnapshot, setServicesSnapshot] = useState<ServicesSnapshot | null>(null);
  const [fallbackServices] = useState(() => toFallbackServices(live.services));
  const [cpuHistory, setCpuHistory] = useState<number[]>(() => live.cpuHistory.slice(-48));
  const [cpuUpdatedAt, setCpuUpdatedAt] = useState<string | null>(null);

  const [fallbackDisk] = useState(() => {
    const totalGb = live.disks.reduce((a, d) => a + d.sizeGB, 0);
    const usedGb = live.disks.reduce((a, d) => a + d.usedGB, 0);
    return {
      totalGb,
      usedGb,
      freeGb: Math.max(totalGb - usedGb, 0),
      usage: pct(usedGb, totalGb),
      disks: live.disks,
    };
  });
  const [diskSnapshot, setDiskSnapshot] = useState(fallbackDisk);
  const [diskUpdatedAt, setDiskUpdatedAt] = useState<string | null>(null);
  const [fallbackMemPct] = useState(() => pct(live.sys.memUsedGB, live.sys.memTotalGB));
  const [memPct, setMemPct] = useState(fallbackMemPct);
  const [memHistory, setMemHistory] = useState<number[]>(() => live.memHistory.slice(-48));
  const [memUpdatedAt, setMemUpdatedAt] = useState<string | null>(null);
  const serviceSummary = summarizeServices(servicesSnapshot, fallbackServices);

  const swapPct = pct(live.sys.swapUsedGB, live.sys.swapTotalGB);

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
        setCpuArch(snapshot.arch);
        setCpuThreads(snapshot.threads);
        setCpuProcessorCount(snapshot.processes);
        setHostname(snapshot.host);
        setKernel(snapshot.kernel);
        setOsname(snapshot.os);
        setCpuTemp(snapshot.tempCpu);
        setUptime(live.informations[0]?.time);
        setCpuHistory((prev) => [...prev.slice(1), snapshot.usage]);
        setCpuUpdatedAt(new Date().toLocaleTimeString());
      } catch {
        if (mounted) {
          setCpuPct(fallbackCpuPct);
          setCpuName(live.sys.cpuModel);
          setCpuCore(String(live.sys.cores));
          setCpuArch(live.sys.arch);
          setCpuProcessorCount(live.sys.processes);
          setCpuThreads(live.sys.threads);
          setHostname(live.sys.hostname);
          setKernel(live.sys.kernel);
          setOsname(live.sys.os);
          setCpuTemp(live.sys.tempCpu);
          setUptime(live.informations[0]?.time);
        }
      }
    };

    const loadServices = async () => {
      try {
        const snapshot = await getServicesSnapshot(controller.signal);
        if (!mounted) return;

        setServicesSnapshot(snapshot);
      } catch {
        if (mounted) setServicesSnapshot(null);
      }
    };

    void loadCpu();
    void loadServices();
    const refreshId = window.setInterval(() => {
      void loadCpu();
    }, 5000);

    const servicesRefreshId = window.setInterval(() => {
      void loadServices();
    }, 15000);

    const loadDisk = async () => {
      try {
        const snapshot = await getDiskSnapshot(controller.signal);
        if (!mounted) return;

        setDiskSnapshot(snapshot);
        setDiskUpdatedAt(new Date().toLocaleTimeString());
      } catch {
        if (mounted) setDiskSnapshot(fallbackDisk);
      }
    };

    void loadDisk();
    const diskRefreshId = window.setInterval(() => {
      void loadDisk();
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
      window.clearInterval(servicesRefreshId);
      window.clearInterval(diskRefreshId);
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
          value={fmtBytes(diskSnapshot.usedGb)}
          sub={`${fmtBytes(diskSnapshot.freeGb)} libres · API /disk${diskUpdatedAt ? ` · ${diskUpdatedAt}` : ''}`}
          used={diskSnapshot.usedGb}
          total={diskSnapshot.totalGb}
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
            <Info label="Hôte" value={hostname} />
            <Info label="OS" value={osname} />
            <Info label="Noyau" value={kernel} mono />
            <Info label="Architecture" value={cpuArch} mono />
            <Info label="Uptime" value={uptime} />
            <Info label="Processus" value={`${cpuProcessorCount} (${cpuThreads} threads)`} />
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
              value={`${cpuTemp.toFixed(0)}°C`}
              tone={cpuTemp > 70 ? 'text-err-400' : 'text-brand-300'}
            />
            <Sensor icon={<Zap size={16} />} label="Consommation" value={`${live.sys.powerWatts.toFixed(0)} W`} tone="text-warn-400" />
            <Sensor
              icon={<Power size={16} />}
              label="Disques sains"
              value={`${live.disks.filter((d) => d.health === 'ok').length}/${live.disks.length}`}
              tone="text-brand-300"
            />
            <Sensor
              icon={<Activity size={16} />}
              label="Services activés"
              value={`${serviceSummary.enabled}/${serviceSummary.total}`}
              tone={serviceSummary.disabled > 0 ? 'text-warn-400' : 'text-brand-300'}
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

      {/* SECTION DU NOUVEAU SYSTEME DE DISQUE ENRICHIE */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <h2 className="text-sm font-semibold text-white">Occupation & Performance des disques</h2>
          <div className="mt-4 space-y-4">
            {diskSnapshot.disks?.map((d) => {
              const p = pct(d.usedGB, d.sizeGB);
              const tone = usageTone(p);
              const health = diskHealthMeta[d.health] ?? { cls: 'bg-ink-700 text-ink-300 ring-ink-600', text: d.health };

              return (
                <div key={d.model} className="rounded-xl border border-ink-700/40 bg-ink-850/20 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-ink-100">{d.mount}</span>
                      <span className={`chip text-[10px] py-0.5 px-1.5 ring-1 ring-inset ${health.cls}`}>{health.text}</span>
                    </div>
                    <span className="text-ink-400 font-mono">
                      {d.usedGB.toFixed(1)} / {d.sizeGB} GB
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
                    <div className={`h-full rounded-full ${tone.bar} transition-all`} style={{ width: `${p}%` }} />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-ink-400 pt-1 border-t border-ink-700/30">
                    <div>
                      <span className="font-medium text-ink-300">{d.device}</span> · <span className="uppercase font-mono text-[10px]">{d.fstype}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span>{d.tempC}°C</span>
                      <span className="text-brand-400">↓ {d.readMBps.toFixed(1)} MB/s</span>
                      <span className="text-accent-400">↑ {d.writeMBps.toFixed(1)} MB/s</span>
                      <span className={`font-semibold ${tone.text}`}>{p.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="text-sm font-semibold text-white">État des services</h2>
          <div className="mt-4 space-y-2">
            {serviceSummary.list.slice(0, 6).map((service) => {
              const m = describeServiceState(service.state);
              return (
                <div key={service.name} className="flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`dot ${m.dot}`} />
                    <div>
                      <p className="text-sm font-medium text-ink-100">{service.name}</p>
                      <p className="font-mono text-[11px] text-ink-400">{service.state}</p>
                    </div>
                  </div>
                  <span className={`chip ring-1 ring-inset ${m.cls}`}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* HISTOGRAMME / LISTE DE LA TOPOLOGIE COMPLÈTE (LSBLK) */}
      <div className="card card-pad">
        <h2 className="text-sm font-semibold text-white">Topologie des blocs physiques (lsblk)</h2>
        <p className="text-xs text-ink-400 mb-4">Structure matérielle brute de la table des périphériques</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink-300">
            <thead>
              <tr className="border-b border-ink-700 text-ink-400 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-3">Périphérique</th>
                <th className="py-2 px-3">Modèle</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Taille</th>
                <th className="py-2 px-3">Point de montage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle font-mono">
              {live.lsblk?.blockdevices.map((device) => (
                <BlockDeviceRows key={device.name} device={device} depth={0} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BlockDeviceRows({ device, depth }: { device: any; depth: number }) {
  return (
    <>
      <tr className={`${depth === 0 ? 'bg-ink-850/20 text-white' : 'text-ink-400 hover:bg-ink-800/10'}`}>
        <td className="py-2.5 px-3 flex items-center">
          <span style={{ paddingLeft: `${depth * 16}px` }} className="opacity-60 mr-1">
            {depth > 0 ? '└─ ' : ''}
          </span>
          <span className={depth === 0 ? 'font-bold text-brand-300' : 'text-ink-200'}>
            {device.name}
          </span>
        </td>
        <td className="py-2.5 px-3 text-ink-400 truncate max-w-[180px]">{device.model ?? '-'}</td>
        <td className="py-2.5 px-3">
          <span className={`px-1.5 py-0.5 rounded text-[10px] ${device.type === 'disk' ? 'bg-brand-500/10 text-brand-400' : 'bg-ink-700/50 text-ink-400'}`}>
            {device.type}
          </span>
        </td>
        <td className="py-2.5 px-3 font-semibold">{device.size}</td>
        <td className="py-2.5 px-3 text-accent-400">{device.mountpoint ?? '-'}</td>
      </tr>
      {device.children?.map((child: any) => (
        <BlockDeviceRows key={child.name} device={child} depth={depth + 1} />
      ))}
    </>
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
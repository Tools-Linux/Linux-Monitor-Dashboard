import {
  Activity,
  Cpu,
  HardDrive,
  ListTree,
  Network,
  ScrollText,
  Settings,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCpuSnapshot, getMemorySnapshot } from '../lib/apiService';
import type { Route } from '../lib/router';
import { useLiveData } from '../lib/live';
import { pct, usageTone } from '../lib/format';

interface SidebarProps {
  route: Route;
  navigate: (r: Route) => void;
}

const NAV: Array<{ id: Route; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Vue d\'ensemble', icon: <Activity size={18} /> },
  { id: 'services', label: 'Services', icon: <ShieldCheck size={18} /> },
  { id: 'disks', label: 'Disques', icon: <HardDrive size={18} /> },
  { id: 'processes', label: 'Processus', icon: <ListTree size={18} /> },
  { id: 'network', label: 'Réseau', icon: <Network size={18} /> },
  { id: 'logs', label: 'Journaux', icon: <ScrollText size={18} /> },
  { id: 'settings', label: 'Paramètres', icon: <Settings size={18} /> },
];

export function Sidebar({ route, navigate }: SidebarProps) {
  const live = useLiveData();
  const [fallbackCpuPct] = useState(() => live.cpuHistory[live.cpuHistory.length - 1]);
  const [cpuPct, setCpuPct] = useState(fallbackCpuPct);
  const [fallbackMemPct] = useState(() => pct(live.sys.memUsedGB, live.sys.memTotalGB));
  const [memPct, setMemPct] = useState(fallbackMemPct);
  const [namePct, setNamePct] = useState(live.sys.hostname);
  const cpuTone = usageTone(cpuPct).bar;
  const memTone = usageTone(memPct).bar;

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadCpu = async () => {
      try {
        const snapshot = await getCpuSnapshot(controller.signal);
        if (mounted) setCpuPct(snapshot.usage);
        setNamePct(snapshot.host);
      } catch {
        if (mounted) setCpuPct(fallbackCpuPct);
      }
    };

    const loadMemory = async () => {
      try {
        const snapshot = await getMemorySnapshot(controller.signal);
        if (mounted) setMemPct(snapshot.usage);
      } catch {
        if (mounted) setMemPct(fallbackMemPct);
      }
    };

    void loadCpu();
    void loadMemory();
    const refreshId = window.setInterval(() => {
      void loadCpu();
      void loadMemory();
    }, 5000);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(refreshId);
    };
  }, []);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-700/60 bg-ink-900/50 p-4 md:flex">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 ring-1 ring-inset ring-brand-500/30">
          <Terminal className="text-brand-300" size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Linux-Monitor</p>
          <p className="text-[11px] text-ink-400">{namePct}</p>
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`nav-link ${route === item.id ? 'nav-link-active' : ''}`}
          >
            <span className={route === item.id ? 'text-brand-300' : 'text-ink-400'}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="card p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-ink-300">
              <Cpu size={12} /> CPU
            </span>
            <span className="font-mono text-ink-100">{cpuPct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div className={`h-full rounded-full ${cpuTone} transition-all`} style={{ width: `${cpuPct}%` }} />
          </div>
        </div>
        <div className="card p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-ink-300">
              <HardDrive size={12} /> RAM
            </span>
            <span className="font-mono text-ink-100">{memPct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
            <div className={`h-full rounded-full ${memTone} transition-all`} style={{ width: `${memPct}%` }} />
          </div>
        </div>
        <p className="px-2 text-[10px] text-ink-500">Linux-Monitor v1.0 · mock data</p>
      </div>
    </aside>
  );
}

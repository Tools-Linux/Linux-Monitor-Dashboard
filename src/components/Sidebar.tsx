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
  const [fallbackCpuPct] = useState(() => live.cpuHistory[live.cpuHistory.length - 1] ?? 0);
  const [cpuPct, setCpuPct] = useState(fallbackCpuPct);
  const [memPct, setMemPct] = useState(
    pct(live.sys.memUsedGB, live.sys.memTotalGB)
  );

  const [hostname, setHostname] = useState(live.sys.hostname);

  const [diskSnapshot, setDiskSnapshot] = useState(() => {
    const totalGb = live.disks.reduce((sum, d) => sum + d.sizeGB, 0);
    const usedGb = live.disks.reduce((sum, d) => sum + d.usedGB, 0);

    return {
      totalGb,
      usedGb,
      freeGb: totalGb - usedGb,
      usage: pct(usedGb, totalGb),
      disks: live.disks,
    };
  });

  useEffect(() => {

  const socket = new WebSocket(
    "ws://192.168.1.130:5000/ws/dashboard"
  );


  socket.onopen = () => {
    console.log("Sidebar WebSocket connecté");
  };


  socket.onmessage = (event) => {

    const message = JSON.parse(event.data);


    switch(message.type)
    {

      case "cpu":
      {
        const cpu = message.data;

        setCpuPct(cpu.usage);
        setHostname(cpu.host);

        break;
      }


      case "memory":
      {
        const memory = message.data;

        setMemPct(memory.usage);

        break;
      }


      case "disk":
      {
        setDiskSnapshot(message.data);

        break;
      }

    }

  };


  socket.onerror = (error) => {
    console.error(
      "Sidebar WebSocket erreur",
      error
    );
  };


  socket.onclose = () => {
    console.log(
      "Sidebar WebSocket fermé"
    );
  };


  return () => {
    socket.close();
  };


}, []);

  const widgets = [
    {
      name: 'CPU',
      icon: Cpu,
      value: cpuPct,
    },
    {
      name: 'RAM',
      icon: Activity,
      value: memPct,
    },
    {
      name: 'DISK',
      icon: HardDrive,
      value: diskSnapshot.usage,
    },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-700/60 bg-ink-900/50 p-4 md:flex">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 ring-1 ring-inset ring-brand-500/30">
          <Terminal className="text-brand-300" size={20} />
        </div>

        <div>
          <p className="text-sm font-semibold text-white">
            Linux-Monitor
          </p>
          <p className="text-[11px] text-ink-400">
            {hostname}
          </p>
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
        {widgets.map(({ name, icon: Icon, value }) => {
          const tone = usageTone(value).bar;

          return (
            <div className="card p-3" key={name}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ink-300">
                  <Icon size={12} />
                  {name}
                </span>

                <span className="font-mono text-ink-100">
                  {value}%
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                <div
                  className={`h-full rounded-full ${tone} transition-all`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}

        <p className="px-2 text-[10px] text-ink-500">
          Linux-Monitor v1.0
        </p>
      </div>
    </aside>
  );
}
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
import { getCpuSnapshot } from '../lib/apiService';
import { useLiveData } from '../lib/live';
import { fmtBytes, fmtMbps, pct, usageTone } from '../lib/format';
import { Ring, Sparkline } from '../components/Charts';
import { StatTile } from '../components/StatTile';
import type { ServiceStatus } from '../lib/data';

export function DashboardPage() {
  const live = useLiveData();
  const initialCpu =
    live.cpuHistory[live.cpuHistory.length - 1] ?? 0;

  const [cpuPct, setCpuPct] = useState<number>(initialCpu);

  const [cpuHistory, setCpuHistory] = useState<number[]>(
    () => live.cpuHistory.slice(-48)
  );

  const [cpuUpdatedAt, setCpuUpdatedAt] =
    useState<string | null>(null);


useEffect(() => {

  console.log("CPU effect lancé");

  let mounted = true;

  async function loadCpu() {

    console.log("loadCpu appelé");

    try {

      const snapshot = await getCpuSnapshot();

      console.log("CPU reçu :", snapshot);

      if (!mounted) return;

      setCpuPct(snapshot.usage);

    } catch (e) {

      console.error("Erreur CPU :", e);

    }
  }


  loadCpu();


  return () => {
    mounted = false;
  };

}, []);


  const memPct = pct(
    live.sys.memUsedGB,
    live.sys.memTotalGB
  );

  const swapPct = pct(
    live.sys.swapUsedGB,
    live.sys.swapTotalGB
  );


  const totalDiskGB =
    live.disks.reduce(
      (a, d) => a + d.sizeGB,
      0
    );

  const usedDiskGB =
    live.disks.reduce(
      (a, d) => a + d.usedGB,
      0
    );


  const runningServices =
    live.services.filter(
      (s) => s.status === 'running'
    ).length;


  const failedServices =
    live.services.filter(
      (s) => s.status === 'failed'
    ).length;



  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const loadCpu = async () => {
      try {
        const snapshot = await getCpuSnapshot(controller.signal);
        if (mounted) setCpuPct(snapshot.usage);
        if (mounted) {
          setCpuHistory((prev) => [...prev.slice(1), snapshot.usage]);
        }
      } catch {
        if (mounted) setCpuPct(fallbackCpuPct);
      }
    };

    void loadCpu();
    const refreshId = window.setInterval(() => {
      void loadCpu();
    }, 5000);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(refreshId);
    };
  }, []);

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatTile
          label="Charge CPU"
          value={`${cpuPct.toFixed(1)}%`}
          sub={`${live.sys.cores} cœurs · ${live.sys.cpuModel
            .split(' ')
            .slice(0,4)
            .join(' ')}`}
          icon={<Cpu size={18}/>}
          accent="bg-brand-500"
        />


        <StatTile
          label="Mémoire RAM"
          value={`${live.sys.memUsedGB.toFixed(1)} / ${live.sys.memTotalGB} GB`}
          sub={`Cache ${live.sys.memCachedGB.toFixed(1)} GB · Swap ${live.sys.swapUsedGB.toFixed(1)} GB`}
          used={live.sys.memUsedGB}
          total={live.sys.memTotalGB}
          icon={<Server size={18}/>}
          accent="bg-accent-500"
        />


        <StatTile
          label="Stockage"
          value={fmtBytes(usedDiskGB)}
          sub={`${live.disks.length} volumes montés`}
          used={usedDiskGB}
          total={totalDiskGB}
          icon={<HardDrive size={18}/>}
          accent="bg-warn-500"
        />


        <StatTile
          label="Réseau"
          value={fmtMbps(live.sys.netRxMbps)}
          sub={`↑ ${fmtMbps(live.sys.netTxMbps)} · total ↓ ${live.sys.netRxTotalGB} GB`}
          icon={<Network size={18}/>}
          accent="bg-accent-500"
        />

      </div>
9990d4fd5de7


      <div className="card card-pad">

        <h2 className="text-sm font-semibold text-white">
          Activité CPU
        </h2>


        <div className="mt-4">

          <div className="flex justify-between text-xs">

            <span>
              CPU
            </span>

            <span className="font-mono text-brand-300">
              {cpuPct.toFixed(2)}%
            </span>

          </div>


          <Sparkline
            data={cpuHistory}
            color="#10b981"
            height={56}
            max={100}
          />


          <p className="mt-2 text-[11px] text-ink-500">
            Dernière API :
            {" "}
            {cpuUpdatedAt ?? "en attente"}
          </p>

        </div>

      </div>



      <div className="card card-pad">

        <h2 className="text-sm font-semibold text-white">
          Synthèse système
        </h2>


        <div className="mt-4 flex justify-center">

          <Ring
            value={cpuPct}
            color="#10b981"
            sublabel="CPU"
          />

        </div>

      </div>


    </div>
  );
}
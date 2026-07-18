import { useEffect, useRef, useState } from 'react';
import {
  makeCpuCores,
  makeDisks,
  makeIfaces,
  makeLog,
  makeProcesses,
  makeServices,
  makeSystemInfo,
  seedLogs,
  walk,
  walkCores,
  type Disk,
  type LogEntry,
  type NetIface,
  type Process,
  type Service,
  type SystemInfo,
} from './data';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface LiveState {
  sys: SystemInfo;
  services: Service[];
  disks: Disk[];
  ifaces: NetIface[];
  processes: Process[];
  logs: LogEntry[];
  cpuHistory: number[];
  memHistory: number[];
  netRxHistory: number[];
  netTxHistory: number[];
}

const HIST_LEN = 48;

function initial(): LiveState {
  const cores = makeCpuCores(16);
  const sys = makeSystemInfo(cores);
  return {
    sys,
    services: makeServices(),
    disks: makeDisks(),
    ifaces: makeIfaces(),
    processes: makeProcesses(),
    logs: seedLogs(40),
    cpuHistory: Array.from({ length: HIST_LEN }, () => 20 + Math.random() * 15),
    memHistory: Array.from({ length: HIST_LEN }, () => sys.memUsedGB),
    netRxHistory: Array.from({ length: HIST_LEN }, () => 80),
    netTxHistory: Array.from({ length: HIST_LEN }, () => 40),
  } as LiveState;
}

export function useLiveData(): LiveState {
  const [state, setState] = useState<LiveState>(initial);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    const tick = setInterval(() => {
      const prev = ref.current;
      const cores = walkCores(prev.sys.cpuCores);
      const avgCpu = cores.reduce((a, c) => a + c.usage, 0) / cores.length;
      const memUsedGB = walk(prev.sys.memUsedGB, 24, 52, 1.2);
      const swapUsedGB = walk(prev.sys.swapUsedGB, 0.1, 2.5, 0.2);
      const netRx = walk(prev.sys.netRxMbps, 20, 620, 40);
      const netTx = walk(prev.sys.netTxMbps, 10, 320, 25);
      const tempCpu = walk(prev.sys.tempCpu, 48, 78, 2);
      const powerWatts = walk(prev.sys.powerWatts, 110, 240, 8);
      const load1 = +clamp(avgCpu / 100 * 1.2 + Math.random() * 0.1, 0, 4).toFixed(2);
      const load5 = +clamp(load1 * 0.9 + 0.1, 0, 4).toFixed(2);
      const load15 = +clamp(load5 * 0.95 + 0.05, 0, 4).toFixed(2);

      setState({
        sys: {
          ...prev.sys,
          cpuCores: cores,
          memUsedGB,
          swapUsedGB,
          netRxMbps: netRx,
          netTxMbps: netTx,
          tempCpu,
          powerWatts,
          load: [load1, load5, load15],
          processes: prev.sys.processes + Math.round((Math.random() - 0.5) * 4),
        },
        services: prev.services.map((s) =>
          s.status === 'running'
            ? { ...s, cpu: +walk(s.cpu, 0.1, 14, 1.5).toFixed(1), memMB: Math.round(walk(s.memMB, 30, 1100, 40)) }
            : s
        ),
        disks: prev.disks.map((d) => ({
          ...d,
          readMBps: +walk(d.readMBps, 0, 260, 30).toFixed(1),
          writeMBps: +walk(d.writeMBps, 0, 180, 22).toFixed(1),
          tempC: +walk(d.tempC, 26, 52, 2).toFixed(0),
        })),
        ifaces: prev.ifaces.map((n) =>
          n.status === 'up'
            ? { ...n, rxMbps: +walk(n.rxMbps, 5, n.speedGbps * 100, 50).toFixed(1), txMbps: +walk(n.txMbps, 2, n.speedGbps * 100, 35).toFixed(1) }
            : n
        ),
        processes: prev.processes.map((p) => ({ ...p, cpu: +walk(p.cpu, 0, 35, 3).toFixed(1) })).sort((a, b) => b.cpu - a.cpu),
        logs: [makeLog(), ...prev.logs].slice(0, 120),
        cpuHistory: [...prev.cpuHistory.slice(1), avgCpu],
        memHistory: [...prev.memHistory.slice(1), memUsedGB],
        netRxHistory: [...prev.netRxHistory.slice(1), netRx],
        netTxHistory: [...prev.netTxHistory.slice(1), netTx],
      });
    }, 1500);
    return () => clearInterval(tick);
  }, []);

  return state;
}

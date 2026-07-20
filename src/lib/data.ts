// Mock Linux monitoring data engine.
// Generates realistic-ish, evolving time-series and tables for the dashboard.

export type ServiceStatus = 'running' | 'stopped' | 'failed' | 'degraded';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface Service {
  name: string;
  unit: string;
  status: ServiceStatus;
  enabled: boolean;
  description: string;
  cpu: number;
  memMB: number;
  pid: number;
  uptime: string;
}

export interface Disk {
  device: string;
  mount: string;
  fstype: string;
  sizeGB: number;
  usedGB: number;
  tempC: number;
  readMBps: number;
  writeMBps: number;
  health: 'ok' | 'warn' | 'critical';
}

export interface Network {
  name: string;
  ip: string;
  mac: string;
  status: 'up' | 'down';
  rxMbps: number;
  txMbps: number;
  rxBytes: number;
  txBytes: number;
}

export interface Process {
  pid: number;
  user: string;
  command: string;
  cpu: number;
  memMB: number;
  state: 'R' | 'S' | 'D' | 'Z' | 'T';
  started: string;
}

export interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  unit: string;
  message: string;
}

export interface CpuCore {
  id: number;
  usage: number;
  freqGHz: number;
  tempC: number;
}

export interface CpuLoad {
  core: number;
  usage: number;
}

export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  load: [number, number, number];
  servicescount: number;
  cpuModel: string;
  cores: number;
  processes: number;
  cpuCores: CpuCore[];
  memTotalGB: number;
  memUsedGB: number;
  memCachedGB: number;
  swapTotalGB: number;
  swapUsedGB: number;
  netRxMbps: number;
  netTxMbps: number;
  netRxTotalGB: number;
  netTxTotalGB: number;
  tempCpu: number;
  tempGpu: number;
  powerWatts: number;
  threads: number;
}

export interface Information {
  time: string;
}

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

let logCounter = 1;

const SERVICE_DEFS: Array<Omit<Service, 'cpu' | 'memMB' | 'pid' | 'uptime'>> = [];

const DISK_DEFS: Array<Omit<Disk, 'usedGB' | 'tempC' | 'readMBps' | 'writeMBps'>> = [];

const IFACE_DEFS: Array<Omit<Network, 'rxMbps' | 'txMbps'>> = [];

const PROCESS_DEFS: Array<Omit<Process, 'cpu' | 'memMB' | 'state'>> = [];

const LOG_TEMPLATES: Array<{ level: LogLevel; unit: string; message: string }> = [];

const INFO_DEFS: Array<Omit<Information, 'time'>> = [];

const USERS = ['root', 'deploy', 'postgres', 'redis', 'www-data', 'monitor', 'git', 'grafana', 'systemd+'];
const COMMANDS = [
  '/usr/sbin/sshd -D',
  'nginx: worker process',
  'postgres: 14/main: writer',
  'node /srv/api/dist/server.js',
  'python3 batch_runner.py',
  '/usr/bin/redis-server *:6379',
  '/usr/bin/dockerd -H fd://',
  '/usr/local/bin/healthcheck',
  'java -Xmx2g -jar app.jar',
  'go run ./cmd/server',
  'rustc --edition 2021 crate',
  'ffmpeg -i input.mp4 -c:v libx265 out.mkv',
];

function fmtUptime(): string {
  const days = 6;
  const h = 14 + Math.floor(rand(0, 4));
  const m = Math.floor(rand(0, 59));
  return `${days}j ${h}h ${m}min`;
}

export function makeCpuCores(count: number): CpuCore[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    usage: rand(8, 45),
    freqGHz: rand(2.4, 4.8),
    tempC: rand(42, 62),
  }));
}

export function makeSystemInfo(partial: Partial<SystemInfo>): SystemInfo {
  return {
    hostname: '',
    os: '',
    kernel: '',
    arch: '',
    load: [0, 0, 0],
    cpuModel: '',
    cores: 0,
    cpuCores: [],
    memTotalGB: 0,
    memUsedGB: 0,
    memCachedGB: 0,
    swapTotalGB: 0,
    swapUsedGB: 0,
    netRxMbps: 0,
    netTxMbps: 0,
    netRxTotalGB: 0,
    netTxTotalGB: 0,
    tempCpu: 0,
    tempGpu: 0,
    powerWatts: 0,
    processes: 0,
    threads: 0,
    servicescount: 0,
    ...partial,
  };
}
export function makeServices(): Service[] {
  return SERVICE_DEFS.map((s, i) => ({
    ...s,
    cpu: s.status === 'running' ? rand(0.1, 8) : 0,
    memMB: s.status === 'running' ? rand(40, 920) : 0,
    pid: 800 + i * 37,
    uptime: s.status === 'running' ? '6j 14h' : s.status === 'stopped' ? '—' : '3j 02h',
  }));
}

export function makeInformation(): Information[] {
  return INFO_DEFS.map((i) => ({
    ...i,
    time: new Date().toISOString(),
  }));
}

export function makeDisks(): Disk[] {
  return DISK_DEFS.map((d) => {
    const usedGB = d.health === 'warn' ? d.sizeGB * rand(0.82, 0.93) : d.sizeGB * rand(0.18, 0.62);
    return {
      ...d,
      usedGB,
      tempC: rand(28, 48),
      readMBps: rand(0, 220),
      writeMBps: rand(0, 140),
    };
  });
}

export function makeIfaces(): Network[] {
  return IFACE_DEFS.map((n) => ({
    ...n,
    rxMbps: n.status === 'up' ? rand(5, 600) : 0,
    txMbps: n.status === 'up' ? rand(2, 300) : 0,
  }));
}

export function makeProcesses(): Process[] {
  const base = PROCESS_DEFS.map((p) => ({
    ...p,
    cpu: +rand(0, 24).toFixed(1),
    memMB: Math.round(rand(8, 1400)),
    state: (['R', 'S', 'S', 'S', 'D'] as const)[Math.floor(rand(0, 5))],
  }));
  // add a few dynamic ones
  for (let i = 0; i < 4; i++) {
    base.push({
      pid: 6000 + i * 13,
      user: USERS[Math.floor(rand(0, USERS.length))],
      command: COMMANDS[Math.floor(rand(0, COMMANDS.length))],
      cpu: +rand(0, 30).toFixed(1),
      memMB: Math.round(rand(20, 900)),
      state: 'R',
      started: '2026-07-18 ' + String(Math.floor(rand(0, 23))).padStart(2, '0') + ':' + String(Math.floor(rand(0, 59))).padStart(2, '0'),
    });
  }
  return base.sort((a, b) => b.cpu - a.cpu);
}

export function makeLog(): LogEntry {
  const tpl =
    LOG_TEMPLATES[Math.floor(rand(0, LOG_TEMPLATES.length))] ??
    { level: 'info' as LogLevel, unit: 'system', message: 'No log templates configured' };
  const now = new Date();
  return {
    id: logCounter++,
    time: now.toISOString().substring(11, 19),
    level: tpl.level,
    unit: tpl.unit,
    message: tpl.message,
  };
}

export function seedLogs(n: number): LogEntry[] {
  return Array.from({ length: n }, () => makeLog()).reverse();
}

// Smooth random walk for live metrics
export function walk(value: number, min: number, max: number, step: number): number {
  const next = value + rand(-step, step);
  return clamp(next, min, max);
}

export function walkCores(cores: CpuCore[]): CpuCore[] {
  return cores.map((c) => ({
    ...c,
    usage: clamp(walk(c.usage, 2, 95, 8), 2, 95),
    freqGHz: +clamp(walk(c.freqGHz, 2.4, 5.0, 0.2), 2.4, 5.0).toFixed(2),
    tempC: +clamp(walk(c.tempC, 38, 82, 3), 38, 82).toFixed(0),
  }));
}

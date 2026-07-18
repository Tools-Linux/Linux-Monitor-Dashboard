// Mock Linux monitoring data engine.
// Generates realistic-ish, evolving time-series and tables for the dashboard.

export type ServiceStatus = 'running' | 'stopped' | 'failed' | 'degraded';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface Service {
  name: string;
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

export interface NetIface {
  name: string;
  ip: string;
  mac: string;
  rxMbps: number;
  txMbps: number;
  status: 'up' | 'down';
  speedGbps: number;
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

export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  uptime: string;
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

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

let logCounter = 1;

const SERVICE_DEFS: Array<Omit<Service, 'cpu' | 'memMB' | 'pid' | 'uptime'>> = [
  { name: 'SSH Server', unit: 'sshd.service', status: 'running', enabled: true, description: 'OpenBSD secure shell server' },
  { name: 'Nginx', unit: 'nginx.service', status: 'running', enabled: true, description: 'High-performance web server' },
  { name: 'PostgreSQL', unit: 'postgresql.service', status: 'running', enabled: true, description: 'Object-relational SQL database' },
  { name: 'Redis', unit: 'redis-server.service', status: 'running', enabled: true, description: 'In-memory data store' },
  { name: 'Docker Engine', unit: 'docker.service', status: 'running', enabled: true, description: 'Container runtime daemon' },
  { name: 'Cron', unit: 'cron.service', status: 'running', enabled: true, description: 'Periodic command scheduler' },
  { name: 'systemd-resolved', unit: 'systemd-resolved.service', status: 'running', enabled: true, description: 'Network name resolution' },
  { name: 'UFW Firewall', unit: 'ufw.service', status: 'running', enabled: true, description: 'Uncomplicated firewall' },
  { name: 'Fail2ban', unit: 'fail2ban.service', status: 'running', enabled: true, description: 'Intrusion prevention framework' },
  { name: 'Prometheus Node Exporter', unit: 'node_exporter.service', status: 'running', enabled: true, description: 'Metrics exporter' },
  { name: 'Grafana', unit: 'grafana-server.service', status: 'degraded', enabled: true, description: 'Analytics & dashboards' },
  { name: 'Mail Transport Agent', unit: 'postfix.service', status: 'stopped', enabled: false, description: 'SMTP mail transport' },
  { name: 'Cups Printer', unit: 'cups.service', status: 'stopped', enabled: false, description: 'Print server' },
  { name: 'Bluetooth Daemon', unit: 'bluetooth.service', status: 'failed', enabled: true, description: 'Bluetooth service' },
];

const DISK_DEFS: Array<Omit<Disk, 'usedGB' | 'tempC' | 'readMBps' | 'writeMBps'>> = [
  { device: '/dev/nvme0n1p2', mount: '/', fstype: 'ext4', sizeGB: 240, health: 'ok' },
  { device: '/dev/nvme0n1p1', mount: '/boot', fstype: 'vfat', sizeGB: 1, health: 'ok' },
  { device: '/dev/sda1', mount: '/data', fstype: 'xfs', sizeGB: 4000, health: 'warn' },
  { device: '/dev/sdb1', mount: '/backup', fstype: 'ext4', sizeGB: 8000, health: 'ok' },
  { device: '/dev/mapper/vault', mount: '/vault', fstype: 'luks', sizeGB: 2000, health: 'ok' },
];

const IFACE_DEFS: Array<Omit<NetIface, 'rxMbps' | 'txMbps'>> = [
  { name: 'eno1', ip: '10.0.42.10', mac: 'a0:36:9f:12:4c:88', status: 'up', speedGbps: 10 },
  { name: 'eno2', ip: '10.0.42.11', mac: 'a0:36:9f:12:4c:89', status: 'up', speedGbps: 10 },
  { name: 'wg0', ip: '10.100.0.1', mac: '—', status: 'up', speedGbps: 1 },
  { name: 'docker0', ip: '172.17.0.1', mac: '02:42:7a:9b:1d:0e', status: 'up', speedGbps: 1 },
  { name: 'veth-plumb', ip: '—', mac: '9e:11:3a:bb:22:7f', status: 'down', speedGbps: 0 },
];

const PROCESS_DEFS: Array<Omit<Process, 'cpu' | 'memMB' | 'state'>> = [
  { pid: 1, user: 'root', command: '/sbin/init', started: '2026-07-12 09:14' },
  { pid: 482, user: 'root', command: '/usr/lib/systemd/systemd-journald', started: '2026-07-12 09:14' },
  { pid: 611, user: 'systemd+', command: '/lib/systemd/systemd-networkd', started: '2026-07-12 09:14' },
  { pid: 742, user: 'postgres', command: 'postgres: 14/main: writer', started: '2026-07-12 09:15' },
  { pid: 1024, user: 'www-data', command: 'nginx: worker process', started: '2026-07-12 09:15' },
  { pid: 1288, user: 'redis', command: '/usr/bin/redis-server *:6379', started: '2026-07-12 09:16' },
  { pid: 1567, user: 'root', command: '/usr/bin/dockerd -H fd://', started: '2026-07-12 09:16' },
  { pid: 2048, user: 'prometheus', command: '/usr/bin/node_exporter', started: '2026-07-12 09:17' },
  { pid: 2210, user: 'grafana', command: '/usr/sbin/grafana server', started: '2026-07-12 09:17' },
  { pid: 3010, user: 'root', command: '/usr/sbin/sshd -D', started: '2026-07-12 09:18' },
  { pid: 3456, user: 'deploy', command: 'node /srv/api/dist/server.js', started: '2026-07-15 22:41' },
  { pid: 4022, user: 'deploy', command: 'python3 batch_runner.py', started: '2026-07-18 03:02' },
  { pid: 4188, user: 'git', command: 'git-http-backend', started: '2026-07-18 07:55' },
  { pid: 4444, user: 'root', command: 'kworker/u32:2-events', started: '2026-07-12 09:14' },
  { pid: 5021, user: 'monitor', command: '/usr/local/bin/healthcheck', started: '2026-07-18 08:10' },
];

const LOG_TEMPLATES: Array<{ level: LogLevel; unit: string; message: string }> = [
  { level: 'info', unit: 'sshd.service', message: 'Accepted publickey for deploy from 10.0.42.51 port 51824' },
  { level: 'info', unit: 'nginx.service', message: 'GET /api/v1/health 200 12ms (127.0.0.1)' },
  { level: 'warn', unit: 'grafana-server.service', message: 'Slow query detected: dashboard=overview (1.4s)' },
  { level: 'error', unit: 'bluetooth.service', message: 'Failed to start Bluetooth daemon: adapter not found' },
  { level: 'info', unit: 'postgresql.service', message: 'checkpoint complete: wrote 128 buffers (1.0MB)' },
  { level: 'warn', unit: 'ufw.service', message: 'Blocked inbound TCP 23 from 192.168.0.14 to 10.0.42.10' },
  { level: 'info', unit: 'docker.service', message: 'Container "redis" health status: healthy' },
  { level: 'error', unit: 'kernel', message: 'EXT4-fs warning: sda1: checktime reached, running e2fsck recommended' },
  { level: 'debug', unit: 'systemd-resolved.service', message: 'DNS query: api.internal -> 10.0.42.11 (cache hit)' },
  { level: 'info', unit: 'fail2ban.service', message: 'Ban 203.0.113.45 for 1h (sshd, maxretry=5)' },
  { level: 'warn', unit: 'node_exporter.service', message: 'collector "textfile" skipped: no textfiles dir' },
  { level: 'info', unit: 'cron.service', message: 'Job `/usr/local/bin/backup.sh` finished in 4m12s' },
];

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

export function makeSystemInfo(cores: CpuCore[]): SystemInfo {
  const memTotalGB = 64;
  const memUsedGB = rand(28, 38);
  return {
    hostname: 'srv-prod-01',
    os: 'Debian GNU/Linux 12 (bookworm)',
    kernel: '6.1.0-21-amd64',
    arch: 'x86_64',
    uptime: fmtUptime(),
    load: [0.42, 0.58, 0.61],
    cpuModel: 'AMD Ryzen 9 7950X 16-Core/32-Threads',
    cores: cores.length,
    cpuCores: cores,
    memTotalGB,
    memUsedGB,
    memCachedGB: rand(6, 10),
    swapTotalGB: 8,
    swapUsedGB: rand(0.2, 1.4),
    netRxMbps: rand(40, 320),
    netTxMbps: rand(20, 180),
    netRxTotalGB: 1842.7,
    netTxTotalGB: 968.1,
    tempCpu: rand(52, 68),
    tempGpu: rand(48, 70),
    powerWatts: rand(120, 210),
    processes: 312,
    threads: 1842,
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

export function makeIfaces(): NetIface[] {
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
  const tpl = LOG_TEMPLATES[Math.floor(rand(0, LOG_TEMPLATES.length))];
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

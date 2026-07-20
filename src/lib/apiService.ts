import { Disk, Network } from "./data";

export type DiskSnapshot = {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  usage: number;
  disks: Disk[];
};

export type CpuCoreLoad = {
  core: string;
  usage: number;
};

export type CpuSnapshot = {
  usage: number;
  name: string;
  core: string;
  arch: string;
  processes: number;
  threads: number;
  host: string;
  kernel: string;
  os: string;
  tempCpu: number;
  charge: CpuCoreLoad[];
};

export type NetworkSnapshot = {
  name: string;
  ip: string;
  mac: string;
  status: 'up' | 'down';
  speedMbps: number;
  rxMbps: number;
  txMbps: number;
  rxBytes: number;
  txBytes: number;
};

export type InformationSnapshot = {
  time: string;
}

export type MemorySnapshot = {
  usage: number;
  usedGb?: number;
  totalGb?: number;
  freeGb?: number;
  usedMb?: number;
  totalMb?: number;
  freeMb?: number;
  usagePercent?: number;
  availableMb?: number;
};

export type ServiceItem = {
  name: string;
  state: string;
};

export type ServicesSnapshot = {
  total: number;
  enabled: number;
  disabled: number;
  list: ServiceItem[];
};

export type ApiLogEntry = {
  timestamp: string;
  level: string;
  service: string;
  pid: string;
  message: string;
};

export type LogsSnapshot = {
  logs: ApiLogEntry[];
};

const API_BASE_URL = 'http://192.168.1.130:5000/api';

function isDiskSnapshot(value: unknown): value is DiskSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return ['totalGb', 'usedGb', 'freeGb', 'usage'].every((key) => typeof candidate[key] === 'number');
}

function isNetworkSnapshot(value: unknown): value is NetworkSnapshot {
  return (
    Array.isArray(value) &&
    value.every((item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Network).name === 'string' &&
      typeof (item as Network).ip === 'string' &&
      typeof (item as Network).mac === 'string' &&
      ((item as Network).status === 'up' ||
        (item as Network).status === 'down') &&
      typeof (item as Network).speedMbps === 'number'
    )
  );
}


function isCpuSnapshot(value: unknown): value is CpuSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.usage === 'number' &&
    typeof candidate.name === 'string' &&
    (typeof candidate.core === 'string' || typeof candidate.core === 'number') &&
    Array.isArray(candidate.charge) &&
    candidate.charge.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CpuCoreLoad).core === 'string' &&
        typeof (item as CpuCoreLoad).usage === 'number'
    )
  );
}
function isInformationSnapshot(value: unknown): value is InformationSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.time === 'string'
  );
}


function isMemorySnapshot(value: unknown): value is MemorySnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  const hasLegacyShape = typeof candidate.usage === 'number';
  const hasMbShape =
    typeof candidate.totalMb === 'number' &&
    typeof candidate.usedMb === 'number' &&
    typeof candidate.availableMb === 'number' &&
    typeof candidate.usagePercent === 'number';

  if (!hasLegacyShape && !hasMbShape) return false;

  const optionalNumberFields = ['usedGb', 'totalGb', 'freeGb', 'usedMb', 'totalMb', 'freeMb', 'usagePercent', 'availableMb'];
  return optionalNumberFields.every((key) => candidate[key] == null || typeof candidate[key] === 'number');
}

function isServiceItem(value: unknown): value is ServiceItem {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === 'string' && typeof candidate.state === 'string';
}

function isServicesSnapshot(value: unknown): value is ServicesSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.total === 'number' &&
    typeof candidate.enabled === 'number' &&
    typeof candidate.disabled === 'number' &&
    Array.isArray(candidate.list) &&
    candidate.list.every(isServiceItem)
  );
}

function isApiLogEntry(value: unknown): value is ApiLogEntry {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.timestamp === 'string' &&
    typeof candidate.level === 'string' &&
    typeof candidate.service === 'string' &&
    typeof candidate.pid === 'string' &&
    typeof candidate.message === 'string'
  );
}

function isLogsSnapshot(value: unknown): value is LogsSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.logs) && candidate.logs.every(isApiLogEntry);
}

function unwrapServicesPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;

  const candidate = value as Record<string, unknown>;
  if ('services' in candidate) {
    return candidate.services;
  }

  return value;
}

function unwrapLogsPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;

  const candidate = value as Record<string, unknown>;
  if ('logs' in candidate && Array.isArray(candidate.logs)) {
    return value;
  }

  if ('data' in candidate) {
    return candidate.data;
  }

  return value;
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getDiskSnapshot(signal?: AbortSignal): Promise<DiskSnapshot> {
  const data = await fetchJson<unknown>('/disk', signal);

  if (!isDiskSnapshot(data)) {
    throw new Error('Réponse API invalide');
  }

  return data;
}

export async function getNetworkSnapshot(signal?: AbortSignal): Promise<NetworkSnapshot> {
  const data = await fetchJson<unknown>('/network', signal);

  if (!isNetworkSnapshot(data)) {
    throw new Error('Réponse API invalide');
  }

  return data;
}

export async function getCpuSnapshot(signal?: AbortSignal): Promise<CpuSnapshot> {
  const data = await fetchJson<unknown>('/cpu', signal);

  if (!isCpuSnapshot(data)) {
    throw new Error('Réponse API invalide');
  }

  return {
    ...data,
    core: String(data.core),
  };
}
export async function getInformationSnapshot(signal?: AbortSignal): Promise<InformationSnapshot> {
  const data = await fetchJson<unknown>('/information', signal);

  if (!isInformationSnapshot(data)) {
    throw new Error('Réponse API invalide');
  }
  return {
    ...data,
    time: String(data.time),
  };
}


export async function getMemorySnapshot(signal?: AbortSignal): Promise<MemorySnapshot> {
  const data = await fetchJson<unknown>('/memory', signal);

  if (!isMemorySnapshot(data)) {
    throw new Error('Réponse API invalide');
  }

  if (typeof data.usagePercent === 'number' && typeof data.availableMb === 'number') {
    const usedGb = data.usedMb != null ? data.usedMb / 1024 : undefined;
    const totalGb = data.totalMb != null ? data.totalMb / 1024 : undefined;
    const freeGb = data.availableMb / 1024;

    return {
      usage: data.usagePercent,
      usedMb: data.usedMb,
      totalMb: data.totalMb,
      freeMb: data.availableMb,
      usedGb,
      totalGb,
      freeGb,
      usagePercent: data.usagePercent,
      availableMb: data.availableMb,
    };
  }

  return data;
}

export async function getServicesSnapshot(signal?: AbortSignal): Promise<ServicesSnapshot> {
  const data = await fetchJson<unknown>('/services', signal);
  const payload = unwrapServicesPayload(data);

  if (!isServicesSnapshot(payload)) {
    throw new Error('Réponse API invalide');
  }

  return payload;
}

export async function getLogsSnapshot(signal?: AbortSignal): Promise<LogsSnapshot> {
  const data = await fetchJson<unknown>('/logs', signal);
  const payload = unwrapLogsPayload(data);

  if (!isLogsSnapshot(payload)) {
    throw new Error('Réponse API invalide');
  }

  return payload;
}
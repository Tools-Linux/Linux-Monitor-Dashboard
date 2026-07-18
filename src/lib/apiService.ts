export type DiskSnapshot = {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  usage: number;
};

export type CpuSnapshot = {
  usage: number;
};

export type MemorySnapshot = {
  usage: number;
  usedGb?: number;
  totalGb?: number;
  freeGb?: number;
  usedMb?: number;
  totalMb?: number;
  freeMb?: number;
};

const API_BASE_URL = 'http://192.168.1.130:5000/api';

function isDiskSnapshot(value: unknown): value is DiskSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return ['totalGb', 'usedGb', 'freeGb', 'usage'].every((key) => typeof candidate[key] === 'number');
}

function isCpuSnapshot(value: unknown): value is CpuSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return typeof candidate.usage === 'number';
}

function isMemorySnapshot(value: unknown): value is MemorySnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.usage !== 'number') return false;

  const optionalNumberFields = ['usedGb', 'totalGb', 'freeGb', 'usedMb', 'totalMb', 'freeMb'];
  return optionalNumberFields.every((key) => candidate[key] == null || typeof candidate[key] === 'number');
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

export async function getCpuSnapshot(signal?: AbortSignal): Promise<CpuSnapshot> {
  const data = await fetchJson<unknown>('/cpu', signal);

  if (!isCpuSnapshot(data)) {
    throw new Error('Réponse API invalide');
  }

  return data;
}

export async function getMemorySnapshot(signal?: AbortSignal): Promise<MemorySnapshot> {
  const data = await fetchJson<unknown>('/memory', signal);

  if (!isMemorySnapshot(data)) {
    throw new Error('Réponse API invalide');
  }

  return data;
}
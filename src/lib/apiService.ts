export type DiskSnapshot = {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  usage: number;
};

export type CpuSnapshot = {
  usage: number;
  name: string;
  core: string;
};

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

const API_BASE_URL = 'http://192.168.1.130:5000/api';

function isDiskSnapshot(value: unknown): value is DiskSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return ['totalGb', 'usedGb', 'freeGb', 'usage'].every((key) => typeof candidate[key] === 'number');
}

function isCpuSnapshot(value: unknown): value is CpuSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.usage === 'number' &&
    typeof candidate.name === 'string' &&
    (typeof candidate.core === 'string' || typeof candidate.core === 'number')
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

  return {
    ...data,
    core: String(data.core),
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
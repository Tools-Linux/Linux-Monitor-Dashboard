export type DiskSnapshot = {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  usage: number;
};

const API_BASE_URL = 'http://localhost:5000/api';

function isDiskSnapshot(value: unknown): value is DiskSnapshot {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  return ['totalGb', 'usedGb', 'freeGb', 'usage'].every((key) => typeof candidate[key] === 'number');
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
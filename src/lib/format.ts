export function fmtBytes(gb: number): string {
  if (gb < 1) return `${(gb * 1024).toFixed(0)} MB`;
  if (gb < 1024) return `${gb.toFixed(1)} GB`;
  return `${(gb / 1024).toFixed(2)} TB`;
}

export function fmtMbps(mbps: number): string {
  if (mbps < 1) return `${(mbps * 1000).toFixed(0)} Kbps`;
  if (mbps < 1000) return `${mbps.toFixed(1)} Mbps`;
  return `${(mbps / 1000).toFixed(2)} Gbps`;
}

export function pct(used: number, total: number): number {
  return total > 0 ? (used / total) * 100 : 0;
}

export function usageTone(p: number): { bar: string; text: string } {
  if (p >= 90) return { bar: 'bg-err-500', text: 'text-err-400' };
  if (p >= 75) return { bar: 'bg-warn-500', text: 'text-warn-400' };
  return { bar: 'bg-brand-500', text: 'text-brand-300' };
}

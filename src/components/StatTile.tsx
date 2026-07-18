import { Bar } from './Charts';
import { pct, usageTone } from '../lib/format';

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  used?: number;
  total?: number;
  icon?: React.ReactNode;
  accent?: string;
}

export function StatTile({ label, value, sub, used, total, icon, accent = 'bg-brand-500' }: StatTileProps) {
  const p = used != null && total != null ? pct(used, total) : null;
  const tone = p != null ? usageTone(p) : null;
  return (
    <div className="stat-tile">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-ink-300">{sub}</p>}
        </div>
        {icon && (
          <div className={`grid h-10 w-10 place-items-center rounded-xl bg-ink-800 text-ink-200 ring-1 ring-inset ring-ink-700`}>
            {icon}
          </div>
        )}
      </div>
      {p != null && tone && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-ink-300">{p.toFixed(0)}% utilisé</span>
            <span className={tone.text}>{used != null && total != null ? `${used.toFixed(1)} / ${total}` : ''}</span>
          </div>
          <Bar value={p} className={`bg-ink-700 [&>div]:${tone.bar}`} />
        </div>
      )}
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${accent} opacity-[0.06] blur-2xl`} />
    </div>
  );
}

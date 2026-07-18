import { Bell, RefreshCw, Search, Terminal } from 'lucide-react';
import { useLiveData } from '../lib/live';
import { fmtMbps } from '../lib/format';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const live = useLiveData();
  const load = live.sys.load;
  const status = load[0] > 3 ? 'critical' : load[0] > 1.5 ? 'warn' : 'ok';
  const dot = status === 'critical' ? 'bg-err-500' : status === 'warn' ? 'bg-warn-500' : 'bg-brand-500';
  const statusLabel = status === 'critical' ? 'Critique' : status === 'warn' ? 'Charge élevée' : 'Opérationnel';

  return (
    <header className="sticky top-0 z-10 border-b border-ink-700/60 bg-ink-950/70 backdrop-blur-md">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex items-center gap-3 md:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 ring-1 ring-inset ring-brand-500/30">
            <Terminal className="text-brand-300" size={18} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-white">{title}</h1>
          {subtitle && <p className="truncate text-xs text-ink-400">{subtitle}</p>}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={15} />
            <input className="input pl-9 pr-3 py-1.5 w-64" placeholder="Rechercher un service, PID…" />
          </div>
        </div>

        <div className="hidden items-center gap-4 px-2 text-xs text-ink-300 md:flex">
          <div className="flex items-center gap-1.5">
            <span className={`dot ${dot} animate-pulseSoft`} />
            <span className="font-medium text-ink-100">{statusLabel}</span>
          </div>
          <div className="h-4 w-px bg-ink-700" />
          <div className="font-mono">
            Load <span className="text-ink-100">{load[0].toFixed(2)}</span> · {load[1].toFixed(2)} · {load[2].toFixed(2)}
          </div>
          <div className="h-4 w-px bg-ink-700" />
          <div className="font-mono">
            ↓ {fmtMbps(live.sys.netRxMbps)} · ↑ {fmtMbps(live.sys.netTxMbps)}
          </div>
        </div>

        <button className="btn btn-ghost" title="Rafraîchir">
          <RefreshCw size={15} />
        </button>
        <button className="btn btn-ghost relative" title="Notifications">
          <Bell size={15} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-400" />
        </button>
      </div>
    </header>
  );
}

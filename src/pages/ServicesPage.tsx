import { useEffect, useState } from 'react';
import { useLiveData } from '../lib/live';
import {
  WS_BASE_URL,
  type ServiceItem,
  type ServicesSnapshot,
} from '../lib/apiService';

const WS_URL = `${WS_BASE_URL}/services`;

const stateMeta = {
  enabled: {
    label: "Activé",
    cls: "bg-brand-500/10 text-brand-300 ring-brand-500/30",
    dot: "bg-brand-500",
  },
  disabled: {
    label: "Désactivé",
    cls: "bg-ink-700/60 text-ink-300 ring-ink-600",
    dot: "bg-ink-400",
  },
  static: {
    label: "Statique",
    cls: "bg-yellow-500/10 text-yellow-300 ring-yellow-500/30",
    dot: "bg-yellow-500",
  },
} as const;


type Filter =
  | "all"
  | "enabled"
  | "disabled"
  | "static";


function describeState(state: string) {
  return (
    stateMeta[state as keyof typeof stateMeta] ?? {
      label: state,
      cls: "bg-ink-700/60 text-ink-300 ring-ink-600",
      dot: "bg-ink-500",
    }
  );
}

function toFallbackServices(services: Array<{ name: string; enabled: boolean }>): ServiceItem[] {
  return services.map((service) => ({
    name: service.name,
    state: service.enabled ? 'enabled' : 'disabled',
  }));
}

function summarizeServices(snapshot: ServicesSnapshot | null, fallback: ServiceItem[]) {
  const list = snapshot?.list ?? fallback;

  return {
    total: snapshot?.total ?? list.length,
    enabled: snapshot?.enabled ?? list.filter(s => s.state === "enabled").length,
    disabled: snapshot?.disabled ?? list.filter(s => s.state === "disabled").length,
    static: snapshot?.static ?? list.filter(s => s.state === "static").length,
    list,
  };
}

export function ServicesPage() {
  const live = useLiveData();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [servicesSnapshot, setServicesSnapshot] = useState<ServicesSnapshot | null>(null);
  const [fallbackServices] = useState(() => toFallbackServices(live.services));


  useEffect(() => {
  const socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("Services WS connecté");
  };

    socket.onmessage = (event) => {
      console.log("RAW WS :", event.data);

      let data: any;

      try {
        data = JSON.parse(event.data);
      } catch {
        console.warn("Message WS invalide :", event.data);
        return;
      }

      console.log("SERVICES WS :", data);

      if (!data.services || !Array.isArray(data.services)) {
        return;
      }

      const snapshot: ServicesSnapshot = {
        total: data.services.length,
        enabled: data.services.filter((s: ServiceItem) => s.state === "enabled").length,
        disabled: data.services.filter((s: ServiceItem) => s.state === "disabled").length,
        static: data.services.filter((s: ServiceItem) => s.state === "static").length,
        list: data.services,
      };

      setServicesSnapshot(snapshot);
    };
  socket.onerror = (err) => {
    console.error("Services WS erreur", err);
  };

  return () => {
    socket.close();
  };
}, []);

  const serviceSummary = summarizeServices(servicesSnapshot, fallbackServices);

  const filtered = serviceSummary.list.filter((service) => {
    if (filter !== 'all' && service.state !== filter) return false;
    if (query && !service.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: serviceSummary.total,
    enabled: serviceSummary.enabled,
    disabled: serviceSummary.disabled,
    static: serviceSummary.static,
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'enabled', 'disabled', 'static'] as Filter[]).map((f) => {
          const active = filter === f;
          const meta = f === 'all' ? null : stateMeta[f];

          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip ring-1 ring-inset transition ${
                active ? 'bg-ink-700 text-white ring-ink-500' : 'bg-ink-850/50 text-ink-300 ring-ink-700 hover:text-white'
              }`}
            >
              {meta && <span className={`dot ${meta.dot}`} />}
              {f === 'all' ? 'Tous' : meta!.label}
              <span className="ml-1 rounded-full bg-ink-900/80 px-1.5 text-[10px] text-ink-400">{counts[f]}</span>
            </button>
          );
        })}
        <div className="ml-auto relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer…"
            className="input w-56 py-1.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total" value={serviceSummary.total} />
        <MetricCard label="Activés" value={serviceSummary.enabled} tone="text-brand-300" />
        <MetricCard label="Désactivés" value={serviceSummary.disabled} tone="text-ink-300" />
        <MetricCard label="Statiques" value={serviceSummary.static} tone="text-yellow-300" />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/60 bg-ink-850/40 text-left text-xs uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">État</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((service) => {
                const meta = describeState(service.state);

                return (
                  <tr
                      key={`${service.name}-${service.state}`}
                      className="border-b border-ink-800/60 table-row-hover"
                    >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`dot ${meta.dot}`} />
                        <div>
                          <p className="font-medium text-ink-100">{service.name}</p>
                          <p className="font-mono text-[11px] text-ink-400">api/services</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip ring-1 ring-inset ${meta.cls}`}>{meta.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-ink-400">Aucun service ne correspond.</p>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = 'text-white' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card card-pad">
      <p className="text-xs uppercase tracking-wider text-ink-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

import { useState } from 'react';
import { useLiveData } from '../lib/live';

export function SettingsPage() {
  const live = useLiveData();
  const [refresh, setRefresh] = useState(1500);
  const [theme, setTheme] = useState<'dark' | 'midnight'>('dark');
  const [notif, setNotif] = useState(true);
  const [autoRestart, setAutoRestart] = useState(true);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Profil système">
          <Row label="Nom d'hôte" value={live.sys.hostname} />
          <Row label="Système d'exploitation" value={live.sys.os} />
          <Row label="Noyau" value={live.sys.kernel} mono />
          <Row label="Architecture" value={live.sys.arch} mono />
          <Row label="Uptime actuel" value={live.sys.uptime} />
        </Section>

        <Section title="Préférences d'affichage">
          <ToggleRow label="Notifications système" value={notif} onChange={setNotif} />
          <ToggleRow label="Redémarrage auto des services échoués" value={autoRestart} onChange={setAutoRestart} />
          <div className="flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
            <span className="text-sm text-ink-200">Thème</span>
            <div className="flex gap-1 rounded-lg bg-ink-900/70 p-1">
              {(['dark', 'midnight'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    theme === t ? 'bg-brand-500 text-ink-950' : 'text-ink-300 hover:text-white'
                  }`}
                >
                  {t === 'dark' ? 'Sombre' : 'Minuit'}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-200">Fréquence de rafraîchissement</span>
              <span className="font-mono text-brand-300">{(refresh / 1000).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min={500}
              max={5000}
              step={500}
              value={refresh}
              onChange={(e) => setRefresh(Number(e.target.value))}
              className="mt-3 w-full accent-brand-500"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink-500">
              <span>0.5s</span>
              <span>5s</span>
            </div>
          </div>
        </Section>

        <Section title="Alertes & seuils">
          <ThresholdRow label="CPU >" unit="%" def={85} />
          <ThresholdRow label="Mémoire >" unit="%" def={90} />
          <ThresholdRow label="Disque >" unit="%" def={80} />
          <ThresholdRow label="Température >" unit="°C" def={75} />
        </Section>

        <Section title="À propos">
          <p className="text-sm text-ink-300">
            <span className="font-semibold text-white">Linux-Monitor</span> est un tableau de bord de supervision
            Linux inspiré de Proxmox/ProxMenux. Cette démonstration utilise des données simulées en temps réel.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Meta k="Version" v="1.0.0" />
            <Meta k="API" v="mock-engine" />
            <Meta k="Rafraîchissement" v={`${(refresh / 1000).toFixed(1)}s`} />
            <Meta k="Licence" v="MIT" />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card card-pad">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
      <span className="text-sm text-ink-300">{label}</span>
      <span className={`text-sm text-ink-100 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
      <span className="text-sm text-ink-200">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition ${value ? 'bg-brand-500' : 'bg-ink-700'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

function ThresholdRow({ label, unit, def }: { label: string; unit: string; def: number }) {
  const [v, setV] = useState(def);
  return (
    <div className="rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-200">{label}</span>
        <span className="font-mono text-brand-300">{v}{unit}</span>
      </div>
      <input
        type="range"
        min={50}
        max={100}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        className="mt-3 w-full accent-brand-500"
      />
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-ink-700/50 bg-ink-850/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{k}</p>
      <p className="font-mono text-ink-100">{v}</p>
    </div>
  );
}

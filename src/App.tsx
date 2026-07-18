import { Activity, HardDrive, ListTree, Network, ScrollText, Settings, ShieldCheck } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useRouter, type Route } from './lib/router';
import { DashboardPage } from './pages/DashboardPage';
import { ServicesPage } from './pages/ServicesPage';
import { DisksPage } from './pages/DisksPage';
import { ProcessesPage } from './pages/ProcessesPage';
import { NetworkPage } from './pages/NetworkPage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';

const META: Record<Route, { title: string; subtitle: string }> = {
  dashboard: { title: 'Vue d\'ensemble', subtitle: 'Supervision temps réel du serveur Linux' },
  services: { title: 'Services', subtitle: 'Unités systemd et statut des démons' },
  disks: { title: 'Disques & stockage', subtitle: 'Volumes montés, occupation et I/O' },
  processes: { title: 'Processus', subtitle: 'Top des processus actifs par ressource' },
  network: { title: 'Réseau', subtitle: 'Interfaces, trafic et connexions' },
  logs: { title: 'Journaux système', subtitle: 'Flux en direct des journaux unifiés' },
  settings: { title: 'Paramètres', subtitle: 'Préférences, alertes et profil système' },
};

const MOBILE_NAV: Array<{ id: Route; icon: React.ReactNode; label: string }> = [
  { id: 'dashboard', icon: <Activity size={18} />, label: 'Accueil' },
  { id: 'services', icon: <ShieldCheck size={18} />, label: 'Services' },
  { id: 'disks', icon: <HardDrive size={18} />, label: 'Disques' },
  { id: 'processes', icon: <ListTree size={18} />, label: 'Proc.' },
  { id: 'network', icon: <Network size={18} />, label: 'Réseau' },
  { id: 'logs', icon: <ScrollText size={18} />, label: 'Logs' },
  { id: 'settings', icon: <Settings size={18} />, label: 'Réglages' },
];

function App() {
  const { route, navigate } = useRouter();
  const meta = META[route];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar route={route} navigate={navigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
          <div className="mx-auto max-w-7xl animate-slideIn">
            {route === 'dashboard' && <DashboardPage />}
            {route === 'services' && <ServicesPage />}
            {route === 'disks' && <DisksPage />}
            {route === 'processes' && <ProcessesPage />}
            {route === 'network' && <NetworkPage />}
            {route === 'logs' && <LogsPage />}
            {route === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-ink-700/60 bg-ink-950/90 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-around px-2 py-2 overflow-x-auto">
          {MOBILE_NAV.map((n) => {
            const active = route === n.id;
            return (
              <button
                key={n.id}
                onClick={() => navigate(n.id)}
                className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] transition ${
                  active ? 'text-brand-300' : 'text-ink-400 hover:text-white'
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;

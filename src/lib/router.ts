import { useEffect, useState } from 'react';

export type Route =
  | 'dashboard'
  | 'services'
  | 'disks'
  | 'processes'
  | 'network'
  | 'logs'
  | 'settings';

const ROUTES: Route[] = ['dashboard', 'services', 'disks', 'processes', 'network', 'logs', 'settings'];

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(h) ? h : 'dashboard';
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r: Route) => {
    window.location.hash = `/${r}`;
  };

  return { route, navigate };
}

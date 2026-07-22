import { useEffect, useState } from 'react';
import { useLiveData } from '../lib/live';

type SortKey = 'cpu' | 'memMB' | 'pid';

type Service = {
  name: string;
  state: string;
};

const WS_URL = "ws://192.168.1.130:5000/ws/services";

const stateMeta: Record<string, string> = {
  R: 'text-brand-300',
  S: 'text-ink-300',
  D: 'text-warn-400',
  Z: 'text-err-400',
  T: 'text-ink-400',
};

export function ProcessesPage() {
  const live = useLiveData();

  const [sort, setSort] = useState<SortKey>('cpu');
  const [query, setQuery] = useState('');

  const [services, setServices] = useState<Service[]>([]);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [serviceEnabled, setServiceEnabled] = useState(0);
  const [serviceDisabled, setServiceDisabled] = useState(0);


  useEffect(() => {

    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log("Services WS connecté");
    };

    socket.onmessage = (event) => {

      const data = JSON.parse(event.data);

      console.log("SERVICES WS :", data);

      if(data.type === "services")
      {
        setServices(data.services.list ?? []);
        setServiceTotal(data.services.total ?? 0);
        setServiceEnabled(data.services.enabled ?? 0);
        setServiceDisabled(data.services.disabled ?? 0);
      }
    };

    socket.onerror = (err) => {
      console.error("Services WS erreur", err);
    };

    return () => {
      socket.close();
    };

  }, []);


  const processes = live.processes ?? [];

  const rows = [...processes]
    .filter((p) =>
      !query ||
      `${p.command} ${p.user} ${p.pid}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
    .sort((a,b) =>
      Number(b[sort] ?? 0) - Number(a[sort] ?? 0)
    );


  const totalCpu = processes.reduce(
    (a,p)=>a + Number(p.cpu ?? 0),
    0
  );

  const totalMem = processes.reduce(
    (a,p)=>a + Number(p.memMB ?? 0),
    0
  );


  return (
    <div className="space-y-4">

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

        <div className="card card-pad">
          <p className="text-xs text-ink-400">Processus</p>
          <p className="text-2xl text-white">
            {live.sys.processes}
          </p>
        </div>

        <div className="card card-pad">
          <p className="text-xs text-ink-400">Threads</p>
          <p className="text-2xl text-white">
            {live.sys.threads}
          </p>
        </div>

        <div className="card card-pad">
          <p className="text-xs text-ink-400">Services actifs</p>
          <p className="text-2xl text-white">
            {serviceEnabled}/{serviceTotal}
          </p>
        </div>

        <div className="card card-pad">
          <p className="text-xs text-ink-400">Services désactivés</p>
          <p className="text-2xl text-white">
            {serviceDisabled}
          </p>
        </div>

      </div>


      <div className="card overflow-hidden">

        <div className="border-b border-ink-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            Services Linux
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">

          {services.map((service)=>(

            <div
              key={service.name}
              className="flex justify-between rounded-lg border border-ink-700 bg-ink-850 px-3 py-2"
            >

              <span className="truncate font-mono text-sm text-ink-200">
                {service.name}
              </span>

              <span className={
                service.state === "enabled"
                ? "text-brand-300"
                : "text-ink-400"
              }>
                {service.state}
              </span>

            </div>

          ))}

        </div>

      </div>


      <div className="card overflow-hidden">

        <div className="flex justify-between border-b border-ink-700 px-4 py-3">

          <h2 className="text-sm font-semibold text-white">
            Processus actifs
          </h2>

          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="Filtrer..."
            className="input w-60 py-1"
          />

        </div>


        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b border-ink-700 text-left text-xs text-ink-400">

                <th className="px-3 py-2">PID</th>
                <th>User</th>
                <th>Commande</th>
                <th>Etat</th>
                <th>CPU</th>
                <th>RAM</th>

              </tr>

            </thead>

            <tbody>

              {rows.map((p)=>(

                <tr
                  key={p.pid}
                  className="border-b border-ink-800"
                >

                  <td className="px-3 py-2">
                    {p.pid}
                  </td>

                  <td>
                    {p.user}
                  </td>

                  <td className="font-mono">
                    {p.command}
                  </td>

                  <td className={stateMeta[p.state] ?? "text-ink-400"}>
                    {p.state}
                  </td>

                  <td>
                    {Number(p.cpu ?? 0).toFixed(1)}%
                  </td>

                  <td>
                    {Number(p.memMB ?? 0).toFixed(1)} MB
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}


function SortHead({
  label,
  k,
  sort,
  setSort
}:{
  label:string;
  k:SortKey;
  sort:SortKey;
  setSort:(k:SortKey)=>void;
}){

  return (

    <th className="px-3 py-2 text-right">

      <button
        onClick={()=>setSort(k)}
        className={
          sort === k
          ? "text-brand-300"
          : "text-ink-400"
        }
      >
        {label}
        {sort === k && " ↓"}
      </button>

    </th>

  );
}
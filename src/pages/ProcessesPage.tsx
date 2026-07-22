import { useEffect, useState } from 'react';
import { useLiveData } from '../lib/live';

type SortKey = 'cpu' | 'memMB' | 'pid';

const WS_URL = "ws://192.168.1.130:5000/ws/dashboard";

const stateMeta: Record<string, string> = {
  R: 'text-brand-300',
  S: 'text-ink-300',
  D: 'text-warn-400',
  Z: 'text-err-400',
  T: 'text-ink-400',
};


type Service = {
  name:string;
  state:string;
};


export function ProcessesPage() {

  const live = useLiveData();

  const [sort,setSort] = useState<SortKey>('cpu');
  const [query,setQuery] = useState('');

  const [services,setServices] = useState<Service[]>([]);
  const [serviceTotal,setServiceTotal] = useState(0);
  const [serviceEnabled,setServiceEnabled] = useState(0);
  const [serviceDisabled,setServiceDisabled] = useState(0);

  useEffect(()=>{

    const socket = new WebSocket(WS_URL);


    socket.onopen=()=>{
      console.log("WebSocket services connecté");
    };


    socket.onmessage=(event)=>{

      const data = JSON.parse(event.data);

      console.log("WS PROCESS PAGE :",data);


      if(data.services){

        const srv=data.services;


        setServices(
          srv.list ?? []
        );


        setServiceTotal(
          srv.total ?? 0
        );


        setServiceEnabled(
          srv.enabled ?? 0
        );


        setServiceDisabled(
          srv.disabled ?? 0
        );

      }

    };


    return ()=>{
      socket.close();
    };


  },[]);



  /*
      PROCESSUS
  */

  const processes = live.processes ?? [];


  const rows=[...processes]
    .filter((p)=>
      !query ||
      `${p.command} ${p.user} ${p.pid}`
      .toLowerCase()
      .includes(query.toLowerCase())
    )
    .sort((a,b)=>
      Number(b[sort]??0)-Number(a[sort]??0)
    );


  const totalCpu=processes.reduce(
    (a,p)=>a+Number(p.cpu??0),
    0
  );


  const totalMem=processes.reduce(
    (a,p)=>a+Number(p.memMB??0),
    0
  );



return (

<div className="space-y-3">


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
<p className="text-xs text-ink-400">Services arrêtés</p>
<p className="text-2xl text-white">
{serviceDisabled}
</p>
</div>


</div>



<div className="card overflow-hidden">


<div className="px-4 py-3 border-b border-ink-700">

<h2 className="text-sm text-white">
Services Linux
</h2>

</div>



<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">


{
services.map((s)=>(


<div
key={s.name}
className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 flex justify-between"
>


<span className="font-mono text-sm text-ink-200 truncate">
{s.name}
</span>


<span
className={
s.state==="enabled"
?
"text-brand-300"
:
"text-ink-400"
}
>
{s.state}
</span>


</div>


))
}


</div>

</div>





<div className="card overflow-hidden">


<div className="px-4 py-3 border-b border-ink-700 flex justify-between">

<h2 className="text-sm text-white">
Processus actifs
</h2>


<input
value={query}
onChange={(e)=>setQuery(e.target.value)}
placeholder="Filtrer..."
className="input w-60 py-1"
/>


</div>



<table className="w-full text-sm">

<thead>

<tr className="text-xs text-ink-400 border-b border-ink-700">

<th className="px-3 py-2">PID</th>
<th>User</th>
<th>Commande</th>
<th>Etat</th>
<th>CPU</th>
<th>RAM</th>

</tr>

</thead>


<tbody>


{
rows.map(p=>(


<tr key={p.pid}
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


<td className={stateMeta[p.state]}>
{p.state}
</td>


<td>
{Number(p.cpu??0).toFixed(1)}%
</td>


<td>
{Number(p.memMB??0).toFixed(1)} MB
</td>


</tr>


))
}



</tbody>

</table>


</div>


</div>

);


}
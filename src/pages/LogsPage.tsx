import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { useLiveData } from '../lib/live';
import type { LogLevel } from '../lib/data';
import { WS_BASE_URL } from '../lib/apiService';

const WS_URL = `${WS_BASE_URL}/logs`;

const levelMeta: Record<LogLevel,{cls:string;dot:string;label:string}> = {
  info:{cls:'text-brand-300',dot:'bg-brand-500',label:'INFO'},
  warn:{cls:'text-warn-400',dot:'bg-warn-500',label:'WARN'},
  error:{cls:'text-err-400',dot:'bg-err-500',label:'ERR'},
  debug:{cls:'text-ink-400',dot:'bg-ink-500',label:'DBG'},
};

type Filter='all'|LogLevel;

type UiLogEntry={
  id:string;
  time:string;
  level:LogLevel;
  unit:string;
  message:string;
};

function normalizeLevel(value:string):LogLevel{
  const level=value.toLowerCase();

  if(level==="info"||level==="warn"||level==="error"||level==="debug")
    return level;

  if(level==="warning") return "warn";
  if(level==="err") return "error";

  return "info";
}

function extractTime(timestamp:string){
  const date=new Date(timestamp);

  if(!Number.isNaN(date.getTime()))
    return date.toISOString().substring(11,19);

  return timestamp;
}

function mapFallbackLogs(entries:any[]):UiLogEntry[]{
  return entries.map(e=>({
    id:String(e.id),
    time:e.time,
    level:e.level,
    unit:e.unit,
    message:e.message
  }));
}

export function LogsPage(){

  const live=useLiveData();

  const [filter,setFilter]=useState<Filter>('all');
  const [paused,setPaused]=useState(false);
  const [query,setQuery]=useState('');

  const [logs,setLogs]=useState<UiLogEntry[]>(
    mapFallbackLogs(live.logs)
  );

  const scrollRef=useRef<HTMLDivElement>(null);


  useEffect(()=>{

    const socket=new WebSocket(WS_URL);

    socket.onopen=()=>{
      console.log("Logs WS connecté");
    };

    socket.onmessage=(event)=>{

      const message=JSON.parse(event.data);

      console.log("WS LOGS:",message);

      if(message.type==="logs" && message.logs && !paused){

      const formatted = message.logs.logs.map((log:any)=>({
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        time: extractTime(log.timestamp),
        level: normalizeLevel(log.level),
        unit: `${log.service} (pid:${log.pid})`,
        message: log.message
      }));

        setLogs(formatted);
      }
    };

    socket.onerror=(e)=>{
      console.error("Logs WS erreur",e);
    };

    socket.onclose=()=>{
      console.log("Logs WS fermé");
    };

    return()=>{
      socket.close();
    };

  },[paused]);


  const filteredLogs=logs.filter(l=>{

    if(filter!=="all" && l.level!==filter)
      return false;

    if(query && !`${l.unit} ${l.message}`.toLowerCase().includes(query.toLowerCase()))
      return false;

    return true;
  });


  return(
    <div className="space-y-4">

      <div className="flex flex-wrap items-center gap-2">

        {(['all','info','warn','error','debug'] as Filter[]).map(f=>{

          const active=filter===f;

          return(
            <button
              key={f}
              onClick={()=>setFilter(f)}
              className={`chip ring-1 ring-inset ${
                active
                ? 'bg-ink-700 text-white ring-ink-500'
                : 'bg-ink-850/50 text-ink-300 ring-ink-700'
              }`}
            >
              {f!=="all" &&
                <span className={`dot ${levelMeta[f].dot}`}/>
              }
              {f==="all"?"Tous":levelMeta[f].label}
            </button>
          );

        })}

        <div className="ml-auto flex items-center gap-2">

          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Filtrer les journaux…"
            className="input w-56 py-1.5"
          />

          <button
            onClick={()=>setPaused(p=>!p)}
            className="btn btn-ghost"
          >
            {paused?<Play size={15}/>:<Pause size={15}/>}
            {paused?"Live":"Pause"}
          </button>

          <button
            onClick={()=>setLogs([])}
            className="btn btn-ghost"
          >
            <Trash2 size={15}/>
          </button>

        </div>

      </div>


      <div
        ref={scrollRef}
        className="card overflow-hidden"
        style={{maxHeight:'70vh',overflowY:'auto'}}
      >

        <div className="border-b border-ink-700/60 px-4 py-2.5 text-xs text-ink-400">
          {filteredLogs.length} entrées · {paused?"flux en pause":"flux en direct"}
        </div>


        <div className="divide-y divide-ink-800/40 font-mono text-xs">

          {filteredLogs.map(l=>{

            const m=levelMeta[l.level];

            return(
              <div
                key={l.id}
                className="flex items-start gap-3 px-4 py-2.5 table-row-hover"
              >

                <span className="text-ink-500">
                  {l.time}
                </span>

                <span className={m.cls}>
                  <span className={`dot ${m.dot} mr-1.5 align-middle`}/>
                  {m.label}
                </span>

                <span className="text-ink-400">
                  {l.unit}
                </span>

                <span className="text-ink-100">
                  {l.message}
                </span>

              </div>
            );

          })}

        </div>

      </div>

    </div>
  );
}
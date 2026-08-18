import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MirageClient, normalizeBaseUrl } from '../api/client';
import type { Bootstrap, Session, Telemetry } from '../api/types';
import { loadBaseUrl, saveBaseUrl as persistBaseUrl } from '../storage/settings';

type MirageState = {
  ready: boolean; online: boolean; error: string; baseUrl: string; bootstrap: Bootstrap | null;
  telemetry: Telemetry | null; sessions: Session[]; client: MirageClient;
  setBaseUrl(value: string): Promise<void>; refresh(): Promise<void>; startSession(label: string): Promise<void>;
  stopSession(): Promise<void>; replay(id: string): Promise<void>;
};

const Context = createContext<MirageState | null>(null);

export function MirageProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [baseUrl, setUrl] = useState('http://mirage.local:8080');
  const [online, setOnline] = useState(false);
  const [error, setError] = useState('');
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const client = useMemo(() => new MirageClient(baseUrl), [baseUrl]);
  const socket = useRef<WebSocket | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [next, history] = await Promise.all([client.bootstrap(), client.sessions()]);
      setBootstrap(next); setSessions(history); setOnline(true); setError('');
      try { setTelemetry(await client.telemetry()); } catch { /* vehicle may not have produced its first sample */ }
    } catch (cause) {
      setOnline(false); setError(cause instanceof Error ? cause.message : 'Unable to reach Mirage');
    }
  }, [client]);

  useEffect(() => { loadBaseUrl().then(value => { setUrl(normalizeBaseUrl(value)); setReady(true); }); }, []);
  useEffect(() => {
    if (!ready) return;
    refresh();
    const interval = setInterval(refresh, 10_000);
    const ws = new WebSocket(client.websocketUrl()); socket.current = ws;
    ws.onmessage = event => { try { setTelemetry(JSON.parse(event.data)); setOnline(true); } catch { /* malformed frame */ } };
    ws.onerror = () => setError(current => current || 'Live stream disconnected; polling continues');
    return () => { clearInterval(interval); ws.close(); };
  }, [client, ready, refresh]);

  async function changeBaseUrl(value: string) { const normalized = normalizeBaseUrl(value); await persistBaseUrl(normalized); setUrl(normalized); }
  async function startSession(label: string) { await client.startSession(label); await refresh(); }
  async function stopSession() { await client.stopSession(); await refresh(); }
  async function replay(id: string) { await client.replay(id); }

  return <Context.Provider value={{ ready, online, error, baseUrl, bootstrap, telemetry, sessions, client, setBaseUrl: changeBaseUrl, refresh, startSession, stopSession, replay }}>{children}</Context.Provider>;
}

export function useMirage() { const value = useContext(Context); if (!value) throw new Error('useMirage must be inside MirageProvider'); return value; }

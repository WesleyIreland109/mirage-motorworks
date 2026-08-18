import type { Bootstrap, Session, Telemetry } from './types';

export function normalizeBaseUrl(value: string) {
  let url = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url;
}

export class MirageClient {
  constructor(readonly baseUrl: string) {}
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
    if (!response.ok) throw new Error((await response.text()) || `Mirage returned ${response.status}`);
    return response.json() as Promise<T>;
  }
  bootstrap() { return this.request<Bootstrap>('/api/mobile/bootstrap'); }
  telemetry() { return this.request<Telemetry>('/api/telemetry/current'); }
  sessions() { return this.request<Session[]>('/api/sessions'); }
  startSession(label: string) { return this.request<Session>('/api/session/start', { method: 'POST', body: JSON.stringify({ label }) }); }
  stopSession() { return this.request<Session>('/api/session/stop', { method: 'POST' }); }
  replay(id: string, speed = 1) { return this.request<{ state: string }>('/api/session/replay', { method: 'POST', body: JSON.stringify({ id, speed }) }); }
  telemetryDownload(id: string) { return `${this.baseUrl}/api/sessions/${encodeURIComponent(id)}/telemetry`; }
  obdDownload(id: string) { return `${this.baseUrl}/api/sessions/${encodeURIComponent(id)}/obd`; }
  websocketUrl() { return `${this.baseUrl.replace(/^http/, 'ws')}/ws/telemetry`; }
}

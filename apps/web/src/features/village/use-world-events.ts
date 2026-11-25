import { useEffect, useState } from 'react';
import { useQueryClient, type QueryFilters } from '@tanstack/react-query';
import { api } from '@dwar/api-client';

const queryNames = {
  village: ['village'],
  incomings: ['incomings'],
  reports: ['reports'],
  mail: ['mailbox', 'mail-thread'],
};
type Scope = keyof typeof queryNames;
const scopes = Object.keys(queryNames) as Scope[];

export function useWorldEvents(worldId: number, accountId: number) {
  const client = useQueryClient();
  const [pollForChanges, setPollForChanges] = useState(typeof EventSource === 'undefined');

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    setPollForChanges(false);

    const pending = new Set<Scope>();
    const refreshing = new Set<Scope>();
    let source: EventSource;
    let stopped = false;
    let refreshTimer: number | undefined;
    let readyTimer: number | undefined;
    let retryTimer: number | undefined;
    let retryDelay = 3000;

    function scheduleRefresh() {
      refreshTimer ??= window.setTimeout(refresh, 30);
    }

    function refresh() {
      refreshTimer = undefined;
      for (const scope of pending) {
        if (refreshing.has(scope)) continue;
        pending.delete(scope);
        refreshing.add(scope);
        const filter: QueryFilters = {
          predicate: ({ queryKey }) =>
            queryKey[1] === worldId && queryNames[scope].some((name) => name === queryKey[0]),
        };
        // Um pedido em curso pode ter lido o estado anterior à notificação.
        const inFlight = client.isFetching({ ...filter, type: 'active' }) > 0;
        void client.invalidateQueries(filter, { cancelRefetch: false }).then(() => {
          if (stopped) return;
          refreshing.delete(scope);
          if (inFlight) pending.add(scope);
          if (pending.has(scope)) scheduleRefresh();
        });
      }
    }

    function connect() {
      retryTimer = undefined;
      const stream = new EventSource(api.worldEventsUrl(worldId));
      source = stream;
      readyTimer = window.setTimeout(() => setPollForChanges(true), 5000);
      function unavailable() {
        window.clearTimeout(readyTimer);
        setPollForChanges(true);
      }

      stream.addEventListener('ready', () => {
        window.clearTimeout(readyTimer);
        setPollForChanges(false);
        retryDelay = 3000;
        for (const scope of scopes) pending.add(scope);
        scheduleRefresh();
      });
      stream.addEventListener('change', (event) => {
        if (!(event instanceof MessageEvent) || typeof event.data !== 'string') return;
        try {
          const message = JSON.parse(event.data) as { scope?: unknown } | null;
          const scope = message?.scope;
          if (typeof scope !== 'string' || !Object.hasOwn(queryNames, scope)) return;
          pending.add(scope as Scope);
          scheduleRefresh();
        } catch {
          // Uma notificação inválida não interrompe a conexão.
        }
      });
      stream.addEventListener('unavailable', unavailable);
      stream.addEventListener('error', () => {
        unavailable();
        if (stream.readyState !== EventSource.CLOSED) return;
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(30_000, retryDelay * 2);
      });
    }

    connect();
    return () => {
      stopped = true;
      source.close();
      window.clearTimeout(readyTimer);
      window.clearTimeout(refreshTimer);
      window.clearTimeout(retryTimer);
    };
  }, [accountId, client, worldId]);

  return pollForChanges;
}

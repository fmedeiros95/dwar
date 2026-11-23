import type { QueryClient } from '@tanstack/react-query';
import { preloadBacking } from './features/village/overview/scene-theme.js';
import { api } from '@dwar/api-client';

/**
 * Quem abre o jogo direto pelo endereço pede mundo, aldeia e comandos junto com a conta, em vez de um
 * depois do outro. Sem sessão os pedidos falham em silêncio e são refeitos depois do login.
 */
export function preloadGame(client: QueryClient) {
  const code = /^\/([a-z][a-z0-9-]{1,31})\/game$/.exec(location.pathname)?.[1];
  if (!code) return;
  if (new URLSearchParams(location.search).get('screen') !== 'map') preloadBacking();
  const selected = new URLSearchParams(location.search).get('village');
  const villageId = selected === null ? undefined : Number(selected);
  void client
    .fetchQuery({ queryKey: ['world-by-slug', code], queryFn: () => api.worldBySlug(code) })
    .then((world) => {
      void client.prefetchQuery({
        queryKey: ['village', world.id, villageId ?? null],
        queryFn: () => api.village(world.id, villageId),
      });
      void client.prefetchQuery({
        queryKey: ['incomings', world.id],
        queryFn: () => api.incomings(world.id),
      });
    })
    .catch(() => undefined);
}
